import { QueryClientProvider } from '@tanstack/react-query';
import { Navigate, Route, Routes } from 'react-router-dom';

import { AppShell } from '@/components/layout/AppShell';
import { AuthProvider } from '@/features/auth/AuthContext';
import { LoginPage } from '@/features/auth/LoginPage';
import { ProtectedRoute } from '@/features/auth/ProtectedRoute';
import { RegisterPage } from '@/features/auth/RegisterPage';
import { PartsPage } from '@/features/parts/PartsPage';
import type { QueryClient } from '@tanstack/react-query';
import type { ReactElement } from 'react';

export function App({ queryClient }: { queryClient: QueryClient }): ReactElement {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              <Route path="/parts" element={<PartsPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/parts" replace />} />
        </Routes>
      </AuthProvider>
    </QueryClientProvider>
  );
}
