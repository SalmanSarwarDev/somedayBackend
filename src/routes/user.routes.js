const express = require('express');
const {
  getProfile,
  updateProfile,
  updateProfileImage,
} = require('../controllers/user.controller');
const requireAuth = require('../middleware/requireAuth');
const { handleProfileImageUpload } = require('../utils/upload');

const router = express.Router();

router.get('/profile', requireAuth, getProfile);
router.patch('/profile', requireAuth, updateProfile);
router.patch('/profile/avatar', requireAuth, handleProfileImageUpload, updateProfileImage);

module.exports = router;