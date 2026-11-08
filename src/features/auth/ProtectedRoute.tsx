import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAuth } from '@/features/auth/AuthContext';
import { SessionLoading } from '@/features/auth/SessionLoading';
import type { Location } from 'react-router-dom';
import type { ReactElement } from 'react';

/** Waits for the session to be restored, then redirects to /login, remembering where the user was headed. */
export function ProtectedRoute(): ReactElement {
  const { status } = useAuth();
  const location: Location = useLocation();

  if (status === 'loading') return <SessionLoading />;
  if (status === 'anonymous') return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}
