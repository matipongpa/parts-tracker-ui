import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import { App } from '@/App';
import { purgeLegacyToken } from '@/lib/api/session';
import { createQueryClient } from '@/queryClient';
import type { QueryClient } from '@tanstack/react-query';

import './index.css';

const container: HTMLElement | null = document.getElementById('root');
if (container === null) throw new Error('Root element #root not found');

purgeLegacyToken();
const queryClient: QueryClient = createQueryClient();

createRoot(container).render(
  <StrictMode>
    <BrowserRouter>
      <App queryClient={queryClient} />
    </BrowserRouter>
  </StrictMode>,
);
