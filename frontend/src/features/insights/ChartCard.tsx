import { useState, type ReactNode } from 'react';
import { Panel } from '@/components/Panel';
import { Button } from '@/components/ui/button';
import type { AsyncState } from '@/lib/useAsync';

interface Props<T> {
  title: string;
  description: string;
  filters?: ReactNode;
  state: AsyncState<T>;
  isEmpty: (data: T) => boolean;
  emptyMessage: string;
  chart: (data: T) => ReactNode;
  /** The same data as a table: readable without the chart, and printable. */
  table: (data: T) => ReactNode;
  className?: string | undefined;
  /** Body height in every state; taller for charts with many categories. */
  heightClassName?: string;
}

/**
 * A fixed-height card: skeleton, empty, error, chart and table all take the same space, so the
 * grid never jumps and a chart can't overflow its card.
 */
export function ChartCard<T>({
  filters,
  chart,
  table,
  heightClassName = 'h-80',
  ...panel
}: Props<T>) {
  const [view, setView] = useState<'chart' | 'table'>('chart');

  return (
    <Panel
      {...panel}
      bodyClassName={heightClassName}
      actions={
        <>
          {filters}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setView(view === 'chart' ? 'table' : 'chart')}
          >
            {view === 'chart' ? 'Show table' : 'Show chart'}
          </Button>
        </>
      }
    >
      {(data) => (view === 'chart' ? chart(data) : table(data))}
    </Panel>
  );
}
