"use client";

interface Column {
  key: string;
  label: string;
  align?: "left" | "right";
}

interface Props {
  columns: Column[];
  rows: Record<string, unknown>[];
  onSort?: (key: string) => void;
  sortKey?: string;
  sortDir?: "asc" | "desc";
}

export default function ReportTable({ columns, rows, onSort, sortKey, sortDir }: Props) {
  function arrow(col: string) {
    if (col !== sortKey) return "";
    return sortDir === "asc" ? " ↑" : " ↓";
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-edge-primary bg-surface-primary">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-edge-secondary">
            {columns.map((col) => (
              <th
                key={col.key}
                onClick={() => onSort?.(col.key)}
                className={
                  "px-4 py-3 font-semibold text-content-secondary whitespace-nowrap " +
                  (onSort ? "cursor-pointer select-none hover:text-content-primary " : "") +
                  (col.align === "right" ? "text-right" : "text-left")
                }
              >
                {col.label}{arrow(col.key)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-edge-secondary">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-surface-secondary transition-colors">
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={
                    "px-4 py-3 text-content-primary " +
                    (col.align === "right" ? "text-right" : "text-left")
                  }
                >
                  {String(row[col.key] ?? "")}
                </td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-8 text-center text-content-muted"
              >
                No data
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}