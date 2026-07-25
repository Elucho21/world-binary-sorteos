"use server";

import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { bannerSchema } from "@/lib/validation";

export type FormState = { error?: string } | undefined;

function toTimestamp(value: string | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export async function createBanner(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireSuperAdmin();
  const parsed = bannerSchema.safeParse({
    title: formData.get("title"),
    imageUrl: formData.get("imageUrl"),
    linkUrl: formData.get("linkUrl"),
    placement: formData.get("placement"),
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisá los datos del banner." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("banners").insert({
    title: parsed.data.title,
    image_url: parsed.data.imageUrl,
    link_url: parsed.data.linkUrl || null,
    placement: parsed.data.placement,
    starts_at: toTimestamp(parsed.data.startsAt),
    ends_at: toTimestamp(parsed.data.endsAt),
    created_by: admin.id,
  });

  if (error) return { error: "No se pudo crear el banner." };

  revalidatePath("/admin/banners");
  return undefined;
}

export async function toggleBannerActive(bannerId: string, isActive: boolean) {
  await requireSuperAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("banners").update({ is_active: isActive }).eq("id", bannerId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/banners");
}

export async function deleteBanner(bannerId: string) {
  await requireSuperAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("banners").delete().eq("id", bannerId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/banners");
}
