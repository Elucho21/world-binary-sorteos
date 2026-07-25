import Link from "next/link";
import { notFound } from "next/navigation";
import { requireApprovedEducator } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SorteoEditForm } from "@/components/dashboard/sorteo-edit-form";
import { ConfirmButton } from "@/components/dashboard/delete-button";
import { setSorteoStatus, deleteSorteo } from "../actions";
import type { SorteoStatus } from "@/types/database.types";

const statusLabel: Record<SorteoStatus, string> = {
  draft: "Borrador",
  active: "Activo",
  paused: "Pausado",
  ended: "Finalizado",
};

export default async function SorteoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireApprovedEducator();
  const supabase = await createClient();

  const { data: sorteo } = await supabase.from("sorteos").select("*").eq("id", id).single();
  if (!sorteo) notFound();

  const [{ count: segmentCount }, { count: participantCount }] = await Promise.all([
    supabase.from("wheel_segments").select("id", { count: "exact", head: true }).eq("sorteo_id", id),
    supabase.from("participants").select("id", { count: "exact", head: true }).eq("sorteo_id", id),
  ]);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">{sorteo.name}</h1>
            <Badge tone={sorteo.status === "active" ? "success" : "neutral"}>
              {statusLabel[sorteo.status]}
            </Badge>
          </div>
          <a
            href={`${siteUrl}/s/${sorteo.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-brand-primary hover:underline"
          >
            {siteUrl}/s/{sorteo.slug}
          </a>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/dashboard/sorteos/${id}/segments`}>
            <Button variant="secondary" size="sm">
              Ruleta ({segmentCount ?? 0})
            </Button>
          </Link>
          <Link href={`/dashboard/sorteos/${id}/codes`}>
            <Button variant="secondary" size="sm">
              Códigos
            </Button>
          </Link>
          <Link href={`/dashboard/sorteos/${id}/participants`}>
            <Button variant="secondary" size="sm">
              Participantes ({participantCount ?? 0})
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Estado del sorteo</CardTitle>
          <CardDescription>
            Solo un sorteo &quot;Activo&quot; es visible y jugable en su URL pública.
          </CardDescription>
        </CardHeader>
        <div className="flex flex-wrap gap-2">
          {(["draft", "active", "paused", "ended"] as SorteoStatus[]).map((status) => (
            <form key={status} action={setSorteoStatus.bind(null, id, status)}>
              <Button
                type="submit"
                size="sm"
                variant={sorteo.status === status ? "primary" : "secondary"}
              >
                {statusLabel[status]}
              </Button>
            </form>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Datos del sorteo</CardTitle>
        </CardHeader>
        <SorteoEditForm sorteo={sorteo} />
      </Card>

      <Card className="border-brand-danger/30">
        <CardHeader>
          <CardTitle>Zona de riesgo</CardTitle>
          <CardDescription>
            Borrar el sorteo elimina también sus segmentos, participantes y giros.
          </CardDescription>
        </CardHeader>
        <ConfirmButton
          action={deleteSorteo.bind(null, id)}
          confirmText="¿Seguro que querés borrar este sorteo? Esta acción no se puede deshacer."
        >
          Borrar sorteo
        </ConfirmButton>
      </Card>
    </div>
  );
}
