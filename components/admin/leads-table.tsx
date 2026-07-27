"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ExportCsvButton } from "@/components/dashboard/export-csv-button";

interface LeadRow {
  nombre: string;
  email: string;
  sorteo: string;
  educador: string;
  fecha: string;
}

export function LeadsTable({ rows }: { rows: LeadRow[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.nombre.toLowerCase().includes(q) || r.email.toLowerCase().includes(q));
  }, [rows, query]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nombre o email..."
          className="max-w-xs"
        />
        <ExportCsvButton filename="leads-world-binary.csv" rows={filtered as unknown as Record<string, unknown>[]} />
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
            {filtered.map((row, i) => (
              <tr key={i} className="border-b border-brand-border/60">
                <td className="px-4 py-3">{row.nombre}</td>
                <td className="px-4 py-3">{row.email}</td>
                <td className="px-4 py-3">{row.sorteo}</td>
                <td className="px-4 py-3">{row.educador}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-brand-muted">
                  {rows.length === 0 ? "Todavía no hay leads." : "Sin resultados para esa búsqueda."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
