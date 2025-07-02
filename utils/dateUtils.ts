// utils/dateUtils.ts
export function getIsoWeek(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  // Thursday in current week decides the year and week number
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
  // January 4 is always in week 1.
  const week1 = new Date(d.getFullYear(), 0, 4);
  // Adjust to Thursday in week 1 and count number of weeks from date to week1.
  return `${d.getFullYear()}-W${String(
    1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7)
  ).padStart(2, '0')}`;
}

export function getWeekDates(isoWeek: string): { startDate: Date; endDate: Date } {
  const [yearStr, weekPart] = isoWeek.split('-W');
  const year = parseInt(yearStr, 10);
  const week = parseInt(weekPart, 10);

  // Create a date for January 1st of the given year.
  // The 1st of January can be in week 52 or 53 of the previous year, or in week 1 of the current year.
  // A week is in a year if its Thursday is in that year.
  
  // Find the date of the first day of the first ISO week of the year
  const firstDayOfYear = new Date(Date.UTC(year, 0, 1));
  const dayOfWeekJan1 = firstDayOfYear.getUTCDay(); // 0 (Sun) to 6 (Sat)
  
  // Calculate offset to the first Monday of the ISO year.
  // ISO 8601 week starts on Monday. Day 1 is Monday.
  // If Jan 1 is Mon (1), Tue (2), Wed (3), Thu (4), then it's in week 1.
  // If Jan 1 is Fri (5), Sat (6), Sun (0), then it's in week 52/53 of previous year.
  let daysToFirstIsoWeekDay = 1 - dayOfWeekJan1;
  if (dayOfWeekJan1 > 4) { // If Jan 1st is Fri, Sat, Sun
    daysToFirstIsoWeekDay += 7;
  }

  // Date of the Monday of week 1
  const mondayOfWeek1 = new Date(Date.UTC(year, 0, 1 + daysToFirstIsoWeekDay));

  // Calculate the Monday of the target week
  const targetMonday = new Date(mondayOfWeek1);
  targetMonday.setUTCDate(mondayOfWeek1.getUTCDate() + (week - 1) * 7);

  const targetSunday = new Date(targetMonday);
  targetSunday.setUTCDate(targetMonday.getUTCDate() + 6);
  
  // Ensure times are at the very start/end of the day UTC for proper comparison
  targetMonday.setUTCHours(0,0,0,0);
  targetSunday.setUTCHours(23,59,59,999);

  return { startDate: targetMonday, endDate: targetSunday };
}
