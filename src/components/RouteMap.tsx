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

// Fix Leaflet default icon paths broken by Vite bundling
delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const MARKER_COLORS: Record<string, string> = {
  start: "#2196f3",
  pickup: "#4caf50",
  dropoff: "#f44336",
  fuel: "#ff9800",
  rest: "#9c27b0",
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

/** Auto-fits map bounds to the polyline when route changes. */
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
    <div style={{ marginBottom: 32 }}>
      <div style={{ marginBottom: 8, fontFamily: "monospace" }}>
        <strong>Total distance:</strong> {route.total_miles.toFixed(1)} miles
        &nbsp;|&nbsp;
        <strong>Drive time:</strong> {route.total_drive_hrs.toFixed(1)} hrs
      </div>

      {/* Legend */}
      <div
        style={{
          display: "flex",
          gap: 16,
          marginBottom: 8,
          flexWrap: "wrap",
          fontSize: 12,
          fontFamily: "monospace",
        }}
      >
        {Object.entries(MARKER_COLORS).map(([type, color]) => (
          <span
            key={type}
            style={{ display: "flex", alignItems: "center", gap: 4 }}
          >
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                background: color,
                display: "inline-block",
              }}
            />
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </span>
        ))}
      </div>

      <MapContainer
        center={center}
        zoom={5}
        style={{
          height: 420,
          width: "100%",
          borderRadius: 6,
          border: "1px solid #ccc",
        }}
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
            color="#1a1a1a"
            weight={3}
            opacity={0.8}
          />
        )}

        {route.waypoints.map((wp, i) => (
          <Marker
            key={i}
            position={[wp.coords[0], wp.coords[1]]}
            icon={makeIcon(wp.type)}
          >
            <Popup>
              <strong>{wp.type.toUpperCase()}</strong>
              <br />
              {wp.name}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
