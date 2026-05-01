import { useState, useRef, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import {
  MapPin,
  Truck,
  User,
  Package,
  Clock,
  ChevronDown,
  ChevronUp,
  Loader2,
  Navigation,
} from "lucide-react";
import type { TripFormData } from "../api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

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
    <div ref={containerRef} className="relative">
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <Input
          type="text"
          value={value}
          onChange={handleInput}
          onBlur={onBlur}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder={placeholder}
          autoComplete="off"
          className={cn(
            "pl-8",
            error ? "border-destructive focus-visible:ring-destructive" : "",
          )}
        />
      </div>
      {open && (
        <ul className="absolute top-full left-0 right-0 z-50 mt-1 max-h-56 overflow-y-auto rounded-lg border bg-card shadow-lg animate-fade-in p-0 list-none">
          {suggestions.map((s, i) => (
            <li
              key={i}
              onPointerDown={() => select(s)}
              className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors first:rounded-t-lg last:rounded-b-lg"
            >
              <MapPin className="h-3 w-3 shrink-0 text-muted-foreground" />
              <span className="truncate">{s}</span>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}

// ─── Collapsible section ──────────────────────────────────────────────────────

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function FormSection({
  title,
  icon,
  children,
  defaultOpen = true,
}: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border bg-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex w-full items-center justify-between px-5 py-3.5 text-sm font-semibold hover:bg-accent/50 transition-colors rounded-t-xl",
          !open && "rounded-b-xl",
        )}
      >
        <span className="flex items-center gap-2">
          <span className="text-muted-foreground">{icon}</span>
          {title}
        </span>
        {open ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      {open && (
        <div className="px-5 pb-5 pt-1 flex flex-col gap-4 rounded-b-xl">
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Field wrapper ────────────────────────────────────────────────────────────

interface FieldProps {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}

function Field({ label, required, error, hint, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label
        className={cn(
          "text-sm",
          required && "after:content-['*'] after:ml-0.5 after:text-destructive",
        )}
      >
        {label}
      </Label>
      {children}
      {hint && !error && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
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

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      {/* Locations */}
      <FormSection title="Locations" icon={<MapPin className="h-4 w-4" />}>
        {(
          [
            ["current_location", "Current Location", "e.g. Chicago, IL"],
            ["pickup_location", "Pickup Location", "e.g. Milwaukee, WI"],
            ["dropoff_location", "Dropoff Location", "e.g. Indianapolis, IN"],
          ] as const
        ).map(([key, label, placeholder]) => (
          <Field key={key} label={label} required error={errors[key]?.message}>
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
          </Field>
        ))}
      </FormSection>

      {/* HOS Cycle */}
      <FormSection title="HOS Cycle" icon={<Clock className="h-4 w-4" />}>
        <Field
          label="Current Cycle Used (hrs)"
          required
          error={errors.current_cycle_used_hrs?.message}
          hint="70-hr/8-day rule · property-carrying driver · no adverse conditions"
        >
          <Input
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
            className={
              errors.current_cycle_used_hrs ? "border-destructive" : ""
            }
          />
        </Field>
        <Field label="Trip Start Date">
          <Input type="date" {...register("trip_start_date")} />
        </Field>
      </FormSection>

      {/* Driver & Vehicle */}
      <FormSection title="Driver & Vehicle" icon={<User className="h-4 w-4" />}>
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Driver Name"
            required
            error={errors.driver_name?.message}
          >
            <Input
              {...register("driver_name", { required: "Required" })}
              placeholder="Full name"
              className={errors.driver_name ? "border-destructive" : ""}
            />
          </Field>
          <Field
            label="Driver #"
            required
            error={errors.driver_number?.message}
          >
            <Input
              {...register("driver_number", { required: "Required" })}
              placeholder="CDL or employee #"
              className={errors.driver_number ? "border-destructive" : ""}
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Tractor #"
            required
            error={errors.tractor_number?.message}
          >
            <Input
              {...register("tractor_number", { required: "Required" })}
              placeholder="Unit number"
              className={errors.tractor_number ? "border-destructive" : ""}
            />
          </Field>
          <Field
            label="Trailer #"
            required
            error={errors.trailer_number?.message}
          >
            <Input
              {...register("trailer_number", { required: "Required" })}
              placeholder="Trailer number"
              className={errors.trailer_number ? "border-destructive" : ""}
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Home Terminal"
            required
            error={errors.home_terminal?.message}
          >
            <Input
              {...register("home_terminal", { required: "Required" })}
              placeholder="City, State"
              className={errors.home_terminal ? "border-destructive" : ""}
            />
          </Field>
          <Field
            label="Carrier Name"
            required
            error={errors.carrier_name?.message}
          >
            <Input
              {...register("carrier_name", { required: "Required" })}
              placeholder="Company name"
              className={errors.carrier_name ? "border-destructive" : ""}
            />
          </Field>
        </div>
      </FormSection>

      {/* Freight */}
      <FormSection
        title="Freight"
        icon={<Package className="h-4 w-4" />}
        defaultOpen={false}
      >
        <Field label="Shipper" required error={errors.shipper?.message}>
          <Input
            {...register("shipper", { required: "Required" })}
            placeholder="Shipping company or name"
            className={errors.shipper ? "border-destructive" : ""}
          />
        </Field>
        <Field label="Commodity" required error={errors.commodity?.message}>
          <Input
            {...register("commodity", { required: "Required" })}
            placeholder="e.g. General Freight, Produce"
            className={errors.commodity ? "border-destructive" : ""}
          />
        </Field>
      </FormSection>

      <Button
        type="submit"
        disabled={loading}
        size="lg"
        className="w-full gap-2 font-semibold"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Calculating route…
          </>
        ) : (
          <>
            <Truck className="h-4 w-4" />
            Generate Trip Plan
            <Navigation className="h-4 w-4 ml-auto opacity-60" />
          </>
        )}
      </Button>
    </form>
  );
}
