import { requireSuperAdmin } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BannerForm } from "@/components/admin/banner-form";
import { BannerListItem } from "@/components/admin/banner-list-item";

export default async function AdminBannersPage() {
  await requireSuperAdmin();
  const supabase = await createClient();

  const { data: banners } = await supabase
    .from("banners")
    .select("*")
    .order("sort_order", { ascending: true });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Banners</h1>
        <p className="text-sm text-brand-muted">
          Espacios publicitarios para World Binary TV, torneos y novedades.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nuevo banner</CardTitle>
          <CardDescription>Subí la imagen a donde prefieras (ej. Supabase Storage) y pegá su URL pública.</CardDescription>
        </CardHeader>
        <BannerForm />
      </Card>

      <div className="space-y-3">
        {(banners ?? []).map((banner) => (
          <BannerListItem key={banner.id} banner={banner} />
        ))}
        {(!banners || banners.length === 0) && (
          <p className="text-sm text-brand-muted">Todavía no hay banners.</p>
        )}
      </div>
    </div>
  );
}
