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
