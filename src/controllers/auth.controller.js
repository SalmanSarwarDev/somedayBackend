const bcrypt = require('bcrypt');
const User = require('../models/User');
const {
  publicUser,
  signup,
  login,
  googleLogin,
  verifyEmail,
  resendVerification,
} = require('../services/auth.service');

const sendError = (res, error) => {
  if (error.code === 11000) {
    return res.status(409).json({ succeeded: false, message: 'An account with this email already exists' });
  }
  const status = error.status || 500;
  if (status >= 500) console.error('Authentication request failed:', error.message);
  return res.status(status).json({
    succeeded: false,
    message: status >= 500 ? 'Authentication request failed' : error.message,
  });
};

const signupUser = async (req, res) => {
  try {
    const data = await signup(req.body);
    return res.status(201).json({
      succeeded: true,
      message: 'Account created. Check your email for a verification code.',
      data,
    });
  } catch (error) {
    return sendError(res, error);
  }
};

const loginUser = async (req, res) => {
  try {
    const data = await login(req.body);
    return res.json({ succeeded: true, message: 'Login successful', data });
  } catch (error) {
    return sendError(res, error);
  }
};

const googleLoginUser = async (req, res) => {
  try {
    const data = await googleLogin(req.body);
    return res.json({ succeeded: true, message: 'Google login successful', data });
  } catch (error) {
    return sendError(res, error);
  }
};

const verifyEmailAddress = async (req, res) => {
  try {
    const data = await verifyEmail(req.body);
    return res.json({ succeeded: true, message: 'Email verified. You can now log in.', data });
  } catch (error) {
    return sendError(res, error);
  }
};

const resendVerificationCode = async (req, res) => {
  try {
    const data = await resendVerification(req.body);
    return res.json({ succeeded: true, ...data });
  } catch (error) {
    return sendError(res, error);
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (typeof currentPassword !== 'string' || typeof newPassword !== 'string' || newPassword.length < 8) {
      return res.status(400).json({ succeeded: false, message: 'Provide currentPassword and a new password of at least 8 characters' });
    }

    const user = await User.findById(req.userId).select('+password');
    if (!user) return res.status(404).json({ succeeded: false, message: 'User not found' });
    if (!(await bcrypt.compare(currentPassword, user.password))) {
      return res.status(401).json({ succeeded: false, message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();
    return res.json({ succeeded: true, message: 'Password changed successfully' });
  } catch (error) {
    return sendError(res, error);
  }
};

module.exports = {
  signupUser,
  loginUser,
  googleLoginUser,
  verifyEmailAddress,
  resendVerificationCode,
  changePassword,
};