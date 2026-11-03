const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const firebaseAdmin = require('../config/firebase');
const User = require('../models/User');
const {
  assertEmailConfiguration,
  sendVerificationEmail,
  sendPasswordResetEmail,
} = require('./email.service');
const { initializeUserRoutines } = require('./routine.service');
const { isValidTimezone } = require('../utils/timezone');

const OTP_LIFETIME_MS = 10 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;

const createError = (message, status) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const createOtp = () => String(crypto.randomInt(100000, 1000000));

const hashOtp = (otp) => crypto
  .createHmac('sha256', process.env.JWT_SECRET)
  .update(otp)
  .digest('hex');

const createToken = (userId) => jwt.sign(
  { sub: String(userId) },
  process.env.JWT_SECRET,
  { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
);

const publicUser = (user) => ({
  id: String(user._id),
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
  emailVerified: user.emailVerified,
  timezone: user.timezone || 'Asia/Karachi',
  phone: user.phone,
  avatar: user.avatar,
  createdAt: user.createdAt,
});

const signup = async (input = {}) => {
  const { firstName, lastName, email, password, timezone } = input && typeof input === 'object' ? input : {};
  if (![firstName, lastName, email, password].every((value) => typeof value === 'string' && value.trim())) {
    throw createError('First name, last name, email and password are required', 400);
  }
  if (password.length < 8) {
    throw createError('Password must be at least 8 characters long', 400);
  }

  if (timezone !== undefined && !isValidTimezone(timezone)) {
    throw createError('Invalid IANA timezone string (e.g. "Asia/Karachi", "Europe/Budapest")', 400);
  }
  const userTimezone = (timezone && isValidTimezone(timezone)) ? timezone.trim() : 'Asia/Karachi';

  assertEmailConfiguration();
  const normalizedEmail = email.trim().toLowerCase();

  const existingUser = await User.findOne({ email: normalizedEmail }).select('+password');
  if (existingUser) {
    if (!existingUser.password && existingUser.authProviders.includes('google')) {
      throw createError(
        'An account with this email already exists using Google sign-in. Please log in using Google, or use "Forgot Password" to set a password.',
        409
      );
    }
    throw createError('An account with this email already exists', 409);
  }

  const otp = createOtp();
  const user = await User.create({
    firstName,
    lastName,
    email: normalizedEmail,
    password,
    timezone: userTimezone,
    emailVerificationCodeHash: hashOtp(otp),
    emailVerificationExpiresAt: new Date(Date.now() + OTP_LIFETIME_MS),
  });

  // Automatically create all 6 predefined daily routines with randomized sequential times
  try {
    await initializeUserRoutines(user._id);
  } catch (routineError) {
    console.error('Failed to initialize user routines during signup:', routineError.message);
  }

  await sendVerificationEmail(user, otp);
  user.emailVerificationLastSentAt = new Date();
  await user.save();

  return { user: publicUser(user), emailVerificationRequired: true };
};

const login = async (input = {}) => {
  const { email, password } = input && typeof input === 'object' ? input : {};
  if (typeof email !== 'string' || typeof password !== 'string') {
    throw createError('Email and password are required', 400);
  }

  const user = await User.findOne({ email: email.trim().toLowerCase() }).select('+password');
  if (!user) {
    throw createError('Email or password is incorrect', 401);
  }

  if (!user.password && user.authProviders.includes('google')) {
    throw createError(
      'This account was registered using Google. Please click "Sign in with Google" to access your account, or use "Forgot Password" to create a password.',
      400
    );
  }

  if (!(await bcrypt.compare(password, user.password))) {
    throw createError('Email or password is incorrect', 401);
  }

  if (user.status !== 'active') {
    throw createError('This account is inactive', 403);
  }
  if (!user.emailVerified) {
    throw createError('Verify your email address before logging in', 403);
  }

  // Ensure routines exist for this user
  try {
    await initializeUserRoutines(user._id);
  } catch (_e) {}

  return { user: publicUser(user), token: createToken(user._id) };
};

const googleLogin = async (input = {}) => {
  const { idToken, timezone } = input && typeof input === 'object' ? input : {};
  if (typeof idToken !== 'string' || !idToken.trim()) {
    throw createError('A Firebase ID token is required', 400);
  }

  let decodedToken;
  try {
    decodedToken = await firebaseAdmin.auth().verifyIdToken(idToken);
  } catch (_error) {
    throw createError('Google sign-in token is invalid or expired', 401);
  }

  const firebaseClaims = decodedToken.firebase || {};
  if (firebaseClaims.sign_in_provider !== 'google.com') {
    throw createError('Sign in with Google to continue', 401);
  }
  if (typeof decodedToken.email !== 'string' || decodedToken.email_verified !== true) {
    throw createError('A Google account with a verified email address is required', 401);
  }

  const email = decodedToken.email.trim().toLowerCase();
  const firebaseUid = decodedToken.uid;
  let user = await User.findOne({ firebaseUid }).select('+firebaseUid');

  if (user && user.email !== email) {
    throw createError('This Google account is linked to a different email address', 409);
  }

  const userTimezone = (timezone && isValidTimezone(timezone)) ? timezone.trim() : 'Asia/Karachi';

  if (!user) {
    user = await User.findOne({ email }).select('+firebaseUid');
    if (user) {
      if (user.firebaseUid && user.firebaseUid !== firebaseUid) {
        throw createError('This email is already linked to another Google account', 409);
      }
      user.firebaseUid = firebaseUid;
      user.emailVerified = true;
      if (!user.authProviders.includes('google')) user.authProviders.push('google');
      if (timezone && isValidTimezone(timezone)) user.timezone = userTimezone;
      await user.save();
    } else {
      const displayName = typeof decodedToken.name === 'string' ? decodedToken.name.trim() : '';
      const nameParts = displayName.split(/\s+/).filter(Boolean);
      const firstName = (nameParts.shift() || email.split('@')[0]).slice(0, 80);
      const lastName = nameParts.join(' ').slice(0, 80);
      user = await User.create({
        firstName,
        lastName: lastName || firstName,
        email,
        emailVerified: true,
        avatar: typeof decodedToken.picture === 'string' ? decodedToken.picture : '',
        firebaseUid,
        timezone: userTimezone,
        authProviders: ['google'],
      });
    }
  }

  if (user.status !== 'active') {
    throw createError('This account is inactive', 403);
  }

  // Ensure routines exist for this user
  try {
    await initializeUserRoutines(user._id);
  } catch (_e) {}

  return { user: publicUser(user), token: createToken(user._id) };
};

const verifyEmail = async (input = {}) => {
  const { email, otp } = input && typeof input === 'object' ? input : {};
  if (typeof email !== 'string' || typeof otp !== 'string' || !/^\d{6}$/.test(otp)) {
    throw createError('Provide a valid email address and 6-digit verification code', 400);
  }

  const user = await User.findOne({ email: email.trim().toLowerCase() }).select(
    '+emailVerificationCodeHash +emailVerificationExpiresAt +emailVerificationAttempts'
  );
  if (!user || user.emailVerified || !user.emailVerificationCodeHash) {
    throw createError('Verification code is invalid or expired', 400);
  }
  if (user.emailVerificationAttempts >= OTP_MAX_ATTEMPTS) {
    throw createError('Too many incorrect codes. Request a new verification code', 429);
  }
  if (!user.emailVerificationExpiresAt || user.emailVerificationExpiresAt <= new Date()) {
    user.emailVerificationCodeHash = undefined;
    user.emailVerificationExpiresAt = undefined;
    await user.save();
    throw createError('Verification code is invalid or expired. Request a new one', 400);
  }

  const expectedHash = Buffer.from(user.emailVerificationCodeHash, 'hex');
  const providedHash = Buffer.from(hashOtp(otp), 'hex');
  if (expectedHash.length !== providedHash.length || !crypto.timingSafeEqual(expectedHash, providedHash)) {
    user.emailVerificationAttempts += 1;
    await user.save();
    if (user.emailVerificationAttempts >= OTP_MAX_ATTEMPTS) {
      throw createError('Too many incorrect codes. Request a new verification code', 429);
    }
    throw createError('Verification code is invalid or expired', 400);
  }

  user.emailVerified = true;
  user.emailVerificationCodeHash = undefined;
  user.emailVerificationExpiresAt = undefined;
  user.emailVerificationAttempts = 0;
  await user.save();
  return { user: publicUser(user) };
};

const resendVerification = async (input = {}) => {
  const { email } = input && typeof input === 'object' ? input : {};
  if (typeof email !== 'string' || !email.trim()) {
    throw createError('A valid email address is required', 400);
  }

  const normalizedEmail = email.trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail }).select(
    '+emailVerificationCodeHash +emailVerificationExpiresAt +emailVerificationLastSentAt +emailVerificationAttempts'
  );
  const genericResponse = {
    message: 'If an unverified account exists for that email, a verification code will be sent',
  };
  if (!user || user.emailVerified) return genericResponse;

  const now = Date.now();
  if (
    user.emailVerificationLastSentAt
    && now - user.emailVerificationLastSentAt.getTime() < OTP_RESEND_COOLDOWN_MS
  ) {
    return genericResponse;
  }

  assertEmailConfiguration();
  const otp = createOtp();
  user.emailVerificationCodeHash = hashOtp(otp);
  user.emailVerificationExpiresAt = new Date(now + OTP_LIFETIME_MS);
  user.emailVerificationAttempts = 0;
  await user.save();

  await sendVerificationEmail(user, otp);
  user.emailVerificationLastSentAt = new Date();
  await user.save();
  return genericResponse;
};

const forgotPassword = async (input = {}) => {
  const { email } = input && typeof input === 'object' ? input : {};
  if (typeof email !== 'string' || !email.trim()) {
    throw createError('A valid email address is required', 400);
  }

  const genericResponse = {
    message: 'If an account exists for that email, a password reset code has been sent',
  };

  const normalizedEmail = email.trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail }).select(
    '+passwordResetCodeHash +passwordResetExpiresAt +passwordResetLastSentAt +passwordResetAttempts'
  );

  if (!user || user.status !== 'active') {
    return genericResponse;
  }

  const now = Date.now();
  if (
    user.passwordResetLastSentAt
    && now - user.passwordResetLastSentAt.getTime() < OTP_RESEND_COOLDOWN_MS
  ) {
    return genericResponse;
  }

  assertEmailConfiguration();
  const otp = createOtp();
  user.passwordResetCodeHash = hashOtp(otp);
  user.passwordResetExpiresAt = new Date(now + OTP_LIFETIME_MS);
  user.passwordResetAttempts = 0;
  await user.save();

  await sendPasswordResetEmail(user, otp);
  user.passwordResetLastSentAt = new Date();
  await user.save();

  return genericResponse;
};

const resetPassword = async (input = {}) => {
  const { email, otp, newPassword } = input && typeof input === 'object' ? input : {};
  if (typeof email !== 'string' || typeof otp !== 'string' || !/^\d{6}$/.test(otp)) {
    throw createError('Provide a valid email address and 6-digit reset code', 400);
  }
  if (typeof newPassword !== 'string' || newPassword.length < 8) {
    throw createError('New password must be at least 8 characters long', 400);
  }

  const user = await User.findOne({ email: email.trim().toLowerCase() }).select(
    '+password +passwordResetCodeHash +passwordResetExpiresAt +passwordResetAttempts'
  );

  if (!user || !user.passwordResetCodeHash) {
    throw createError('Reset code is invalid or expired', 400);
  }
  if (user.passwordResetAttempts >= OTP_MAX_ATTEMPTS) {
    throw createError('Too many incorrect attempts. Request a new reset code', 429);
  }
  if (!user.passwordResetExpiresAt || user.passwordResetExpiresAt <= new Date()) {
    user.passwordResetCodeHash = undefined;
    user.passwordResetExpiresAt = undefined;
    await user.save();
    throw createError('Reset code is invalid or expired. Request a new one', 400);
  }

  const expectedHash = Buffer.from(user.passwordResetCodeHash, 'hex');
  const providedHash = Buffer.from(hashOtp(otp), 'hex');
  if (expectedHash.length !== providedHash.length || !crypto.timingSafeEqual(expectedHash, providedHash)) {
    user.passwordResetAttempts += 1;
    await user.save();
    if (user.passwordResetAttempts >= OTP_MAX_ATTEMPTS) {
      throw createError('Too many incorrect attempts. Request a new reset code', 429);
    }
    throw createError('Reset code is invalid or expired', 400);
  }

  user.password = newPassword;
  if (!user.authProviders.includes('password')) {
    user.authProviders.push('password');
  }
  user.emailVerified = true;
  user.passwordResetCodeHash = undefined;
  user.passwordResetExpiresAt = undefined;
  user.passwordResetAttempts = 0;
  await user.save();

  return {
    message: 'Password reset successfully. You can now log in with your new password.',
  };
};

const changePassword = async (userId, input = {}) => {
  const { currentPassword, newPassword } = input && typeof input === 'object' ? input : {};
  if (typeof newPassword !== 'string' || newPassword.length < 8) {
    throw createError('New password must be at least 8 characters long', 400);
  }

  const user = await User.findById(userId).select('+password');
  if (!user) {
    throw createError('User not found', 404);
  }

  // If the user already has a password, currentPassword is required and must match
  const hadPassword = Boolean(user.password);
  if (hadPassword) {
    if (typeof currentPassword !== 'string' || !currentPassword) {
      throw createError('Current password is required', 400);
    }
    if (!(await bcrypt.compare(currentPassword, user.password))) {
      throw createError('Current password is incorrect', 401);
    }
  }

  // Set the new password
  user.password = newPassword;
  if (!user.authProviders.includes('password')) {
    user.authProviders.push('password');
  }
  await user.save();

  return {
    message: hadPassword
      ? 'Password changed successfully'
      : 'Password created successfully. You can now log in with Google or your password.',
  };
};

module.exports = {
  createToken,
  publicUser,
  signup,
  login,
  googleLogin,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  changePassword,
};
