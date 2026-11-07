import { useEffect, useState } from 'react';
import { NavLink, Outlet, useMatches } from 'react-router-dom';
import {
  Banknote,
  LayoutDashboard,
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Sun,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useTheme } from '@/lib/useTheme';
import { cn } from '@/lib/utils';

/** Add future sections here (e.g. Payroll runs, Reports); the sidebar and drawer pick them up. */
const NAV_ITEMS: { to: string; label: string; icon: LucideIcon }[] = [
  { to: '/insights', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/employees', label: 'Employees', icon: Users },
];

export interface RouteHandle {
  title: string;
}

function usePageTitle(): string {
  const matches = useMatches();
  const title =
    matches
      .map((match) => (match.handle as RouteHandle | undefined)?.title)
      .filter(Boolean)
      .at(-1) ?? 'HR Payroll';

  useEffect(() => {
    document.title = `${title} · HR Payroll`;
  }, [title]);

  return title;
}

function NavItems({
  label,
  collapsed = false,
  onNavigate,
}: {
  label: string;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <nav aria-label={label} className="grid gap-1 px-2">
      {NAV_ITEMS.map(({ to, label: itemLabel, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          title={collapsed ? itemLabel : undefined}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'flex h-9 items-center gap-3 rounded-md px-3 text-sm text-sidebar-foreground/80 outline-none transition-colors',
              'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-ring',
              isActive && 'bg-sidebar-accent font-medium text-sidebar-accent-foreground',
              collapsed && 'justify-center px-0',
            )
          }
        >
          {({ isActive }) => (
            <>
              <Icon
                aria-hidden
                className={cn('size-4 shrink-0', isActive && 'text-sidebar-primary')}
              />
              <span className={collapsed ? 'sr-only' : 'truncate'}>{itemLabel}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

function Brand({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <div
      className={cn(
        'flex h-14 items-center gap-2 px-4 font-semibold',
        collapsed && 'justify-center px-0',
      )}
    >
      <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <Banknote aria-hidden className="size-4" />
      </span>
      <span className={collapsed ? 'sr-only' : undefined}>HR Payroll</span>
    </div>
  );
}

export function AppShell() {
  const title = usePageTitle();
  const { theme, toggleTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="flex min-h-svh bg-muted/40">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'sticky top-0 hidden h-svh shrink-0 flex-col border-r bg-sidebar transition-[width] md:flex',
          collapsed ? 'w-16' : 'w-60',
        )}
      >
        <Brand collapsed={collapsed} />
        <NavItems label="Main" collapsed={collapsed} />
        <div className={cn('mt-auto p-2', collapsed && 'flex justify-center')}>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
          </Button>
        </div>
      </aside>

      {/* Mobile drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="left" className="w-64 bg-sidebar p-0">
          <SheetHeader className="p-0">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <Brand />
          </SheetHeader>
          <NavItems label="Mobile" onNavigate={() => setDrawerOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur md:px-6">
          <Button
            variant="ghost"
            size="icon-sm"
            className="md:hidden"
            aria-label="Open navigation"
            onClick={() => setDrawerOpen(true)}
          >
            <Menu />
          </Button>
          <h1 className="truncate text-lg font-semibold">{title}</h1>
          <Button
            variant="ghost"
            size="icon-sm"
            className="ml-auto"
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            onClick={toggleTheme}
          >
            {theme === 'dark' ? <Sun /> : <Moon />}
          </Button>
        </header>
        <main className="mx-auto w-full max-w-7xl min-w-0 flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
