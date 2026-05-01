import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { planTrip } from "./api";
import type { TripFormData } from "./api";
import TripForm from "./components/TripForm";
import RouteMap from "./components/RouteMap";
import LogSheetList from "./components/LogSheetList";

type Tab = "map" | "logs";

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("map");

  const mutation = useMutation({
    mutationFn: (form: TripFormData) => planTrip(form),
    onSuccess: () => setActiveTab("map"),
  });

  const result = mutation.data ?? null;
  const loading = mutation.isPending;
  const error = mutation.error
    ? mutation.error instanceof Error
      ? mutation.error.message
      : "Unknown error"
    : null;

  return (
    <div
      style={{
        maxWidth: 1200,
        margin: "0 auto",
        padding: "24px 16px",
        fontFamily: "sans-serif",
      }}
    >
      <header style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: "monospace", fontSize: 22, margin: 0 }}>
          🚛 ELD Trip Planner
        </h1>
        <p style={{ color: "#666", fontSize: 13, margin: "4px 0 0" }}>
          70-hr/8-day property-carrying driver · HOS compliant route + daily log
          sheets
        </p>
      </header>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: result ? "380px 1fr" : "480px",
          gap: 40,
        }}
      >
        {/* Left: form */}
        <div>
          <TripForm onSubmit={mutation.mutate} loading={loading} />
          {error && (
            <div
              style={{
                marginTop: 16,
                padding: 12,
                background: "#fff0f0",
                border: "1px solid #ffaaaa",
                borderRadius: 4,
                fontFamily: "monospace",
                fontSize: 12,
                color: "#c00",
              }}
            >
              {error}
            </div>
          )}
        </div>

        {/* Right: results */}
        {result && (
          <div>
            {/* Summary bar */}
            <div
              style={{
                display: "flex",
                gap: 24,
                marginBottom: 20,
                padding: "10px 16px",
                background: "#f5f5f5",
                borderRadius: 6,
                fontFamily: "monospace",
                fontSize: 13,
              }}
            >
              <span>
                <strong>{result.summary.total_miles.toFixed(0)}</strong> miles
              </span>
              <span>
                <strong>{result.summary.total_drive_hrs.toFixed(1)}</strong> hrs
                driving
              </span>
              <span>
                <strong>{result.summary.num_log_sheets}</strong> log sheet
                {result.summary.num_log_sheets !== 1 ? "s" : ""}
              </span>
            </div>

            {/* Tab bar */}
            <div
              style={{
                display: "flex",
                gap: 0,
                marginBottom: 20,
                borderBottom: "2px solid #ddd",
              }}
            >
              {(["map", "logs"] as Tab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    padding: "8px 24px",
                    border: "none",
                    borderBottom:
                      activeTab === tab
                        ? "2px solid #1a1a1a"
                        : "2px solid transparent",
                    background: "transparent",
                    fontFamily: "monospace",
                    fontSize: 13,
                    fontWeight: activeTab === tab ? 700 : 400,
                    cursor: "pointer",
                    marginBottom: -2,
                  }}
                >
                  {tab === "map" ? "🗺 Route Map" : "📋 Log Sheets"}
                </button>
              ))}
            </div>

            {activeTab === "map" && (
              <div data-section="map">
                <RouteMap route={result.route} />
              </div>
            )}
            {activeTab === "logs" && (
              <LogSheetList sheets={result.log_sheets} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
