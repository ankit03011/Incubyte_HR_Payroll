import { useCallback, useState } from 'react';
import { MAX_OUTLIERS_PAGE_SIZE, OUTLIER_THRESHOLDS, countryByCode } from '@hr/shared';
import { Pagination } from '@/components/Pagination';
import { Panel } from '@/components/Panel';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { api } from '@/lib/api';
import { formatMoney, formatRatio } from '@/lib/format';
import { useAsync } from '@/lib/useAsync';

const { above, below } = OUTLIER_THRESHOLDS;

export function OutliersPanel() {
  const [page, setPage] = useState(1);
  const load = useCallback(
    (signal: AbortSignal) =>
      api.insightsOutliers({ page, pageSize: MAX_OUTLIERS_PAGE_SIZE }, signal),
    [page],
  );
  const state = useAsync(load);

  return (
    <Panel
      title="Salary outliers"
      description={`Paid above ${above}× or below ${below}× the median for the same job title in the same country.`}
      state={state}
      isEmpty={(data) => data.total === 0}
      emptyMessage={`No outliers: everyone is paid within ${below}×–${above}× of their peer median.`}
    >
      {(data) => (
        <div className="grid gap-3">
          <Table containerClassName="max-h-[28rem]">
            <TableHeader sticky>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Job title</TableHead>
                <TableHead>Country</TableHead>
                <TableHead className="text-right">Salary</TableHead>
                <TableHead className="text-right">Salary (USD)</TableHead>
                <TableHead className="text-right">Peer median (USD)</TableHead>
                <TableHead className="text-right" title="Salary divided by the peer median">
                  Ratio
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((outlier) => (
                <TableRow key={outlier.id}>
                  <TableCell className="font-medium">{outlier.fullName}</TableCell>
                  <TableCell>{outlier.jobTitle}</TableCell>
                  <TableCell>{countryByCode(outlier.countryCode).name}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMoney(outlier.salary, outlier.currencyCode)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMoney(outlier.salaryUsd, 'USD')}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMoney(outlier.peerMedianSalaryUsd, 'USD')}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatRatio(outlier.ratioToPeerMedian)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination
            page={data.page}
            pageSize={data.pageSize}
            total={data.total}
            onPageChange={setPage}
          />
        </div>
      )}
    </Panel>
  );
}
