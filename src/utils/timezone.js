/**
 * Timezone validation and local date/time utilities.
 */

const isValidTimezone = (tz) => {
  if (typeof tz !== 'string' || !tz.trim()) return false;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz.trim() });
    return true;
  } catch (_error) {
    return false;
  }
};

const isValidTimeString = (timeStr) => (
  typeof timeStr === 'string' && /^([01]\d|2[0-3]):([0-5]\d)$/.test(timeStr.trim())
);

/**
 * Returns the current date (YYYY-MM-DD) and time (HH:mm) in a given IANA timezone.
 */
const getLocalParts = (timezone, date = new Date()) => {
  const tz = isValidTimezone(timezone) ? timezone.trim() : 'Asia/Karachi';

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });

  const parts = formatter.formatToParts(date);
  const partMap = {};
  for (const part of parts) {
    partMap[part.type] = part.value;
  }

  const localDate = `${partMap.year}-${partMap.month}-${partMap.day}`;
  const localTime = `${partMap.hour}:${partMap.minute}`;

  return { localDate, localTime };
};

module.exports = {
  isValidTimezone,
  isValidTimeString,
  getLocalParts,
};

