# Trucking ELD — Frontend

React + TypeScript SPA that provides the ELD Trip Planner UI. Accepts trip details, displays an interactive route map with Leaflet, and renders pixel-perfect ELD daily log sheets onto HTML Canvas — all driven by the Django REST API.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Component Architecture](#component-architecture)
  - [App.tsx](#apptsx)
  - [TripForm](#tripform)
  - [RouteMap](#routemap)
  - [LogSheetCanvas](#logsheetcanvas)
  - [LogSheetList](#logsheetlist)
- [API Client](#api-client)
- [Configuration & Environment Variables](#configuration--environment-variables)
- [Local Development](#local-development)
- [Deployment (Vercel)](#deployment-vercel)
- [UI Component Library](#ui-component-library)

---

## Overview

The frontend is a **single-page application** with no client-side state persistence. On each form submission it:

1. Sends a `POST /api/trips/plan/` request to the backend.
2. Renders the returned route geometry on an interactive **Leaflet map** with color-coded markers (start, pickup, dropoff, fuel stops, rest stops).
3. Renders each day's HOS activity as a **canvas-drawn ELD log sheet** — faithfully reproducing the physical paper logbook grid, remarks section, and totals row.
4. Exposes a **PNG download** button for each log sheet.

---

## Tech Stack

| Category | Library / Tool |
|---|---|
| UI framework | React 18 + TypeScript |
| Build tool | Vite 5 |
| Styling | Tailwind CSS 3 |
| Component primitives | Radix UI |
| Data fetching | TanStack Query v5 |
| Forms | React Hook Form |
| Map | Leaflet + react-leaflet |
| Icons | Lucide React |
| Dark mode | next-themes (via custom ThemeProvider) |
| Linting / types | TypeScript strict mode |

---

## Project Structure

```
frontend/
├── index.html
├── vite.config.ts            # Dev proxy → http://127.0.0.1:8000
├── tsconfig.json
├── tailwind.config.js
├── postcss.config.js
├── vercel.json               # SPA rewrite rule for client-side routing
├── .env.example              # Environment variable template
└── src/
    ├── main.tsx              # React root mount + QueryClient setup
    ├── App.tsx               # Root layout, tab state, mutation handler
    ├── api.ts                # API client, TypeScript types, planTrip()
    ├── index.css             # Tailwind directives + CSS custom properties
    └── components/
        ├── TripForm.tsx          # Trip input form with Nominatim autocomplete
        ├── RouteMap.tsx          # Leaflet map with route polyline + markers
        ├── LogSheetCanvas.tsx    # HTML Canvas ELD log sheet renderer
        ├── LogSheetList.tsx      # Scrollable list of log sheets
        ├── theme-provider.tsx    # Dark/light mode context
        ├── theme-toggle.tsx      # Header theme toggle button
        └── ui/
            ├── badge.tsx
            ├── button.tsx
            ├── card.tsx
            ├── input.tsx
            ├── label.tsx
            ├── separator.tsx
            ├── skeleton.tsx
            └── tabs.tsx
```

---

## Component Architecture

### App.tsx

Root orchestrator. Holds:
- **Tab state** (`"map"` | `"logs"`) — switches between the route map and log sheets views.
- **`useMutation`** (TanStack Query) — fires `planTrip()` and tracks loading / error / data states.
- **Sticky header** with the app name, trip summary badges (total miles, drive hours, log sheet count), and the theme toggle.
- **`ResultSkeleton`** — shown while the API request is in flight.

On a successful response the active tab switches automatically to `"map"`.

---

### TripForm

**File:** `src/components/TripForm.tsx`

Collects all fields required by the backend `TripPlanRequestSerializer`.

**Required fields**

| Field | Label | Notes |
|---|---|---|
| `current_location` | Current Location | Nominatim autocomplete |
| `pickup_location` | Pickup Location | Nominatim autocomplete |
| `dropoff_location` | Dropoff Location | Nominatim autocomplete |
| `current_cycle_used_hrs` | Cycle Hours Used | `0–70`, float |

**Optional fields** (collapsible "Driver & Vehicle Details" panel)

| Field | Label |
|---|---|
| `trip_start_date` | Trip Start Date |
| `driver_name` | Driver Name |
| `driver_number` | Driver Number / CDL |
| `tractor_number` | Tractor # |
| `trailer_number` | Trailer # |
| `home_terminal` | Home Terminal |
| `carrier_name` | Carrier / Company |
| `shipper` | Shipper |
| `commodity` | Commodity |

**Nominatim autocomplete**

The `LocationAutocomplete` internal component debounces keystrokes and queries `https://nominatim.openstreetmap.org/search` to suggest city/state results in a dropdown — no API key required.

---

### RouteMap

**File:** `src/components/RouteMap.tsx`

Leaflet map rendered via `react-leaflet`. Displays:

- **Blue polyline** — full road geometry returned by the backend (or straight-line if no ORS key).
- **Color-coded markers** — each waypoint type has a distinct color:

| Waypoint type | Color |
|---|---|
| `start` | Blue `#3b82f6` |
| `pickup` | Green `#22c55e` |
| `dropoff` | Red `#ef4444` |
| `fuel` | Orange `#f97316` |
| `rest` | Purple `#a855f7` |

- **Popups** on each marker showing the waypoint name.
- **Auto-fit bounds** — the map re-centers and zooms to fit all waypoints on every new result.

> **Note:** Leaflet's default icon paths are broken by Vite's asset bundling. `RouteMap.tsx` patches `L.Icon.Default` to use the unpkg CDN URLs at module load time.

---

### LogSheetCanvas

**File:** `src/components/LogSheetCanvas.tsx`

Renders one FMCSA-format ELD Daily Log Sheet onto an HTML `<canvas>` element. The canvas faithfully reproduces the physical paper logbook:

```
┌──────────────────────────────────────────────────┐
│  HEADER  (date, driver, tractor, trailer, …)     │
├──────────────────────────────────────────────────┤
│  GRID    (24 hrs × 4 rows, 15-min tick marks)    │
│  Line 1 — Off Duty                               │
│  Line 2 — Sleeper Berth                          │
│  Line 3 — Driving                                │
│  Line 4 — On-Duty / Not Driving                  │
├──────────────────────────────────────────────────┤
│  REMARKS  (city/state + activity per status chg) │
├──────────────────────────────────────────────────┤
│  TOTALS   (hrs per line, total on-duty)          │
└──────────────────────────────────────────────────┘
```

**Key behaviors:**
- Redraws on every prop change via `useEffect`.
- Dark-mode aware — reads `--foreground` and `--background` CSS variables from the document root to match the active theme.
- Exposes a **Download PNG** button that calls `canvas.toDataURL("image/png")` and triggers a file download named `eld-log-day-N.png`.

---

### LogSheetList

**File:** `src/components/LogSheetList.tsx`

Wraps `LogSheetCanvas` in a scrollable list. Renders one canvas card per day returned in `log_sheets[]`, with the day number and date label in the card header.

---

## API Client

**File:** `src/api.ts`

Contains all TypeScript interface definitions that mirror the backend response shape, and the `planTrip()` function used by TanStack Query.

**Key interfaces**

| Interface | Description |
|---|---|
| `TripFormData` | Full form payload sent to `POST /api/trips/plan/` |
| `LogEntry` | A single duty status block (line, start/end minutes, location, remark) |
| `DayTotals` | Per-day hour totals (off-duty, sleeper, driving, on-duty) |
| `LogSheetHeader` | Driver/vehicle/shipper fields for the log sheet header |
| `LogSheet` | One full day's log sheet (header + entries + totals + miles) |
| `Waypoint` | Map marker (name, type, `[lat, lon]` coords) |
| `RouteData` | Full route result (total miles, drive hours, waypoints, polyline coords) |
| `TripPlanResponse` | Top-level API response (`route`, `log_sheets`, `summary`) |

**Base URL resolution**

```ts
const BASE_URL = import.meta.env.VITE_API_URL ?? "";
```

In development, `VITE_API_URL` is not set and Vite's dev server proxies `/api/*` → `http://127.0.0.1:8000`. In production, set `VITE_API_URL` to the deployed backend URL.

---

## Configuration & Environment Variables

Copy `.env.example` to `.env` before running locally.

| Variable | Default | Description |
|---|---|---|
| `VITE_API_URL` | _(empty — uses Vite proxy)_ | Backend base URL for production. Example: `https://my-backend.onrender.com/api` |

> In development, leave `VITE_API_URL` unset. The Vite dev server proxy (`vite.config.ts`) forwards all `/api` requests to `http://127.0.0.1:8000`.

---

## Local Development

**Prerequisites:** Node.js 18+, backend running on port 8000.

```bash
# 1. Enter the frontend directory
cd frontend

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Leave VITE_API_URL blank — the Vite proxy handles /api requests

# 4. Start the dev server
npm run dev
```

The app will be available at `http://localhost:5173`.

**Available scripts**

| Script | Command | Description |
|---|---|---|
| `dev` | `vite` | Start Vite dev server with HMR |
| `build` | `tsc && vite build` | Type-check and build for production |
| `preview` | `vite preview` | Preview the production build locally |

---

## Deployment (Vercel)

The frontend is configured for deployment on [Vercel](https://vercel.com/).

**`vercel.json`** contains a single SPA rewrite rule so that all paths serve `index.html`:

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

**Deployment steps:**

1. Push the `frontend/` directory to a GitHub repository (or connect the monorepo with the root directory set to `frontend/`).
2. In Vercel project settings, set:
   - **Framework Preset:** Vite
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
3. Add environment variable:
   - `VITE_API_URL` → `https://your-backend.onrender.com/api`
4. In the backend's Vercel CORS settings, add your Vercel deployment URL to `CORS_ALLOWED_ORIGINS`.

---

## UI Component Library

The `src/components/ui/` directory contains lightweight Radix UI-based primitives styled with Tailwind CSS and `class-variance-authority`. These are **not** from a third-party package — they are local copies following the shadcn/ui pattern.

| Component | Based on | Usage |
|---|---|---|
| `Button` | Radix Slot | Primary actions, icon buttons, download trigger |
| `Input` | HTML `<input>` | Form text fields |
| `Label` | Radix Label | Form field labels |
| `Badge` | — | Summary stats in the header |
| `Card` | — | Log sheet wrappers |
| `Tabs` | Radix Tabs | Map / Logs view switcher |
| `Separator` | Radix Separator | Header dividers |
| `Skeleton` | — | Loading placeholder while API is in flight |

The `cn()` utility (`src/lib/utils.ts`) merges Tailwind class names using `clsx` + `tailwind-merge`.
