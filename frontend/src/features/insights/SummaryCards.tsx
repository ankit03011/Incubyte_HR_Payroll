import { useCallback, useId, type ReactNode } from 'react';
import type { InsightsSummary } from '@hr/shared';
import { Banknote, Calculator, CircleAlert, Scale, Users, type LucideIcon } from 'lucide-react';
import { StateMessage } from '@/components/StateMessage';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import { formatCompactUsd, formatCount, formatMoney } from '@/lib/format';
import { useAsync } from '@/lib/useAsync';

const usdOrDash = (amount: number | null) => (amount === null ? '—' : formatMoney(amount, 'USD'));

interface CardSpec {
  label: string;
  icon: LucideIcon;
  value: (summary: InsightsSummary) => string;
  /** Extra precision under the headline, e.g. the exact payroll behind "$715.9M". */
  detail?: (summary: InsightsSummary) => string;
}

const CARDS: CardSpec[] = [
  { label: 'Headcount', icon: Users, value: (s) => formatCount(s.headcount) },
  {
    label: 'Total payroll (USD)',
    icon: Banknote,
    value: (s) => formatCompactUsd(s.totalPayrollUsd),
    detail: (s) => `${formatMoney(s.totalPayrollUsd, 'USD')} per year`,
  },
  { label: 'Average salary (USD)', icon: Calculator, value: (s) => usdOrDash(s.meanSalaryUsd) },
  { label: 'Median salary (USD)', icon: Scale, value: (s) => usdOrDash(s.medianSalaryUsd) },
];

function Card({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon: LucideIcon;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <section
      aria-labelledby={id}
      className="grid min-w-0 gap-2 rounded-xl border bg-card p-4 shadow-xs sm:p-5"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 id={id} className="text-sm font-medium text-muted-foreground">
          {label}
        </h2>
        <Icon aria-hidden className="size-4 text-muted-foreground" />
      </div>
      {children}
    </section>
  );
}

/** Hero numbers rather than charts: each answers one question at a glance. */
export function SummaryCards() {
  const load = useCallback((signal: AbortSignal) => api.insightsSummary(signal), []);
  const summary = useAsync(load);

  if (summary.status === 'error') {
    return (
      <div className="rounded-xl border bg-card">
        <StateMessage
          tone="error"
          icon={CircleAlert}
          title="Couldn't load the summary."
          className="py-6"
          action={
            <Button variant="outline" size="sm" onClick={summary.reload}>
              Try again
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 xl:grid-cols-4">
      {CARDS.map(({ label, icon, value, detail }) => (
        <Card key={label} label={label} icon={icon}>
          {summary.data ? (
            <div className="min-w-0">
              <p className="truncate text-2xl font-semibold tabular-nums">{value(summary.data)}</p>
              {detail && (
                <p className="truncate text-xs text-muted-foreground tabular-nums">
                  {detail(summary.data)}
                </p>
              )}
            </div>
          ) : (
            <Skeleton aria-label="Loading" className="h-8 w-32" />
          )}
        </Card>
      ))}
    </div>
  );
}
