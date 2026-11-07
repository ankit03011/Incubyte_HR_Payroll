import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { EmployeeDetail } from '@hr/shared';
import { aPage, anEmployee, mockApi } from '../../support/mockApi';
import { renderApp } from '../../support/renderApp';

function mockEmployeesApi() {
  return mockApi(({ method, url }) => {
    if (method === 'DELETE') return { status: 204 };
    if (url.pathname === '/api/employees/1') {
      const detail: EmployeeDetail = {
        ...anEmployee(),
        salary: 130_000,
        salaryHistory: [
          { salary: 130_000, currencyCode: 'USD', effectiveFrom: '2026-11-07' },
          { salary: 120_000, currencyCode: 'USD', effectiveFrom: '2024-03-01' },
        ],
      };
      return { body: detail };
    }
    return { body: aPage([anEmployee()]) };
  });
}

describe('deleting an employee', () => {
  it('asks for confirmation and deletes only once confirmed, then refreshes the list', async () => {
    const user = userEvent.setup();
    const api = mockEmployeesApi();
    renderApp('/employees');
    await screen.findByText('Ada Lovelace');

    await user.click(screen.getByRole('button', { name: 'Delete Ada Lovelace' }));

    const confirmation = screen.getByRole('alertdialog', { name: 'Delete Ada Lovelace?' });
    expect(api.matching('DELETE', '/api/employees/1')).toHaveLength(0);

    await user.click(within(confirmation).getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(api.matching('DELETE', '/api/employees/1')).toHaveLength(1);
    expect(api.listQueries()).toHaveLength(2);
  });

  it('keeps the employee when the confirmation is cancelled', async () => {
    const user = userEvent.setup();
    const api = mockEmployeesApi();
    renderApp('/employees');
    await screen.findByText('Ada Lovelace');

    await user.click(screen.getByRole('button', { name: 'Delete Ada Lovelace' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(api.matching('DELETE', '/api/employees/1')).toHaveLength(0);
  });
});

describe('employee detail', () => {
  it('opens the employee page with salary history, newest first', async () => {
    const user = userEvent.setup();
    mockEmployeesApi();
    const app = renderApp('/employees');

    await user.click(await screen.findByRole('link', { name: 'Ada Lovelace' }));

    expect(await screen.findByRole('heading', { name: 'Ada Lovelace' })).toBeInTheDocument();
    expect(app.location().pathname).toBe('/employees/1');
    const history = within(await screen.findByRole('table', { name: 'Salary history' }));
    const [, ...rows] = history.getAllByRole('row');
    expect(rows.map((row) => row.textContent)).toEqual([
      'Nov 7, 2026$130,000',
      'Mar 1, 2024$120,000',
    ]);
  });
});
