import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { requireApprovedEducator } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { SorteoEditForm } from "@/components/dashboard/sorteo-edit-form";
import { SorteoStatusButtons } from "@/components/dashboard/sorteo-status-buttons";
import { SorteoDetailTour } from "@/components/dashboard/sorteo-detail-tour";
import { ConfirmButton } from "@/components/dashboard/delete-button";
import { ShareCopyButton } from "@/components/dashboard/share-copy-button";
import { deleteSorteo, cloneSorteo } from "../actions";
import { getCachedQrDataUrl } from "@/lib/cache";
import type { SorteoStatus } from "@/types/database.types";

const statusLabel: Record<SorteoStatus, string> = {
  draft: "Borrador",
  active: "Activo",
  paused: "Pausado",
  ended: "Finalizado",
};

export default async function SorteoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await requireApprovedEducator();
  const supabase = await createClient();

  const { data: sorteo } = await supabase.from("sorteos").select("*").eq("id", id).single();
  if (!sorteo) notFound();

  const rootHref = profile.role === "super_admin" ? "/admin/sorteos" : "/dashboard";
  const rootLabel = profile.role === "super_admin" ? "Sorteos" : "Mis sorteos";

  const [{ count: participantCount }, { count: prizeCount }] = await Promise.all([
    supabase.from("participants").select("id", { count: "exact", head: true }).eq("sorteo_id", id),
    supabase
      .from("prize_codes")
      .select("id", { count: "exact", head: true })
      .eq("sorteo_id", id)
      .eq("status", "available"),
  ]);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const publicUrl = `${siteUrl}/s/${sorteo.slug}`;
  const qrDataUrl = await getCachedQrDataUrl(publicUrl);
  const shareText = `🎉 ¡Registrate en el sorteo de ${sorteo.name} y participá por una cuenta bono de World Binary! Anotate acá: ${publicUrl}`;

  return (
    <div className="space-y-6">
      <Suspense fallback={null}>
        <SorteoDetailTour />
      </Suspense>
      <Breadcrumbs items={[{ label: rootLabel, href: rootHref }, { label: sorteo.name }]} />
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
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1" data-tour="premios-btn">
            <Link href={`/dashboard/sorteos/${id}/codes`}>
              <Button variant="secondary" size="sm">
                Premios ({prizeCount ?? 0})
              </Button>
            </Link>
            <InfoTooltip label="Ayuda sobre Premios">
              Cargá acá las cuentas bono que se van a repartir entre los ganadores de este sorteo.
            </InfoTooltip>
          </span>
          <span className="inline-flex items-center gap-1">
            <Link href={`/dashboard/sorteos/${id}/participants`}>
              <Button variant="secondary" size="sm">
                Participantes ({participantCount ?? 0})
              </Button>
            </Link>
            <InfoTooltip label="Ayuda sobre Participantes">
              Todos los que se registraron en tu link público, con nombre y email.
            </InfoTooltip>
          </span>
          <span className="inline-flex items-center gap-1" data-tour="sortear-btn">
            <Link href={`/dashboard/sorteos/${id}/winners`}>
              <Button variant={sorteo.drawn_at ? "secondary" : "primary"} size="sm">
                {sorteo.drawn_at ? "Ver ganadores" : "Sortear"}
              </Button>
            </Link>
            <InfoTooltip label="Ayuda sobre Sortear">
              Sortear es una acción única y no se puede deshacer ni repetir: una vez que gira la
              ruleta, los ganadores y sus códigos quedan fijos para siempre. Asegurate de tener
              cargados suficientes premios antes de sortear.
            </InfoTooltip>
          </span>
          <span className="inline-flex items-center gap-1">
            <Link href={`/dashboard/sorteos/${id}/stats`}>
              <Button variant="secondary" size="sm">
                Estadísticas
              </Button>
            </Link>
            <InfoTooltip label="Ayuda sobre Estadísticas">
              Cuántos se registraron, cuándo, y cómo viene tu sorteo comparado con tus otros
              sorteos.
            </InfoTooltip>
          </span>
          <span className="inline-flex items-center gap-1">
            <form action={cloneSorteo.bind(null, id)}>
              <Button type="submit" variant="secondary" size="sm">
                Duplicar
              </Button>
            </form>
            <InfoTooltip label="Ayuda sobre Duplicar">
              Crea un sorteo nuevo con los mismos datos (nombre, fechas, cantidad de ganadores)
              pero sin participantes ni premios.
            </InfoTooltip>
          </span>
        </div>
      </div>

      <Card data-tour="estado-card">
        <CardHeader>
          <CardTitle>Estado del sorteo</CardTitle>
          <CardDescription>
            Solo un sorteo &quot;Activo&quot; es visible y jugable en su URL pública.
          </CardDescription>
        </CardHeader>
        <SorteoStatusButtons sorteoId={id} currentStatus={sorteo.status} />
      </Card>

      <Card data-tour="share-card">
        <CardHeader>
          <CardTitle>Compartir</CardTitle>
          <CardDescription>QR y texto listo para mandar por WhatsApp o Instagram.</CardDescription>
        </CardHeader>
        <div className="flex flex-col items-start gap-4 sm:flex-row">
          {/* eslint-disable-next-line @next/next/no-img-element -- generated data: URI, not an external image */}
          <img src={qrDataUrl} alt={`Código QR de ${publicUrl}`} width={140} height={140} className="rounded-md" />
          <div className="flex-1 space-y-2">
            <p className="rounded-md border border-brand-border bg-brand-bg p-3 text-sm text-brand-muted">
              {shareText}
            </p>
            <div className="flex flex-wrap gap-2">
              <ShareCopyButton text={shareText} label="Copiar mensaje" />
              <a href={`/dashboard/sorteos/${id}/marketing/story`}>
                <Button type="button" variant="secondary" size="sm">
                  Story de Instagram
                </Button>
              </a>
              <a href={`/dashboard/sorteos/${id}/marketing/facebook`}>
                <Button type="button" variant="secondary" size="sm">
                  Post de Facebook
                </Button>
              </a>
            </div>
          </div>
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
            Borrar el sorteo elimina también sus participantes y ganadores registrados.
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
