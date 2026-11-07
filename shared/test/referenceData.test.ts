import { describe, expect, it } from 'vitest';
import { currencyFor, salaryBandFor } from '../src/referenceData';

describe('currencyFor', () => {
  it('returns the currency a country pays salaries in', () => {
    expect(currencyFor('IN')).toBe('INR');
    expect(currencyFor('DE')).toBe('EUR');
  });

  it('rejects an unknown country code', () => {
    expect(() => currencyFor('XX')).toThrow(/Unknown country/);
  });
});

describe('salaryBandFor', () => {
  it("converts the role's USD band to local minor units using the country's pay factor", () => {
    // Software Engineer: USD 90,000–150,000; India pay factor 0.25; 83 INR per USD; 2 minor digits
    expect(salaryBandFor('IN', 'Software Engineer')).toEqual({
      minMinor: 1_867_500_00,
      maxMinor: 3_112_500_00,
    });
  });

  it('respects currencies without minor units', () => {
    // Japan pay factor 0.7; 150 JPY per USD; JPY has no minor units
    expect(salaryBandFor('JP', 'Software Engineer')).toEqual({
      minMinor: 9_450_000,
      maxMinor: 15_750_000,
    });
  });

  it('rejects an unknown job title', () => {
    expect(() => salaryBandFor('US', 'Astronaut')).toThrow(/Unknown job title/);
  });
});
