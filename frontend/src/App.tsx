import { useState } from 'react';
import { EmployeesPage } from '@/features/employees/EmployeesPage';
import { InsightsPage } from '@/features/insights/InsightsPage';
import { cn } from '@/lib/utils';

const PAGES = { Employees: EmployeesPage, Insights: InsightsPage } as const;
type PageName = keyof typeof PAGES;

/** Two pages don't justify a router; the shell switches between them (see decisions.md). */
export function App() {
  const [current, setCurrent] = useState<PageName>('Employees');
  const Page = PAGES[current];

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4">
          <span className="font-semibold">HR Payroll</span>
          <nav aria-label="Main" className="flex gap-1">
            {(Object.keys(PAGES) as PageName[]).map((name) => (
              <button
                key={name}
                type="button"
                aria-current={current === name ? 'page' : undefined}
                onClick={() => setCurrent(name)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground',
                  current === name && 'bg-muted font-medium text-foreground',
                )}
              >
                {name}
              </button>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">
        <Page />
      </main>
    </div>
  );
}
