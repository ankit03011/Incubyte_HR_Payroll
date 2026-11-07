import { Link } from 'react-router-dom';
import { SearchX } from 'lucide-react';
import { StateMessage } from '@/components/StateMessage';
import { Button } from '@/components/ui/button';

export function NotFoundPage() {
  return (
    <div className="rounded-xl border bg-card">
      <StateMessage
        icon={SearchX}
        title="There's nothing at this address."
        description="The page may have moved, or the link may be mistyped."
        action={
          <Button asChild>
            <Link to="/employees">Go to employees</Link>
          </Button>
        }
      />
    </div>
  );
}
