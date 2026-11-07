import { COUNTRIES, JOB_TITLES } from '@hr/shared';
import { NativeSelect } from '@/components/NativeSelect';

const COUNTRY_OPTIONS = [...COUNTRIES].sort((a, b) => a.name.localeCompare(b.name));
const DEPARTMENTS = [...new Set(JOB_TITLES.map((job) => job.department))].sort();

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
}

export function CountrySelect({ value, onChange }: SelectProps) {
  return (
    <NativeSelect
      aria-label="Country"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      <option value="">All countries</option>
      {COUNTRY_OPTIONS.map((country) => (
        <option key={country.code} value={country.code}>
          {country.name}
        </option>
      ))}
    </NativeSelect>
  );
}

export function DepartmentSelect({ value, onChange }: SelectProps) {
  return (
    <NativeSelect
      aria-label="Department"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      <option value="">All departments</option>
      {DEPARTMENTS.map((department) => (
        <option key={department}>{department}</option>
      ))}
    </NativeSelect>
  );
}
