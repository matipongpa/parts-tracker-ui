import { useCallback, useState } from 'react';
import { CircuitBoard, List, LogOut, Moon, Sparkles, Sun } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';

import { Button } from '@/components/ui/Button';
import { ASK_PANEL_ID, AskPanel } from '@/features/assistant/AskPanel';
import { useAuth } from '@/features/auth/AuthContext';
import { useTheme } from '@/hooks/useTheme';
import { ApiError } from '@/lib/api/errors';
import { cn } from '@/lib/cn';
import type { LucideIcon } from 'lucide-react';
import type { ReactElement } from 'react';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

const NAV_ITEMS: ReadonlyArray<NavItem> = [{ to: '/parts', label: 'Parts', icon: List }];

const NAV_ITEM_CLASS = 'inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium transition-colors';

export function AppShell(): ReactElement {
  const { logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [loggingOut, setLoggingOut] = useState<boolean>(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [askOpen, setAskOpen] = useState<boolean>(false);
  const closeAsk: () => void = useCallback((): void => setAskOpen(false), []);

  async function handleLogout(): Promise<void> {
    setLoggingOut(true);
    setLogoutError(null);
    try {
      await logout();
      // On success the session is gone and ProtectedRoute unmounts this shell.
    } catch (error: unknown) {
      // The refresh cookie is still live, so stay signed in rather than pretend we logged out.
      setLogoutError(error instanceof ApiError ? error.message : 'Could not log out. Please try again.');
      setLoggingOut(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-surface/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2.5">
              <span className="grid size-8 place-items-center rounded-lg bg-accent text-accent-fg">
                <CircuitBoard className="size-4.5" aria-hidden="true" />
              </span>
              <span className="hidden text-[15px] font-semibold tracking-tight sm:inline">Parts Tracker</span>
            </div>
            <nav aria-label="Main" className="flex items-center gap-1">
              {NAV_ITEMS.map(({ to, label, icon: Icon }: NavItem): ReactElement => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }: { isActive: boolean }): string =>
                    cn(NAV_ITEM_CLASS, isActive ? 'bg-accent-soft text-accent' : 'text-muted hover:bg-surface-2 hover:text-fg')
                  }
                >
                  <Icon className="size-4" aria-hidden="true" />
                  {label}
                </NavLink>
              ))}
              {/* Not a route: Ask AI is an overlay that stays open while you move between pages. */}
              <button
                type="button"
                aria-expanded={askOpen}
                aria-controls={ASK_PANEL_ID}
                onClick={(): void => setAskOpen((current: boolean): boolean => !current)}
                className={cn(NAV_ITEM_CLASS, askOpen ? 'bg-accent-soft text-accent' : 'text-muted hover:bg-surface-2 hover:text-fg')}
              >
                <Sparkles className="size-4" aria-hidden="true" />
                Ask AI
              </button>
            </nav>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              className="px-2"
            >
              {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </Button>
            {logoutError && (
              <span role="alert" className="mr-2 text-sm text-danger">
                {logoutError}
              </span>
            )}
            <Button variant="ghost" size="sm" loading={loggingOut} onClick={(): void => void handleLogout()}>
              <LogOut className="size-4" aria-hidden="true" />
              <span className="hidden sm:inline">Log out</span>
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <Outlet />
      </main>
      <AskPanel open={askOpen} onClose={closeAsk} />
    </div>
  );
}
