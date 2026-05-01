// ─── API types (mirror backend response shape) ────────────────────────────────

export interface LogEntry {
  line: 1 | 2 | 3 | 4;
  start_min: number;
  end_min: number;
  duration_min: number;
  location: string;
  remark: string;
  moving: boolean;
  is_change: boolean;
}

export interface DayTotals {
  off_duty_hrs: number;
  sleeper_hrs: number;
  driving_hrs: number;
  on_duty_hrs: number;
  total_on_duty_hrs: number;
}

export interface LogSheetHeader {
  driver_name: string;
  driver_number: string;
  home_terminal: string;
  carrier_name: string;
  tractor_number: string;
  trailer_number: string;
  shipper: string;
  commodity: string;
}

export interface LogSheet {
  day: number;
  date_label: string;
  header: LogSheetHeader;
  entries: LogEntry[];
  totals: DayTotals;
  miles_today: number;
}

export interface Waypoint {
  name: string;
  type: "start" | "pickup" | "dropoff" | "fuel" | "rest";
  coords: [number, number]; // [lat, lon] — already converted for Leaflet
}

export interface RouteData {
  total_miles: number;
  total_drive_hrs: number;
  waypoints: Waypoint[];
  polyline: [number, number][]; // [lat, lon] for Leaflet
}

export interface TripPlanResponse {
  route: RouteData;
  log_sheets: LogSheet[];
  summary: {
    total_miles: number;
    total_drive_hrs: number;
    num_log_sheets: number;
    num_days: number;
  };
}

export interface TripFormData {
  current_location: string;
  pickup_location: string;
  dropoff_location: string;
  current_cycle_used_hrs: number;
  trip_start_date?: string;   // ISO date string "YYYY-MM-DD"
  driver_name?: string;
  driver_number?: string;
  tractor_number?: string;
  trailer_number?: string;
  home_terminal?: string;
  carrier_name?: string;
  shipper?: string;
  commodity?: string;
}

// ─── API client ────────────────────────────────────────────────────────────────

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000/api";

export async function planTrip(form: TripFormData): Promise<TripPlanResponse> {
  const resp = await fetch(`${BASE_URL}/trips/plan/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(form),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(
      (err as { error?: string }).error ?? `Request failed: ${resp.status}`
    );
  }

  return resp.json() as Promise<TripPlanResponse>;
}
