import { describe, expect, it } from 'vitest';
import { formatDate, formatMoney } from '@/lib/format';

describe('formatMoney', () => {
  it.each([
    [85_000.5, 'USD', '$85,000.50'],
    [120_000, 'USD', '$120,000'],
    [2_500_000, 'INR', '₹2,500,000'],
    [4_500_000, 'JPY', '¥4,500,000'],
    [65_000, 'EUR', '€65,000'],
  ])('formats %d %s as %s', (amount, currency, expected) => {
    expect(formatMoney(amount, currency)).toBe(expected);
  });
});

describe('formatDate', () => {
  it('formats an ISO date without shifting it across time zones', () => {
    expect(formatDate('2024-03-01')).toBe('Mar 1, 2024');
  });
});
