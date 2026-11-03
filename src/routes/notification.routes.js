const express = require('express');
const {
  registerToken,
  unregisterToken,
  sendTest,
  sendToSpecificUser,
} = require('../controllers/notification.controller');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

// All notification management endpoints require authentication
router.post('/token', requireAuth, registerToken);
router.delete('/token', requireAuth, unregisterToken);
router.post('/test', requireAuth, sendTest);
router.post('/send', requireAuth, sendToSpecificUser);

module.exports = router;

