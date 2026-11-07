import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface Props {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  /** Errors are announced to screen readers. */
  tone?: 'neutral' | 'error';
  className?: string;
}

/** The one look for empty, error and not-found states across the app. */
export function StateMessage({
  icon: Icon,
  title,
  description,
  action,
  tone = 'neutral',
  className,
}: Props) {
  return (
    <div
      role={tone === 'error' ? 'alert' : undefined}
      className={cn(
        'flex h-full flex-col items-center justify-center gap-2 px-4 py-10 text-center',
        className,
      )}
    >
      <Icon
        aria-hidden
        className={cn('size-8', tone === 'error' ? 'text-destructive' : 'text-muted-foreground')}
      />
      <p className="font-medium">{title}</p>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
