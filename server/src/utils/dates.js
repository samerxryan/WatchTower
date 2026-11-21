export function toIsoString(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

/**
 * DATE columns are returned as YYYY-MM-DD by mysql2 (dateStrings: ['DATE']).
 */
export function toDateOnly(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  return String(value).slice(0, 10);
}

export function parseDateTimeInput(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function isOverdue(dueDate, status) {
  if (!dueDate || status === 'DONE') {
    return false;
  }
  const parsed = dueDate instanceof Date ? dueDate : new Date(dueDate);
  return !Number.isNaN(parsed.getTime()) && parsed.getTime() < Date.now();
}

export function isDateOnly(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
