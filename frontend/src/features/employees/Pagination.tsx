import { ChevronLeft, ChevronRight } from 'lucide-react';
import { NativeSelect } from '@/components/NativeSelect';
import { Button } from '@/components/ui/button';

export const PAGE_SIZES = [10, 25, 50, 100] as const;

interface Props {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

const count = new Intl.NumberFormat('en-US');

export function Pagination({ page, pageSize, total, onPageChange, onPageSizeChange }: Props) {
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-wrap items-center justify-end gap-4 text-sm">
      <label className="flex items-center gap-2 text-muted-foreground">
        Rows per page
        <NativeSelect
          value={pageSize}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
        >
          {PAGE_SIZES.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </NativeSelect>
      </label>
      <span className="tabular-nums text-muted-foreground">
        {count.format(first)}–{count.format(last)} of {count.format(total)}
      </span>
      <div className="flex gap-1">
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="Previous page"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft />
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="Next page"
          disabled={last >= total}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight />
        </Button>
      </div>
    </div>
  );
}
