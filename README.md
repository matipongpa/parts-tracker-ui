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

The dev server is pinned to port **4200** (`strictPort`) because the backend's CORS allow-list defaults to `http://localhost:4200`. If you deploy the UI elsewhere, add its origin to the backend's `CORS_ALLOWED_ORIGINS`. The refresh cookie also needs `COOKIE_SECURE=false` on the backend for plain-HTTP local dev, and `COOKIE_SAMESITE=none` (with HTTPS) if the UI and API are on different sites; see the backend README.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | dev server with HMR |
| `npm run build` | typecheck, then production build to `dist/` |
| `npm run typecheck` | `tsc` only |
| `npm run lint` | ESLint (bans `any`, requires explicit return types) |
| `npm test` | unit and component tests (single file: `npx vitest run src/features/parts`) |

## Structure

Organised by feature: everything for a feature (API calls, types, hooks, components, tests) lives in its folder. `lib/` and `components/` are shared and must not import from `features/`.

```
src/
  components/ui/       Button, TextField, Skeleton: small, token-driven primitives
  components/layout/   AppShell (header, Ask AI toggle, theme toggle, log out)
  features/auth/       api, types, AuthContext (session restore), ProtectedRoute, LoginPage, RegisterPage
  features/parts/      api, types, usePartsSearch, searchParams (URL <-> filters), PartsPage, table, pagination
  features/assistant/  AskPanel (right-hand overlay) with AskForm (new question), HistoryEntryView (saved answer), HistoryList, api, useAssistantHistory
  lib/api/             fetch client with silent token refresh, in-memory session, typed errors, runtime guards
  hooks/               useDebounce, useTheme
  index.css            design tokens (light/dark) mapped into Tailwind
```

## Behaviour worth knowing

- **Filters and paging live in the URL** (`/parts?pn=LM358&type=Resistor&page=2&size=50`), so searches are shareable and Back/Forward work. `page` is 1-based in the URL, zero-based on the API.
- **Search is debounced** (300 ms); paging is immediate. Previous results stay on screen (dimmed) while the next page loads.
- **Auth:** the short-lived access token is kept in memory only (`lib/api/session.ts`), never in `localStorage`. The long-lived credential is an `httpOnly` refresh cookie set by the backend, which page scripts cannot read. On every reload `AuthProvider` calls `POST /auth/refresh` to turn the cookie back into an access token (a "Restoring your session…" state shows meanwhile). A `401` on any request triggers one refresh and a retry; if that fails you are returned to `/login`, then back to the page you were on. Logging out calls `POST /auth/logout` so the server drops the cookie; if that call fails you stay signed in rather than appear logged out with a live cookie. Sessions are per tab: logging out in one tab does not end another tab until it refreshes. The old `localStorage` token is deleted on first load.
- **Ask AI:** the "Ask AI" button in the header opens a panel over the right-hand side of the page (it is not a route, so there is no `/ask` URL and the page behind stays usable; Esc or the close button hides it). The panel stays mounted while closed and while you browse other pages, so a half-typed question or a request in flight is not lost. A question goes to `POST /api/ask` and the model's answer is shown above the parts its lookups returned (taken from the database, not from the model's text). Every answered question is saved on the server for that user (the newest 100): the history button in the panel lists them, and opening one shows the exact question and answer plus the parts as they were when asked, without calling the model. Deleting takes two clicks. If saving fails the answer is still shown, with a warning. Answers render as plain text because they are built from uploaded spreadsheet content. The ask route only exists when the backend has an AI key configured; otherwise the panel says the assistant is not enabled (saved history stays readable). A question can take up to 90 s, so the button is disabled while one is in flight. Ctrl/Cmd+Enter submits. Cached history is cleared whenever the session ends, so the next user on the same tab never sees it.
- **Registration:** `/register` needs the team invite code, which the backend checks against `REGISTER_INVITE_CODE`. If that variable is unset the backend answers 403 "Registration is closed". After a successful sign-up the page logs you in.
- **Theming:** components use semantic tokens (`bg-surface`, `text-muted`, …) defined in `src/index.css`; light/dark is a `dark` class on `<html>`, set before first paint from the saved or system preference.

## Migration note

This replaced the Angular 20 + Angular Material app. The `docs/` folder still contains the **old Angular production build** and is untouched; it is not rebuilt from this code.
