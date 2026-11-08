import { useCallback, useState } from 'react';

type Theme = 'light' | 'dark';

const THEME_KEY: string = 'theme';

function readTheme(): Theme {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

/** The initial class is applied by the inline script in index.html; this hook toggles and persists it. */
export function useTheme(): { theme: Theme; toggleTheme: () => void } {
  const [theme, setTheme] = useState<Theme>(readTheme);

  const toggleTheme: () => void = useCallback((): void => {
    const next: Theme = readTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.classList.toggle('dark', next === 'dark');
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // Persisting is a convenience; the toggle still works for this session.
    }
    setTheme(next);
  }, []);

  return { theme, toggleTheme };
}
