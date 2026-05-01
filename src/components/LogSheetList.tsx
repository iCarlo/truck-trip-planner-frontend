import type { LogSheet } from "../api";
import LogSheetCanvas from "./LogSheetCanvas";
import { Info } from "lucide-react";

interface Props {
  sheets: LogSheet[];
}

export default function LogSheetList({ sheets }: Props) {
  if (sheets.length === 0) return null;

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div className="flex items-center gap-2 text-sm text-muted-foreground rounded-lg border bg-muted/50 px-4 py-3">
        <Info className="h-4 w-4 shrink-0" />
        <span>
          Scroll right if the canvas is cut off. Use "Export PNG" to save
          individual sheets.
        </span>
      </div>
      <div className="flex flex-col gap-8 overflow-x-auto">
        {sheets.map((sheet) => (
          <div key={sheet.day} className="flex flex-col gap-2">
            <LogSheetCanvas sheet={sheet} />
          </div>
        ))}
      </div>
    </div>
  );
}
