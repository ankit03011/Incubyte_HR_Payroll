import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Employee } from '@hr/shared';
import { CircleAlert, Plus, RotateCcw } from 'lucide-react';
import { Pagination } from '@/components/Pagination';
import { StateMessage } from '@/components/StateMessage';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { useAsync } from '@/lib/useAsync';
import { useDebouncedCallback } from '@/lib/useDebouncedCallback';
import { DeleteEmployeeDialog } from './DeleteEmployeeDialog';
import { EmployeeFilters, type Filters } from './EmployeeFilters';
import { EmployeeFormDialog } from './EmployeeFormDialog';
import { EmployeesTable, type Sort } from './EmployeesTable';
import { readView, toListQuery, writeView, type ListView } from './listView';

const SEARCH_DEBOUNCE_MS = 300;

type Dialog =
  | { kind: 'create' }
  | { kind: 'edit'; employee: Employee }
  | { kind: 'delete'; employee: Employee };

/** Search, filters, sort and page live in the URL, so refresh, links and Back all work. */
function useListView() {
  const [params, setParams] = useSearchParams();
  const queryString = params.toString();
  const view = useMemo(() => readView(new URLSearchParams(queryString)), [queryString]);

  /** Any change other than paging returns to page 1. Typing replaces the history entry. */
  const update = useCallback(
    (changes: Partial<ListView>, { replace = false } = {}) =>
      setParams((current) => writeView({ ...readView(current), page: 1, ...changes }), { replace }),
    [setParams],
  );

  /** Back to the default view (newest first, no search or filters), as a new history entry. */
  const reset = useCallback(() => setParams(new URLSearchParams()), [setParams]);

  return { view, queryString, update, reset };
}

export function EmployeesPage() {
  const { view, queryString, update, reset } = useListView();
  const isDefaultView = queryString === '';
  const [dialog, setDialog] = useState<Dialog>();

  // The input updates on every keystroke; the URL (and request) only once typing pauses.
  // When the URL changes from outside (Back), the input follows it.
  const [searchInput, setSearchInput] = useState(view.search);
  const [searchInUrl, setSearchInUrl] = useState(view.search);
  if (view.search !== searchInUrl) {
    setSearchInUrl(view.search);
    setSearchInput(view.search);
  }
  const commitSearch = useDebouncedCallback(
    (search: string) => update({ search: search.trim() }, { replace: true }),
    SEARCH_DEBOUNCE_MS,
  );

  const load = useCallback(
    (signal: AbortSignal) => api.listEmployees(toListQuery(view), signal),
    [view],
  );
  const employees = useAsync(load);

  const filters: Filters = {
    countryCode: view.countryCode,
    department: view.department,
    jobTitle: view.jobTitle,
  };
  const sort: Sort = { sortBy: view.sortBy, sortOrder: view.sortOrder };
  const closeDialog = () => setDialog(undefined);
  const afterChange = () => {
    closeDialog();
    employees.reload();
  };
  /** A new employee may not match the current filters; the default view shows them first. */
  const afterCreate = () => {
    closeDialog();
    if (isDefaultView) employees.reload();
    else reset();
  };

  return (
    <div className="grid gap-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <EmployeeFilters
          search={searchInput}
          onSearchChange={(search) => {
            setSearchInput(search);
            commitSearch(search);
          }}
          filters={filters}
          onFiltersChange={(next) => update(next)}
        />
        <div className="flex gap-2 lg:ml-auto">
          {!isDefaultView && (
            <Button variant="ghost" onClick={reset}>
              <RotateCcw /> Reset
            </Button>
          )}
          <Button className="flex-1 lg:flex-none" onClick={() => setDialog({ kind: 'create' })}>
            <Plus /> Add employee
          </Button>
        </div>
      </div>

      <div className="min-w-0 rounded-xl border bg-card shadow-xs">
        {employees.status === 'error' ? (
          <StateMessage
            tone="error"
            icon={CircleAlert}
            title="Couldn't load employees."
            description="Check your connection and try again."
            action={
              <Button variant="outline" onClick={employees.reload}>
                Try again
              </Button>
            }
          />
        ) : (
          <EmployeesTable
            employees={employees.data?.items ?? []}
            loading={employees.status === 'loading'}
            sort={sort}
            onSortChange={(next) => update(next)}
            listSearch={queryString}
            onEdit={(employee) => setDialog({ kind: 'edit', employee })}
            onDelete={(employee) => setDialog({ kind: 'delete', employee })}
          />
        )}
      </div>

      {employees.data && (
        <Pagination
          page={view.page}
          pageSize={view.pageSize}
          total={employees.data.total}
          onPageChange={(page) => update({ page })}
          onPageSizeChange={(pageSize) => update({ pageSize })}
        />
      )}

      {dialog?.kind === 'create' && (
        <EmployeeFormDialog onClose={closeDialog} onSaved={afterCreate} />
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
    </div>
  );
}
