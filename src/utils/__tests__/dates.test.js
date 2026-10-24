import {
  addMonths,
  daysBetween,
  formatDateLabel,
  formatMonthLabel,
  isValidIsoDate,
  isValidMonth,
  lastNMonths,
  monthOf,
  monthRange,
  monthsBetween,
  parseIsoDate,
  toIsoDate,
} from '../dates';

describe('toIsoDate / parseIsoDate', () => {
  it('round-trips local dates without time zone shifts', () => {
    const date = new Date(2026, 9, 24, 23, 30); // 24 Oct 2026, late evening local time
    expect(toIsoDate(date)).toBe('2026-10-24');
    expect(parseIsoDate('2026-10-24')).toEqual(new Date(2026, 9, 24));
  });

  it('rejects impossible dates', () => {
    expect(parseIsoDate('2026-02-31')).toBeNull();
    expect(parseIsoDate('2026-13-01')).toBeNull();
    expect(parseIsoDate('24-10-2026')).toBeNull();
    expect(isValidIsoDate('2026-02-28')).toBe(true);
    expect(isValidIsoDate('')).toBe(false);
  });
});

describe('months', () => {
  it('validates month strings', () => {
    expect(isValidMonth('2026-10')).toBe(true);
    expect(isValidMonth('2026-13')).toBe(false);
    expect(isValidMonth('2026-1')).toBe(false);
  });

  it('adds and subtracts months across year boundaries', () => {
    expect(addMonths('2026-10', 1)).toBe('2026-11');
    expect(addMonths('2026-12', 1)).toBe('2027-01');
    expect(addMonths('2026-01', -1)).toBe('2025-12');
    expect(addMonths('2026-01', -13)).toBe('2024-12');
  });

  it('builds half-open ranges for SQL filters', () => {
    expect(monthRange('2026-10')).toEqual({ start: '2026-10-01', end: '2026-11-01' });
    expect(monthRange('2026-12')).toEqual({ start: '2026-12-01', end: '2027-01-01' });
    expect(() => monthRange('nope')).toThrow();
  });

  it('lists trailing months in ascending order', () => {
    expect(lastNMonths('2026-02', 3)).toEqual(['2025-12', '2026-01', '2026-02']);
  });

  it('extracts the month of a date', () => {
    expect(monthOf('2026-10-24')).toBe('2026-10');
  });

  it('counts months between', () => {
    expect(monthsBetween('2026-10', '2027-03')).toBe(5);
    expect(monthsBetween('2026-10', '2026-08')).toBe(-2);
  });
});

describe('labels', () => {
  it('formats months and dates for display', () => {
    expect(formatMonthLabel('2026-10')).toBe('October 2026');
    expect(formatMonthLabel('2026-10', { short: true })).toBe('Oct 2026');
    expect(formatDateLabel('2026-10-05')).toBe('5 Oct 2026');
    expect(formatDateLabel('2026-10-05', { withYear: false })).toBe('5 Oct');
  });
});

describe('daysBetween', () => {
  it('counts whole days in either direction', () => {
    expect(daysBetween('2026-10-24', '2026-10-31')).toBe(7);
    expect(daysBetween('2026-10-31', '2026-10-24')).toBe(-7);
    expect(daysBetween('2026-03-01', '2026-04-01')).toBe(31);
    expect(daysBetween('bad', '2026-04-01')).toBeNull();
  });
});
