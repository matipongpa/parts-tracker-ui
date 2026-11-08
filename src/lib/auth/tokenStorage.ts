// Same key the Angular app used, so existing sessions survive the migration.
const TOKEN_KEY: string = 'token';

type Listener = () => void;

const listeners: Set<Listener> = new Set<Listener>();

function notify(): void {
  listeners.forEach((listener: Listener): void => listener());
}

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    // Storage can throw (private mode, blocked site data); treat as logged out.
    return null;
  }
}

export function setToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } finally {
    notify();
  }
}

export function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } finally {
    notify();
  }
}

/** Subscribe to token changes, including ones made in other tabs. Returns an unsubscribe fn. */
export function subscribeToken(listener: Listener): () => void {
  listeners.add(listener);
  const onStorage: (event: StorageEvent) => void = (event: StorageEvent): void => {
    if (event.key === TOKEN_KEY || event.key === null) listener();
  };
  window.addEventListener('storage', onStorage);
  return (): void => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}
