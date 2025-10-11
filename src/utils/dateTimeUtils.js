/**
 * Calculates the number of days between two dates, including both the start and end dates.
 * @param {string|Date} startDate - The start date (can be a Date object or ISO date string)
 * @param {string|Date} endDate - The end date (can be a Date object or ISO date string)
 * @returns {number} The number of days between the two dates, including both start and end dates
 * @throws {Error} If the dates are invalid or if endDate is before startDate
 */
const getDuration = (startDate, endDate) => {
  // Convert inputs to Date objects if they're strings
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Validate dates
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new Error('Invalid date(s) provided');
  }

  // Ensure end date is not before start date
  if (end < start) {
    throw new Error('End date cannot be before start date');
  }

  // Calculate difference in days and add 1 to include both start and end dates
  const diffTime = end - start;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  // Add 1 to include both start and end dates
  return diffDays + 1;
};

export {
  getDuration
};