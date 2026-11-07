import { COUNTRIES, JOB_TITLES } from '@hr/shared';
import { Search } from 'lucide-react';
import { NativeSelect } from '@/components/NativeSelect';
import { Input } from '@/components/ui/input';

export interface Filters {
  countryCode: string;
  department: string;
  jobTitle: string;
}

const DEPARTMENTS = [...new Set(JOB_TITLES.map((job) => job.department))].sort();
const TITLES = JOB_TITLES.map((job) => job.title).sort();
const COUNTRY_OPTIONS = [...COUNTRIES].sort((a, b) => a.name.localeCompare(b.name));

interface Props {
  search: string;
  onSearchChange: (search: string) => void;
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
}

export function EmployeeFilters({ search, onSearchChange, filters, onFiltersChange }: Props) {
  const set = (key: keyof Filters) => (event: React.ChangeEvent<HTMLSelectElement>) =>
    onFiltersChange({ ...filters, [key]: event.target.value });

  return (
    <div className="grid w-full gap-2 sm:grid-cols-3 lg:flex lg:flex-1 lg:flex-wrap lg:items-center">
      <div className="relative sm:col-span-3 lg:min-w-64 lg:flex-1">
        <Search
          aria-hidden
          className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          type="search"
          aria-label="Search name or email"
          placeholder="Search name or email"
          className="pl-8"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </div>
      <NativeSelect
        className="w-full lg:w-44"
        aria-label="Country"
        value={filters.countryCode}
        onChange={set('countryCode')}
      >
        <option value="">All countries</option>
        {COUNTRY_OPTIONS.map((country) => (
          <option key={country.code} value={country.code}>
            {country.name}
          </option>
        ))}
      </NativeSelect>
      <NativeSelect
        className="w-full lg:w-44"
        aria-label="Department"
        value={filters.department}
        onChange={set('department')}
      >
        <option value="">All departments</option>
        {DEPARTMENTS.map((department) => (
          <option key={department}>{department}</option>
        ))}
      </NativeSelect>
      <NativeSelect
        className="w-full lg:w-44"
        aria-label="Job title"
        value={filters.jobTitle}
        onChange={set('jobTitle')}
      >
        <option value="">All job titles</option>
        {TITLES.map((title) => (
          <option key={title}>{title}</option>
        ))}
      </NativeSelect>
    </div>
  );
}
