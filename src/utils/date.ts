/**
 * Date utility functions for handling date formatting
 */

/**
 * Format a Date object to YYYY-MM-DD string in LOCAL timezone
 * This avoids timezone conversion issues that occur with toISOString()
 */
export function formatDateToLocalString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse a date string (YYYY-MM-DD) to a Date object at midnight LOCAL time
 * This avoids timezone conversion issues that occur with new Date(string)
 */
export function parseDateString(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}
