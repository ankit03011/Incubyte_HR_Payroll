import { describe, expect, it } from 'vitest';
import {
  formatCompactCount,
  formatCompactUsd,
  formatDate,
  formatMoney,
  formatRatio,
} from '@/lib/format';

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

describe('formatCompactUsd', () => {
  it.each([
    [0, '$0'],
    [20_000, '$20K'],
    [1_500_000, '$1.5M'],
  ])('formats %d as %s for chart axes', (amount, expected) => {
    expect(formatCompactUsd(amount)).toBe(expected);
  });
});

describe('formatRatio', () => {
  it.each([
    [2.79, '2.79×'],
    [0.4, '0.40×'],
  ])('formats %d as %s', (ratio, expected) => {
    expect(formatRatio(ratio)).toBe(expected);
  });
});

describe('formatCompactCount', () => {
  it.each([
    [950, '950'],
    [85_000, '85K'],
    [1_200_000, '1.2M'],
  ])('formats %d as %s', (count, expected) => {
    expect(formatCompactCount(count)).toBe(expected);
  });
});
