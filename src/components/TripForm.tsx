import { useState, useRef, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import type { TripFormData } from "../api";

interface Props {
  onSubmit: (data: TripFormData) => void;
  loading: boolean;
}

// ─── Nominatim autocomplete input ────────────────────────────────────────────

interface AutocompleteProps {
  value: string;
  onChange: (val: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  error?: string;
}

function LocationAutocomplete({
  value,
  onChange,
  onBlur,
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
        onBlur={onBlur}
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
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<TripFormData>({
    defaultValues: {
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
    },
  });

  function textField(
    key: keyof TripFormData,
    label: string,
    hint?: string,
    required?: boolean,
  ) {
    const err = errors[key]?.message;
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
          {...register(key, { required: required ? "Required" : false })}
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
    <form onSubmit={handleSubmit(onSubmit)} style={{ maxWidth: 480 }}>
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

        {(
          [
            ["current_location", "Current Location", "e.g. Chicago, IL"],
            ["pickup_location", "Pickup Location", "e.g. Milwaukee, WI"],
            ["dropoff_location", "Dropoff Location", "e.g. Indianapolis, IN"],
          ] as const
        ).map(([key, label, placeholder], idx, arr) => (
          <div
            key={key}
            style={{ marginBottom: idx < arr.length - 1 ? 14 : 0 }}
          >
            <label
              style={{ display: "block", fontWeight: 600, marginBottom: 4 }}
            >
              {label} <span style={{ color: "red" }}>*</span>
            </label>
            <Controller
              name={key}
              control={control}
              rules={{ required: "Required" }}
              render={({ field }) => (
                <LocationAutocomplete
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  placeholder={placeholder}
                  error={errors[key]?.message}
                />
              )}
            />
          </div>
        ))}
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
            {...register("current_cycle_used_hrs", {
              required: "Required",
              min: { value: 0, message: "Must be 0–70 hours" },
              max: { value: 70, message: "Must be 0–70 hours" },
              valueAsNumber: true,
            })}
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
              {errors.current_cycle_used_hrs.message}
            </span>
          )}
        </div>

        <div style={{ marginBottom: 0 }}>
          <label style={{ display: "block", fontWeight: 400, marginBottom: 4 }}>
            Trip Start Date
          </label>
          <input
            type="date"
            {...register("trip_start_date")}
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
