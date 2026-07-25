import Papa from "papaparse";

// Accepts a raw CSV/plain-text upload and returns the list of codes found.
// Works whether the file has a header row, a single "code" column, or is
// just one code per line — we only care about non-empty cell values.
export function parseCodesFile(text: string): string[] {
  const result = Papa.parse<string[]>(text.trim(), { skipEmptyLines: true });
  const codes = new Set<string>();
  for (const row of result.data) {
    for (const cell of row) {
      const value = String(cell ?? "").trim();
      if (value && value.toLowerCase() !== "code" && value.toLowerCase() !== "codigo") {
        codes.add(value);
      }
    }
  }
  return Array.from(codes);
}

export function toCsv<T extends Record<string, unknown>>(rows: T[]): string {
  return Papa.unparse(rows);
}

export function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  const csv = toCsv(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
