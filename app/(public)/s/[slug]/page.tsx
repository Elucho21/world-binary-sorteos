import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/brand/site-header";
import { SiteFooter } from "@/components/brand/site-footer";
import { BannerStrip } from "@/components/brand/banner-strip";
import { SpinExperience } from "@/components/wheel/spin-experience";

export default async function PublicSorteoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: sorteo } = await supabase
    .from("public_sorteos")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!sorteo) notFound();

  const [{ data: segments }, { data: banners }] = await Promise.all([
    supabase
      .from("public_wheel_segments")
      .select("id, sorteo_id, label, color, sort_order")
      .eq("sorteo_id", sorteo.id)
      .order("sort_order", { ascending: true }),
    supabase.from("active_banners").select("*").eq("placement", "public_sorteo_page"),
  ]);

  const educatorLabel = sorteo.educator_brand_name || sorteo.educator_display_name || "tu educador";

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center gap-8 px-4 py-12 text-center sm:px-6">
        <div>
          <p className="text-sm font-medium text-brand-primary">Sorteo de {educatorLabel}</p>
          <h1 className="text-3xl font-bold tracking-tight">{sorteo.name}</h1>
          {sorteo.description && <p className="mt-2 text-brand-muted">{sorteo.description}</p>}
        </div>

        {segments && segments.length > 0 ? (
          <SpinExperience slug={slug} segments={segments} educatorLabel={educatorLabel} />
        ) : (
          <p className="text-brand-muted">Este sorteo todavía no tiene premios cargados.</p>
        )}

        {banners && banners.length > 0 && <BannerStrip banners={banners} />}
      </main>
      <SiteFooter />
    </div>
  );
}
