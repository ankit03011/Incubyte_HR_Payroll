import { render } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { routes } from '@/routes';

/** Renders the real route table at `path`, so tests exercise the shell, routing and URL state. */
export function renderApp(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return {
    router,
    location: () => router.state.location,
    searchParams: () => new URLSearchParams(router.state.location.search),
  };
}
