const {
  registerDeviceToken,
  unregisterDeviceToken,
  sendTestNotification,
  sendToUser,
  sendTestNotificationWithCron,
} = require('../services/notification.service');

const sendError = (res, error) => {
  const status = error.status || 500;
  if (status >= 500) console.error('Notification operation failed:', error.message);
  return res.status(status).json({
    succeeded: false,
    message: status >= 500 ? 'Notification operation failed' : error.message,
  });
};

const registerToken = async (req, res) => {
  try {
    const data = await registerDeviceToken(req.userId, req.body);
    return res.json({ succeeded: true, ...data });
  } catch (error) {
    return sendError(res, error);
  }
};

const unregisterToken = async (req, res) => {
  try {
    const data = await unregisterDeviceToken(req.userId, req.body);
    return res.json({ succeeded: true, ...data });
  } catch (error) {
    return sendError(res, error);
  }
};

const sendTest = async (req, res) => {
  try {
    const data = await sendTestNotification(req.userId, req.body);
    return res.json({ succeeded: true, ...data });
  } catch (error) {
    return sendError(res, error);
  }
};

const sendToSpecificUser = async (req, res) => {
  try {
    const { targetUserId, title, body, data, imageUrl } = req.body || {};
    if (!targetUserId || !title || !body) {
      return res.status(400).json({
        succeeded: false,
        message: 'targetUserId, title, and body are required',
      });
    }
    const result = await sendToUser(targetUserId, { title, body, data, imageUrl });
    return res.json({ succeeded: true, ...result });
  } catch (error) {
    return sendError(res, error);
  }
};

module.exports = {
  registerToken,
  unregisterToken,
  sendTest,
  sendToSpecificUser,
  sendTestNotificationWithCron,
};
