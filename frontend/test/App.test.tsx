import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { App } from '@/App';
import { aPage, anEmployee, mockApi } from './support/mockApi';

describe('App', () => {
  it('opens on Employees and navigates to Insights', async () => {
    const user = userEvent.setup();
    mockApi(() => ({ body: aPage([anEmployee()]) }));
    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Employees' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Employees' })).toHaveAttribute(
      'aria-current',
      'page',
    );

    await user.click(screen.getByRole('button', { name: 'Insights' }));

    expect(screen.getByRole('heading', { name: 'Insights' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Employees' })).not.toBeInTheDocument();
  });
});
