import { useCallback, useState } from 'react';
import { Panel } from '@/components/Panel';
import { api } from '@/lib/api';
import { useAsync } from '@/lib/useAsync';
import { CountrySelect } from './filters';
import { StatisticsTable } from './StatisticsTable';

export function JobTitlePanel() {
  const [countryCode, setCountryCode] = useState('');
  const load = useCallback(
    (signal: AbortSignal) => api.insightsByJobTitle(countryCode ? { countryCode } : {}, signal),
    [countryCode],
  );
  const state = useAsync(load);

  return (
    <Panel
      title="Pay by job title"
      description={
        countryCode
          ? "In the selected country's currency."
          : 'Across all countries, converted to USD. Pick a country for local currency.'
      }
      actions={<CountrySelect value={countryCode} onChange={setCountryCode} />}
      state={state}
      isEmpty={(data) => data.items.length === 0}
      emptyMessage="No employees yet."
    >
      {(data) => (
        <StatisticsTable
          labelHeading="Job title"
          rows={data.items.map((item) => ({ ...item, key: item.jobTitle, label: item.jobTitle }))}
        />
      )}
    </Panel>
  );
}
