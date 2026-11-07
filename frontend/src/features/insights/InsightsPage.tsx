import { useCallback } from 'react';
import { api } from '@/lib/api';
import { useAsync } from '@/lib/useAsync';
import { CountryPanel } from './CountryPanel';
import { DistributionPanel } from './DistributionPanel';
import { JobTitlePanel } from './JobTitlePanel';
import { OutliersPanel } from './OutliersPanel';
import { MedianByJobTitleCard, PayrollByCountryCard } from './RankedChartCards';
import { SummaryCards } from './SummaryCards';

/**
 * Summary cards, then charts in a two-column grid (stacked on small screens), then detail tables.
 * Every card loads independently, so one failing endpoint only affects its own card.
 */
export function InsightsPage() {
  const loadByCountry = useCallback((signal: AbortSignal) => api.insightsByCountry(signal), []);
  const byCountry = useAsync(loadByCountry);

  return (
    <div className="grid gap-4 md:gap-6">
      <SummaryCards />
      <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
        <DistributionPanel className="lg:col-span-2" />
        <PayrollByCountryCard state={byCountry} />
        <MedianByJobTitleCard />
      </div>
      <CountryPanel state={byCountry} />
      <JobTitlePanel />
      <OutliersPanel />
    </div>
  );
}
