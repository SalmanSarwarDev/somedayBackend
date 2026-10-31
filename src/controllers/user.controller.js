const User = require('../models/User');
const { publicUser } = require('../services/auth.service');
const {
  uploadProfileImage,
  deleteProfileImage,
} = require('../utils/upload');

const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ succeeded: false, message: 'User not found' });
    return res.json({ succeeded: true, data: { user: publicUser(user) } });
  } catch (error) {
    console.error('Profile lookup failed:', error.message);
    return res.status(500).json({ succeeded: false, message: 'Could not load profile' });
  }
};

const updateProfile = async (req, res) => {
  try {
    const updates = {};
    for (const field of ['firstName', 'lastName', 'phone']) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }

    const user = await User.findByIdAndUpdate(req.userId, { $set: updates }, {
      returnDocument: 'after',
      runValidators: true,
    });
    if (!user) return res.status(404).json({ succeeded: false, message: 'User not found' });
    return res.json({ succeeded: true, message: 'Profile updated', data: { user: publicUser(user) } });
  } catch (error) {
    console.error('Profile update failed:', error.message);
    return res.status(400).json({ succeeded: false, message: 'Could not update profile' });
  }
};

const updateProfileImage = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      succeeded: false,
      message: 'Attach an image using the "avatar" form field',
    });
  }

  let uploadedImage;
  let user;
  try {
    user = await User.findById(req.userId).select('+avatarPublicId');
    if (!user) return res.status(404).json({ succeeded: false, message: 'User not found' });

    uploadedImage = await uploadProfileImage(req.file.buffer, req.userId);
    const previousAvatarPublicId = user.avatarPublicId;
    user.avatar = uploadedImage.url;
    user.avatarPublicId = uploadedImage.publicId;
    await user.save();

    try {
      await deleteProfileImage(previousAvatarPublicId);
    } catch (error) {
      console.error('Profile image was updated but the previous Cloudinary image remains:', error.message);
    }

    return res.json({
      succeeded: true,
      message: 'Profile image updated',
      data: { user: publicUser(user) },
    });
  } catch (error) {
    if (uploadedImage) {
      try {
        await deleteProfileImage(uploadedImage.publicId);
      } catch (cleanupError) {
        console.error('Could not remove failed profile image upload from Cloudinary:', cleanupError.message);
      }
    }
    console.error('Profile image update failed:', error.message);
    return res.status(error.status || 500).json({
      succeeded: false,
      message: error.status ? error.message : 'Could not update profile image',
    });
  }
};

module.exports = { getProfile, updateProfile, updateProfileImage };