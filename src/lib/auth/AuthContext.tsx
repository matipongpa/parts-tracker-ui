import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from 'react';

import { login as loginRequest } from '@/lib/api/auth';
import { clearToken, getToken, setToken, subscribeToken } from '@/lib/auth/tokenStorage';
import type { LoginCredentials, LoginResponse } from '@/lib/types';
import type { ReactElement, ReactNode } from 'react';

interface AuthContextValue {
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
}

const AuthContext: React.Context<AuthContextValue | null> = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }): ReactElement {
  // The token lives in localStorage; subscribing keeps every tab (and the 401
  // handler in the query cache) in sync without duplicating it in React state.
  const token: string | null = useSyncExternalStore(subscribeToken, getToken, (): null => null);

  const login: AuthContextValue['login'] = useCallback(async (credentials: LoginCredentials): Promise<void> => {
    const response: LoginResponse = await loginRequest(credentials);
    setToken(response.token);
  }, []);

  const logout: AuthContextValue['logout'] = useCallback((): void => {
    clearToken();
  }, []);

  const value: AuthContextValue = useMemo<AuthContextValue>(
    (): AuthContextValue => ({ isAuthenticated: token !== null, login, logout }),
    [token, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value: AuthContextValue | null = useContext(AuthContext);
  if (value === null) throw new Error('useAuth must be used inside <AuthProvider>');
  return value;
}
