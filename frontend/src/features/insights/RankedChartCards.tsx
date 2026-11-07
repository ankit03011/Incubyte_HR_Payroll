import { useCallback } from 'react';
import { countryByCode, type CountryInsightsResponse } from '@hr/shared';
import { api } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import { useAsync, type AsyncState } from '@/lib/useAsync';
import { ChartCard } from './ChartCard';
import { RankedBarChart, ValueTable, type RankedValue } from './charts';

/** Room for up to 16 one-line category labels without crowding. */
const RANKED_CHART_HEIGHT = 'h-[30rem]';

const byValueDescending = (a: RankedValue, b: RankedValue) => b.value - a.value;

function usdTable(label: string, labelHeading: string, valueHeading: string, rows: RankedValue[]) {
  return (
    <ValueTable
      label={label}
      labelHeading={labelHeading}
      valueHeading={valueHeading}
      rows={rows.map((row) => ({
        key: row.label,
        label: row.label,
        value: formatMoney(row.value, 'USD'),
      }))}
    />
  );
}

/** Uses the by-country response shared with the country table, so it's fetched once. */
export function PayrollByCountryCard({ state }: { state: AsyncState<CountryInsightsResponse> }) {
  const rows = (data: CountryInsightsResponse): RankedValue[] =>
    data.items
      .map((item) => ({ label: countryByCode(item.countryCode).name, value: item.totalPayrollUsd }))
      .sort(byValueDescending);

  return (
    <ChartCard
      heightClassName={RANKED_CHART_HEIGHT}
      title="Payroll by country (USD)"
      description="Total annual payroll, converted to USD at static rates."
      state={state}
      isEmpty={(data) => data.items.length === 0}
      emptyMessage="No employees yet."
      chart={(data) => <RankedBarChart data={rows(data)} valueName="Total payroll (USD)" />}
      table={(data) => usdTable('Payroll by country', 'Country', 'Total payroll (USD)', rows(data))}
    />
  );
}

export function MedianByJobTitleCard() {
  const load = useCallback((signal: AbortSignal) => api.insightsByJobTitle({}, signal), []);
  const rows = (data: { items: { jobTitle: string; medianSalary: number }[] }): RankedValue[] =>
    data.items
      .map((item) => ({ label: item.jobTitle, value: item.medianSalary }))
      .sort(byValueDescending);

  return (
    <ChartCard
      heightClassName={RANKED_CHART_HEIGHT}
      title="Median salary by job title (USD)"
      description="Across all countries, converted to USD."
      state={useAsync(load)}
      isEmpty={(data) => data.items.length === 0}
      emptyMessage="No employees yet."
      chart={(data) => <RankedBarChart data={rows(data)} valueName="Median salary (USD)" />}
      table={(data) =>
        usdTable('Median salary by job title', 'Job title', 'Median salary (USD)', rows(data))
      }
    />
  );
}
