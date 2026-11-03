const firebaseAdmin = require('../config/firebase');
const User = require('../models/User');

const createError = (message, status) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

/**
 * Register or update an FCM device token for a user.
 */
const registerDeviceToken = async (userId, { token, device = 'web' } = {}) => {
  if (typeof token !== 'string' || !token.trim()) {
    throw createError('A valid FCM token string is required', 400);
  }

  const cleanToken = token.trim();
  const cleanDevice = typeof device === 'string' && device.trim() ? device.trim().toLowerCase() : 'web';

  // 1. Remove this token if it was previously registered to any account (e.g. user switch)
  await User.updateMany(
    { 'fcmTokens.token': cleanToken },
    { $pull: { fcmTokens: { token: cleanToken } } }
  );

  // 2. Add to current user's tokens
  const user = await User.findByIdAndUpdate(
    userId,
    {
      $push: {
        fcmTokens: {
          token: cleanToken,
          device: cleanDevice,
          updatedAt: new Date(),
        },
      },
    },
    { returnDocument: 'after' }
  );

  if (!user) {
    throw createError('User not found', 404);
  }

  return {
    message: 'Device token registered successfully',
    device: cleanDevice,
  };
};

/**
 * Remove an FCM device token (e.g., on logout).
 */
const unregisterDeviceToken = async (userId, { token } = {}) => {
  if (typeof token !== 'string' || !token.trim()) {
    throw createError('A valid FCM token is required to unregister', 400);
  }

  await User.findByIdAndUpdate(userId, {
    $pull: { fcmTokens: { token: token.trim() } },
  });

  return { message: 'Device token unregistered successfully' };
};

/**
 * Multicast notification sender with automatic dead/invalid token pruning.
 */
const sendToTokens = async ({ tokens, title, body, data = {}, imageUrl = '' }) => {
  if (!Array.isArray(tokens) || tokens.length === 0) {
    return { successCount: 0, failureCount: 0, prunedCount: 0 };
  }

  // Deduplicate tokens
  const uniqueTokens = [...new Set(tokens.filter((t) => typeof t === 'string' && t.trim()))];
  if (uniqueTokens.length === 0) {
    return { successCount: 0, failureCount: 0, prunedCount: 0 };
  }

  const stringData = {};
  for (const [key, value] of Object.entries(data)) {
    stringData[key] = String(value);
  }

  let totalSuccess = 0;
  let totalFailure = 0;
  const invalidTokens = [];
  const responses = [];

  // Firebase supports maximum 500 tokens per multicast batch
  for (let i = 0; i < uniqueTokens.length; i += 500) {
    const batch = uniqueTokens.slice(i, i + 500);

    const payload = {
      notification: {
        title,
        body,
        ...(imageUrl ? { imageUrl } : {}),
      },
      data: stringData,
      tokens: batch,
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'default',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
      webpush: {
        notification: {
          title,
          body,
          icon: imageUrl || '/favicon.ico',
        },
      },
    };

    const response = await firebaseAdmin.messaging().sendEachForMulticast(payload);
    totalSuccess += response.successCount;
    totalFailure += response.failureCount;

    response.responses.forEach((resp, index) => {
      responses.push({
        token: batch[index],
        success: resp.success,
        messageId: resp.messageId || null,
        error: resp.error ? resp.error.code : null,
      });

      if (!resp.success) {
        const errorCode = resp.error?.code;
        if (
          errorCode === 'messaging/registration-token-not-registered'
          || errorCode === 'messaging/invalid-registration-token'
          || errorCode === 'messaging/invalid-argument'
        ) {
          invalidTokens.push(batch[index]);
        }
      }
    });
  }

  // Clean up invalid or expired tokens automatically
  if (invalidTokens.length > 0) {
    await User.updateMany(
      { 'fcmTokens.token': { $in: invalidTokens } },
      { $pull: { fcmTokens: { token: { $in: invalidTokens } } } }
    );
  }

  return {
    total: uniqueTokens.length,
    successCount: totalSuccess,
    failureCount: totalFailure,
    prunedCount: invalidTokens.length,
    responses,
  };
};

/**
 * Send notification to a specific user by userId.
 */
const sendToUser = async (userId, { title, body, data = {}, imageUrl = '' }) => {
  const user = await User.findById(userId).select('+fcmTokens');
  if (!user) {
    throw createError('User not found', 404);
  }

  const tokens = (user.fcmTokens || []).map((t) => t.token);
  if (tokens.length === 0) {
    return {
      delivered: false,
      message: 'User has no registered active device tokens',
      results: null,
    };
  }

  const results = await sendToTokens({ tokens, title, body, data, imageUrl });
  return {
    delivered: results.successCount > 0,
    results,
  };
};

/**
 * Send test notification to the authenticated user's registered devices or a provided test token.
 */
const sendTestNotification = async (userId, input = {}) => {
  const { token, title, body, imageUrl } = input && typeof input === 'object' ? input : {};

  const notificationTitle = title || 'Someday Test Notification 🔔';
  const notificationBody = body || `Hello! Push notifications are working perfectly at ${new Date().toLocaleTimeString()}.`;

  // If a direct token was specified, test directly with it
  if (typeof token === 'string' && token.trim()) {
    const results = await sendToTokens({
      tokens: [token.trim()],
      title: notificationTitle,
      body: notificationBody,
      data: { type: 'test_notification', timestamp: String(Date.now()) },
      imageUrl,
    });
    return {
      message: results.successCount > 0
        ? 'Test notification sent successfully'
        : 'Failed to send notification to the provided token',
      results,
    };
  }

  // Otherwise, send to all tokens registered for this user
  const user = await User.findById(userId).select('+fcmTokens');
  if (!user) {
    throw createError('User not found', 404);
  }

  const tokens = (user.fcmTokens || []).map((t) => t.token);
  if (tokens.length === 0) {
    throw createError(
      'No registered devices found for this account. Register a device token first via POST /api/notifications/token or provide a "token" field in this request.',
      400
    );
  }

  const results = await sendToTokens({
    tokens,
    title: notificationTitle,
    body: notificationBody,
    data: { type: 'test_notification', timestamp: String(Date.now()) },
    imageUrl,
  });

  return {
    message: results.successCount > 0
      ? `Test notification sent to ${results.successCount} device(s)`
      : 'Notification delivery failed for all registered devices',
    results,
  };
};

/**
 * Cron worker function to broadcast a periodic test notification
 * to all registered devices in MongoDB.
 */
const sendTestNotificationWithCron = async () => {
  try {
    const users = await User.find({
      fcmTokens: { $exists: true, $ne: [] }
    }).select('+fcmTokens');

    const tokens = users.flatMap((user) =>
      (user.fcmTokens || [])
        .map((item) => item.token)
        .filter(Boolean)
    );

    if (!tokens.length) {
      console.log('[NODE-CRON] No FCM device tokens found to send.');
      return;
    }

    console.log(`[NODE-CRON] Total tokens found: ${tokens.length}`);

    const result = await sendToTokens({
      tokens,
      title: 'Someday Routine Cron ⏰',
      body: `This is a scheduled cron push notification at ${new Date().toLocaleTimeString()}!`,
      data: { type: 'cron_routine_test' },
    });

    console.log(
      `[NODE-CRON] Cron notification finished: Success: ${result.successCount}, Failed: ${result.failureCount}, Pruned: ${result.prunedCount}`
    );
  } catch (error) {
    console.error('[NODE-CRON] Notification Error:', error.message);
  }
};

module.exports = {
  registerDeviceToken,
  unregisterDeviceToken,
  sendToTokens,
  sendToUser,
  sendTestNotification,
  sendTestNotificationWithCron,
};
