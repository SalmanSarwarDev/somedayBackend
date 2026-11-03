const {
  getUserRoutines,
  updateRoutineTime,
  updateRoutineNotification,
  updateRoutineCompletion,
} = require('../services/routine.service');

const sendError = (res, error) => {
  const status = error.status || 500;
  if (status >= 500) console.error('Routine controller error:', error.message);
  return res.status(status).json({
    succeeded: false,
    message: status >= 500 ? 'Internal routine processing error' : error.message,
  });
};

const getRoutines = async (req, res) => {
  try {
    const data = await getUserRoutines(req.userId);
    return res.json({
      succeeded: true,
      message: 'Routines retrieved successfully',
      data: { routines: data },
    });
  } catch (error) {
    return sendError(res, error);
  }
};

const changeRoutineTime = async (req, res) => {
  try {
    const { time, timezone } = req.body || {};
    const result = await updateRoutineTime(req.userId, req.params.id, time, timezone);
    return res.json({
      succeeded: true,
      message: 'Routine time updated successfully',
      data: {
        routine: result.routine,
        ...(result.timezone ? { timezone: result.timezone } : {}),
      },
    });
  } catch (error) {
    return sendError(res, error);
  }
};

const toggleRoutineNotification = async (req, res) => {
  try {
    const { notificationEnabled } = req.body || {};
    const routine = await updateRoutineNotification(req.userId, req.params.id, notificationEnabled);
    return res.json({
      succeeded: true,
      message: `Notification ${routine.notificationEnabled ? 'enabled' : 'disabled'} successfully`,
      data: { routine },
    });
  } catch (error) {
    return sendError(res, error);
  }
};

const completeRoutine = async (req, res) => {
  try {
    const isCompleted = req.body && req.body.isCompleted !== undefined ? req.body.isCompleted : true;
    const routine = await updateRoutineCompletion(req.userId, req.params.id, isCompleted);
    return res.json({
      succeeded: true,
      message: `Routine marked as ${routine.isCompleted ? 'completed' : 'incomplete'}`,
      data: { routine },
    });
  } catch (error) {
    return sendError(res, error);
  }
};

module.exports = {
  getRoutines,
  changeRoutineTime,
  toggleRoutineNotification,
  completeRoutine,
};
