import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { planTrip } from "./api";
import type { TripFormData } from "./api";
import TripForm from "./components/TripForm";
import RouteMap from "./components/RouteMap";
import LogSheetList from "./components/LogSheetList";
import { ThemeProvider } from "./components/theme-provider";
import { ThemeToggle } from "./components/theme-toggle";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./components/ui/tabs";
import { Badge } from "./components/ui/badge";
import { Separator } from "./components/ui/separator";
import { ResultSkeleton } from "./components/ui/skeleton";
import {
  Truck,
  Map,
  FileText,
  AlertCircle,
  Route,
  Clock,
  LayoutDashboard,
} from "lucide-react";

function AppContent() {
  const [activeTab, setActiveTab] = useState("map");

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
    <div className="min-h-screen bg-background flex flex-col">
      {/* ── Top nav ── */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <div className="flex items-center gap-2.5 font-semibold text-sm">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Truck className="h-4 w-4" />
            </div>
            <span className="hidden sm:inline">ELD Trip Planner</span>
          </div>

          <Separator orientation="vertical" className="h-5 hidden sm:block" />

          <p className="hidden md:block text-xs text-muted-foreground">
            70-hr/8-day · HOS compliant route + daily log sheets
          </p>

          {result && (
            <>
              <Separator orientation="vertical" className="h-5 mx-1" />
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary" className="gap-1 text-xs">
                  <Route className="h-3 w-3" />
                  {result.summary.total_miles.toFixed(0)} mi
                </Badge>
                <Badge variant="secondary" className="gap-1 text-xs">
                  <Clock className="h-3 w-3" />
                  {result.summary.total_drive_hrs.toFixed(1)} hrs
                </Badge>
                <Badge variant="secondary" className="gap-1 text-xs">
                  <LayoutDashboard className="h-3 w-3" />
                  {result.summary.num_log_sheets} sheet
                  {result.summary.num_log_sheets !== 1 ? "s" : ""}
                </Badge>
              </div>
            </>
          )}

          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* ── Main layout ── */}
      <main className="flex-1 max-w-[1400px] mx-auto w-full px-4 sm:px-6 py-6">
        <div
          className={`flex gap-6 ${result || loading ? "lg:flex-row" : "justify-center"} flex-col`}
        >
          {/* Left: form panel */}
          <div
            className={
              result || loading ? "lg:w-[380px] shrink-0" : "w-full max-w-xl"
            }
          >
            <div className="sticky top-20">
              <TripForm onSubmit={mutation.mutate} loading={loading} />

              {/* Error state */}
              {error && (
                <div className="mt-4 flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive animate-fade-in">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <p className="font-medium min-w-0 break-words overflow-wrap-anywhere">
                    {error}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right: results */}
          {(result || loading) && (
            <div className="flex-1 min-w-0 animate-slide-in-right">
              {loading ? (
                <ResultSkeleton />
              ) : result ? (
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="mb-4">
                    <TabsTrigger value="map" className="gap-1.5">
                      <Map className="h-3.5 w-3.5" />
                      Route Map
                    </TabsTrigger>
                    <TabsTrigger value="logs" className="gap-1.5">
                      <FileText className="h-3.5 w-3.5" />
                      Log Sheets
                      <Badge
                        variant="secondary"
                        className="ml-1 text-xs px-1.5 py-0 h-4"
                      >
                        {result.summary.num_log_sheets}
                      </Badge>
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="map" className="animate-fade-in">
                    <RouteMap route={result.route} />
                  </TabsContent>
                  <TabsContent value="logs" className="animate-fade-in">
                    <LogSheetList sheets={result.log_sheets} />
                  </TabsContent>
                </Tabs>
              ) : null}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="eld-ui-theme">
      <AppContent />
    </ThemeProvider>
  );
}
