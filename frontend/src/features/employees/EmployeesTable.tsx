import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { countryByCode, type Employee, type EmployeeSortField, type SortOrder } from '@hr/shared';
import { Link } from 'react-router-dom';
import { ArrowDown, ArrowUp, ArrowUpDown, Pencil, Trash2 } from 'lucide-react';
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
import { formatDate, formatMoney } from '@/lib/format';

/** Router state passed to the employee page. */
export interface EmployeeLinkState {
  listSearch: string;
}

export interface Sort {
  sortBy: EmployeeSortField;
  sortOrder: SortOrder;
}

interface Props {
  employees: Employee[];
  loading: boolean;
  sort: Sort;
  onSortChange: (sort: Sort) => void;
  /** The list's query string, so the detail page can link back to the same filtered view. */
  listSearch: string;
  onEdit: (employee: Employee) => void;
  onDelete: (employee: Employee) => void;
}

const SKELETON_ROWS = 8;

function buildColumns({
  listSearch,
  onEdit,
  onDelete,
}: Pick<Props, 'listSearch' | 'onEdit' | 'onDelete'>) {
  const columns: ColumnDef<Employee>[] = [
    {
      id: 'name',
      accessorKey: 'fullName',
      header: 'Name',
      // Email sits under the name: one column instead of two keeps the table within a laptop width.
      cell: ({ row }) => (
        <div className="grid">
          <Link
            to={`/employees/${row.original.id}`}
            state={{ listSearch } satisfies EmployeeLinkState}
            className="w-fit rounded-sm font-medium text-foreground underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
          >
            {row.original.fullName}
          </Link>
          <span className="text-xs text-muted-foreground">{row.original.email}</span>
        </div>
      ),
    },
    {
      id: 'country',
      header: 'Country',
      enableSorting: false,
      cell: ({ row }) => countryByCode(row.original.countryCode).name,
    },
    { id: 'department', header: 'Department', enableSorting: false, accessorKey: 'department' },
    { id: 'jobTitle', header: 'Job title', enableSorting: false, accessorKey: 'jobTitle' },
    {
      id: 'salary',
      accessorKey: 'salary',
      header: 'Salary',
      cell: ({ row }) => formatMoney(row.original.salary, row.original.currencyCode),
    },
    {
      id: 'startDate',
      accessorKey: 'startDate',
      header: 'Start date',
      cell: ({ row }) => formatDate(row.original.startDate),
    },
    {
      id: 'actions',
      header: () => <span className="sr-only">Actions</span>,
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Edit ${row.original.fullName}`}
            onClick={() => onEdit(row.original)}
          >
            <Pencil />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Delete ${row.original.fullName}`}
            onClick={() => onDelete(row.original)}
          >
            <Trash2 />
          </Button>
        </div>
      ),
    },
  ];
  return columns;
}

function SortIcon({ direction }: { direction: false | 'asc' | 'desc' }) {
  if (direction === 'asc') return <ArrowUp aria-hidden />;
  if (direction === 'desc') return <ArrowDown aria-hidden />;
  return <ArrowUpDown aria-hidden className="opacity-40" />;
}

/** Sorting and pagination are server-side: the table only renders what the API returned. */
export function EmployeesTable({ employees, loading, sort, onSortChange, ...actions }: Props) {
  const sorting: SortingState = [{ id: sort.sortBy, desc: sort.sortOrder === 'desc' }];

  // TanStack Table returns non-memoisable functions; fine here because no React Compiler is used.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: employees,
    columns: buildColumns(actions),
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    enableSortingRemoval: false,
    sortDescFirst: false,
    state: { sorting },
    onSortingChange: (updater) => {
      const [next] = typeof updater === 'function' ? updater(sorting) : updater;
      if (next)
        onSortChange({
          sortBy: next.id as EmployeeSortField,
          sortOrder: next.desc ? 'desc' : 'asc',
        });
    },
  });
  const columnCount = table.getAllLeafColumns().length;

  return (
    // Fixed-height scroll area with a sticky header keeps pagination in view below the table.
    // lg+: one-row toolbar, so reserve only top bar, padding, toolbar, gaps and pagination (~13rem).
    // Below lg the toolbar stacks, so keep a generous reserve with a usable minimum height.
    <Table
      aria-busy={loading}
      containerClassName="max-h-[max(24rem,calc(100svh-17rem))] lg:max-h-[max(20rem,calc(100svh-13.5rem))]"
    >
      <TableHeader sticky>
        {table.getHeaderGroups().map((group) => (
          <TableRow key={group.id}>
            {group.headers.map((header) => {
              const direction = header.column.getIsSorted();
              return (
                <TableHead
                  key={header.id}
                  aria-sort={
                    direction ? (direction === 'asc' ? 'ascending' : 'descending') : undefined
                  }
                >
                  {header.column.getCanSort() ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="-ml-2"
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      <SortIcon direction={direction} />
                    </Button>
                  ) : (
                    flexRender(header.column.columnDef.header, header.getContext())
                  )}
                </TableHead>
              );
            })}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {loading && employees.length === 0
          ? Array.from({ length: SKELETON_ROWS }, (_, index) => (
              <TableRow key={index}>
                <TableCell colSpan={columnCount}>
                  <Skeleton className="h-5 w-full" />
                </TableCell>
              </TableRow>
            ))
          : table.getRowModel().rows.map((row) => (
              <TableRow key={row.id} className={loading ? 'opacity-60' : undefined}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className={cell.column.id === 'salary' ? 'tabular-nums' : undefined}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
        {!loading && employees.length === 0 && (
          <TableRow>
            <TableCell colSpan={columnCount} className="h-24 text-center text-muted-foreground">
              No employees match your search or filters.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
