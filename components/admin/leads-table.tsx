import { Card } from "@/components/ui/card";
import { ExportCsvButton } from "@/components/dashboard/export-csv-button";

interface LeadRow {
  nombre: string;
  email: string;
  sorteo: string;
  educador: string;
  fecha: string;
}

// Search + pagination now live server-side in app/(admin)/admin/leads/page.tsx
// (the participants table can be much larger than the 2000-row client cap
// this used to have) — `rows` is already the current page, `exportRows` is
// every row matching the current search (capped separately, for the CSV).
export function LeadsTable({ rows, exportRows }: { rows: LeadRow[]; exportRows: LeadRow[] }) {
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <ExportCsvButton filename="leads-world-binary.csv" rows={exportRows as unknown as Record<string, unknown>[]} />
      </div>

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-brand-border text-brand-muted">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Sorteo</th>
              <th className="px-4 py-3">Educador</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-brand-border/60">
                <td className="px-4 py-3">{row.nombre}</td>
                <td className="px-4 py-3">{row.email}</td>
                <td className="px-4 py-3">{row.sorteo}</td>
                <td className="px-4 py-3">{row.educador}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-brand-muted">
                  {exportRows.length === 0 ? "Todavía no hay leads." : "Sin resultados para esa búsqueda."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
