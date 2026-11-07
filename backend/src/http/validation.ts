import {
  COUNTRIES,
  DEFAULT_PAGE_SIZE,
  EMPLOYEE_SORT_FIELDS,
  MAX_OUTLIERS_PAGE_SIZE,
  MAX_PAGE_SIZE,
  SORT_ORDERS,
  decimalPlacesMessage,
  fitsCurrencyPrecision,
  type EmployeeInput,
} from '@hr/shared';
import { z } from 'zod';
import { ValidationError } from '../errors.js';

/** Upper bound keeps salaries far inside Number.MAX_SAFE_INTEGER once in minor units. */
const MAX_SALARY = 1_000_000_000_000;

/** "Required" when the field is absent; otherwise the field-specific message. */
const required = (message: string) => ({
  error: (issue: { input?: unknown }) => (issue.input === undefined ? 'Required' : message),
});

const requiredText = (max: number) =>
  z
    .string(required('Must be text'))
    .trim()
    .min(1, 'Required')
    .max(max, `Must be at most ${max} characters`);

/** Empty query values (e.g. `?search=`) mean "no filter" rather than a validation error. */
const optionalFilter = z
  .string()
  .trim()
  .max(100, 'Must be at most 100 characters')
  .transform((value) => value || undefined)
  .optional();

export const employeeInputSchema = z
  .object({
    fullName: requiredText(200),
    email: z
      .string(required('Must be a valid email address'))
      .trim()
      .toLowerCase()
      .pipe(z.email('Must be a valid email address')),
    jobTitle: requiredText(100),
    department: requiredText(100),
    countryCode: z.enum(
      COUNTRIES.map((country) => country.code),
      required('Must be a supported country code'),
    ),
    salary: z
      .number(required('Must be a number'))
      .positive('Must be greater than 0')
      .max(MAX_SALARY, `Must be at most ${MAX_SALARY}`),
    startDate: z.iso.date(required('Must be a date in YYYY-MM-DD format')),
  })
  .superRefine((input, context) => {
    const country = COUNTRIES.find((c) => c.code === input.countryCode);
    if (country && !fitsCurrencyPrecision(input.salary, country.currencyCode)) {
      context.addIssue({
        code: 'custom',
        path: ['salary'],
        message: decimalPlacesMessage(country.currencyCode),
      });
    }
  }) satisfies z.ZodType<EmployeeInput>;

const pageField = z.coerce
  .number()
  .int('Must be a whole number')
  .min(1, 'Must be at least 1')
  .default(1);

const pageSizeField = (max: number, fallback: number) =>
  z.coerce
    .number()
    .int('Must be a whole number')
    .min(1, 'Must be at least 1')
    .max(max, `Must be at most ${max}`)
    .default(fallback);

export const listQuerySchema = z.object({
  page: pageField,
  pageSize: pageSizeField(MAX_PAGE_SIZE, DEFAULT_PAGE_SIZE),
  search: optionalFilter,
  countryCode: optionalFilter,
  department: optionalFilter,
  jobTitle: optionalFilter,
  sortBy: z.enum(EMPLOYEE_SORT_FIELDS).default('name'),
  sortOrder: z.enum(SORT_ORDERS).default('asc'),
});

export const insightsFilterSchema = z.object({
  countryCode: optionalFilter,
  department: optionalFilter,
});

export const outliersQuerySchema = z.object({
  page: pageField,
  pageSize: pageSizeField(MAX_OUTLIERS_PAGE_SIZE, MAX_OUTLIERS_PAGE_SIZE),
});

export const idParamsSchema = z.object({
  id: z.coerce
    .number('Must be a positive integer')
    .int('Must be a positive integer')
    .positive('Must be a positive integer'),
});

/** Parses input or throws a ValidationError carrying field-level messages. */
export function parseOrThrow<Schema extends z.ZodType>(
  schema: Schema,
  input: unknown,
): z.output<Schema> {
  const result = schema.safeParse(input);
  if (!result.success) {
    const { fieldErrors } = z.flattenError(result.error);
    throw new ValidationError(fieldErrors as Record<string, string[]>);
  }
  return result.data;
}
