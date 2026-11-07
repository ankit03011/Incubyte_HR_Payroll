import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { EmployeesPage } from '@/features/employees/EmployeesPage';
import { aPage, anEmployee, mockApi } from '../../support/mockApi';

function rowNames(): string[] {
  const [, ...rows] = screen.getAllByRole('row'); // skip the header row
  return rows.map((row) => within(row).getAllByRole('cell')[0]?.textContent ?? '');
}

describe('EmployeesPage', () => {
  it('renders a row per employee from the API, with salary in local currency', async () => {
    mockApi(() => ({
      body: aPage([
        anEmployee({ id: 1, fullName: 'Ada Lovelace', salary: 85_000.5 }),
        anEmployee({
          id: 2,
          fullName: 'Arjun Iyer',
          email: 'arjun@example.com',
          countryCode: 'IN',
          currencyCode: 'INR',
          salary: 2_500_000,
          startDate: '2022-07-18',
        }),
      ]),
    }));

    render(<EmployeesPage />);

    const arjunRow = (await screen.findByText('Arjun Iyer')).closest('tr') as HTMLElement;
    expect(within(arjunRow).getByText('arjun@example.com')).toBeInTheDocument();
    expect(within(arjunRow).getByText('India')).toBeInTheDocument();
    expect(within(arjunRow).getByText('₹2,500,000')).toBeInTheDocument();
    expect(within(arjunRow).getByText('Jul 18, 2022')).toBeInTheDocument();
    expect(screen.getByText('$85,000.50')).toBeInTheDocument();
    expect(rowNames()).toEqual(['Ada Lovelace', 'Arjun Iyer']);
  });

  it('requests the first page of 25, sorted by name, on load', async () => {
    const api = mockApi(() => ({ body: aPage([anEmployee()]) }));

    render(<EmployeesPage />);
    await screen.findByText('Ada Lovelace');

    expect(Object.fromEntries(api.lastListQuery() ?? [])).toEqual({
      page: '1',
      pageSize: '25',
      sortBy: 'name',
      sortOrder: 'asc',
    });
  });

  it('searches once the user stops typing, not on every keystroke', async () => {
    const user = userEvent.setup();
    const api = mockApi(() => ({ body: aPage([anEmployee()]) }));
    render(<EmployeesPage />);
    await screen.findByText('Ada Lovelace');

    await user.type(screen.getByRole('searchbox', { name: 'Search name or email' }), 'ana');

    await waitFor(() => expect(api.lastListQuery()?.get('search')).toBe('ana'));
    expect(api.listQueries().map((query) => query.get('search'))).toEqual([null, 'ana']);
  });

  it('sends the country, department and job title filters and returns to the first page', async () => {
    const user = userEvent.setup();
    const api = mockApi(({ url }) => ({
      body: aPage([anEmployee()], {
        total: 60,
        page: Number(url.searchParams.get('page')),
      }),
    }));
    render(<EmployeesPage />);
    await screen.findByText('Ada Lovelace');
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    await waitFor(() => expect(api.lastListQuery()?.get('page')).toBe('2'));

    await user.selectOptions(screen.getByRole('combobox', { name: 'Country' }), 'IN');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Department' }), 'Engineering');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Job title' }), 'QA Engineer');

    await waitFor(() => expect(api.lastListQuery()?.get('jobTitle')).toBe('QA Engineer'));
    const query = api.lastListQuery();
    expect(query?.get('countryCode')).toBe('IN');
    expect(query?.get('department')).toBe('Engineering');
    expect(query?.get('page')).toBe('1');
  });

  it('sorts by a column when its header is clicked, toggling the direction on a second click', async () => {
    const user = userEvent.setup();
    const api = mockApi(() => ({ body: aPage([anEmployee()]) }));
    render(<EmployeesPage />);
    await screen.findByText('Ada Lovelace');

    await user.click(screen.getByRole('button', { name: 'Salary' }));
    await waitFor(() => expect(api.lastListQuery()?.get('sortBy')).toBe('salary'));
    expect(api.lastListQuery()?.get('sortOrder')).toBe('asc');

    await user.click(screen.getByRole('button', { name: 'Salary' }));
    await waitFor(() => expect(api.lastListQuery()?.get('sortOrder')).toBe('desc'));
  });

  it('changes the page size and returns to the first page', async () => {
    const user = userEvent.setup();
    const api = mockApi(() => ({ body: aPage([anEmployee()]) }));
    render(<EmployeesPage />);
    await screen.findByText('Ada Lovelace');

    await user.selectOptions(screen.getByRole('combobox', { name: 'Rows per page' }), '50');

    await waitFor(() => expect(api.lastListQuery()?.get('pageSize')).toBe('50'));
    expect(api.lastListQuery()?.get('page')).toBe('1');
  });

  it('shows the visible range and disables Previous on the first page', async () => {
    mockApi(() => ({ body: aPage([anEmployee()], { total: 60 }) }));

    render(<EmployeesPage />);

    expect(await screen.findByText('1–25 of 60')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next page' })).toBeEnabled();
  });

  it('shows an empty state when no employees match', async () => {
    mockApi(() => ({ body: aPage([]) }));

    render(<EmployeesPage />);

    expect(
      await screen.findByText('No employees match your search or filters.'),
    ).toBeInTheDocument();
  });

  it('shows an error with a retry when the API fails', async () => {
    const user = userEvent.setup();
    let attempts = 0;
    mockApi(() =>
      ++attempts === 1
        ? {
            status: 500,
            body: { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } },
          }
        : { body: aPage([anEmployee()]) },
    );
    render(<EmployeesPage />);

    await user.click(await screen.findByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.queryByText("Couldn't load employees.")).not.toBeInTheDocument();
  });
});
