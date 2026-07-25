import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/brand/site-header";
import { SiteFooter } from "@/components/brand/site-footer";
import { BannerStrip } from "@/components/brand/banner-strip";
import { MagicLinkForm } from "@/components/brand/magic-link-form";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { participantLogout } from "./actions";
import type { MyEntry, ActiveBanner } from "@/types/database.types";

export default async function MisPremiosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: banners } = await supabase
    .from("active_banners")
    .select("*")
    .eq("placement", "participant_dashboard");

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center gap-8 px-4 py-12 text-center sm:px-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mis Premios</h1>
          <p className="mt-2 text-brand-muted">
            Ingresá tu email y te mandamos un link para ver todos los premios que ganaste, con
            cualquier educador.
          </p>
        </div>

        {!user?.email ? (
          <MagicLinkForm />
        ) : (
          <ParticipantEntries email={user.email} />
        )}

        {banners && banners.length > 0 && <BannerStrip banners={banners as ActiveBanner[]} />}
      </main>
      <SiteFooter />
    </div>
  );
}

async function ParticipantEntries({ email }: { email: string }) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("my_entries")
    .select("*")
    .order("spun_at", { ascending: false });

  const entries = (data ?? []) as MyEntry[];

  return (
    <div className="w-full space-y-4 text-left">
      <div className="flex items-center justify-between">
        <p className="text-sm text-brand-muted">Sesión: {email}</p>
        <form action={participantLogout}>
          <Button type="submit" variant="ghost" size="sm">
            Salir
          </Button>
        </form>
      </div>

      {entries.length === 0 && (
        <Card>
          <CardTitle>Todavía no tenés premios</CardTitle>
          <CardDescription className="mt-2">
            Participá en el sorteo de tu educador para empezar a ganar.
          </CardDescription>
        </Card>
      )}

      {entries.map((entry) => (
        <Card key={entry.entry_id} className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-medium">{entry.segment_label}</p>
            <p className="text-xs text-brand-muted">
              {entry.sorteo_name} — {entry.educator_brand_name || entry.educator_display_name}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {entry.code && <span className="font-mono text-sm">{entry.code}</span>}
            {entry.code_status && (
              <Badge tone={entry.code_status === "redeemed" ? "success" : "warning"}>
                {entry.code_status === "redeemed" ? "Canjeado" : "Pendiente de canje"}
              </Badge>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
