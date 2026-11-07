import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { EmployeesPage } from '@/features/employees/EmployeesPage';
import { aPage, anEmployee, mockApi, type RecordedRequest } from '../../support/mockApi';

type Reply = { status?: number; body?: unknown };

/** List requests always succeed; writes are answered by `onWrite`. */
function mockEmployeesApi(onWrite: (request: RecordedRequest) => Reply) {
  return mockApi((request) =>
    request.method === 'GET' ? { body: aPage([anEmployee()]) } : onWrite(request),
  );
}

async function openAddDialog(user: UserEvent): Promise<HTMLElement> {
  render(<EmployeesPage />);
  await screen.findByText('Ada Lovelace');
  await user.click(screen.getByRole('button', { name: 'Add employee' }));
  return screen.getByRole('dialog', { name: 'Add employee' });
}

async function fillIn(user: UserEvent, dialog: HTMLElement): Promise<void> {
  const form = within(dialog);
  await user.type(form.getByLabelText('Full name'), 'Grace Hopper');
  await user.type(form.getByLabelText('Email'), 'grace@example.com');
  await user.type(form.getByLabelText('Job title'), 'Software Engineer');
  await user.type(form.getByLabelText('Department'), 'Engineering');
  await user.selectOptions(form.getByLabelText('Country'), 'US');
  await user.type(form.getByLabelText(/Annual salary/), '85000.50');
  await user.type(form.getByLabelText('Start date'), '2024-03-01');
}

describe('employee form', () => {
  it('creates an employee with the salary in major units, then refreshes the list', async () => {
    const user = userEvent.setup();
    const api = mockEmployeesApi(() => ({ status: 201, body: anEmployee({ id: 2 }) }));
    const dialog = await openAddDialog(user);

    await fillIn(user, dialog);
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(api.matching('POST', '/api/employees')[0]?.body).toEqual({
      fullName: 'Grace Hopper',
      email: 'grace@example.com',
      jobTitle: 'Software Engineer',
      department: 'Engineering',
      countryCode: 'US',
      salary: 85_000.5,
      startDate: '2024-03-01',
    });
    expect(api.listQueries()).toHaveLength(2);
  });

  it('shows the currency of the selected country next to the salary', async () => {
    const user = userEvent.setup();
    mockEmployeesApi(() => ({}));
    const dialog = await openAddDialog(user);

    await user.selectOptions(within(dialog).getByLabelText('Country'), 'JP');

    expect(within(dialog).getByLabelText('Annual salary (JPY)')).toBeInTheDocument();
  });

  it('shows the field errors from a 400 response next to each field', async () => {
    const user = userEvent.setup();
    mockEmployeesApi(() => ({
      status: 400,
      body: {
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Request validation failed',
          fields: {
            email: ['Must be a valid email address'],
            salary: ['USD amounts allow at most 2 decimal places'],
          },
        },
      },
    }));
    const dialog = await openAddDialog(user);

    await fillIn(user, dialog);
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));

    const form = within(dialog);
    expect(await form.findByText('Must be a valid email address')).toBeInTheDocument();
    expect(form.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
    expect(form.getByLabelText('Email')).toHaveAccessibleDescription(
      'Must be a valid email address',
    );
    expect(form.getByText('USD amounts allow at most 2 decimal places')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('explains a duplicate email clearly on 409', async () => {
    const user = userEvent.setup();
    mockEmployeesApi(() => ({
      status: 409,
      body: {
        error: { code: 'DUPLICATE_EMAIL', message: 'Email grace@example.com is already used' },
      },
    }));
    const dialog = await openAddDialog(user);

    await fillIn(user, dialog);
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));

    expect(
      await within(dialog).findByText('An employee with this email already exists.'),
    ).toBeInTheDocument();
  });

  it('pre-fills the form when editing and saves the changes with PUT', async () => {
    const user = userEvent.setup();
    const api = mockEmployeesApi(() => ({ body: anEmployee() }));
    render(<EmployeesPage />);
    await screen.findByText('Ada Lovelace');

    await user.click(screen.getByRole('button', { name: 'Edit Ada Lovelace' }));
    const form = within(screen.getByRole('dialog', { name: 'Edit employee' }));
    expect(form.getByLabelText('Full name')).toHaveValue('Ada Lovelace');
    expect(form.getByLabelText('Annual salary (USD)')).toHaveValue('120000');

    await user.clear(form.getByLabelText('Annual salary (USD)'));
    await user.type(form.getByLabelText('Annual salary (USD)'), '130000');
    await user.click(form.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(api.matching('PUT', '/api/employees/1')).toHaveLength(1));
    expect(api.matching('PUT', '/api/employees/1')[0]?.body).toMatchObject({
      fullName: 'Ada Lovelace',
      salary: 130_000,
    });
  });
});
