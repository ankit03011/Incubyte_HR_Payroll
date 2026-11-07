import { useCallback, useState } from 'react';
import { api } from '@/lib/api';
import { formatCount } from '@/lib/format';
import { useAsync } from '@/lib/useAsync';
import { ChartCard } from './ChartCard';
import { DistributionChart, ValueTable, bucketLabel } from './charts';
import { CountrySelect, DepartmentSelect } from './filters';

export function DistributionPanel({ className }: { className?: string }) {
  const [countryCode, setCountryCode] = useState('');
  const [department, setDepartment] = useState('');
  const load = useCallback(
    (signal: AbortSignal) => api.insightsDistribution({ countryCode, department }, signal),
    [countryCode, department],
  );

  return (
    <ChartCard
      className={className}
      title="Salary distribution (USD)"
      description="How many employees earn within each 20,000 USD band."
      filters={
        <>
          <CountrySelect value={countryCode} onChange={setCountryCode} />
          <DepartmentSelect value={department} onChange={setDepartment} />
        </>
      }
      state={useAsync(load)}
      isEmpty={(data) => data.buckets.length === 0}
      emptyMessage="No employees match these filters."
      chart={(data) => <DistributionChart buckets={data.buckets} />}
      table={(data) => (
        <ValueTable
          label="Salary distribution"
          labelHeading="Salary range (USD)"
          valueHeading="Employees"
          rows={data.buckets.map((bucket) => ({
            key: bucket.minSalary,
            label: bucketLabel(bucket),
            value: formatCount(bucket.headcount),
          }))}
        />
      )}
    />
  );
}
