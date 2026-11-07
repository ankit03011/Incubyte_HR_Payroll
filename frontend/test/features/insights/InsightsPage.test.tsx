import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type {
  CountryInsightsResponse,
  InsightsSummary,
  JobTitleInsight,
  JobTitleInsightsResponse,
  OutliersResponse,
  SalaryDistribution,
} from '@hr/shared';
import { anEmployee, mockApi, type RecordedRequest } from '../../support/mockApi';
import { renderApp } from '../../support/renderApp';

const summary: InsightsSummary = {
  headcount: 10_000,
  totalPayrollUsd: 715_874_268.2,
  meanSalaryUsd: 71_587.43,
  medianSalaryUsd: 64_401.33,
};

const byCountry: CountryInsightsResponse = {
  items: [
    {
      countryCode: 'IN',
      currencyCode: 'INR',
      headcount: 2_483,
      minSalary: 834_000,
      medianSalary: 2_083_800,
      meanSalary: 2_179_669.19,
      maxSalary: 4_964_300,
      totalPayrollUsd: 65_207_394.12,
    },
  ],
};

const softwareEngineersInUsd: JobTitleInsight = {
  jobTitle: 'Software Engineer',
  currencyCode: 'USD',
  headcount: 2_000,
  minSalary: 22_500,
  medianSalary: 96_000,
  meanSalary: 98_000,
  maxSalary: 150_000,
  totalPayrollUsd: 196_000_000,
};

const jobTitlesInUsd: JobTitleInsightsResponse = { items: [softwareEngineersInUsd] };

const jobTitlesInIndia: JobTitleInsightsResponse = {
  items: [{ ...softwareEngineersInUsd, currencyCode: 'INR', medianSalary: 2_490_000 }],
};

const distribution: SalaryDistribution = {
  currencyCode: 'USD',
  bucketSize: 20_000,
  buckets: [
    { minSalary: 0, maxSalary: 20_000, headcount: 871 },
    { minSalary: 20_000, maxSalary: 40_000, headcount: 1_954 },
  ],
};

const outliers: OutliersResponse = {
  items: [
    {
      ...anEmployee({ fullName: 'Aarav Mehta', jobTitle: 'Accountant', salary: 196_700 }),
      salaryUsd: 196_700,
      peerMedianSalaryUsd: 70_550,
      ratioToPeerMedian: 2.79,
    },
  ],
  total: 113,
  page: 1,
  pageSize: 50,
};

type Overrides = Partial<Record<string, { status?: number; body?: unknown }>>;

/** Answers every insights endpoint; `overrides` replaces the reply for a path. */
function mockInsightsApi(overrides: Overrides = {}) {
  const replies: Record<string, (request: RecordedRequest) => unknown> = {
    '/api/insights/summary': () => summary,
    '/api/insights/by-country': () => byCountry,
    '/api/insights/by-job-title': ({ url }) =>
      url.searchParams.get('countryCode') === 'IN' ? jobTitlesInIndia : jobTitlesInUsd,
    '/api/insights/distribution': () => distribution,
    '/api/insights/outliers': ({ url }) => ({
      ...outliers,
      page: Number(url.searchParams.get('page')),
    }),
  };
  return mockApi((request) => {
    const override = overrides[request.url.pathname];
    if (override) return override;
    return { body: replies[request.url.pathname]?.(request) };
  });
}

/** The dashboard is lazy-loaded; the first import of Recharts can exceed the 1 s default. */
async function openDashboard(): Promise<void> {
  renderApp('/insights');
  // The page title renders in the shell at once; wait for the lazy page's own content.
  await screen.findByRole('region', { name: 'Salary outliers' }, { timeout: 5_000 });
}

const panel = (name: string) => within(screen.getByRole('region', { name }));
const lastQuery = (api: ReturnType<typeof mockApi>, path: string) =>
  api.matching('GET', path).at(-1)?.url.searchParams;

describe('InsightsPage', () => {
  it('renders the summary cards from the API', async () => {
    mockInsightsApi();

    await openDashboard();

    expect(await panel('Headcount').findByText('10,000')).toBeInTheDocument();
    expect(panel('Total payroll (USD)').getByText('$715.9M')).toBeInTheDocument();
    expect(panel('Total payroll (USD)').getByText('$715,874,268.20 per year')).toBeInTheDocument();
    expect(panel('Average salary (USD)').getByText('$71,587.43')).toBeInTheDocument();
    expect(panel('Median salary (USD)').getByText('$64,401.33')).toBeInTheDocument();
  });

  it('shows statistics per country in local currency with payroll in USD', async () => {
    mockInsightsApi();

    await openDashboard();

    const row = (await panel('Pay by country').findByText('India')).closest('tr') as HTMLElement;
    expect(
      within(row)
        .getAllByRole('cell')
        .map((cell) => cell.textContent),
    ).toEqual([
      'India',
      '2,483',
      '₹834,000',
      '₹2,083,800',
      '₹2,179,669.19',
      '₹4,964,300',
      '$65,207,394.12',
    ]);
  });

  it('requests job-title statistics for the selected country and shows them in its currency', async () => {
    const user = userEvent.setup();
    const api = mockInsightsApi();
    await openDashboard();
    const jobTitles = panel('Pay by job title');
    expect(await jobTitles.findByText('$96,000')).toBeInTheDocument();

    await user.selectOptions(jobTitles.getByRole('combobox', { name: 'Country' }), 'IN');

    expect(await jobTitles.findByText('₹2,490,000')).toBeInTheDocument();
    expect(lastQuery(api, '/api/insights/by-job-title')?.get('countryCode')).toBe('IN');
  });

  it('sends the distribution filters with the request', async () => {
    const user = userEvent.setup();
    const api = mockInsightsApi();
    await openDashboard();
    const chart = panel('Salary distribution (USD)');

    await user.selectOptions(chart.getByRole('combobox', { name: 'Country' }), 'US');
    await user.selectOptions(chart.getByRole('combobox', { name: 'Department' }), 'Sales');

    await waitFor(() =>
      expect(lastQuery(api, '/api/insights/distribution')?.get('department')).toBe('Sales'),
    );
    expect(lastQuery(api, '/api/insights/distribution')?.get('countryCode')).toBe('US');
  });

  it('offers the distribution as a table', async () => {
    const user = userEvent.setup();
    mockInsightsApi();
    await openDashboard();
    const chart = panel('Salary distribution (USD)');

    await user.click(await chart.findByRole('button', { name: 'Show table' }));

    const [, ...rows] = within(
      chart.getByRole('table', { name: 'Salary distribution' }),
    ).getAllByRole('row');
    expect(rows.map((row) => row.textContent)).toEqual([
      '$0 – $20,000871',
      '$20,000 – $40,0001,954',
    ]);
  });

  it('lists outliers with their ratio to the peer median and pages through them', async () => {
    const user = userEvent.setup();
    const api = mockInsightsApi();
    await openDashboard();
    const list = panel('Salary outliers');

    const row = (await list.findByText('Aarav Mehta')).closest('tr') as HTMLElement;
    expect(within(row).getByText('2.79×')).toBeInTheDocument();
    expect(within(row).getByText('$70,550')).toBeInTheDocument();
    expect(list.getByText('1–50 of 113')).toBeInTheDocument();

    await user.click(list.getByRole('button', { name: 'Next page' }));

    await waitFor(() => expect(lastQuery(api, '/api/insights/outliers')?.get('page')).toBe('2'));
    expect(lastQuery(api, '/api/insights/outliers')?.get('pageSize')).toBe('50');
  });

  it('shows an error in a failing panel while the other panels still render', async () => {
    const user = userEvent.setup();
    let byCountryFails = true;
    mockApi(({ url }) => {
      if (url.pathname === '/api/insights/by-country' && byCountryFails) {
        return { status: 500, body: { error: { code: 'INTERNAL_ERROR', message: 'boom' } } };
      }
      const bodies: Record<string, unknown> = {
        '/api/insights/summary': summary,
        '/api/insights/by-country': byCountry,
        '/api/insights/by-job-title': jobTitlesInUsd,
        '/api/insights/distribution': distribution,
        '/api/insights/outliers': outliers,
      };
      return { body: bodies[url.pathname] };
    });
    await openDashboard();

    expect(
      await panel('Pay by country').findByText("Couldn't load this panel."),
    ).toBeInTheDocument();
    expect(await panel('Headcount').findByText('10,000')).toBeInTheDocument();
    expect(await panel('Salary outliers').findByText('Aarav Mehta')).toBeInTheDocument();

    byCountryFails = false;
    await user.click(panel('Pay by country').getByRole('button', { name: 'Try again' }));

    expect(await panel('Pay by country').findByText('India')).toBeInTheDocument();
  });

  it('shows empty states when there is nothing to report', async () => {
    mockInsightsApi({
      '/api/insights/summary': {
        body: { headcount: 0, totalPayrollUsd: 0, meanSalaryUsd: null, medianSalaryUsd: null },
      },
      '/api/insights/by-country': { body: { items: [] } },
      '/api/insights/by-job-title': { body: { items: [] } },
      '/api/insights/distribution': { body: { ...distribution, buckets: [] } },
      '/api/insights/outliers': { body: { items: [], total: 0, page: 1, pageSize: 50 } },
    });

    await openDashboard();

    expect(await panel('Median salary (USD)').findByText('—')).toBeInTheDocument();
    expect(await panel('Pay by country').findByText('No employees yet.')).toBeInTheDocument();
    expect(await panel('Pay by job title').findByText('No employees yet.')).toBeInTheDocument();
    expect(panel('Payroll by country (USD)').getByText('No employees yet.')).toBeInTheDocument();
    expect(
      panel('Median salary by job title (USD)').getByText('No employees yet.'),
    ).toBeInTheDocument();
    expect(
      await panel('Salary distribution (USD)').findByText('No employees match these filters.'),
    ).toBeInTheDocument();
    expect(
      await panel('Salary outliers').findByText(
        'No outliers: everyone is paid within 0.5×–1.5× of their peer median.',
      ),
    ).toBeInTheDocument();
  });

  it('charts payroll by country in USD, with a table view', async () => {
    const user = userEvent.setup();
    mockInsightsApi();
    await openDashboard();
    const chart = panel('Payroll by country (USD)');

    await user.click(await chart.findByRole('button', { name: 'Show table' }));

    const [, ...rows] = within(chart.getByRole('table')).getAllByRole('row');
    expect(rows.map((row) => row.textContent)).toEqual(['India$65,207,394.12']);
  });

  it('charts the median salary by job title in USD, with a table view', async () => {
    const user = userEvent.setup();
    mockInsightsApi();
    await openDashboard();
    const chart = panel('Median salary by job title (USD)');

    await user.click(await chart.findByRole('button', { name: 'Show table' }));

    const [, ...rows] = within(chart.getByRole('table')).getAllByRole('row');
    expect(rows.map((row) => row.textContent)).toEqual(['Software Engineer$96,000']);
  });
});
