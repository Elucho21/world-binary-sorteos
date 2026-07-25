"use client";

import { Button } from "@/components/ui/button";
import { downloadCsv } from "@/lib/csv";

export function ExportCsvButton({
  filename,
  rows,
  label = "Exportar CSV",
}: {
  filename: string;
  rows: Record<string, unknown>[];
  label?: string;
}) {
  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      onClick={() => downloadCsv(filename, rows)}
      disabled={rows.length === 0}
    >
      {label}
    </Button>
  );
}
