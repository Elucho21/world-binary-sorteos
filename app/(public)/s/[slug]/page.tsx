import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/brand/site-header";
import { SiteFooter } from "@/components/brand/site-footer";
import { BannerStrip } from "@/components/brand/banner-strip";
import { RegistrationForm } from "@/components/public/registration-form";
import { PrizeRevealCheck } from "@/components/public/prize-reveal-check";

export default async function PublicSorteoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: sorteo } = await supabase
    .from("public_sorteos")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!sorteo) notFound();

  const [{ data: sorteoDetails }, { data: banners }] = await Promise.all([
    supabase.from("sorteos").select("winners_count, drawn_at").eq("id", sorteo.id).single(),
    supabase.from("active_banners").select("*").eq("placement", "public_sorteo_page"),
  ]);

  const educatorLabel = sorteo.educator_brand_name || sorteo.educator_display_name || "tu educador";
  const winnersCount = sorteoDetails?.winners_count ?? 1;
  const alreadyDrawn = !!sorteoDetails?.drawn_at;

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center gap-8 px-4 py-12 text-center sm:px-6">
        <div>
          <p className="text-sm font-medium text-brand-primary">Sorteo de {educatorLabel}</p>
          <h1 className="text-3xl font-bold tracking-tight">{sorteo.name}</h1>
          {sorteo.description && <p className="mt-2 text-brand-muted">{sorteo.description}</p>}
          <p className="mt-3 text-sm text-brand-muted">
            {winnersCount > 1 ? `Se sortean ${winnersCount} ganadores` : "Se sortea 1 ganador"} entre
            todos los que se registren.
          </p>
        </div>

        {!alreadyDrawn && (
          <div className="w-full rounded-lg border border-brand-border bg-brand-surface p-4 text-left text-sm text-brand-muted">
            <p className="font-medium text-brand-text">Cómo funciona</p>
            <ol className="mt-2 list-inside list-decimal space-y-1.5">
              <li>Te registrás con tu nombre y email.</li>
              <li>
                {educatorLabel} sortea {winnersCount > 1 ? `${winnersCount} ganadores` : "1 ganador"}{" "}
                entre todos los inscriptos.
              </li>
              <li>
                Si ganás, te avisamos y vas a ver tu premio en <strong>Mis Premios</strong> — desde
                ahí lo canjeás con {educatorLabel} o con World Binary.
              </li>
            </ol>
          </div>
        )}

        {!alreadyDrawn && (
          <RegistrationForm slug={slug} educatorLabel={educatorLabel} winnersCount={winnersCount} />
        )}
        <PrizeRevealCheck slug={slug} alreadyDrawn={alreadyDrawn} educatorLabel={educatorLabel} />

        {banners && banners.length > 0 && <BannerStrip banners={banners} />}
      </main>
      <SiteFooter />
    </div>
  );
}
