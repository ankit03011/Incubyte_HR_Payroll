import { countryByCode, type CountryInsightsResponse } from '@hr/shared';
import { Panel } from '@/components/Panel';
import type { AsyncState } from '@/lib/useAsync';
import { StatisticsTable } from './StatisticsTable';

export function CountryPanel({ state }: { state: AsyncState<CountryInsightsResponse> }) {
  return (
    <Panel
      title="Pay by country"
      description="Salary statistics in each country's currency; payroll converted to USD."
      state={state}
      isEmpty={(data) => data.items.length === 0}
      emptyMessage="No employees yet."
    >
      {(data) => (
        <StatisticsTable
          labelHeading="Country"
          rows={data.items.map((item) => ({
            ...item,
            key: `${item.countryCode}-${item.currencyCode}`,
            label: countryByCode(item.countryCode).name,
          }))}
        />
      )}
    </Panel>
  );
}
