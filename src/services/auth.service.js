const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const firebaseAdmin = require('../config/firebase');
const User = require('../models/User');
const {
  assertEmailConfiguration,
  sendVerificationEmail,
} = require('./email.service');

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
  phone: user.phone,
  avatar: user.avatar,
  createdAt: user.createdAt,
});

const signup = async (input = {}) => {
  const { firstName, lastName, email, password } = input && typeof input === 'object' ? input : {};
  if (![firstName, lastName, email, password].every((value) => typeof value === 'string' && value.trim())) {
    throw createError('First name, last name, email and password are required', 400);
  }

  assertEmailConfiguration();
  const normalizedEmail = email.trim().toLowerCase();
  if (await User.exists({ email: normalizedEmail })) {
    throw createError('An account with this email already exists', 409);
  }

  const otp = createOtp();
  const user = await User.create({
    firstName,
    lastName,
    email: normalizedEmail,
    password,
    emailVerificationCodeHash: hashOtp(otp),
    emailVerificationExpiresAt: new Date(Date.now() + OTP_LIFETIME_MS),
  });

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
  if (!user || !user.password || !(await bcrypt.compare(password, user.password))) {
    const error = new Error('Email or password is incorrect');
    error.status = 401;
    throw error;
  }
  if (user.status !== 'active') {
    throw createError('This account is inactive', 403);
  }
  if (!user.emailVerified) {
    throw createError('Verify your email address before logging in', 403);
  }

  return { user: publicUser(user), token: createToken(user._id) };
};

const googleLogin = async (input = {}) => {
  const { idToken } = input && typeof input === 'object' ? input : {};
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

  if (!user) {
    user = await User.findOne({ email }).select('+firebaseUid');
    if (user) {
      if (user.firebaseUid && user.firebaseUid !== firebaseUid) {
        throw createError('This email is already linked to another Google account', 409);
      }
      user.firebaseUid = firebaseUid;
      user.emailVerified = true;
      if (!user.authProviders.includes('google')) user.authProviders.push('google');
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
        authProviders: ['google'],
      });
    }
  }

  if (user.status !== 'active') {
    throw createError('This account is inactive', 403);
  }

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

module.exports = {
  createToken,
  publicUser,
  signup,
  login,
  googleLogin,
  verifyEmail,
  resendVerification,
};