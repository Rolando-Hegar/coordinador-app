# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server on port 5175
npm run build     # Type-check (tsc -b) then bundle (vite build)
npm run preview   # Preview the production build locally
```

There are no tests or linters configured. Type-checking is done via `tsc -b` as part of the build.

## Architecture

### Overview

A mobile-first PWA dashboard for retail coordinators ("coordinadores de sala") to monitor store service tickets, technicians, and cash-change requests. Deployed on Vercel.

**Stack:** React 18 + TypeScript + Vite · Tailwind CSS · Zustand · Supabase (server-side only) · vite-plugin-pwa

---

### API Layer (`api/`)

All backend logic lives in two files:

- **`api/_coor_handler.ts`** — pure business logic. Exports `initCoordinator()`, `handleGet(params)`, and `handlePost(body)`. Speaks directly to Supabase using the service key. All timestamps use Mexico City timezone (`America/Mexico_City`).
- **`api/coordinator.ts`** — Vercel serverless entry point. Wraps the handler with CORS (restricted to two hardcoded origins), IP-based rate limiting (30 req/min), and HTTP method routing.

The API uses an **action dispatch pattern** rather than REST routes:
- `GET /api/coordinator?action=<name>&...params`
- `POST /api/coordinator` with body `{ action: string, data: {} }`

Available GET actions: `login`, `getResumen`, `getMisTiendas`, `getTecnicos`, `getEncargadas`, `getRanking`, `getCambios`  
Available POST actions: `reasignarTickets`, `autorizarCambio`, `rechazarCambio`

Errors are thrown with `Object.assign(new Error('msg'), { statusCode: 4xx })` so the entry point can forward the correct HTTP status.

**Dev parity:** `vite.config.ts` includes a custom Vite plugin (`coorApiPlugin`) that intercepts `/api/coordinator` requests in development, dynamically importing `_coor_handler.ts` and running the same logic — no separate dev API server needed.

Required env vars (`.env` file for local dev):
```
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
```

---

### Frontend (`src/`)

**State:** A single Zustand store (`src/store/app.ts`) holds the authenticated `Coordinador` object (persisted to `localStorage` under the key `coor-app`). Auth is purely client-side state — if the store has a coordinator, the user is logged in.

**Routing:** `src/App.tsx` defines all routes. The `AuthLayout` wrapper redirects to `/login` when no coordinator is in the store. The `/ranking` route is intentionally hidden from navigation — it is only reachable via a 1-second long-press on the coordinator's name in `Resumen.tsx`.

**API calls:** `src/lib/api.ts` exposes `api.get<T>(action, params)` and `api.post<T>(action, data)` — thin wrappers around `fetch` that map to the action dispatch pattern above.

**Screens** (`src/screens/`): Each screen is a self-contained component that fetches its own data on mount using the coordinator's `tiendas_asignadas` array as a filter. Data fetching pattern is consistent — local `loading`/`error`/`data` state, call on `useEffect` with coordinator dependency.

---

### Design System

Colors are defined as CSS custom properties in `src/index.css` and exposed as Tailwind utilities via `tailwind.config.ts`:

| Token | Purpose |
|-------|---------|
| `srv-bg` / `srv-surface` / `srv-surface2` | Dark background layers |
| `srv-accent` | Purple (#8B5CF6) — primary interactive color |
| `srv-text` / `srv-text-sub` / `srv-text-muted` | Text hierarchy |
| `srv-ok` / `srv-warn` / `srv-crit` | Status colors (green/amber/red) |

Reusable CSS component classes defined in `@layer components`: `.screen`, `.scroll-area`, `.card`, `.btn-primary`, `.btn-secondary`, `.label`. Use these instead of duplicating utility patterns.

Border radius helpers: `rounded-10`, `rounded-12`, `rounded-14` (custom values in Tailwind config).

Safe-area classes for mobile notch/home-bar: `.safe-top`, `.safe-bottom`.

The drawer navigation (`DrawerNav`) is always rendered inside `AuthLayout` and sits in a fixed overlay. Each screen uses `pl-14` on its header row to avoid overlapping the hamburger button.
