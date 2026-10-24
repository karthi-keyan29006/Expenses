// Dates are stored as ISO strings: "YYYY-MM-DD" for transactions and "YYYY-MM"
// for months. All helpers work in the device's local time zone so that a
// transaction entered "today" is never shifted to a different day.

export const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
export const MONTH_PATTERN = /^(\d{4})-(\d{2})$/;

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function pad2(value) {
  return String(value).padStart(2, '0');
}

/** Formats a JS Date as a local "YYYY-MM-DD" string. */
export function toIsoDate(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/** Formats a JS Date as a local "YYYY-MM" string. */
export function toMonthString(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;
}

/** Parses a "YYYY-MM-DD" string into a local JS Date (midnight). */
export function parseIsoDate(iso) {
  const match = DATE_PATTERN.exec(String(iso ?? ''));
  if (!match) {
    return null;
  }
  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  if (
    date.getFullYear() !== Number(year) ||
    date.getMonth() !== Number(month) - 1 ||
    date.getDate() !== Number(day)
  ) {
    return null; // e.g. 2026-02-31
  }
  return date;
}

export function isValidIsoDate(iso) {
  return parseIsoDate(iso) !== null;
}

export function isValidMonth(month) {
  const match = MONTH_PATTERN.exec(String(month ?? ''));
  if (!match) {
    return false;
  }
  const value = Number(match[2]);
  return value >= 1 && value <= 12;
}

export function todayIso() {
  return toIsoDate(new Date());
}

export function currentMonth() {
  return toMonthString(new Date());
}

/** "2026-10-24" -> "2026-10". */
export function monthOf(isoDate) {
  return String(isoDate ?? '').slice(0, 7);
}

/** Adds (or subtracts) whole months to a "YYYY-MM" string. */
export function addMonths(month, delta) {
  const match = MONTH_PATTERN.exec(month);
  if (!match) {
    throw new Error(`Invalid month: ${month}`);
  }
  const total = Number(match[1]) * 12 + (Number(match[2]) - 1) + delta;
  const year = Math.floor(total / 12);
  const monthIndex = ((total % 12) + 12) % 12;
  return `${year}-${pad2(monthIndex + 1)}`;
}

/**
 * Returns the inclusive start and exclusive end dates for a month, suitable
 * for `date >= start AND date < end` SQL filters.
 */
export function monthRange(month) {
  if (!isValidMonth(month)) {
    throw new Error(`Invalid month: ${month}`);
  }
  return {
    start: `${month}-01`,
    end: `${addMonths(month, 1)}-01`,
  };
}

/** Returns an ascending list of the `count` months ending at `month`. */
export function lastNMonths(month, count) {
  const months = [];
  for (let offset = count - 1; offset >= 0; offset -= 1) {
    months.push(addMonths(month, -offset));
  }
  return months;
}

export function compareMonths(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** "2026-10" -> "October 2026" (or "Oct 2026" when short). */
export function formatMonthLabel(month, { short = false } = {}) {
  const match = MONTH_PATTERN.exec(month);
  if (!match) {
    return String(month ?? '');
  }
  const name = MONTH_NAMES[Number(match[2]) - 1] ?? match[2];
  return `${short ? name.slice(0, 3) : name} ${match[1]}`;
}

/** "2026-10" -> "Oct". */
export function formatMonthShort(month) {
  const match = MONTH_PATTERN.exec(month);
  if (!match) {
    return String(month ?? '');
  }
  return (MONTH_NAMES[Number(match[2]) - 1] ?? match[2]).slice(0, 3);
}

/** "2026-10-24" -> "24 Oct 2026". */
export function formatDateLabel(iso, { withYear = true } = {}) {
  const match = DATE_PATTERN.exec(String(iso ?? ''));
  if (!match) {
    return String(iso ?? '');
  }
  const monthName = (MONTH_NAMES[Number(match[2]) - 1] ?? match[2]).slice(0, 3);
  const day = Number(match[3]);
  return withYear ? `${day} ${monthName} ${match[1]}` : `${day} ${monthName}`;
}

/** Formats an ISO timestamp (e.g. from JSON backups) for display. */
export function formatDateTimeLabel(isoTimestamp) {
  const date = new Date(isoTimestamp);
  if (Number.isNaN(date.getTime())) {
    return String(isoTimestamp ?? '');
  }
  return `${formatDateLabel(toIsoDate(date))}, ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

/** Whole days from `fromIso` to `toIso` (negative when `toIso` is earlier). */
export function daysBetween(fromIso, toIso) {
  const from = parseIsoDate(fromIso);
  const to = parseIsoDate(toIso);
  if (!from || !to) {
    return null;
  }
  const fromUtc = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const toUtc = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((toUtc - fromUtc) / 86400000);
}

/** Whole months from one "YYYY-MM" to another (negative when earlier). */
export function monthsBetween(fromMonth, toMonth) {
  const from = MONTH_PATTERN.exec(fromMonth);
  const to = MONTH_PATTERN.exec(toMonth);
  if (!from || !to) {
    return null;
  }
  return (Number(to[1]) - Number(from[1])) * 12 + (Number(to[2]) - Number(from[2]));
}
