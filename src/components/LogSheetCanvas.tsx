/**
 * LogSheetCanvas — renders one ELD Daily Log Sheet onto an HTML <canvas>.
 *
 * Graph community bridge: this component consumes output from:
 *   - Community 0 (Logbook Tracking): grid, remarks, bracket notation, tick marks
 *   - Community 4 (Driver Activity States): which line each entry sits on
 *   - Community 8/9/10: header fields (driver, vehicle, shipper info)
 *
 * Physical logbook anatomy reproduced here:
 *   ┌────────────────────────────────────────────────┐
 *   │  HEADER (date, driver, tractor, trailer…)      │
 *   ├────────────────────────────────────────────────┤
 *   │  GRID  (24 hrs × 4 rows, 15-min ticks)         │
 *   │  Line 1 — Off Duty      ────────────────────── │
 *   │  Line 2 — Sleeper Berth ────────────────────── │
 *   │  Line 3 — Driving       ────────────────────── │
 *   │  Line 4 — On Duty       ────────────────────── │
 *   ├────────────────────────────────────────────────┤
 *   │  REMARKS  (city/state + activity per change)   │
 *   ├────────────────────────────────────────────────┤
 *   │  TOTALS   (hrs per line, total on-duty)        │
 *   └────────────────────────────────────────────────┘
 */

import { useEffect, useRef } from "react";
import type { LogSheet, LogEntry } from "../api";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

// ─── Layout constants (pixels) ────────────────────────────────────────────────
const CANVAS_W = 1100;
const CANVAS_H = 800;
const MARGIN = 20;
const LABEL_W = 90; // left column for row labels ("Off Duty", etc.)
const GRID_X = MARGIN + LABEL_W;
const GRID_W = CANVAS_W - GRID_X - MARGIN;
const GRID_Y = 160; // top of grid (below header)
const ROW_H = 40;
const GRID_H = ROW_H * 4;
const REMARKS_Y = GRID_Y + GRID_H + 24;
const TOTALS_Y = CANVAS_H - 70;
const HOURS = 24;

// Colors
const C_GRID = "#333333";
const C_GRID_LIGHT = "#aaaaaa";
const C_BAR = "#1a1a1a";
const C_BRACKET = "#555555";
const C_TICK = "#cc0000"; // red 45° tick marks at duty changes
const C_HEADER_BG = "#f5f5f5";
const C_TEXT = "#111111";
const C_TEXT_LIGHT = "#555555";

// Line labels (matches physical logbook)
const ROW_LABELS: Record<number, string> = {
  1: "Off Duty",
  2: "Sleeper\nBerth",
  3: "Driving",
  4: "On Duty\n(Not Driving)",
};

// ─── Helper: convert minutes-from-midnight → canvas X coordinate ──────────────
function minToX(min: number): number {
  return GRID_X + (min / (HOURS * 60)) * GRID_W;
}

// ─── Helper: line number (1–4) → canvas Y center of that row ─────────────────
function lineToY(line: number): number {
  return GRID_Y + (line - 1) * ROW_H + ROW_H / 2;
}

// ─── Canvas drawing functions ─────────────────────────────────────────────────

function drawHeader(ctx: CanvasRenderingContext2D, sheet: LogSheet) {
  ctx.fillStyle = C_HEADER_BG;
  ctx.fillRect(0, 0, CANVAS_W, GRID_Y - 4);

  ctx.fillStyle = C_TEXT;
  ctx.font = "bold 14px monospace";
  ctx.fillText("DRIVER'S DAILY LOG", MARGIN, 22);

  ctx.font = "11px monospace";
  ctx.fillStyle = C_TEXT_LIGHT;

  const h = sheet.header;
  const col1 = MARGIN;
  const col2 = 380;
  const col3 = 720;

  // Row 1
  ctx.fillText(`Date: ${sheet.date_label}`, col1, 44);
  ctx.fillText(`Driver: ${h.driver_name || "—"}`, col2, 44);
  ctx.fillText(`Driver #: ${h.driver_number || "—"}`, col3, 44);

  // Row 2
  ctx.fillText(`Carrier: ${h.carrier_name || "—"}`, col1, 64);
  ctx.fillText(`Home Terminal: ${h.home_terminal || "—"}`, col2, 64);

  // Row 3
  ctx.fillText(`Tractor: ${h.tractor_number || "—"}`, col1, 84);
  ctx.fillText(`Trailer: ${h.trailer_number || "—"}`, col2, 84);
  ctx.fillText(`Miles Today: ${sheet.miles_today}`, col3, 84);

  // Row 4
  ctx.fillText(`Shipper: ${h.shipper || "—"}`, col1, 104);
  ctx.fillText(`Commodity: ${h.commodity || "—"}`, col2, 104);

  // Separator line
  ctx.strokeStyle = C_GRID;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(MARGIN, GRID_Y - 8);
  ctx.lineTo(CANVAS_W - MARGIN, GRID_Y - 8);
  ctx.stroke();
}

function drawGrid(ctx: CanvasRenderingContext2D) {
  // Inner bounds — 1px inset from the outer border so strokes never bleed
  // outside the frame. The outer border is drawn last to act as a hard cover.
  const innerTop = GRID_Y + 1;
  const innerBottom = GRID_Y + GRID_H - 1;

  // Row dividers (horizontal)
  ctx.strokeStyle = C_GRID;
  ctx.lineWidth = 1;
  for (let row = 1; row < 4; row++) {
    const y = GRID_Y + row * ROW_H;
    ctx.beginPath();
    ctx.moveTo(GRID_X + 1, y);
    ctx.lineTo(GRID_X + GRID_W - 1, y);
    ctx.stroke();
  }

  // Hour dividers + 15-min sub-ticks (vertical, strictly inside the border)
  for (let h = 0; h <= HOURS; h++) {
    const x = GRID_X + (h / HOURS) * GRID_W;

    // Major hour line — full inner height
    ctx.strokeStyle = C_GRID_LIGHT;
    ctx.lineWidth = h % 6 === 0 ? 1 : 0.5;
    ctx.beginPath();
    ctx.moveTo(x, innerTop);
    ctx.lineTo(x, innerBottom);
    ctx.stroke();

    // 15-min sub-ticks (3 per hour) — short tick from top inward
    if (h < HOURS) {
      for (let q = 1; q < 4; q++) {
        const qx = GRID_X + ((h + q / 4) / HOURS) * GRID_W;
        ctx.strokeStyle = C_GRID_LIGHT;
        ctx.lineWidth = 0.3;
        ctx.beginPath();
        ctx.moveTo(qx, innerTop);
        ctx.lineTo(qx, innerTop + 7);
        ctx.stroke();
      }
    }
  }

  // Outer border drawn LAST — sits on top and covers any anti-alias bleed
  // from inner lines meeting the edge.
  ctx.strokeStyle = C_GRID;
  ctx.lineWidth = 1;
  ctx.strokeRect(GRID_X, GRID_Y, GRID_W, GRID_H);

  // Hour labels (above the grid, unaffected by inner clipping)
  ctx.font = "9px monospace";
  ctx.fillStyle = C_TEXT_LIGHT;
  for (let h = 0; h <= HOURS; h++) {
    const x = GRID_X + (h / HOURS) * GRID_W;
    const label =
      h === 0
        ? "M"
        : h === 12
          ? "N"
          : h === 24
            ? "M"
            : String(h > 12 ? h - 12 : h);
    ctx.fillText(label, x - 4, GRID_Y - 4);
  }

  // Row labels
  ctx.font = "10px monospace";
  ctx.fillStyle = C_TEXT;
  for (let line = 1; line <= 4; line++) {
    const label = ROW_LABELS[line];
    const y = GRID_Y + (line - 1) * ROW_H;
    label.split("\n").forEach((part, i) => {
      ctx.fillText(part, MARGIN, y + 14 + i * 12);
    });
  }
}

function drawEntries(ctx: CanvasRenderingContext2D, entries: LogEntry[]) {
  // Sort by start_min for clean rendering
  const sorted = [...entries].sort((a, b) => a.start_min - b.start_min);

  sorted.forEach((entry, idx) => {
    const x1 = minToX(entry.start_min);
    const x2 = minToX(
      entry.end_min > entry.start_min ? entry.end_min : 24 * 60,
    );
    const y = GRID_Y + (entry.line - 1) * ROW_H;

    // ── Horizontal status bar ──────────────────────────────────────────────
    ctx.fillStyle = C_BAR;
    ctx.fillRect(x1, y + ROW_H / 2 - 1.5, x2 - x1, 3);

    // ── Bracket notation (truck stationary, on-duty or off-duty) ──────────
    // A bracket is a downward-opening "cup": vertical lines on both ends
    if (!entry.moving && entry.line !== 2) {
      ctx.strokeStyle = C_BRACKET;
      ctx.lineWidth = 1.5;
      // Left bracket leg
      ctx.beginPath();
      ctx.moveTo(x1, y + 4);
      ctx.lineTo(x1, y + ROW_H - 4);
      ctx.stroke();
      // Right bracket leg
      ctx.beginPath();
      ctx.moveTo(x2, y + 4);
      ctx.lineTo(x2, y + ROW_H - 4);
      ctx.stroke();
    }

    // ── Vertical connector line to previous entry's line ──────────────────
    if (idx > 0 && entry.is_change) {
      const prev = sorted[idx - 1];
      const prevY = GRID_Y + (prev.line - 1) * ROW_H + ROW_H / 2;
      const currY = lineToY(entry.line);

      ctx.strokeStyle = C_BAR;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x1, prevY);
      ctx.lineTo(x1, currY);
      ctx.stroke();

      // ── 45° tick mark at duty-status change ───────────────────────────
      // A short diagonal line going down-right at the change point
      ctx.strokeStyle = C_TICK;
      ctx.lineWidth = 1;
      ctx.beginPath();
      const tickSize = 8;
      const topY = Math.min(prevY, currY);
      ctx.moveTo(x1 - tickSize / 2, topY - tickSize / 2);
      ctx.lineTo(x1 + tickSize / 2, topY + tickSize / 2);
      ctx.stroke();
    }
  });
}

function drawRemarks(ctx: CanvasRenderingContext2D, entries: LogEntry[]) {
  // Separator line below grid
  ctx.strokeStyle = C_GRID_LIGHT;
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(MARGIN, REMARKS_Y - 4);
  ctx.lineTo(CANVAS_W - MARGIN, REMARKS_Y - 4);
  ctx.stroke();

  // Section header
  ctx.font = "bold 9px monospace";
  ctx.fillStyle = C_TEXT;
  ctx.fillText("Remarks", MARGIN, REMARKS_Y + 8);

  // Column headers
  const COL_TIME = GRID_X;
  const COL_LOC = GRID_X + 80;
  const COL_ACT = GRID_X + 300;
  const REMARK_ROW_H = 14;

  ctx.font = "bold 8px monospace";
  ctx.fillStyle = C_TEXT_LIGHT;
  ctx.fillText("Time", COL_TIME, REMARKS_Y + 8);
  ctx.fillText("Location", COL_LOC, REMARKS_Y + 8);
  ctx.fillText("Activity", COL_ACT, REMARKS_Y + 8);

  // Light header underline
  ctx.strokeStyle = C_GRID_LIGHT;
  ctx.lineWidth = 0.3;
  ctx.beginPath();
  ctx.moveTo(COL_TIME, REMARKS_Y + 11);
  ctx.lineTo(CANVAS_W - MARGIN, REMARKS_Y + 11);
  ctx.stroke();

  // Only print remarks for duty-status changes
  const changes = entries
    .filter((e) => e.is_change)
    .sort((a, b) => a.start_min - b.start_min);

  ctx.font = "8.5px monospace";
  changes.forEach((entry, i) => {
    const y = REMARKS_Y + 22 + i * REMARK_ROW_H;
    if (y + REMARK_ROW_H > TOTALS_Y - 4) return; // overflow guard

    const timeLabel = formatTime(entry.start_min);
    const loc =
      entry.location.length > 26
        ? entry.location.slice(0, 25) + "…"
        : entry.location;
    const act =
      entry.remark.length > 38 ? entry.remark.slice(0, 37) + "…" : entry.remark;

    // Alternating row background
    if (i % 2 === 0) {
      ctx.fillStyle = "#f9f9f9";
      ctx.fillRect(
        COL_TIME - 2,
        y - 10,
        CANVAS_W - MARGIN - COL_TIME + 2,
        REMARK_ROW_H,
      );
    }

    // Vertical tick from grid into remarks at change X position
    const x = minToX(entry.start_min);
    ctx.strokeStyle = C_GRID_LIGHT;
    ctx.lineWidth = 0.4;
    ctx.beginPath();
    ctx.moveTo(x, REMARKS_Y - 4);
    ctx.lineTo(
      x,
      REMARKS_Y - 4 + Math.min(14, 22 + i * REMARK_ROW_H - REMARKS_Y + 4),
    );
    ctx.stroke();

    ctx.fillStyle = C_TEXT_LIGHT;
    ctx.fillText(timeLabel, COL_TIME, y);
    ctx.fillStyle = C_TEXT;
    ctx.fillText(loc, COL_LOC, y);
    ctx.fillText(act, COL_ACT, y);
  });
}

function drawTotals(ctx: CanvasRenderingContext2D, sheet: LogSheet) {
  const t = sheet.totals;

  // Separator
  ctx.strokeStyle = C_GRID;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(MARGIN, TOTALS_Y - 8);
  ctx.lineTo(CANVAS_W - MARGIN, TOTALS_Y - 8);
  ctx.stroke();

  ctx.font = "10px monospace";
  ctx.fillStyle = C_TEXT_LIGHT;

  const cols = [
    { label: "Off Duty", val: t.off_duty_hrs },
    { label: "Sleeper", val: t.sleeper_hrs },
    { label: "Driving", val: t.driving_hrs },
    { label: "On Duty", val: t.on_duty_hrs },
    { label: "Total On-Duty", val: t.total_on_duty_hrs },
  ];

  const colW = GRID_W / cols.length;
  cols.forEach(({ label, val }, i) => {
    const x = GRID_X + i * colW;
    ctx.fillStyle = C_TEXT_LIGHT;
    ctx.fillText(label, x + 4, TOTALS_Y + 8);
    ctx.fillStyle = C_TEXT;
    ctx.font = "bold 12px monospace";
    ctx.fillText(`${val.toFixed(2)} hrs`, x + 4, TOTALS_Y + 24);
    ctx.font = "10px monospace";
  });
}

function formatTime(min: number): string {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  const ampm = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

// ─── React component ──────────────────────────────────────────────────────────

interface Props {
  sheet: LogSheet;
  onExport?: () => void;
}

export default function LogSheetCanvas({ sheet, onExport }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    drawHeader(ctx, sheet);
    drawGrid(ctx);
    drawEntries(ctx, sheet.entries);
    drawRemarks(ctx, sheet.entries);
    drawTotals(ctx, sheet);
  }, [sheet]);

  function handleExport() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `log-sheet-day-${sheet.day + 1}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    onExport?.();
  }

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <span className="text-sm font-medium">{sheet.date_label}</span>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          className="gap-1.5 text-xs h-7"
        >
          <Download className="h-3 w-3" />
          Export PNG
        </Button>
      </div>
      <div className="overflow-x-auto p-4">
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          className="block max-w-full h-auto rounded-md border border-border"
          style={{ height: "auto" }}
        />
      </div>
    </div>
  );
}
