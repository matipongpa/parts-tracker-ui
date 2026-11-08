import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAuth } from '@/lib/auth/AuthContext';
import type { Location } from 'react-router-dom';
import type { ReactElement } from 'react';

/** Redirects to /login, remembering where the user was headed. */
export function ProtectedRoute(): ReactElement {
  const { isAuthenticated } = useAuth();
  const location: Location = useLocation();

  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}
