import { TOKENS } from "@/config/calendarMaps";

export default function CellPill({
  labelTop, labelBottom,
}: { labelTop: string; labelBottom?: string; }) {
  if (!labelTop && !labelBottom) return null;

  return (
    <div className="h-full w-full flex items-center" style={{ position:"relative", zIndex: TOKENS.z.booking }}>
      <div
        className="flex flex-col justify-center rounded-md w-full"
        style={{
          height: "calc(var(--cell-h) - 8px)",
          background: "#DBEAFE",                // blue-100
          border: "1px solid #C7DBFD",
          color: "#4B5563",                      // gray-600
          padding: "6px 10px",
        }}
      >
        <div style={{ fontSize: "13px", fontWeight: 700, lineHeight: 1.1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {labelTop}
        </div>
        {!!labelBottom && (
          <div style={{ fontSize: "11px", lineHeight: 1.1 }} className="tabular-nums">
            {labelBottom}
          </div>
        )}
      </div>
    </div>
  );
}
