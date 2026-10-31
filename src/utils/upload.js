const crypto = require('crypto');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;

const MAX_PROFILE_IMAGE_SIZE = 5 * 1024 * 1024;
const IMAGE_SIGNATURES = {
  'image/jpeg': (header) => header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff,
  'image/png': (header) => header.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
  'image/webp': (header) => (
    header.toString('ascii', 0, 4) === 'RIFF'
    && header.toString('ascii', 8, 12) === 'WEBP'
  ),
};

const profileImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_PROFILE_IMAGE_SIZE,
    files: 1,
  },
  fileFilter: (_req, file, callback) => {
    if (!IMAGE_SIGNATURES[file.mimetype]) {
      const error = new Error('Profile image must be a JPEG, PNG, or WebP file');
      error.status = 400;
      return callback(error);
    }
    return callback(null, true);
  },
});

const configureCloudinary = () => {
  const required = [
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET',
  ];
  const missing = required.filter((name) => !process.env[name]);
  if (missing.length) {
    const error = new Error(`Cloudinary is not configured. Missing: ${missing.join(', ')}`);
    error.status = 503;
    throw error;
  }

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
};

const hasValidImageSignature = (buffer, mimeType) => (
  buffer.length >= 12 && IMAGE_SIGNATURES[mimeType](buffer.subarray(0, 12))
);

const handleProfileImageUpload = (req, res, next) => {
  profileImageUpload.single('avatar')(req, res, (error) => {
    if (error) {
      if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
          succeeded: false,
          message: 'Profile image must be 5 MB or smaller',
        });
      }

      const status = error.status || 500;
      if (status >= 500) console.error('Profile image upload failed:', error.message);
      return res.status(status).json({
        succeeded: false,
        message: status >= 500 ? 'Could not upload profile image' : error.message,
      });
    }

    if (!req.file || hasValidImageSignature(req.file.buffer, req.file.mimetype)) {
      return next();
    }
    return res.status(400).json({
      succeeded: false,
      message: 'Uploaded file contents do not match a supported image format',
    });
  });
};

const uploadProfileImage = async (buffer, userId) => {
  configureCloudinary();
  return new Promise((resolve, reject) => {
    const upload = cloudinary.uploader.upload_stream(
      {
        folder: `someday/users/${userId}/profile-images`,
        public_id: crypto.randomUUID(),
        resource_type: 'image',
        overwrite: false,
        unique_filename: false,
        allowed_formats: ['jpg', 'png', 'webp'],
      },
      (error, result) => {
        if (error || !result) {
          console.error('Cloudinary profile image upload failed:', error?.message || 'No upload result returned');
          const uploadError = new Error('Could not upload profile image. Please try again later');
          uploadError.status = 503;
          return reject(uploadError);
        }
        return resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );
    upload.end(buffer);
  });
};

const deleteProfileImage = async (publicId) => {
  if (!publicId) return;
  configureCloudinary();

  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: 'image',
      invalidate: true,
    });
    if (result.result !== 'ok' && result.result !== 'not found') {
      throw new Error(`Unexpected Cloudinary deletion result: ${result.result}`);
    }
  } catch (cause) {
    console.error('Cloudinary profile image deletion failed:', cause.message);
    const error = new Error('Could not remove the previous profile image from Cloudinary');
    error.status = 503;
    throw error;
  }
};

module.exports = {
  handleProfileImageUpload,
  uploadProfileImage,
  deleteProfileImage,
};
