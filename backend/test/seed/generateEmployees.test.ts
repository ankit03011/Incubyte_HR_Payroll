import { describe, expect, it } from 'vitest';
import { currencyFor, salaryBandFor } from '@hr/shared';
import { generateEmployees } from '../../src/seed/generateEmployees.js';

describe('generateEmployees', () => {
  it('generates exactly the requested number of employees', () => {
    const employees = generateEmployees({ seed: 42, count: 25 });

    expect(employees).toHaveLength(25);
  });

  it('generates identical employees for the same seed', () => {
    expect(generateEmployees({ seed: 7, count: 100 })).toEqual(
      generateEmployees({ seed: 7, count: 100 }),
    );
  });

  it('generates different employees for a different seed', () => {
    expect(generateEmployees({ seed: 7, count: 100 })).not.toEqual(
      generateEmployees({ seed: 8, count: 100 }),
    );
  });

  it('gives every one of 10,000 employees a unique email, ignoring case', () => {
    const emails = generateEmployees({ seed: 42, count: 10_000 }).map((e) => e.email.toLowerCase());

    expect(new Set(emails).size).toBe(10_000);
  });

  it('builds plain ASCII emails, stripping accents from names like Lucía and Müller', () => {
    const emails = generateEmployees({ seed: 42, count: 10_000 }).map((e) => e.email);

    expect(emails.filter((email) => !/^[a-z]+\.[a-z]+\d*@example\.com$/.test(email))).toEqual([]);
    expect(emails).toContain('lucia.nair@example.com');
  });

  it("pays every employee in their country's currency", () => {
    const employees = generateEmployees({ seed: 42, count: 1_000 });

    for (const employee of employees) {
      expect(employee.currencyCode).toBe(currencyFor(employee.countryCode));
    }
  });

  it('keeps all but about 1% of salaries within the band for the country and job title', () => {
    const employees = generateEmployees({ seed: 42, count: 10_000 });

    const outsideBand = employees.filter(({ countryCode, jobTitle, salaryMinor }) => {
      const { minMinor, maxMinor } = salaryBandFor(countryCode, jobTitle);
      return salaryMinor < minMinor || salaryMinor > maxMinor;
    });

    expect(outsideBand.length).toBeGreaterThanOrEqual(50);
    expect(outsideBand.length).toBeLessThanOrEqual(150);
  });
});
