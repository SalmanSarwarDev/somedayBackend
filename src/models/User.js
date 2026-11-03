const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, trim: true, required: true, maxlength: 80 },
    lastName: { type: String, trim: true, required: true, maxlength: 80 },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      required: true,
      unique: true,
      match: /^\S+@\S+\.\S+$/,
    },
    password: {
      type: String,
      minlength: 8,
      select: false,
      required() {
        return this.authProviders.includes('password');
      },
    },
    authProviders: {
      type: [{ type: String, enum: ['password', 'google'] }],
      default: ['password'],
    },
    firebaseUid: { type: String, unique: true, sparse: true, select: false },
    emailVerified: { type: Boolean, default: false },
    emailVerificationCodeHash: { type: String, select: false },
    emailVerificationExpiresAt: { type: Date, select: false },
    emailVerificationLastSentAt: { type: Date, select: false },
    emailVerificationAttempts: { type: Number, default: 0, select: false },
    passwordResetCodeHash: { type: String, select: false },
    passwordResetExpiresAt: { type: Date, select: false },
    passwordResetLastSentAt: { type: Date, select: false },
    passwordResetAttempts: { type: Number, default: 0, select: false },
    fcmTokens: {
      type: [
        {
          token: { type: String, required: true, trim: true },
          device: { type: String, trim: true, default: 'web' },
          updatedAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
      select: false,
    },
    timezone: {
      type: String,
      trim: true,
      default: 'Asia/Karachi',
    },
    phone: { type: String, trim: true, default: '' },
    avatar: { type: String, default: '' },
    avatarPublicId: { type: String, default: '', select: false },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  {
    collection: 'User',
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform: (_document, value) => {
        value.id = String(value._id);
        delete value._id;
        delete value.password;
        delete value.fcmTokens;
        return value;
      },
    },
  }
);

userSchema.pre('save', async function hashPassword() {
  if (this.isModified('password') && this.password) {
    this.password = await bcrypt.hash(this.password, 12);
  }
});

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
