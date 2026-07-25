import Link from "next/link";
import { requireApprovedEducator } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { SorteoStatus } from "@/types/database.types";

const statusTone: Record<SorteoStatus, "neutral" | "success" | "warning" | "danger"> = {
  draft: "neutral",
  active: "success",
  paused: "warning",
  ended: "danger",
};

const statusLabel: Record<SorteoStatus, string> = {
  draft: "Borrador",
  active: "Activo",
  paused: "Pausado",
  ended: "Finalizado",
};

export default async function DashboardPage() {
  const profile = await requireApprovedEducator();
  const supabase = await createClient();
  const { data: sorteos } = await supabase
    .from("sorteos")
    .select("id, name, slug, status, created_at")
    .eq("educator_id", profile.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Mis sorteos</h1>
          <p className="text-sm text-brand-muted">Creá y gestioná tus sorteos de ruleta.</p>
        </div>
        <Link href="/dashboard/sorteos/new">
          <Button>Nuevo sorteo</Button>
        </Link>
      </div>

      {!sorteos || sorteos.length === 0 ? (
        <Card>
          <CardTitle>Todavía no tenés sorteos</CardTitle>
          <CardDescription className="mt-2">
            Creá tu primer sorteo para empezar a captar participantes.
          </CardDescription>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {sorteos.map((sorteo) => (
            <Link key={sorteo.id} href={`/dashboard/sorteos/${sorteo.id}`}>
              <Card className="h-full transition-colors hover:border-brand-primary">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle>{sorteo.name}</CardTitle>
                  <Badge tone={statusTone[sorteo.status]}>{statusLabel[sorteo.status]}</Badge>
                </div>
                <CardDescription className="mt-2">/s/{sorteo.slug}</CardDescription>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
