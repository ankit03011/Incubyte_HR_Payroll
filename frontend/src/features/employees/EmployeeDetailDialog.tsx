import { useCallback } from 'react';
import { countryByCode, type Employee } from '@hr/shared';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { api } from '@/lib/api';
import { formatDate, formatMoney } from '@/lib/format';
import { useAsync } from '@/lib/useAsync';

interface Props {
  employee: Employee;
  onClose: () => void;
}

export function EmployeeDetailDialog({ employee, onClose }: Props) {
  const load = useCallback(
    (signal: AbortSignal) => api.getEmployee(employee.id, signal),
    [employee.id],
  );
  const detail = useAsync(load);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{employee.fullName}</DialogTitle>
          <DialogDescription>
            {employee.jobTitle} · {employee.department} · {countryByCode(employee.countryCode).name}
          </DialogDescription>
        </DialogHeader>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-muted-foreground">Email</dt>
            <dd>{employee.email}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Start date</dt>
            <dd>{formatDate(employee.startDate)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Current salary</dt>
            <dd className="font-medium tabular-nums">
              {formatMoney(employee.salary, employee.currencyCode)}
            </dd>
          </div>
        </dl>
        <section className="grid gap-2">
          <h3 className="text-sm font-medium">Salary history</h3>
          {detail.status === 'error' && (
            <p role="alert" className="text-sm text-destructive">
              Couldn&apos;t load the salary history.
            </p>
          )}
          {detail.status === 'loading' && <Skeleton className="h-16 w-full" />}
          {detail.status === 'success' && detail.data && (
            <Table aria-label="Salary history">
              <TableHeader>
                <TableRow>
                  <TableHead>Effective from</TableHead>
                  <TableHead className="text-right">Salary</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detail.data.salaryHistory.map((entry, index) => (
                  <TableRow key={index}>
                    <TableCell>{formatDate(entry.effectiveFrom)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoney(entry.salary, entry.currencyCode)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </section>
      </DialogContent>
    </Dialog>
  );
}
