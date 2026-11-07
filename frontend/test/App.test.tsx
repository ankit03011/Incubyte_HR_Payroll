import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { EmployeeDetail } from '@hr/shared';
import { aPage, anEmployee, mockApi } from './support/mockApi';
import { renderApp } from './support/renderApp';

/** Employees endpoints answer; insights fail, proving pages render regardless. */
function mockBackend() {
  return mockApi(({ url }) => {
    if (url.pathname.startsWith('/api/insights')) {
      return { status: 500, body: { error: { code: 'INTERNAL_ERROR', message: 'unavailable' } } };
    }
    if (url.pathname === '/api/employees/1') {
      const detail: EmployeeDetail = {
        ...anEmployee(),
        salaryHistory: [{ salary: 120_000, currencyCode: 'USD', effectiveFrom: '2024-03-01' }],
      };
      return { body: detail };
    }
    if (url.pathname === '/api/employees/999') {
      return {
        status: 404,
        body: { error: { code: 'NOT_FOUND', message: 'Employee 999 not found' } },
      };
    }
    return { body: aPage([anEmployee()]) };
  });
}

// The first visit to a lazy-loaded page transforms Recharts, which can exceed the 1 s default.
const LAZY = { timeout: 5_000 };

describe('routes', () => {
  it('redirects / to the employees list', async () => {
    mockBackend();

    const app = renderApp('/');

    expect(await screen.findByRole('heading', { level: 1, name: 'Employees' })).toBeInTheDocument();
    expect(app.location().pathname).toBe('/employees');
  });

  it('renders the dashboard at /insights', async () => {
    mockBackend();

    renderApp('/insights');

    expect(screen.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeInTheDocument();
    expect(
      await screen.findByRole('region', { name: 'Salary outliers' }, LAZY),
    ).toBeInTheDocument();
  });

  it('renders the employee detail page at /employees/:id', async () => {
    mockBackend();

    renderApp('/employees/1');

    expect(await screen.findByRole('heading', { name: 'Ada Lovelace' })).toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'Salary history' })).toBeInTheDocument();
  });

  it('explains when an employee does not exist', async () => {
    mockBackend();

    renderApp('/employees/999');

    expect(await screen.findByText('Employee not found.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to employees' })).toHaveAttribute(
      'href',
      '/employees',
    );
  });

  it('shows a 404 page for an unknown route', async () => {
    mockBackend();

    renderApp('/payslips');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Page not found' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to employees' })).toHaveAttribute(
      'href',
      '/employees',
    );
  });
});

describe('navigation', () => {
  it('marks the active route in the sidebar and navigates between pages', async () => {
    const user = userEvent.setup();
    mockBackend();
    const app = renderApp('/employees');
    const sidebar = within(await screen.findByRole('navigation', { name: 'Main' }));

    expect(sidebar.getByRole('link', { name: 'Employees' })).toHaveAttribute(
      'aria-current',
      'page',
    );

    await user.click(sidebar.getByRole('link', { name: 'Dashboard' }));

    expect(
      await screen.findByRole('region', { name: 'Salary outliers' }, LAZY),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeInTheDocument();
    expect(app.location().pathname).toBe('/insights');
    expect(sidebar.getByRole('link', { name: 'Dashboard' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('collapses the desktop sidebar to icons while keeping link names', async () => {
    const user = userEvent.setup();
    mockBackend();
    renderApp('/employees');
    const sidebar = within(await screen.findByRole('navigation', { name: 'Main' }));

    await user.click(screen.getByRole('button', { name: 'Collapse sidebar' }));

    expect(screen.getByRole('button', { name: 'Expand sidebar' })).toBeInTheDocument();
    expect(sidebar.getByRole('link', { name: 'Employees' })).toBeInTheDocument();
  });

  it('opens the mobile navigation drawer and closes it after choosing a page', async () => {
    const user = userEvent.setup();
    mockBackend();
    const app = renderApp('/employees');

    await user.click(await screen.findByRole('button', { name: 'Open navigation' }));
    const drawer = screen.getByRole('dialog', { name: 'Navigation' });
    await user.click(within(drawer).getByRole('link', { name: 'Dashboard' }));

    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Navigation' })).not.toBeInTheDocument(),
    );
    expect(app.location().pathname).toBe('/insights');
  });

  it('closes the mobile navigation drawer with Escape', async () => {
    const user = userEvent.setup();
    mockBackend();
    renderApp('/employees');

    await user.click(await screen.findByRole('button', { name: 'Open navigation' }));
    expect(screen.getByRole('dialog', { name: 'Navigation' })).toBeInTheDocument();

    await user.keyboard('{Escape}');

    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Navigation' })).not.toBeInTheDocument(),
    );
  });

  it('returns from an employee to the list with its filters intact', async () => {
    const user = userEvent.setup();
    mockBackend();
    const app = renderApp('/employees?countryCode=US');

    await user.click(await screen.findByRole('link', { name: 'Ada Lovelace' }));
    await user.click(await screen.findByRole('link', { name: 'Back to employees' }));

    await screen.findByRole('heading', { level: 1, name: 'Employees' });
    expect(app.location().search).toBe('?countryCode=US');
  });

  it('switches between light and dark themes', async () => {
    const user = userEvent.setup();
    mockBackend();
    renderApp('/employees');

    await user.click(await screen.findByRole('button', { name: 'Switch to dark theme' }));
    expect(document.documentElement).toHaveClass('dark');

    await user.click(screen.getByRole('button', { name: 'Switch to light theme' }));
    expect(document.documentElement).not.toHaveClass('dark');
  });
});
