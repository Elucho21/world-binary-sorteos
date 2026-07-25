import { requireSuperAdmin } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BannerForm } from "@/components/admin/banner-form";
import { toggleBannerActive, deleteBanner } from "./actions";

const placementLabel: Record<string, string> = {
  public_sorteo_page: "Página pública",
  participant_dashboard: "Mis Premios",
};

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
          <Card key={banner.id} className="flex flex-wrap items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element -- admin-pasted external URL, no next/image domain to allowlist */}
            <img src={banner.image_url} alt={banner.title} className="h-16 w-28 rounded object-cover" />
            <div className="flex-1">
              <p className="font-medium">{banner.title}</p>
              <p className="text-xs text-brand-muted">{placementLabel[banner.placement]}</p>
            </div>
            <Badge tone={banner.is_active ? "success" : "neutral"}>
              {banner.is_active ? "Activo" : "Inactivo"}
            </Badge>
            <div className="flex gap-2">
              <form action={toggleBannerActive.bind(null, banner.id, !banner.is_active)}>
                <Button type="submit" size="sm" variant="secondary">
                  {banner.is_active ? "Desactivar" : "Activar"}
                </Button>
              </form>
              <form action={deleteBanner.bind(null, banner.id)}>
                <Button type="submit" size="sm" variant="danger">
                  Borrar
                </Button>
              </form>
            </div>
          </Card>
        ))}
        {(!banners || banners.length === 0) && (
          <p className="text-sm text-brand-muted">Todavía no hay banners.</p>
        )}
      </div>
    </div>
  );
}
