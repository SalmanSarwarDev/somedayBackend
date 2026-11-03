/**
 * Predefined daily routines configuration.
 * Order and routine keys are fixed.
 * Time ranges are non-overlapping to ensure logical daily sequencing.
 */
const PREDEFINED_ROUTINES = [
  {
    order: 1,
    routineKey: 'morning',
    title: 'Morning Routine',
    description: 'Start your day with mindfulness, hydration, and light stretching.',
    timeRange: { startHour: 6, startMinute: 0, endHour: 7, endMinute: 0 },
  },
  {
    order: 2,
    routineKey: 'coffee',
    title: 'Coffee Time',
    description: 'Enjoy your morning brew and plan your day ahead.',
    timeRange: { startHour: 7, startMinute: 30, endHour: 9, endMinute: 30 },
  },
  {
    order: 3,
    routineKey: 'lunch',
    title: 'Lunch Break',
    description: 'Nourish your body and take a wholesome pause from work.',
    timeRange: { startHour: 12, startMinute: 0, endHour: 13, endMinute: 45 },
  },
  {
    order: 4,
    routineKey: 'tea',
    title: 'Afternoon Tea',
    description: 'Refresh and recharge with a warm cup of tea or healthy snack.',
    timeRange: { startHour: 16, startMinute: 0, endHour: 17, endMinute: 30 },
  },
  {
    order: 5,
    routineKey: 'dinner',
    title: 'Dinner Time',
    description: 'Savor a balanced evening meal with family or friends.',
    timeRange: { startHour: 19, startMinute: 30, endHour: 21, endMinute: 0 },
  },
  {
    order: 6,
    routineKey: 'bedtime',
    title: 'Bedtime Preparation',
    description: 'Wind down, disconnect from screens, and prepare for restful sleep.',
    timeRange: { startHour: 22, startMinute: 0, endHour: 23, endMinute: 30 },
  },
];

/**
 * Generates a random HH:mm time within a given window, stepped by 5-minute intervals.
 */
const getRandomTimeInRange = (startHour, startMinute, endHour, endMinute) => {
  const startTotal = startHour * 60 + startMinute;
  const endTotal = endHour * 60 + endMinute;
  const step = 5;
  const steps = Math.floor((endTotal - startTotal) / step);
  const randomStep = Math.floor(Math.random() * (steps + 1));
  const chosenTotal = startTotal + randomStep * step;

  const hours = Math.floor(chosenTotal / 60);
  const minutes = chosenTotal % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

module.exports = {
  PREDEFINED_ROUTINES,
  getRandomTimeInRange,
};

