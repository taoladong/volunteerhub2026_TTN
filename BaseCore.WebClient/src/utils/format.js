/**
 * Shared formatting utilities – import from here instead of copy-pasting.
 */

/**
 * Format a date string/object to Vietnamese date (dd/mm/yyyy).
 */
export function fmt(dt) {
  if (!dt) return '';
  return parseApiDate(dt).toLocaleDateString('vi-VN');
}

/**
 * Format a date string/object to Vietnamese datetime (dd/mm/yyyy HH:mm).
 */
export function fmtDateTime(dt) {
  if (!dt) return '';
  return parseApiDate(dt).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format a date string/object to Vietnamese time (HH:mm).
 */
export function fmtTime(dt) {
  if (!dt) return '';
  return parseApiDate(dt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Format a number as Vietnamese currency (e.g. 1.000.000đ).
 */
export function money(value) {
  return new Intl.NumberFormat('vi-VN').format(Number(value) || 0) + 'đ';
}

/**
 * Backend DateTime values can be serialized without a timezone suffix while
 * still being stored and compared as UTC. Parse those values as UTC so all UI
 * displays and datetime-local bounds use the same clock.
 */
export function parseApiDate(dt) {
  if (dt instanceof Date) return dt;
  const raw = String(dt);
  const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(raw);
  return new Date(hasTimezone ? raw : `${raw}Z`);
}

/**
 * Convert an ISO date string to value suitable for <input type="datetime-local">.
 * Adjusts for local timezone offset.
 */
export function toDateTimeLocal(dt) {
  if (!dt) return '';
  const date = parseApiDate(dt);
  if (!Number.isFinite(date.getTime())) return '';
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 16);
}
