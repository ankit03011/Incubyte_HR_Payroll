import { COUNTRIES, JOB_TITLES, currencyByCode, salaryBandFor } from '@hr/shared';
import type { NewEmployee } from '../repositories/employeeRepository';
import { FIRST_NAMES, LAST_NAMES } from './names';
import { createRandom, type Random } from './random';

const EMAIL_DOMAIN = 'example.com';
/** Fixed base date keeps the output independent of when the seed runs. */
const EARLIEST_START = Date.UTC(2018, 0, 1);
const START_DATE_SPAN_DAYS = 8 * 365;
const DAY_MS = 86_400_000;

function toEmailPart(name: string): string {
  // NFD splits 'í' into 'i' + a combining accent, which the next step drops with all non-letters.
  return name
    .normalize('NFD')
    .replace(/[^a-zA-Z]/g, '')
    .toLowerCase();
}

function createUniqueEmail(): (firstName: string, lastName: string) => string {
  const timesUsed = new Map<string, number>();
  return (firstName, lastName) => {
    const local = `${toEmailPart(firstName)}.${toEmailPart(lastName)}`;
    const count = (timesUsed.get(local) ?? 0) + 1;
    timesUsed.set(local, count);
    return `${count === 1 ? local : `${local}${count}`}@${EMAIL_DOMAIN}`;
  };
}

/** Share of employees deliberately paid far outside their band, so outlier insights have data. */
const OUTLIER_SHARE = 0.01;

function roundToStep(amountMinor: number, step: number): number {
  return Math.max(step, Math.round(amountMinor / step) * step);
}

/**
 * Picks a salary rounded to whole hundreds of the local currency: usually uniform inside the
 * band; for ~1% of employees, 1.6–2.2x the band's top or 0.30–0.45x its bottom. Even for the
 * widest band (max = 2x min) that is beyond 1.5x / below 0.5x the peer median.
 */
function seededSalary(
  random: Random,
  countryCode: string,
  jobTitle: string,
  currencyCode: string,
): number {
  const { minMinor, maxMinor } = salaryBandFor(countryCode, jobTitle);
  const step = 100 * 10 ** currencyByCode(currencyCode).minorUnits;
  const roll = random.next();

  if (roll < OUTLIER_SHARE / 2) return roundToStep(maxMinor * (1.6 + random.next() * 0.6), step);
  if (roll < OUTLIER_SHARE) return roundToStep(minMinor * (0.3 + random.next() * 0.15), step);
  return random.int(Math.ceil(minMinor / step), Math.floor(maxMinor / step)) * step;
}

function startDate(random: Random): string {
  const days = random.int(0, START_DATE_SPAN_DAYS);
  return new Date(EARLIEST_START + days * DAY_MS).toISOString().slice(0, 10);
}

export function generateEmployees({ seed, count }: { seed: number; count: number }): NewEmployee[] {
  const random = createRandom(seed);
  const uniqueEmail = createUniqueEmail();

  return Array.from({ length: count }, () => {
    const firstName = random.pick(FIRST_NAMES);
    const lastName = random.pick(LAST_NAMES);
    const country = random.weightedPick(COUNTRIES);
    const job = random.weightedPick(JOB_TITLES);

    return {
      fullName: `${firstName} ${lastName}`,
      email: uniqueEmail(firstName, lastName),
      jobTitle: job.title,
      department: job.department,
      countryCode: country.code,
      currencyCode: country.currencyCode,
      salaryMinor: seededSalary(random, country.code, job.title, country.currencyCode),
      startDate: startDate(random),
    };
  });
}
