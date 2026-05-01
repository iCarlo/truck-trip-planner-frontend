import type { LogSheet } from "../api";
import LogSheetCanvas from "./LogSheetCanvas";

interface Props {
  sheets: LogSheet[];
}

export default function LogSheetList({ sheets }: Props) {
  if (sheets.length === 0) return null;

  return (
    <div>
      <h2 style={{ fontFamily: "monospace", marginBottom: 8 }}>
        ELD Log Sheets ({sheets.length} day{sheets.length !== 1 ? "s" : ""})
      </h2>
      <p
        style={{
          fontSize: 12,
          color: "#666",
          fontFamily: "monospace",
          marginBottom: 24,
        }}
      >
        Scroll right if canvas is cut off. Use "Export PNG" to save individual
        sheets.
      </p>
      <div style={{ overflowX: "auto" }}>
        {sheets.map((sheet) => (
          <LogSheetCanvas key={sheet.day} sheet={sheet} />
        ))}
      </div>
    </div>
  );
}
