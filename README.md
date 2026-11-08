# parts-tracker-ui

Web UI for [parts-tracker-backend](../parts-tracker-backend): log in, then search and browse electronic parts across projects and PCBs.

**Stack:** React 19 · TypeScript (strict) · Vite · React Router · TanStack Query · Tailwind CSS v4 · Vitest + Testing Library.

## Run it

```bash
npm install
npm run dev        # http://localhost:4200
```

The API URL defaults to `http://localhost:8080/api`. Override it with a `.env.local` file:

```bash
VITE_API_URL=http://localhost:8080/api
```

The dev server is pinned to port **4200** (`strictPort`) because the backend's CORS allow-list (`internal/platform/httpx/cors.go`) only contains `http://localhost:4200`. If you deploy the UI elsewhere, add that origin to the backend.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | dev server with HMR |
| `npm run build` | typecheck, then production build to `dist/` |
| `npm run typecheck` | `tsc` only |
| `npm run lint` | ESLint (bans `any`, requires explicit return types) |
| `npm test` | unit and component tests (single file: `npx vitest run src/features/parts`) |

## Structure

```
src/
  components/ui/       Button, TextField, Skeleton: small, token-driven primitives
  components/layout/   AppShell (header, theme toggle, log out)
  features/auth/       LoginPage, shared AuthLayout
  features/parts/      PartsPage + filters, table, pagination, and their pure logic (query, pageItems, typeTone)
  lib/api/             fetch client (typed errors, runtime guards), auth + parts endpoints
  lib/auth/            token storage, AuthContext, ProtectedRoute
  hooks/               useDebounce, useTheme
  index.css            design tokens (light/dark) mapped into Tailwind
```

## Behaviour worth knowing

- **Filters and paging live in the URL** (`/parts?pn=LM358&type=Resistor&page=2&size=50`), so searches are shareable and Back/Forward work. `page` is 1-based in the URL, zero-based on the API.
- **Search is debounced** (300 ms); paging is immediate. Previous results stay on screen (dimmed) while the next page loads.
- **Auth:** the JWT is kept in `localStorage` under `token` (same key as the old Angular app). Any `401` from the API clears it and returns you to `/login`, then back to the page you were on.
- **Theming:** components use semantic tokens (`bg-surface`, `text-muted`, …) defined in `src/index.css`; light/dark is a `dark` class on `<html>`, set before first paint from the saved or system preference.

## Migration note

This replaced the Angular 20 + Angular Material app. The `docs/` folder still contains the **old Angular production build** and is untouched; it is not rebuilt from this code.
