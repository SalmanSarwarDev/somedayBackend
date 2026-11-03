const cron = require('node-cron');
const User = require('../models/User');
const Routine = require('../models/Routine');
const { getLocalParts } = require('../utils/timezone');
const { sendToTokens } = require('../services/notification.service');

// In-memory cache to prevent duplicate sends during the same minute without saving logs to DB
const recentlyDispatched = new Map();

/**
 * Checks all active timezones and dispatches push notifications for due routines.
 * Runs on a 1-minute tick ('* * * * *').
 */
const checkAndDispatchRoutineNotifications = async () => {
  try {
    const now = Date.now();

    // Clean up memory cache entries older than 5 minutes
    for (const [key, timestamp] of recentlyDispatched.entries()) {
      if (now - timestamp > 5 * 60 * 1000) {
        recentlyDispatched.delete(key);
      }
    }

    // 1. Find all distinct timezones across active users
    const timezones = await User.distinct('timezone', { status: 'active' });
    if (!timezones.length) return;

    for (const tz of timezones) {
      const { localDate, localTime } = getLocalParts(tz);

      // 2. Find active users in this timezone who have at least one registered FCM token
      const users = await User.find({
        timezone: tz,
        status: 'active',
        'fcmTokens.0': { $exists: true },
      }).select('_id +fcmTokens');

      if (!users.length) continue;

      const userMap = new Map(users.map((u) => [String(u._id), u]));
      const userIds = users.map((u) => u._id);

      // 3. Find routines due at this exact local minute that are NOT completed and have notifications enabled
      const routines = await Routine.find({
        userId: { $in: userIds },
        time: localTime,
        isActive: true,
        notificationEnabled: true,
        isCompleted: false, // Skip if marked as completed
      });

      if (!routines.length) continue;

      // 4. Process each due routine
      for (const routine of routines) {
        const userIdStr = String(routine.userId);
        const dispatchKey = `${routine._id}_${localDate}_${localTime}`;

        // In-memory deduplication check (prevents double sends within the same minute)
        if (recentlyDispatched.has(dispatchKey)) {
          continue;
        }

        recentlyDispatched.set(dispatchKey, now);

        // 5. Gather user tokens and dispatch notification directly
        const user = userMap.get(userIdStr);
        const tokens = (user?.fcmTokens || []).map((t) => t.token).filter(Boolean);

        if (tokens.length > 0) {
          try {
            await sendToTokens({
              tokens,
              title: routine.title,
              body: routine.description,
              data: {
                type: 'routine_reminder',
                routineId: String(routine._id),
                routineKey: routine.routineKey,
              },
            });
            console.log(`[SCHEDULER] Dispatched "${routine.title}" to user ${userIdStr} (${tz} ${localTime})`);
          } catch (sendError) {
            console.error(`[SCHEDULER] Failed to send push for routine ${routine._id}:`, sendError.message);
          }
        }
      }
    }
  } catch (error) {
    console.error('[SCHEDULER] Routine notification cycle error:', error.message);
  }
};

/**
 * Initializes the node-cron scheduler.
 */
const startRoutineScheduler = () => {
  console.log('[SCHEDULER] Timezone-aware Daily Routine Notification Scheduler started.');

  // Schedule tick every minute
  cron.schedule('* * * * *', async () => {
    await checkAndDispatchRoutineNotifications();
  });
};

module.exports = {
  checkAndDispatchRoutineNotifications,
  startRoutineScheduler,
};
