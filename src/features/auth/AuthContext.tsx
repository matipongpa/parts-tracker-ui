import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore } from 'react';

import { login as loginRequest, logout as logoutRequest } from '@/features/auth/api';
import { clearSession, getAccessToken, refreshAccessToken, setAccessToken, subscribeToken } from '@/lib/api/session';
import type { LoginCredentials, LoginResponse } from '@/features/auth/types';
import type { ReactElement, ReactNode } from 'react';

/** `loading` lasts only until the first refresh attempt settles, so a reload does not flash the login page. */
export type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

interface AuthContextValue {
  status: AuthStatus;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  /** Rejects if the server could not be told, because the refresh cookie would then still be live. */
  logout: () => Promise<void>;
}

const AuthContext: React.Context<AuthContextValue | null> = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }): ReactElement {
  // The access token is held in memory (lib/api/session); subscribing keeps this provider and the
  // 401 handler in the query cache in sync without duplicating the token in React state.
  const token: string | null = useSyncExternalStore(subscribeToken, getAccessToken, (): null => null);
  const [restored, setRestored] = useState<boolean>(false);

  // A reload wipes memory, so ask the server to turn the httpOnly cookie back into an access token.
  useEffect((): (() => void) => {
    let active: boolean = true;
    refreshAccessToken()
      .catch((error: unknown): void => {
        // Offline or server error: we cannot tell whether the session is valid, so show the login page.
        console.warn('Could not restore the session', error);
      })
      .finally((): void => {
        if (active) setRestored(true);
      });
    return (): void => {
      active = false;
    };
  }, []);

  const login: AuthContextValue['login'] = useCallback(async (credentials: LoginCredentials): Promise<void> => {
    const response: LoginResponse = await loginRequest(credentials);
    setAccessToken(response.token);
  }, []);

  const logout: AuthContextValue['logout'] = useCallback(async (): Promise<void> => {
    await logoutRequest();
    clearSession();
  }, []);

  const value: AuthContextValue = useMemo<AuthContextValue>((): AuthContextValue => {
    const status: AuthStatus = token !== null ? 'authenticated' : restored ? 'anonymous' : 'loading';
    return { status, isAuthenticated: token !== null, login, logout };
  }, [token, restored, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value: AuthContextValue | null = useContext(AuthContext);
  if (value === null) throw new Error('useAuth must be used inside <AuthProvider>');
  return value;
}
