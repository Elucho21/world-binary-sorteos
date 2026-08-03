"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BannerForm } from "@/components/admin/banner-form";
import { toggleBannerActive, deleteBanner } from "@/app/(admin)/admin/banners/actions";
import type { Banner } from "@/types/database.types";

const placementLabel: Record<string, string> = {
  public_sorteo_page: "Página pública",
  participant_dashboard: "Mis Premios",
};

export function BannerListItem({ banner }: { banner: Banner }) {
  const [isEditing, setIsEditing] = useState(false);

  if (isEditing) {
    return (
      <Card>
        <BannerForm banner={banner} onCancel={() => setIsEditing(false)} />
      </Card>
    );
  }

  return (
    <Card className="flex flex-wrap items-center gap-4">
      {/* eslint-disable-next-line @next/next/no-img-element -- admin-pasted external URL, no next/image domain to allowlist */}
      <img src={banner.image_url} alt={banner.title} className="h-16 w-28 rounded object-cover" />
      <div className="flex-1">
        <p className="font-medium">{banner.title}</p>
        <p className="text-xs text-brand-muted">{placementLabel[banner.placement]}</p>
      </div>
      <Badge tone={banner.is_active ? "success" : "neutral"}>{banner.is_active ? "Activo" : "Inactivo"}</Badge>
      <div className="flex gap-2">
        <Button type="button" size="sm" variant="secondary" onClick={() => setIsEditing(true)}>
          Editar
        </Button>
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
  );
}
