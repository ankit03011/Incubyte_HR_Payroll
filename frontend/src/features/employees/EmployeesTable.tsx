import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { countryByCode, type Employee, type EmployeeSortField, type SortOrder } from '@hr/shared';
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

export interface Sort {
  sortBy: EmployeeSortField;
  sortOrder: SortOrder;
}

interface Props {
  employees: Employee[];
  loading: boolean;
  sort: Sort;
  onSortChange: (sort: Sort) => void;
  onOpen: (employee: Employee) => void;
  onEdit: (employee: Employee) => void;
  onDelete: (employee: Employee) => void;
}

const SKELETON_ROWS = 8;

function buildColumns({ onOpen, onEdit, onDelete }: Pick<Props, 'onOpen' | 'onEdit' | 'onDelete'>) {
  const columns: ColumnDef<Employee>[] = [
    {
      id: 'name',
      accessorKey: 'fullName',
      header: 'Name',
      cell: ({ row }) => (
        <button
          type="button"
          className="font-medium hover:underline"
          onClick={() => onOpen(row.original)}
        >
          {row.original.fullName}
        </button>
      ),
    },
    { id: 'email', header: 'Email', enableSorting: false, accessorKey: 'email' },
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
    <Table aria-busy={loading}>
      <TableHeader>
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
