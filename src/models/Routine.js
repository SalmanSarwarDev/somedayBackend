const mongoose = require('mongoose');

const routineSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    routineKey: {
      type: String,
      required: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    time: {
      type: String,
      required: true,
      match: /^([01]\d|2[0-3]):([0-5]\d)$/, // HH:mm format
    },
    order: {
      type: Number,
      required: true,
      default: 0,
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
    notificationEnabled: {
      type: Boolean,
      default: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    collection: 'Routine',
    versionKey: false,
    toJSON: {
      transform: (_document, value) => {
        value.id = String(value._id);
        delete value._id;
        return value;
      },
    },
  }
);

// Prevent duplicate routines with same routineKey for the same user
routineSchema.index({ userId: 1, routineKey: 1 }, { unique: true });
// Optimize scheduler search by time, active status, completion status, and notifications
routineSchema.index({ time: 1, isActive: 1, notificationEnabled: 1, isCompleted: 1 });

module.exports = mongoose.models.Routine || mongoose.model('Routine', routineSchema);
