import type { SalaryStatistics } from '@hr/shared';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCount, formatMoney } from '@/lib/format';

export interface StatisticsRow extends SalaryStatistics {
  key: string;
  label: string;
}

const AMOUNT_COLUMNS = ['minSalary', 'medianSalary', 'meanSalary', 'maxSalary'] as const;
const AMOUNT_HEADINGS = ['Min', 'Median', 'Mean', 'Max'];

/** Min/median/mean/max are in each row's own currency; payroll is always USD. */
export function StatisticsTable({
  labelHeading,
  rows,
}: {
  labelHeading: string;
  rows: StatisticsRow[];
}) {
  return (
    <Table containerClassName="max-h-[28rem]">
      <TableHeader sticky>
        <TableRow>
          <TableHead>{labelHeading}</TableHead>
          <TableHead className="text-right">Headcount</TableHead>
          {AMOUNT_HEADINGS.map((heading) => (
            <TableHead key={heading} className="text-right">
              {heading}
            </TableHead>
          ))}
          <TableHead className="text-right">Total payroll (USD)</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.key}>
            <TableCell className="font-medium">{row.label}</TableCell>
            <TableCell className="text-right tabular-nums">{formatCount(row.headcount)}</TableCell>
            {AMOUNT_COLUMNS.map((column) => (
              <TableCell key={column} className="text-right tabular-nums">
                {formatMoney(row[column], row.currencyCode)}
              </TableCell>
            ))}
            <TableCell className="text-right tabular-nums">
              {formatMoney(row.totalPayrollUsd, 'USD')}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
