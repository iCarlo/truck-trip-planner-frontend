import { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import type { RouteData } from "../api";
import "leaflet/dist/leaflet.css";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Fix Leaflet default icon paths broken by Vite bundling
delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const MARKER_COLORS: Record<string, string> = {
  start: "#3b82f6",
  pickup: "#22c55e",
  dropoff: "#ef4444",
  fuel: "#f97316",
  rest: "#a855f7",
};

const MARKER_LABELS: Record<string, string> = {
  start: "Start",
  pickup: "Pickup",
  dropoff: "Dropoff",
  fuel: "Fuel",
  rest: "Rest",
};

function makeIcon(type: string) {
  const color = MARKER_COLORS[type] ?? "#333";
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="36" viewBox="0 0 24 36">
      <path fill="${color}" d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24S24 21 24 12C24 5.4 18.6 0 12 0z"/>
      <circle fill="white" cx="12" cy="12" r="5"/>
    </svg>`;
  return L.divIcon({
    html: svg,
    iconSize: [24, 36],
    iconAnchor: [12, 36],
    popupAnchor: [0, -36],
    className: "",
  });
}

function FitBounds({ polyline }: { polyline: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (polyline.length > 1) {
      map.fitBounds(polyline as L.LatLngBoundsExpression, {
        padding: [40, 40],
      });
    }
  }, [map, polyline]);
  return null;
}

interface Props {
  route: RouteData;
}

export default function RouteMap({ route }: Props) {
  const center: [number, number] =
    route.polyline.length > 0 ? route.polyline[0] : [39.5, -98.35];

  return (
    <div className="flex flex-col gap-3">
      {/* Legend */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(MARKER_COLORS).map(([type, color]) => (
          <Badge
            key={type}
            variant="outline"
            className="gap-1.5 text-xs font-medium"
          >
            <span
              className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
              style={{ background: color }}
            />
            {MARKER_LABELS[type] ?? type}
          </Badge>
        ))}
      </div>

      <MapContainer
        center={center}
        zoom={5}
        className={cn(
          "h-[420px] w-full rounded-xl border border-border overflow-hidden isolate",
        )}
        scrollWheelZoom
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <FitBounds polyline={route.polyline} />

        {route.polyline.length > 1 && (
          <Polyline
            positions={route.polyline}
            color="#3b82f6"
            weight={4}
            opacity={0.85}
          />
        )}

        {route.waypoints.map((wp, i) => (
          <Marker
            key={i}
            position={[wp.coords[0], wp.coords[1]]}
            icon={makeIcon(wp.type)}
          >
            <Popup>
              <strong className="capitalize">{wp.type}</strong>
              <br />
              {wp.name}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
