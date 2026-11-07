import { useCallback, useMemo, useState } from 'react';
import { DEFAULT_PAGE_SIZE, type Employee, type EmployeeListQuery } from '@hr/shared';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { useAsync } from '@/lib/useAsync';
import { useDebouncedValue } from '@/lib/useDebouncedValue';
import { DeleteEmployeeDialog } from './DeleteEmployeeDialog';
import { EmployeeDetailDialog } from './EmployeeDetailDialog';
import { EmployeeFilters, NO_FILTERS, type Filters } from './EmployeeFilters';
import { EmployeeFormDialog } from './EmployeeFormDialog';
import { EmployeesTable, type Sort } from './EmployeesTable';
import { Pagination } from './Pagination';

const SEARCH_DEBOUNCE_MS = 300;

type Dialog =
  | { kind: 'create' }
  | { kind: 'edit'; employee: Employee }
  | { kind: 'delete'; employee: Employee }
  | { kind: 'detail'; employee: Employee };

export function EmployeesPage() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim(), SEARCH_DEBOUNCE_MS);
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [sort, setSort] = useState<Sort>({ sortBy: 'name', sortOrder: 'asc' });
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [dialog, setDialog] = useState<Dialog>();

  // The page belongs to one combination of search/filters/sort/size; any change shows page 1.
  // Deriving this (instead of resetting it in an effect) avoids a request for a stale page.
  const viewKey = JSON.stringify([debouncedSearch, filters, sort, pageSize]);
  const [pageState, setPageState] = useState({ viewKey, page: 1 });
  const page = pageState.viewKey === viewKey ? pageState.page : 1;
  const setPage = (next: number) => setPageState({ viewKey, page: next });

  const query = useMemo<EmployeeListQuery>(
    () => ({
      page,
      pageSize,
      ...sort,
      ...filters,
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
    }),
    [page, pageSize, sort, filters, debouncedSearch],
  );
  const load = useCallback((signal: AbortSignal) => api.listEmployees(query, signal), [query]);
  const employees = useAsync(load);

  const closeDialog = () => setDialog(undefined);
  const afterChange = () => {
    closeDialog();
    employees.reload();
  };

  return (
    <section className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Employees</h1>
        <Button onClick={() => setDialog({ kind: 'create' })}>
          <Plus /> Add employee
        </Button>
      </div>

      <EmployeeFilters
        search={search}
        onSearchChange={setSearch}
        filters={filters}
        onFiltersChange={setFilters}
      />

      {employees.status === 'error' ? (
        <div
          role="alert"
          className="grid justify-items-center gap-3 rounded-lg border p-8 text-center"
        >
          <p>Couldn&apos;t load employees.</p>
          <Button variant="outline" onClick={employees.reload}>
            Try again
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border">
          <EmployeesTable
            employees={employees.data?.items ?? []}
            loading={employees.status === 'loading'}
            sort={sort}
            onSortChange={setSort}
            onOpen={(employee) => setDialog({ kind: 'detail', employee })}
            onEdit={(employee) => setDialog({ kind: 'edit', employee })}
            onDelete={(employee) => setDialog({ kind: 'delete', employee })}
          />
        </div>
      )}

      {employees.data && (
        <Pagination
          page={employees.data.page}
          pageSize={employees.data.pageSize}
          total={employees.data.total}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      )}

      {dialog?.kind === 'create' && (
        <EmployeeFormDialog onClose={closeDialog} onSaved={afterChange} />
      )}
      {dialog?.kind === 'edit' && (
        <EmployeeFormDialog
          key={dialog.employee.id}
          employee={dialog.employee}
          onClose={closeDialog}
          onSaved={afterChange}
        />
      )}
      {dialog?.kind === 'delete' && (
        <DeleteEmployeeDialog
          employee={dialog.employee}
          onClose={closeDialog}
          onDeleted={afterChange}
        />
      )}
      {dialog?.kind === 'detail' && (
        <EmployeeDetailDialog employee={dialog.employee} onClose={closeDialog} />
      )}
    </section>
  );
}
