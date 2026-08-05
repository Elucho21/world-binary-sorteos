"use client";

import { useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MiniBarChart } from "@/components/dashboard/mini-bar-chart";
import { groupByDay } from "@/lib/stats";

interface StatsParticipant {
  email: string;
  sorteoId: string;
  sorteoName: string;
  educatorId: string;
  createdAt: string;
}

interface StatsPrizeCode {
  status: string;
  educatorId: string;
}

interface EducatorOption {
  id: string;
  name: string;
}

export function StatsDashboard({
  participants,
  prizeCodes,
  educators,
  totalParticipants,
  totalIssued,
  totalRedeemed,
}: {
  participants: StatsParticipant[];
  prizeCodes: StatsPrizeCode[];
  educators: EducatorOption[];
  totalParticipants: number;
  totalIssued: number;
  totalRedeemed: number;
}) {
  const [educatorId, setEducatorId] = useState("all");

  const filtered = useMemo(
    () => (educatorId === "all" ? participants : participants.filter((p) => p.educatorId === educatorId)),
    [participants, educatorId]
  );

  const totalRegistros = educatorId === "all" ? totalParticipants : filtered.length;

  const { uniqueCount, repeatingCount } = useMemo(() => {
    const emailSorteos = new Map<string, Set<string>>();
    for (const p of filtered) {
      const email = p.email.toLowerCase();
      const set = emailSorteos.get(email) ?? new Set<string>();
      set.add(p.sorteoId);
      emailSorteos.set(email, set);
    }
    let repeating = 0;
    for (const sorteoIds of emailSorteos.values()) {
      if (sorteoIds.size > 1) repeating += 1;
    }
    return { uniqueCount: emailSorteos.size, repeatingCount: repeating };
  }, [filtered]);

  const { issuedCount, redeemedCount } = useMemo(() => {
    if (educatorId === "all") return { issuedCount: totalIssued, redeemedCount: totalRedeemed };
    const forEducator = prizeCodes.filter((c) => c.educatorId === educatorId);
    return {
      issuedCount: forEducator.filter((c) => c.status === "issued").length,
      redeemedCount: forEducator.filter((c) => c.status === "redeemed").length,
    };
  }, [prizeCodes, educatorId, totalIssued, totalRedeemed]);

  const chartData = useMemo(() => groupByDay(filtered.map((p) => p.createdAt)), [filtered]);

  const topSorteos = useMemo(() => {
    const counts = new Map<string, { name: string; count: number }>();
    for (const p of filtered) {
      const current = counts.get(p.sorteoId) ?? { name: p.sorteoName, count: 0 };
      current.count += 1;
      counts.set(p.sorteoId, current);
    }
    return Array.from(counts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [filtered]);

  return (
    <div className="space-y-6">
      <div>
        <label htmlFor="educatorFilter" className="mb-1 block text-xs text-brand-muted">
          Filtrar por educador
        </label>
        <select
          id="educatorFilter"
          value={educatorId}
          onChange={(e) => setEducatorId(e.target.value)}
          className="rounded-md border border-brand-border bg-brand-surface px-3 py-2 text-sm text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary"
        >
          <option value="all">Todos los educadores</option>
          {educators.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Card className="p-4 text-center">
          <p className="text-2xl font-semibold">{totalRegistros}</p>
          <p className="text-xs text-brand-muted">Registros totales</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-semibold">{uniqueCount}</p>
          <p className="text-xs text-brand-muted">Registros únicos</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-semibold">{repeatingCount}</p>
          <p className="text-xs text-brand-muted">Participantes que repiten</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-semibold">{issuedCount}</p>
          <p className="text-xs text-brand-muted">Códigos emitidos</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-semibold">{redeemedCount}</p>
          <p className="text-xs text-brand-muted">Códigos canjeados</p>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Inscriptos por día</CardTitle>
          <CardDescription>Últimos 14 días{educatorId === "all" ? ", todos los sorteos" : ""}.</CardDescription>
        </CardHeader>
        <MiniBarChart data={chartData} />
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top 5 sorteos por participantes</CardTitle>
        </CardHeader>
        <div className="space-y-2">
          {topSorteos.map((s, i) => (
            <div key={i} className="flex items-center justify-between border-b border-brand-border/60 py-2">
              <span>{s.name}</span>
              <span className="font-semibold">{s.count}</span>
            </div>
          ))}
          {topSorteos.length === 0 && <p className="text-sm text-brand-muted">Todavía no hay datos.</p>}
        </div>
      </Card>
    </div>
  );
}
