import { useCallback } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { countryByCode, type EmployeeDetail } from '@hr/shared';
import { ArrowLeft, CircleAlert, UserX } from 'lucide-react';
import { StateMessage } from '@/components/StateMessage';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ApiRequestError, api } from '@/lib/api';
import { formatDate, formatMoney } from '@/lib/format';
import { useAsync } from '@/lib/useAsync';
import type { EmployeeLinkState } from './EmployeesTable';

function isNotFound(error: unknown): boolean {
  return error instanceof ApiRequestError && (error.status === 404 || error.status === 400);
}

function Details({ employee }: { employee: EmployeeDetail }) {
  const facts = [
    ['Email', employee.email],
    ['Job title', employee.jobTitle],
    ['Department', employee.department],
    ['Country', countryByCode(employee.countryCode).name],
    ['Start date', formatDate(employee.startDate)],
    ['Current salary', formatMoney(employee.salary, employee.currencyCode)],
  ] as const;

  return (
    <div className="grid gap-4 lg:grid-cols-[2fr_3fr]">
      <section className="grid content-start gap-4 rounded-xl border bg-card p-5 shadow-xs">
        <div>
          <h2 className="text-xl font-semibold">{employee.fullName}</h2>
          <p className="text-sm text-muted-foreground">
            {employee.jobTitle} · {countryByCode(employee.countryCode).name}
          </p>
        </div>
        <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          {facts.map(([term, value]) => (
            <div key={term} className="min-w-0">
              <dt className="text-muted-foreground">{term}</dt>
              <dd className="truncate font-medium">{value}</dd>
            </div>
          ))}
        </dl>
      </section>
      <section className="grid min-w-0 content-start gap-3 rounded-xl border bg-card p-5 shadow-xs">
        <h3 className="font-semibold">Salary history</h3>
        <Table aria-label="Salary history" containerClassName="max-h-96">
          <TableHeader sticky>
            <TableRow>
              <TableHead>Effective from</TableHead>
              <TableHead className="text-right">Annual salary</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employee.salaryHistory.map((entry, index) => (
              <TableRow key={index}>
                <TableCell>{formatDate(entry.effectiveFrom)}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatMoney(entry.salary, entry.currencyCode)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}

export function EmployeeDetailPage() {
  const id = Number(useParams().id);
  const linkState = useLocation().state as EmployeeLinkState | null;
  const backTo = `/employees${linkState?.listSearch ? `?${linkState.listSearch}` : ''}`;

  const load = useCallback((signal: AbortSignal) => api.getEmployee(id, signal), [id]);
  const employee = useAsync(load);

  return (
    <div className="grid gap-4">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to={backTo}>
            <ArrowLeft /> Back to employees
          </Link>
        </Button>
      </div>
      {employee.status === 'error' ? (
        <div className="rounded-xl border bg-card">
          {isNotFound(employee.error) ? (
            <StateMessage
              icon={UserX}
              title="Employee not found."
              description="They may have been deleted."
            />
          ) : (
            <StateMessage
              tone="error"
              icon={CircleAlert}
              title="Couldn't load this employee."
              action={
                <Button variant="outline" onClick={employee.reload}>
                  Try again
                </Button>
              }
            />
          )}
        </div>
      ) : employee.data ? (
        <Details employee={employee.data} />
      ) : (
        <Skeleton aria-label="Loading" className="h-72 w-full rounded-xl" />
      )}
    </div>
  );
}
