import Link from "next/link";
import { redirect } from "next/navigation";
import { requireApprovedEducator, effectiveEducatorId } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DashboardHomeTour } from "@/components/dashboard/dashboard-home-tour";
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
  if (profile.role === "super_admin") {
    redirect("/admin/sorteos");
  }
  const educatorId = effectiveEducatorId(profile);
  const supabase = await createClient();
  const { data: sorteos } = await supabase
    .from("sorteos")
    .select("id, name, slug, status, created_at")
    .eq("educator_id", educatorId)
    .order("created_at", { ascending: false });

  const { count: availableCodeCount } = await supabase
    .from("prize_codes")
    .select("id", { count: "exact", head: true })
    .eq("educator_id", educatorId)
    .eq("status", "available");

  const hasSorteo = (sorteos ?? []).length > 0;
  const hasActiveSorteo = (sorteos ?? []).some((s) => s.status === "active");
  const checklist = [
    { done: hasSorteo, label: "Creá tu primer sorteo", href: "/dashboard/sorteos/new" },
    {
      done: (availableCodeCount ?? 0) > 0,
      label: "Cargá cuentas bono como premio",
      href: hasSorteo ? `/dashboard/sorteos/${sorteos![0].id}/codes` : "/dashboard/codes",
    },
    { done: hasActiveSorteo, label: "Activá el sorteo", href: hasSorteo ? `/dashboard/sorteos/${sorteos![0].id}` : "/dashboard/sorteos/new" },
  ];
  const showChecklist = !checklist.every((step) => step.done);

  return (
    <div className="space-y-6">
      <DashboardHomeTour autoStart={!hasSorteo} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Mis sorteos</h1>
          <p className="text-sm text-brand-muted">Creá y gestioná tus sorteos de ruleta.</p>
        </div>
        <Link href="/dashboard/sorteos/new" data-tour="new-sorteo-btn">
          <Button>Nuevo sorteo</Button>
        </Link>
      </div>

      {showChecklist && (
        <Card data-tour="checklist">
          <CardTitle>Primeros pasos</CardTitle>
          <CardDescription className="mt-1">
            Seguí estos pasos para dejar tu sorteo listo para compartir.
          </CardDescription>
          <ul className="mt-3 space-y-2">
            {checklist.map((step) => (
              <li key={step.label}>
                <Link
                  href={step.href}
                  className="flex items-center gap-2 text-sm hover:text-brand-primary"
                >
                  <span
                    className={
                      step.done
                        ? "flex h-5 w-5 items-center justify-center rounded-full bg-brand-primary text-xs text-brand-primary-foreground"
                        : "flex h-5 w-5 items-center justify-center rounded-full border border-brand-border text-xs text-brand-muted"
                    }
                  >
                    {step.done ? "✓" : ""}
                  </span>
                  <span className={step.done ? "text-brand-muted line-through" : ""}>{step.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

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
