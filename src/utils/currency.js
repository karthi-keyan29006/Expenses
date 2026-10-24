// All monetary values are stored as integer paise (₹1 = 100 paise) to avoid
// floating-point rounding errors. These helpers convert between the user-facing
// rupee strings and the stored paise integers.

export const RUPEE_SYMBOL = '₹';

const AMOUNT_PATTERN = /^(\d+)?(\.(\d{0,2})?)?$/;

/**
 * Groups an integer string using the Indian numbering system
 * (last three digits, then groups of two): 1234567 -> "12,34,567".
 */
export function groupIndian(intString) {
  const digits = String(intString).replace(/\D/g, '') || '0';
  if (digits.length <= 3) {
    return digits;
  }
  const last3 = digits.slice(-3);
  let rest = digits.slice(0, -3);
  const parts = [];
  while (rest.length > 2) {
    parts.unshift(rest.slice(-2));
    rest = rest.slice(0, -2);
  }
  if (rest) {
    parts.unshift(rest);
  }
  return `${parts.join(',')},${last3}`;
}

/**
 * Converts a rupee amount (string or number) into integer paise.
 * Returns NaN when the input is not a valid amount with at most two decimals.
 */
export function rupeesToPaise(input) {
  if (typeof input === 'number') {
    if (!Number.isFinite(input)) {
      return NaN;
    }
    const paise = Math.round(input * 100);
    return Number.isSafeInteger(paise) ? paise : NaN;
  }
  const text = String(input ?? '')
    .trim()
    .replace(/[₹,\s]/g, '');
  if (text === '' || text === '.') {
    return NaN;
  }
  const match = AMOUNT_PATTERN.exec(text);
  if (!match) {
    return NaN;
  }
  const whole = match[1] || '0';
  const fraction = (match[3] || '').padEnd(2, '0');
  const paise = Number(whole) * 100 + Number(fraction);
  return Number.isSafeInteger(paise) ? paise : NaN;
}

/** Converts paise to a plain rupee number (e.g. 50050 -> 500.5). */
export function paiseToRupees(paise) {
  return (Number(paise) || 0) / 100;
}

/**
 * Converts paise to a plain string suitable for pre-filling a text input
 * (e.g. 50050 -> "500.50", 50000 -> "500").
 */
export function paiseToInputString(paise) {
  const value = Math.round(Number(paise) || 0);
  const abs = Math.abs(value);
  const rupees = Math.floor(abs / 100);
  const fraction = abs % 100;
  const sign = value < 0 ? '-' : '';
  if (fraction === 0) {
    return `${sign}${rupees}`;
  }
  return `${sign}${rupees}.${String(fraction).padStart(2, '0')}`;
}

/**
 * Formats paise for display using the rupee symbol and Indian grouping:
 * 12345678 -> "₹1,23,456.78", 50000 -> "₹500".
 */
export function formatPaise(paise, { showSign = false, alwaysDecimals = false } = {}) {
  const value = Number.isFinite(Number(paise)) ? Math.round(Number(paise)) : 0;
  const negative = value < 0;
  const abs = Math.abs(value);
  const rupees = Math.floor(abs / 100);
  const fraction = abs % 100;
  let text = `${RUPEE_SYMBOL}${groupIndian(String(rupees))}`;
  if (fraction > 0 || alwaysDecimals) {
    text += `.${String(fraction).padStart(2, '0')}`;
  }
  if (negative) {
    return `-${text}`;
  }
  if (showSign && value > 0) {
    return `+${text}`;
  }
  return text;
}

/**
 * Keeps only characters that can form a valid rupee amount while the user is
 * typing: digits and a single decimal point with at most two decimals.
 */
export function sanitizeAmountInput(text) {
  let cleaned = String(text ?? '').replace(/[^0-9.]/g, '');
  const firstDot = cleaned.indexOf('.');
  if (firstDot !== -1) {
    const whole = cleaned.slice(0, firstDot);
    const fraction = cleaned.slice(firstDot + 1).replace(/\./g, '').slice(0, 2);
    cleaned = `${whole}.${fraction}`;
  }
  return cleaned;
}

/** Percentage helper that is safe when the denominator is zero. */
export function percentOf(part, total, decimals = 0) {
  if (!total || total <= 0) {
    return 0;
  }
  const factor = 10 ** decimals;
  return Math.round((part / total) * 100 * factor) / factor;
}
