import { useId, useState, type ReactNode } from 'react';
import { COUNTRIES, currencyFor, type Employee } from '@hr/shared';
import { NativeSelect } from '@/components/NativeSelect';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiRequestError, api, type EmployeeDraft } from '@/lib/api';

type FieldName =
  'fullName' | 'email' | 'jobTitle' | 'department' | 'countryCode' | 'salary' | 'startDate';
type Values = Record<FieldName, string>;
type FieldErrors = Partial<Record<FieldName, string[]>>;

const EMPTY: Values = {
  fullName: '',
  email: '',
  jobTitle: '',
  department: '',
  countryCode: '',
  salary: '',
  startDate: '',
};

const DUPLICATE_EMAIL_MESSAGE = 'An employee with this email already exists.';
const COUNTRY_OPTIONS = [...COUNTRIES].sort((a, b) => a.name.localeCompare(b.name));

function toValues(employee: Employee): Values {
  return {
    fullName: employee.fullName,
    email: employee.email,
    jobTitle: employee.jobTitle,
    department: employee.department,
    countryCode: employee.countryCode,
    salary: String(employee.salary),
    startDate: employee.startDate,
  };
}

/** Sends what was typed; the server is the single source of validation rules (see D-section). */
function toDraft({ salary, ...values }: Values): EmployeeDraft {
  const amount = salary.trim();
  return amount === '' ? values : { ...values, salary: Number(amount) };
}

function errorsFrom(error: unknown): { fields: FieldErrors; form?: string } {
  if (error instanceof ApiRequestError && error.status === 400) {
    return { fields: error.details?.fields ?? {} };
  }
  if (error instanceof ApiRequestError && error.status === 409) {
    return { fields: { email: [DUPLICATE_EMAIL_MESSAGE] } };
  }
  return { fields: {}, form: "Couldn't save the employee. Please try again." };
}

interface FieldProps {
  name: FieldName;
  label: string;
  errors: FieldErrors;
  children: (props: {
    id: string;
    'aria-invalid': boolean;
    'aria-describedby'?: string;
  }) => ReactNode;
}

function Field({ name, label, errors, children }: FieldProps) {
  const id = `${useId()}-${name}`;
  const messages = errors[name];
  const errorId = `${id}-error`;
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children({
        id,
        'aria-invalid': Boolean(messages),
        ...(messages ? { 'aria-describedby': errorId } : {}),
      })}
      {messages && (
        <p id={errorId} className="text-sm text-destructive">
          {messages.join(' ')}
        </p>
      )}
    </div>
  );
}

interface Props {
  /** Edit this employee, or create a new one when omitted. */
  employee?: Employee | undefined;
  onClose: () => void;
  onSaved: () => void;
}

export function EmployeeFormDialog({ employee, onClose, onSaved }: Props) {
  const [values, setValues] = useState<Values>(employee ? toValues(employee) : EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string>();
  const [saving, setSaving] = useState(false);

  const title = employee ? 'Edit employee' : 'Add employee';
  const currency = values.countryCode ? currencyFor(values.countryCode) : undefined;
  const text = (name: FieldName) => ({
    value: values[name],
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setValues({ ...values, [name]: event.target.value }),
  });

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const draft = toDraft(values);
      await (employee ? api.updateEmployee(employee.id, draft) : api.createEmployee(draft));
      onSaved();
    } catch (error) {
      const { fields, form } = errorsFrom(error);
      setErrors(fields);
      setFormError(form);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Salary is the annual gross amount in the currency of the employee&apos;s country.
          </DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={submit} className="grid gap-4">
          <Field name="fullName" label="Full name" errors={errors}>
            {(props) => <Input {...props} {...text('fullName')} autoComplete="off" />}
          </Field>
          <Field name="email" label="Email" errors={errors}>
            {(props) => <Input {...props} {...text('email')} type="email" autoComplete="off" />}
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field name="jobTitle" label="Job title" errors={errors}>
              {(props) => <Input {...props} {...text('jobTitle')} />}
            </Field>
            <Field name="department" label="Department" errors={errors}>
              {(props) => <Input {...props} {...text('department')} />}
            </Field>
            <Field name="countryCode" label="Country" errors={errors}>
              {(props) => (
                <NativeSelect {...props} {...text('countryCode')}>
                  <option value="">Select a country</option>
                  {COUNTRY_OPTIONS.map((country) => (
                    <option key={country.code} value={country.code}>
                      {country.name}
                    </option>
                  ))}
                </NativeSelect>
              )}
            </Field>
            <Field
              name="salary"
              label={currency ? `Annual salary (${currency})` : 'Annual salary'}
              errors={errors}
            >
              {(props) => <Input {...props} {...text('salary')} inputMode="decimal" />}
            </Field>
            <Field name="startDate" label="Start date" errors={errors}>
              {(props) => <Input {...props} {...text('startDate')} type="date" />}
            </Field>
          </div>
          {formError && (
            <p role="alert" className="text-sm text-destructive">
              {formError}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
