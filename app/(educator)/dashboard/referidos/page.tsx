import { requireApprovedEducator } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShareCopyButton } from "@/components/dashboard/share-copy-button";

export default async function ReferidosPage() {
  const profile = await requireApprovedEducator();
  const supabase = await createClient();

  const { data: referred } = await supabase
    .from("profiles")
    .select("id, display_name, status, created_at")
    .eq("referred_by", profile.id)
    .order("created_at", { ascending: false });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const referralLink = `${siteUrl}/signup?ref=${profile.id}`;
  const approvedCount = (referred ?? []).filter((r) => r.status === "approved").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Referidos</h1>
        <p className="text-sm text-brand-muted">
          Invitá a otro educador/IB a sumarse a la plataforma con tu link personal.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tu link de invitación</CardTitle>
          <CardDescription>Cuando alguien se registre con este link, va a quedar marcado como referido tuyo.</CardDescription>
        </CardHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <p className="flex-1 rounded-md border border-brand-border bg-brand-bg p-3 font-mono text-sm text-brand-muted">
            {referralLink}
          </p>
          <ShareCopyButton text={referralLink} label="Copiar link" />
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Educadores referidos ({referred?.length ?? 0})</CardTitle>
          <CardDescription>{approvedCount} ya aprobados y activos en la plataforma.</CardDescription>
        </CardHeader>
        <div className="space-y-2">
          {(referred ?? []).map((r) => (
            <div key={r.id} className="flex items-center justify-between border-b border-brand-border/60 py-2">
              <span>{r.display_name}</span>
              <Badge tone={r.status === "approved" ? "success" : r.status === "rejected" ? "danger" : "neutral"}>
                {r.status === "approved" ? "Aprobado" : r.status === "rejected" ? "Rechazado" : "Pendiente"}
              </Badge>
            </div>
          ))}
          {(!referred || referred.length === 0) && (
            <p className="text-sm text-brand-muted">Todavía no referiste a nadie.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
