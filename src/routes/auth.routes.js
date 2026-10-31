const express = require('express');
const {
  signupUser,
  loginUser,
  googleLoginUser,
  verifyEmailAddress,
  resendVerificationCode,
  changePassword,
} = require('../controllers/auth.controller');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

router.post('/signup', signupUser);
router.post('/login', loginUser);
router.post('/google', googleLoginUser);
router.post('/verify-email', verifyEmailAddress);
router.post('/resend-verification', resendVerificationCode);
router.patch('/change-password', requireAuth, changePassword);

module.exports = router;