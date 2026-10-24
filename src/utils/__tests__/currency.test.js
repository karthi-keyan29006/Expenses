import {
  formatPaise,
  groupIndian,
  paiseToInputString,
  percentOf,
  rupeesToPaise,
  sanitizeAmountInput,
} from '../currency';

describe('groupIndian', () => {
  it('uses lakh/crore grouping', () => {
    expect(groupIndian('0')).toBe('0');
    expect(groupIndian('999')).toBe('999');
    expect(groupIndian('1000')).toBe('1,000');
    expect(groupIndian('123456')).toBe('1,23,456');
    expect(groupIndian('1234567')).toBe('12,34,567');
    expect(groupIndian('123456789')).toBe('12,34,56,789');
  });
});

describe('rupeesToPaise', () => {
  it('converts rupee strings without floating point drift', () => {
    expect(rupeesToPaise('500.50')).toBe(50050);
    expect(rupeesToPaise('0.29')).toBe(29);
    expect(rupeesToPaise('1.1')).toBe(110);
    expect(rupeesToPaise('30000')).toBe(3000000);
    expect(rupeesToPaise('.5')).toBe(50);
    expect(rupeesToPaise('12.')).toBe(1200);
  });

  it('accepts formatted input', () => {
    expect(rupeesToPaise('₹1,23,456.78')).toBe(12345678);
    expect(rupeesToPaise(' 250 ')).toBe(25000);
  });

  it('accepts numbers', () => {
    expect(rupeesToPaise(500.5)).toBe(50050);
    expect(rupeesToPaise(Number.NaN)).toBeNaN();
  });

  it('rejects invalid input', () => {
    expect(rupeesToPaise('')).toBeNaN();
    expect(rupeesToPaise('.')).toBeNaN();
    expect(rupeesToPaise('abc')).toBeNaN();
    expect(rupeesToPaise('1.234')).toBeNaN();
    expect(rupeesToPaise('-5')).toBeNaN();
    expect(rupeesToPaise(null)).toBeNaN();
  });
});

describe('formatPaise', () => {
  it('formats with the rupee symbol and Indian grouping', () => {
    expect(formatPaise(0)).toBe('₹0');
    expect(formatPaise(50050)).toBe('₹500.50');
    expect(formatPaise(3000000)).toBe('₹30,000');
    expect(formatPaise(12345678)).toBe('₹1,23,456.78');
    expect(formatPaise(105)).toBe('₹1.05');
  });

  it('handles negatives and signs', () => {
    expect(formatPaise(-850000)).toBe('-₹8,500');
    expect(formatPaise(850000, { showSign: true })).toBe('+₹8,500');
    expect(formatPaise(0, { showSign: true })).toBe('₹0');
  });

  it('can force decimals', () => {
    expect(formatPaise(50000, { alwaysDecimals: true })).toBe('₹500.00');
  });
});

describe('paiseToInputString', () => {
  it('produces values suitable for pre-filling an input', () => {
    expect(paiseToInputString(50000)).toBe('500');
    expect(paiseToInputString(50050)).toBe('500.50');
    expect(paiseToInputString(5)).toBe('0.05');
  });
});

describe('sanitizeAmountInput', () => {
  it('keeps only digits and a single decimal point with two decimals', () => {
    expect(sanitizeAmountInput('12a3')).toBe('123');
    expect(sanitizeAmountInput('1.2.3')).toBe('1.23');
    expect(sanitizeAmountInput('1.234')).toBe('1.23');
    expect(sanitizeAmountInput('₹ 99')).toBe('99');
  });
});

describe('percentOf', () => {
  it('is safe with a zero denominator', () => {
    expect(percentOf(50, 0)).toBe(0);
    expect(percentOf(850000, 3000000, 1)).toBe(28.3);
    expect(percentOf(1, 3)).toBe(33);
  });
});
