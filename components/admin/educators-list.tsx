"use client";

import { useMemo, useState } from "react";
import { setEducatorStatus } from "@/app/(admin)/admin/educators/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ProfileStatus } from "@/types/database.types";

interface EducatorRow {
  id: string;
  display_name: string | null;
  brand_name: string | null;
  status: ProfileStatus;
  created_at: string;
  referrerName?: string | null;
}

const statusTone: Record<ProfileStatus, "warning" | "success" | "danger"> = {
  pending: "warning",
  approved: "success",
  rejected: "danger",
};

const statusLabel: Record<ProfileStatus, string> = {
  pending: "Pendiente",
  approved: "Aprobado",
  rejected: "Rechazado",
};

type Tab = "all" | "approved" | "rejected";

export function EducatorsList({ educators }: { educators: EducatorRow[] }) {
  const [tab, setTab] = useState<Tab>("all");

  const counts = useMemo(
    () => ({
      all: educators.length,
      approved: educators.filter((e) => e.status === "approved").length,
      rejected: educators.filter((e) => e.status === "rejected").length,
    }),
    [educators]
  );

  const filtered = useMemo(
    () => (tab === "all" ? educators : educators.filter((e) => e.status === tab)),
    [educators, tab]
  );

  const tabs: { id: Tab; label: string }[] = [
    { id: "all", label: `Todos (${counts.all})` },
    { id: "approved", label: `Aprobados (${counts.approved})` },
    { id: "rejected", label: `Rechazados (${counts.rejected})` },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <Button
            key={t.id}
            type="button"
            size="sm"
            variant={tab === t.id ? "primary" : "secondary"}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </Button>
        ))}
      </div>
      <div className="space-y-2">
        {filtered.map((educator) => (
          <div key={educator.id} className="flex items-center justify-between border-b border-brand-border/60 py-2">
            <div>
              <p>{educator.display_name}</p>
              {educator.referrerName && (
                <p className="text-xs text-brand-muted">Referido por {educator.referrerName}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge tone={statusTone[educator.status]}>{statusLabel[educator.status]}</Badge>
              {educator.status === "rejected" && (
                <form action={setEducatorStatus.bind(null, educator.id, "approved")}>
                  <Button type="submit" size="sm" variant="secondary">
                    Aprobar igual
                  </Button>
                </form>
              )}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="py-2 text-sm text-brand-muted">No hay educadores con ese estado.</p>
        )}
      </div>
    </div>
  );
}
