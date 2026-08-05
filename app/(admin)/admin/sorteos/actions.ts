"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { sorteoSchema } from "@/lib/validation";

export type FormState = { error?: string } | undefined;

function toTimestamp(value: string | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export async function adminCreateSorteo(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireSuperAdmin();

  const educatorId = String(formData.get("educatorId") ?? "");
  if (!educatorId) {
    return { error: "Elegí para qué educador es el sorteo." };
  }

  const parsed = sorteoSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    description: formData.get("description"),
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt"),
    maxEntries: formData.get("maxEntries") || undefined,
    winnersCount: formData.get("winnersCount") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sorteos")
    .insert({
      educator_id: educatorId,
      name: parsed.data.name,
      slug: parsed.data.slug,
      description: parsed.data.description || null,
      starts_at: toTimestamp(parsed.data.startsAt),
      ends_at: toTimestamp(parsed.data.endsAt),
      max_entries: parsed.data.maxEntries ?? null,
      winners_count: parsed.data.winnersCount,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") return { error: "Ese slug ya está en uso, probá con otro." };
    return { error: "No se pudo crear el sorteo." };
  }

  redirect(`/dashboard/sorteos/${data.id}`);
}

export async function adminDeleteSorteo(sorteoId: string) {
  const admin = await requireSuperAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("sorteos").delete().eq("id", sorteoId);
  if (error) throw new Error(error.message);
  await supabase.from("audit_log").insert({ actor_id: admin.id, action: "sorteo_deleted", target_id: sorteoId });
  revalidatePath("/admin/sorteos");
}

export async function adminBulkDeleteSorteos(sorteoIds: string[]) {
  const admin = await requireSuperAdmin();
  if (sorteoIds.length === 0) return;
  const supabase = await createClient();
  const { error } = await supabase.from("sorteos").delete().in("id", sorteoIds);
  if (error) throw new Error(error.message);
  await supabase
    .from("audit_log")
    .insert(sorteoIds.map((id) => ({ actor_id: admin.id, action: "sorteo_deleted", target_id: id })));
  revalidatePath("/admin/sorteos");
}
