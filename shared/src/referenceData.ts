/**
 * Static reference data. Rates and pay factors are indicative (see decisions.md),
 * chosen to produce realistic-looking data, not to reflect any real market.
 */

export interface Currency {
  code: string;
  /** Digits after the decimal point, e.g. 2 for USD (cents), 0 for JPY. */
  minorUnits: number;
  /** Static FX rate: how many units of this currency buy 1 USD. */
  unitsPerUsd: number;
}

export interface Country {
  code: string;
  name: string;
  currencyCode: string;
  /** Local salary level relative to the US for the same role. */
  payFactor: number;
  /** Relative share of the workforce, used only by the seed. */
  headcountWeight: number;
}

export interface JobTitle {
  title: string;
  department: string;
  usdBand: { min: number; max: number };
  /** Relative share of the workforce, used only by the seed. */
  headcountWeight: number;
}

export const CURRENCIES: readonly Currency[] = [
  { code: 'USD', minorUnits: 2, unitsPerUsd: 1 },
  { code: 'GBP', minorUnits: 2, unitsPerUsd: 0.79 },
  { code: 'EUR', minorUnits: 2, unitsPerUsd: 0.92 },
  { code: 'INR', minorUnits: 2, unitsPerUsd: 83 },
  { code: 'CAD', minorUnits: 2, unitsPerUsd: 1.36 },
  { code: 'AUD', minorUnits: 2, unitsPerUsd: 1.52 },
  { code: 'SGD', minorUnits: 2, unitsPerUsd: 1.34 },
  { code: 'JPY', minorUnits: 0, unitsPerUsd: 150 },
  { code: 'BRL', minorUnits: 2, unitsPerUsd: 5 },
];

export const COUNTRIES: readonly Country[] = [
  { code: 'US', name: 'United States', currencyCode: 'USD', payFactor: 1, headcountWeight: 25 },
  { code: 'IN', name: 'India', currencyCode: 'INR', payFactor: 0.25, headcountWeight: 25 },
  { code: 'GB', name: 'United Kingdom', currencyCode: 'GBP', payFactor: 0.75, headcountWeight: 10 },
  { code: 'DE', name: 'Germany', currencyCode: 'EUR', payFactor: 0.8, headcountWeight: 8 },
  { code: 'FR', name: 'France', currencyCode: 'EUR', payFactor: 0.7, headcountWeight: 5 },
  { code: 'CA', name: 'Canada', currencyCode: 'CAD', payFactor: 0.8, headcountWeight: 7 },
  { code: 'AU', name: 'Australia', currencyCode: 'AUD', payFactor: 0.85, headcountWeight: 5 },
  { code: 'SG', name: 'Singapore', currencyCode: 'SGD', payFactor: 0.85, headcountWeight: 5 },
  { code: 'JP', name: 'Japan', currencyCode: 'JPY', payFactor: 0.7, headcountWeight: 5 },
  { code: 'BR', name: 'Brazil', currencyCode: 'BRL', payFactor: 0.35, headcountWeight: 5 },
];

export const JOB_TITLES: readonly JobTitle[] = [
  {
    title: 'Software Engineer',
    department: 'Engineering',
    usdBand: { min: 90_000, max: 150_000 },
    headcountWeight: 20,
  },
  {
    title: 'Senior Software Engineer',
    department: 'Engineering',
    usdBand: { min: 130_000, max: 200_000 },
    headcountWeight: 12,
  },
  {
    title: 'Engineering Manager',
    department: 'Engineering',
    usdBand: { min: 160_000, max: 240_000 },
    headcountWeight: 3,
  },
  {
    title: 'QA Engineer',
    department: 'Engineering',
    usdBand: { min: 70_000, max: 120_000 },
    headcountWeight: 6,
  },
  {
    title: 'Product Manager',
    department: 'Product',
    usdBand: { min: 110_000, max: 180_000 },
    headcountWeight: 4,
  },
  {
    title: 'Product Designer',
    department: 'Product',
    usdBand: { min: 85_000, max: 140_000 },
    headcountWeight: 3,
  },
  {
    title: 'Account Executive',
    department: 'Sales',
    usdBand: { min: 60_000, max: 120_000 },
    headcountWeight: 8,
  },
  {
    title: 'Sales Development Representative',
    department: 'Sales',
    usdBand: { min: 45_000, max: 75_000 },
    headcountWeight: 6,
  },
  {
    title: 'Marketing Manager',
    department: 'Marketing',
    usdBand: { min: 80_000, max: 140_000 },
    headcountWeight: 3,
  },
  {
    title: 'Content Strategist',
    department: 'Marketing',
    usdBand: { min: 55_000, max: 95_000 },
    headcountWeight: 3,
  },
  {
    title: 'Financial Analyst',
    department: 'Finance',
    usdBand: { min: 65_000, max: 110_000 },
    headcountWeight: 3,
  },
  {
    title: 'Accountant',
    department: 'Finance',
    usdBand: { min: 55_000, max: 90_000 },
    headcountWeight: 3,
  },
  {
    title: 'HR Business Partner',
    department: 'People',
    usdBand: { min: 70_000, max: 120_000 },
    headcountWeight: 2,
  },
  {
    title: 'Recruiter',
    department: 'People',
    usdBand: { min: 55_000, max: 95_000 },
    headcountWeight: 3,
  },
  {
    title: 'Operations Manager',
    department: 'Operations',
    usdBand: { min: 70_000, max: 130_000 },
    headcountWeight: 4,
  },
  {
    title: 'Customer Support Specialist',
    department: 'Operations',
    usdBand: { min: 40_000, max: 65_000 },
    headcountWeight: 12,
  },
];

function findOrThrow<T>(items: readonly T[], matches: (item: T) => boolean, error: string): T {
  const found = items.find(matches);
  if (!found) throw new Error(error);
  return found;
}

export function countryByCode(code: string): Country {
  return findOrThrow(COUNTRIES, (c) => c.code === code, `Unknown country: ${code}`);
}

export function currencyByCode(code: string): Currency {
  return findOrThrow(CURRENCIES, (c) => c.code === code, `Unknown currency: ${code}`);
}

export function jobTitleByName(title: string): JobTitle {
  return findOrThrow(JOB_TITLES, (j) => j.title === title, `Unknown job title: ${title}`);
}

export function currencyFor(countryCode: string): string {
  return countryByCode(countryCode).currencyCode;
}

/** Annual salary band for a role in a country, in that country's currency minor units. */
export function salaryBandFor(
  countryCode: string,
  jobTitle: string,
): { minMinor: number; maxMinor: number } {
  const country = countryByCode(countryCode);
  const currency = currencyByCode(country.currencyCode);
  const { usdBand } = jobTitleByName(jobTitle);
  const toLocalMinor = (usd: number): number =>
    Math.round(usd * country.payFactor * currency.unitsPerUsd) * 10 ** currency.minorUnits;

  return { minMinor: toLocalMinor(usdBand.min), maxMinor: toLocalMinor(usdBand.max) };
}
