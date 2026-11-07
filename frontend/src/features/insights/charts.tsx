import type { SalaryBucket } from '@hr/shared';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCompactCount, formatCompactUsd, formatCount, formatMoney } from '@/lib/format';

/*
 * Chart conventions (dataviz guidance): one accent hue per single-series chart (--chart-bar),
 * no legend (the card title names the series), bars at most 24px thick with 4px rounded ends,
 * recessive grid and axes in muted ink, values in text colours, hover tooltip on every bar.
 */
const TICK = { fill: 'var(--muted-foreground)', fontSize: 12 };
const AXIS_LABEL = { fill: 'var(--muted-foreground)', fontSize: 12 };
const BAR_SIZE = 24;
const CURSOR = { fill: 'var(--muted)' };

interface TooltipProps {
  active?: boolean | undefined;
  payload?: readonly { payload?: unknown }[] | undefined;
}

function ChartTooltip({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md">
      <div className="text-muted-foreground">{title}</div>
      <div className="font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function firstPayload<T>({ active, payload }: TooltipProps): T | undefined {
  return active ? (payload?.[0]?.payload as T | undefined) : undefined;
}

const truncate = (text: string, max: number) =>
  text.length > max ? `${text.slice(0, max - 1)}…` : text;

interface CategoryTickProps {
  x?: number | string | undefined;
  y?: number | string | undefined;
  payload?: { value?: unknown } | undefined;
}

/** A single-line category label (Recharts' default wraps long ones into overlapping lines). */
function CategoryTick({ x, y, payload }: CategoryTickProps) {
  const label = String(payload?.value ?? '');
  return (
    <text x={Number(x)} y={Number(y)} dx={-6} dy={4} textAnchor="end" {...TICK}>
      <title>{label}</title>
      {truncate(label, 20)}
    </text>
  );
}

// ---------------------------------------------------------------------------------------------
// Salary distribution: a histogram of employees per USD band.

export const bucketLabel = (bucket: SalaryBucket) =>
  `${formatMoney(bucket.minSalary, 'USD')} – ${formatMoney(bucket.maxSalary, 'USD')}`;

export function DistributionChart({ buckets }: { buckets: SalaryBucket[] }) {
  return (
    <div
      role="img"
      aria-label="Salary distribution chart. Use Show table for the values."
      className="h-full"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={buckets} margin={{ top: 8, right: 8, bottom: 20, left: 4 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="minSalary"
            tickFormatter={formatCompactUsd}
            tick={TICK}
            tickLine={false}
            axisLine={{ stroke: 'var(--border)' }}
            label={{
              value: 'Annual salary (USD, band start)',
              position: 'insideBottom',
              offset: -14,
              ...AXIS_LABEL,
            }}
          />
          <YAxis
            allowDecimals={false}
            tickFormatter={formatCompactCount}
            tick={TICK}
            tickLine={false}
            axisLine={false}
            width={44}
            label={{ value: 'Employees', angle: -90, position: 'insideLeft', ...AXIS_LABEL }}
          />
          <Tooltip
            cursor={CURSOR}
            content={(props) => {
              const bucket = firstPayload<SalaryBucket>(props);
              return bucket ? (
                <ChartTooltip
                  title={bucketLabel(bucket)}
                  value={`${formatCount(bucket.headcount)} employees`}
                />
              ) : null;
            }}
          />
          <Bar
            isAnimationActive={false}
            dataKey="headcount"
            fill="var(--chart-bar)"
            radius={[4, 4, 0, 0]}
            maxBarSize={BAR_SIZE}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Ranked horizontal bars in USD (payroll by country, median salary by job title).

export interface RankedValue {
  label: string;
  value: number;
}

export function RankedBarChart({ data, valueName }: { data: RankedValue[]; valueName: string }) {
  return (
    <div
      role="img"
      aria-label={`${valueName} chart. Use Show table for the values.`}
      className="h-full"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, bottom: 20, left: 0 }}>
          <CartesianGrid horizontal={false} stroke="var(--border)" />
          <XAxis
            type="number"
            tickFormatter={formatCompactUsd}
            tick={TICK}
            tickLine={false}
            axisLine={{ stroke: 'var(--border)' }}
            label={{ value: valueName, position: 'insideBottom', offset: -14, ...AXIS_LABEL }}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={148}
            interval={0}
            tick={CategoryTick}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            cursor={CURSOR}
            content={(props) => {
              const row = firstPayload<RankedValue>(props);
              return row ? (
                <ChartTooltip title={row.label} value={formatMoney(row.value, 'USD')} />
              ) : null;
            }}
          />
          <Bar
            isAnimationActive={false}
            dataKey="value"
            fill="var(--chart-bar)"
            radius={[0, 4, 4, 0]}
            maxBarSize={BAR_SIZE}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** The table view behind every chart card: label, value. */
export function ValueTable({
  label,
  labelHeading,
  valueHeading,
  rows,
}: {
  /** Accessible name of the table. */
  label: string;
  labelHeading: string;
  valueHeading: string;
  rows: { key: string | number; label: string; value: string }[];
}) {
  return (
    <Table aria-label={label} containerClassName="h-full">
      <TableHeader sticky>
        <TableRow>
          <TableHead>{labelHeading}</TableHead>
          <TableHead className="text-right">{valueHeading}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.key}>
            <TableCell>{row.label}</TableCell>
            <TableCell className="text-right tabular-nums">{row.value}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
