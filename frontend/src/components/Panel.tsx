import { useId, type ReactNode } from 'react';
import { CircleAlert, Inbox } from 'lucide-react';
import { StateMessage } from '@/components/StateMessage';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { AsyncState } from '@/lib/useAsync';
import { cn } from '@/lib/utils';

interface Props<T> {
  title: string;
  description?: string;
  /** Filters or toggles shown in the panel header. */
  actions?: ReactNode;
  state: AsyncState<T>;
  isEmpty: (data: T) => boolean;
  emptyMessage: string;
  children: (data: T) => ReactNode;
  /**
   * Applied to the body in every state (e.g. a fixed chart height), so loading, empty and error
   * states take the same space as the content and the layout never jumps.
   */
  bodyClassName?: string;
  className?: string | undefined;
}

/**
 * A titled card that owns its loading, empty and error states, so one failing endpoint shows an
 * error in its own card instead of blanking the page.
 */
export function Panel<T>({
  title,
  description,
  actions,
  bodyClassName,
  className,
  ...body
}: Props<T>) {
  const headingId = useId();

  return (
    <section
      aria-labelledby={headingId}
      className={cn(
        'flex min-w-0 flex-col gap-4 rounded-xl border bg-card p-4 shadow-xs sm:p-5',
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 sm:flex-nowrap">
        <div className="min-w-0">
          <h2 id={headingId} className="text-base font-semibold">
            {title}
          </h2>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        {actions && (
          <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">{actions}</div>
        )}
      </div>
      <div className={cn('min-w-0', bodyClassName)}>
        <PanelBody {...body} />
      </div>
    </section>
  );
}

function PanelBody<T>({
  state,
  isEmpty,
  emptyMessage,
  children,
}: Pick<Props<T>, 'state' | 'isEmpty' | 'emptyMessage' | 'children'>) {
  if (state.status === 'error') {
    return (
      <StateMessage
        tone="error"
        icon={CircleAlert}
        title="Couldn't load this panel."
        action={
          <Button variant="outline" size="sm" onClick={state.reload}>
            Try again
          </Button>
        }
      />
    );
  }
  if (state.data === undefined)
    return <Skeleton aria-label="Loading" className="h-full min-h-32 w-full" />;
  if (isEmpty(state.data)) return <StateMessage icon={Inbox} title={emptyMessage} />;
  return (
    <div className={cn('h-full', state.status === 'loading' && 'opacity-60 transition-opacity')}>
      {children(state.data)}
    </div>
  );
}
