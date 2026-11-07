import { Suspense, lazy } from 'react';
import { Navigate, type RouteObject } from 'react-router-dom';
import { AppShell, type RouteHandle } from '@/app/AppShell';
import { NotFoundPage } from '@/app/NotFoundPage';
import { Skeleton } from '@/components/ui/skeleton';
import { EmployeeDetailPage } from '@/features/employees/EmployeeDetailPage';
import { EmployeesPage } from '@/features/employees/EmployeesPage';

// The dashboard (and Recharts with it) loads on first visit, keeping the initial bundle small.
const InsightsPage = lazy(() =>
  import('@/features/insights/InsightsPage').then((module) => ({ default: module.InsightsPage })),
);

const handle = (title: string): RouteHandle => ({ title });

/** One route table for the browser (main.tsx) and for tests (createMemoryRouter). */
export const routes: RouteObject[] = [
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/employees" replace /> },
      { path: 'employees', element: <EmployeesPage />, handle: handle('Employees') },
      { path: 'employees/:id', element: <EmployeeDetailPage />, handle: handle('Employee') },
      {
        path: 'insights',
        handle: handle('Dashboard'),
        element: (
          <Suspense fallback={<Skeleton className="h-96 w-full" />}>
            <InsightsPage />
          </Suspense>
        ),
      },
      { path: '*', element: <NotFoundPage />, handle: handle('Page not found') },
    ],
  },
];
