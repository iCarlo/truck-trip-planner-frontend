import { useState, useRef, useEffect } from "react";
import type { TripFormData } from "../api";

interface Props {
  onSubmit: (data: TripFormData) => void;
  loading: boolean;
}

// ─── Nominatim autocomplete input ────────────────────────────────────────────

interface AutocompleteProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  error?: string;
}

function LocationAutocomplete({
  value,
  onChange,
  placeholder,
  error,
}: AutocompleteProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    onChange(val);
    clearTimeout(debounceRef.current);
    if (val.trim().length >= 3) {
      debounceRef.current = setTimeout(async () => {
        try {
          const resp = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(val)}&format=json&limit=5&addressdetails=0`,
            { headers: { "User-Agent": "trucking-eld-app/1.0" } },
          );
          const data: Array<{ display_name: string }> = await resp.json();
          setSuggestions(data.map((r) => r.display_name));
          setOpen(data.length > 0);
        } catch {
          setSuggestions([]);
          setOpen(false);
        }
      }, 450);
    } else {
      setSuggestions([]);
      setOpen(false);
    }
  }

  function select(name: string) {
    onChange(name);
    setSuggestions([]);
    setOpen(false);
  }

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <input
        type="text"
        value={value}
        onChange={handleInput}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        placeholder={placeholder}
        autoComplete="off"
        style={{
          width: "100%",
          padding: "8px 10px",
          border: error ? "1px solid red" : "1px solid #ccc",
          borderRadius: 4,
          fontFamily: "monospace",
          fontSize: 13,
          boxSizing: "border-box",
        }}
      />
      {open && (
        <ul
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            zIndex: 999,
            margin: 0,
            padding: 0,
            listStyle: "none",
            border: "1px solid #bbb",
            borderTop: "none",
            borderRadius: "0 0 4px 4px",
            background: "#fff",
            maxHeight: 220,
            overflowY: "auto",
            boxShadow: "0 4px 8px rgba(0,0,0,0.12)",
          }}
        >
          {suggestions.map((s, i) => (
            <li
              key={i}
              onPointerDown={() => select(s)}
              style={{
                padding: "7px 10px",
                fontSize: 12,
                fontFamily: "monospace",
                cursor: "pointer",
                borderBottom:
                  i < suggestions.length - 1 ? "1px solid #eee" : "none",
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLLIElement).style.background =
                  "#f0f4ff")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLLIElement).style.background = "#fff")
              }
            >
              {s}
            </li>
          ))}
        </ul>
      )}
      {error && <span style={{ color: "red", fontSize: 11 }}>{error}</span>}
    </div>
  );
}

// ─── Main form ────────────────────────────────────────────────────────────────

export default function TripForm({ onSubmit, loading }: Props) {
  const [form, setForm] = useState<TripFormData>({
    current_location: "",
    pickup_location: "",
    dropoff_location: "",
    current_cycle_used_hrs: 0,
    trip_start_date: new Date().toISOString().slice(0, 10),
    driver_name: "",
    driver_number: "",
    tractor_number: "",
    trailer_number: "",
    home_terminal: "",
    carrier_name: "",
    shipper: "",
    commodity: "",
  });

  const [errors, setErrors] = useState<
    Partial<Record<keyof TripFormData, string>>
  >({});

  function validate(): boolean {
    const e: Partial<Record<keyof TripFormData, string>> = {};
    if (!form.current_location.trim()) e.current_location = "Required";
    if (!form.pickup_location.trim()) e.pickup_location = "Required";
    if (!form.dropoff_location.trim()) e.dropoff_location = "Required";
    if (form.current_cycle_used_hrs < 0 || form.current_cycle_used_hrs > 70)
      e.current_cycle_used_hrs = "Must be 0–70 hours";
    if (!form.driver_name?.trim()) e.driver_name = "Required";
    if (!form.driver_number?.trim()) e.driver_number = "Required";
    if (!form.tractor_number?.trim()) e.tractor_number = "Required";
    if (!form.trailer_number?.trim()) e.trailer_number = "Required";
    if (!form.home_terminal?.trim()) e.home_terminal = "Required";
    if (!form.carrier_name?.trim()) e.carrier_name = "Required";
    if (!form.shipper?.trim()) e.shipper = "Required";
    if (!form.commodity?.trim()) e.commodity = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (validate()) onSubmit(form);
  }

  function setLoc(
    key: "current_location" | "pickup_location" | "dropoff_location",
  ) {
    return (val: string) => {
      setForm((f) => ({ ...f, [key]: val }));
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    };
  }

  function textField(
    key: keyof TripFormData,
    label: string,
    hint?: string,
    required?: boolean,
  ) {
    const err = errors[key];
    return (
      <div style={{ marginBottom: 14 }}>
        <label
          style={{
            display: "block",
            fontWeight: required ? 600 : 400,
            marginBottom: 4,
          }}
        >
          {label}
          {required && <span style={{ color: "red" }}> *</span>}
        </label>
        <input
          type="text"
          value={String(form[key] ?? "")}
          onChange={(e) => {
            setForm((f) => ({ ...f, [key]: e.target.value }));
            setErrors((prev) => ({ ...prev, [key]: undefined }));
          }}
          placeholder={hint}
          style={{
            width: "100%",
            padding: "8px 10px",
            border: err ? "1px solid red" : "1px solid #ccc",
            borderRadius: 4,
            fontFamily: "monospace",
            fontSize: 13,
            boxSizing: "border-box",
          }}
        />
        {err && <span style={{ color: "red", fontSize: 11 }}>{err}</span>}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 480 }}>
      <h2 style={{ fontFamily: "monospace", marginBottom: 20 }}>
        Trip Details
      </h2>

      {/* ── Locations ── */}
      <fieldset
        style={{
          border: "1px solid #ddd",
          padding: 16,
          marginBottom: 20,
          borderRadius: 6,
        }}
      >
        <legend style={{ fontWeight: 600, padding: "0 6px" }}>Locations</legend>

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontWeight: 600, marginBottom: 4 }}>
            Current Location <span style={{ color: "red" }}>*</span>
          </label>
          <LocationAutocomplete
            value={form.current_location}
            onChange={setLoc("current_location")}
            placeholder="e.g. Chicago, IL"
            error={errors.current_location}
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontWeight: 600, marginBottom: 4 }}>
            Pickup Location <span style={{ color: "red" }}>*</span>
          </label>
          <LocationAutocomplete
            value={form.pickup_location}
            onChange={setLoc("pickup_location")}
            placeholder="e.g. Milwaukee, WI"
            error={errors.pickup_location}
          />
        </div>

        <div style={{ marginBottom: 0 }}>
          <label style={{ display: "block", fontWeight: 600, marginBottom: 4 }}>
            Dropoff Location <span style={{ color: "red" }}>*</span>
          </label>
          <LocationAutocomplete
            value={form.dropoff_location}
            onChange={setLoc("dropoff_location")}
            placeholder="e.g. Indianapolis, IN"
            error={errors.dropoff_location}
          />
        </div>
      </fieldset>

      {/* ── HOS Cycle ── */}
      <fieldset
        style={{
          border: "1px solid #ddd",
          padding: 16,
          marginBottom: 20,
          borderRadius: 6,
        }}
      >
        <legend style={{ fontWeight: 600, padding: "0 6px" }}>HOS Cycle</legend>

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontWeight: 600, marginBottom: 4 }}>
            Current Cycle Used (hrs) <span style={{ color: "red" }}>*</span>
          </label>
          <input
            type="number"
            value={form.current_cycle_used_hrs}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                current_cycle_used_hrs: parseFloat(e.target.value) || 0,
              }))
            }
            placeholder="0–70 hours used in the last 8 days"
            step="0.5"
            min={0}
            max={70}
            style={{
              width: "100%",
              padding: "8px 10px",
              border: errors.current_cycle_used_hrs
                ? "1px solid red"
                : "1px solid #ccc",
              borderRadius: 4,
              fontFamily: "monospace",
              fontSize: 13,
              boxSizing: "border-box",
            }}
          />
          {errors.current_cycle_used_hrs && (
            <span style={{ color: "red", fontSize: 11 }}>
              {errors.current_cycle_used_hrs}
            </span>
          )}
        </div>

        <div style={{ marginBottom: 0 }}>
          <label style={{ display: "block", fontWeight: 400, marginBottom: 4 }}>
            Trip Start Date
          </label>
          <input
            type="date"
            value={form.trip_start_date ?? ""}
            onChange={(e) =>
              setForm((f) => ({ ...f, trip_start_date: e.target.value }))
            }
            style={{
              width: "100%",
              padding: "8px 10px",
              border: "1px solid #ccc",
              borderRadius: 4,
              fontFamily: "monospace",
              fontSize: 13,
              boxSizing: "border-box",
            }}
          />
        </div>

        <p style={{ fontSize: 11, color: "#666", margin: "8px 0 0" }}>
          Assumes 70-hr/8-day rule, property-carrying driver, no adverse
          conditions.
        </p>
      </fieldset>

      {/* ── Driver & Vehicle ── */}
      <fieldset
        style={{
          border: "1px solid #ddd",
          padding: 16,
          marginBottom: 20,
          borderRadius: 6,
        }}
      >
        <legend style={{ fontWeight: 600, padding: "0 6px" }}>
          Driver & Vehicle
        </legend>
        {textField("driver_name", "Driver Name", "Full name", true)}
        {textField("driver_number", "Driver #", "CDL or employee number", true)}
        {textField("tractor_number", "Tractor #", "Unit number", true)}
        {textField("trailer_number", "Trailer #", "Trailer number", true)}
        {textField("home_terminal", "Home Terminal", "City, State", true)}
        {textField("carrier_name", "Carrier Name", "Company name", true)}
      </fieldset>

      {/* ── Freight ── */}
      <fieldset
        style={{
          border: "1px solid #ddd",
          padding: 16,
          marginBottom: 20,
          borderRadius: 6,
        }}
      >
        <legend style={{ fontWeight: 600, padding: "0 6px" }}>Freight</legend>
        {textField("shipper", "Shipper", "Shipping company or name", true)}
        {textField(
          "commodity",
          "Commodity",
          "e.g. General Freight, Produce",
          true,
        )}
      </fieldset>

      <button
        type="submit"
        disabled={loading}
        style={{
          width: "100%",
          padding: "12px 0",
          background: loading ? "#888" : "#1a1a1a",
          color: "#fff",
          border: "none",
          borderRadius: 4,
          fontFamily: "monospace",
          fontSize: 14,
          fontWeight: 600,
          cursor: loading ? "not-allowed" : "pointer",
        }}
      >
        {loading ? "Calculating route…" : "Generate Trip Plan →"}
      </button>
    </form>
  );
}
