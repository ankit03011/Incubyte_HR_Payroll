import { useState } from 'react';
import type { Employee } from '@hr/shared';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { api } from '@/lib/api';

interface Props {
  employee: Employee;
  onClose: () => void;
  onDeleted: () => void;
}

export function DeleteEmployeeDialog({ employee, onClose, onDeleted }: Props) {
  const [deleting, setDeleting] = useState(false);
  const [failed, setFailed] = useState(false);

  async function confirm(event: React.MouseEvent) {
    event.preventDefault(); // keep the dialog open until the delete has succeeded
    setDeleting(true);
    try {
      await api.deleteEmployee(employee.id);
      onDeleted();
    } catch {
      setFailed(true);
      setDeleting(false);
    }
  }

  return (
    <AlertDialog open onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {employee.fullName}?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently removes the employee and their salary history. It can&apos;t be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {failed && (
          <p role="alert" className="text-sm text-destructive">
            Couldn&apos;t delete the employee. Please try again.
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" disabled={deleting} onClick={confirm}>
            {deleting ? 'Deleting…' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
