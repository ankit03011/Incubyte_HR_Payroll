import { describe, expect, it } from 'vitest';
import { fitsCurrencyPrecision, toMajorUnits, toMinorUnits } from '../src/money.js';

describe('toMinorUnits', () => {
  it.each([
    ['USD', 85_000.5, 8_500_050],
    ['INR', 2_500_000, 250_000_000],
    ['JPY', 4_500_000, 4_500_000],
  ])('converts %s %d to %d minor units', (currency, major, minor) => {
    expect(toMinorUnits(major, currency)).toBe(minor);
  });

  it('rejects amounts with more decimals than the currency allows', () => {
    expect(() => toMinorUnits(1.005, 'USD')).toThrow(/decimal/);
  });
});

describe('toMajorUnits', () => {
  it.each([
    ['USD', 8_500_050, 85_000.5],
    ['JPY', 4_500_000, 4_500_000],
  ])('converts %s %d minor units to %d', (currency, minor, major) => {
    expect(toMajorUnits(minor, currency)).toBe(major);
  });
});

describe('fitsCurrencyPrecision', () => {
  it.each([
    ['USD', 0.29, true],
    ['USD', 1.005, false],
    ['JPY', 100, true],
    ['JPY', 100.5, false],
  ])('%s %d fits: %s', (currency, amount, expected) => {
    expect(fitsCurrencyPrecision(amount, currency)).toBe(expected);
  });
});
