import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

import { clearSession } from '@/lib/api/session';

afterEach((): void => {
  cleanup();
  clearSession();
  localStorage.clear();
});
