import { currencyByCode } from '@hr/shared';

/** One locale app-wide keeps numbers consistent for an HR team reading across countries. */
const LOCALE = 'en-US';

/** Whole amounts drop the decimals ($120,000); others show the currency's digits ($85,000.50). */
export function formatMoney(amount: number, currencyCode: string): string {
  const digits = Number.isInteger(amount) ? 0 : currencyByCode(currencyCode).minorUnits;
  return new Intl.NumberFormat(LOCALE, {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(amount);
}

const dateFormat = new Intl.DateTimeFormat(LOCALE, { dateStyle: 'medium', timeZone: 'UTC' });

/** ISO dates are calendar dates; formatting in UTC stops them shifting a day in other zones. */
export function formatDate(isoDate: string): string {
  return dateFormat.format(new Date(`${isoDate}T00:00:00Z`));
}

const compactUsd = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

/** Short USD amounts for chart axes, e.g. $20K, $1.5M. */
export function formatCompactUsd(amount: number): string {
  return compactUsd.format(amount);
}

/** A salary relative to the peer median, e.g. 2.79×. */
export function formatRatio(ratio: number): string {
  return `${ratio.toFixed(2)}×`;
}

const countFormat = new Intl.NumberFormat(LOCALE);

export function formatCount(count: number): string {
  return countFormat.format(count);
}

const compactCount = new Intl.NumberFormat(LOCALE, {
  notation: 'compact',
  maximumFractionDigits: 1,
});

/** Short counts for chart axes, e.g. 85K, 1.2M. */
export function formatCompactCount(count: number): string {
  return compactCount.format(count);
}
