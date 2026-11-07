import { currencyByCode } from './referenceData';

/** Tolerance for binary floating-point noise, e.g. 0.29 * 100 = 28.999999999999996. */
const EPSILON = 1e-6;

function minorUnitsPerMajor(currencyCode: string): number {
  return 10 ** currencyByCode(currencyCode).minorUnits;
}

export function decimalPlacesMessage(currencyCode: string): string {
  const digits = currencyByCode(currencyCode).minorUnits;
  return digits === 0
    ? `${currencyCode} amounts allow no decimal places`
    : `${currencyCode} amounts allow at most ${digits} decimal places`;
}

export function fitsCurrencyPrecision(amount: number, currencyCode: string): boolean {
  const scaled = amount * minorUnitsPerMajor(currencyCode);
  return Math.abs(scaled - Math.round(scaled)) < EPSILON;
}

/** Converts a major-unit amount (e.g. 85000.5 USD) to integer minor units (8500050 cents). */
export function toMinorUnits(amount: number, currencyCode: string): number {
  if (!fitsCurrencyPrecision(amount, currencyCode)) {
    throw new Error(decimalPlacesMessage(currencyCode));
  }
  return Math.round(amount * minorUnitsPerMajor(currencyCode));
}

export function toMajorUnits(amountMinor: number, currencyCode: string): number {
  return amountMinor / minorUnitsPerMajor(currencyCode);
}
