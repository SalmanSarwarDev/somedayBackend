const User = require('../models/User');
const Routine = require('../models/Routine');
const { PREDEFINED_ROUTINES, getRandomTimeInRange } = require('../config/routines.config');
const { isValidTimeString, isValidTimezone } = require('../utils/timezone');

const createError = (message, status) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

/**
 * Initialize 6 predefined daily routines with randomized logical times for a new user.
 * Idempotent: Skips creation if routines already exist.
 */
const initializeUserRoutines = async (userId, options = {}) => {
  const existingCount = await Routine.countDocuments({ userId }).session(options.session || null);
  if (existingCount > 0) {
    return Routine.find({ userId }).sort({ order: 1 }).session(options.session || null);
  }

  const routinesToCreate = PREDEFINED_ROUTINES.map((routine) => {
    const { startHour, startMinute, endHour, endMinute } = routine.timeRange;
    const randomTime = getRandomTimeInRange(startHour, startMinute, endHour, endMinute);

    return {
      userId,
      routineKey: routine.routineKey,
      title: routine.title,
      description: routine.description,
      time: randomTime,
      order: routine.order,
      isCompleted: false,
      notificationEnabled: true,
      isActive: true,
    };
  });

  return Routine.insertMany(routinesToCreate, options.session ? { session: options.session } : {});
};

/**
 * Get all routines for a user in predefined order.
 */
const getUserRoutines = async (userId) => {
  let routines = await Routine.find({ userId }).sort({ order: 1 });
  if (routines.length === 0) {
    routines = await initializeUserRoutines(userId);
  }
  return routines;
};

/**
 * Update the notification time for a specific routine, and optionally the user's timezone.
 */
const updateRoutineTime = async (userId, routineId, time, timezone) => {
  if (!isValidTimeString(time)) {
    throw createError('Time must be in 24-hour format (HH:mm)', 400);
  }

  const routine = await Routine.findOne({ _id: routineId, userId });
  if (!routine) {
    throw createError('Routine not found', 404);
  }

  routine.time = time.trim();
  await routine.save();

  let updatedTimezone = null;
  if (timezone !== undefined && timezone !== null && timezone !== '') {
    if (!isValidTimezone(timezone)) {
      throw createError('Invalid IANA timezone format (e.g. "Asia/Karachi", "Europe/London")', 400);
    }
    const cleanTz = timezone.trim();
    const user = await User.findByIdAndUpdate(
      userId,
      { timezone: cleanTz },
      { returnDocument: 'after' }
    );
    if (user) {
      updatedTimezone = user.timezone;
    }
  }

  return { routine, timezone: updatedTimezone };
};

/**
 * Toggle notification enabled/disabled for a specific routine.
 */
const updateRoutineNotification = async (userId, routineId, notificationEnabled) => {
  if (typeof notificationEnabled !== 'boolean') {
    throw createError('notificationEnabled must be a boolean value', 400);
  }

  const routine = await Routine.findOne({ _id: routineId, userId });
  if (!routine) {
    throw createError('Routine not found', 404);
  }

  routine.notificationEnabled = notificationEnabled;
  await routine.save();

  return routine;
};

/**
 * Update the isCompleted boolean directly on the Routine document.
 */
const updateRoutineCompletion = async (userId, routineId, isCompleted = true) => {
  const routine = await Routine.findOne({ _id: routineId, userId });
  if (!routine) {
    throw createError('Routine not found', 404);
  }

  routine.isCompleted = Boolean(isCompleted);
  await routine.save();

  return routine;
};

module.exports = {
  initializeUserRoutines,
  getUserRoutines,
  updateRoutineTime,
  updateRoutineNotification,
  updateRoutineCompletion,
};
