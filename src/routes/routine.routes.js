const express = require('express');
const {
  getRoutines,
  changeRoutineTime,
  toggleRoutineNotification,
  completeRoutine,
} = require('../controllers/routine.controller');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

// All routine endpoints require authentication
router.use(requireAuth);

router.get('/', getRoutines);
router.patch('/:id/time', changeRoutineTime);
router.patch('/:id/notification', toggleRoutineNotification);
router.patch('/:id/complete', completeRoutine);

module.exports = router;
