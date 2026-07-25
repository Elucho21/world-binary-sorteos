"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireApprovedEducator } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { sorteoSchema, segmentSchema } from "@/lib/validation";

export type FormState = { error?: string } | undefined;

function toTimestamp(value: string | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export async function createSorteo(_prev: FormState, formData: FormData): Promise<FormState> {
  const profile = await requireApprovedEducator();
  const parsed = sorteoSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    description: formData.get("description"),
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt"),
    maxEntries: formData.get("maxEntries") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sorteos")
    .insert({
      educator_id: profile.id,
      name: parsed.data.name,
      slug: parsed.data.slug,
      description: parsed.data.description || null,
      starts_at: toTimestamp(parsed.data.startsAt),
      ends_at: toTimestamp(parsed.data.endsAt),
      max_entries: parsed.data.maxEntries ?? null,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") return { error: "Ese slug ya está en uso, probá con otro." };
    return { error: "No se pudo crear el sorteo." };
  }

  revalidatePath("/dashboard");
  redirect(`/dashboard/sorteos/${data.id}`);
}

export async function updateSorteo(sorteoId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireApprovedEducator();
  const parsed = sorteoSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    description: formData.get("description"),
    startsAt: formData.get("startsAt"),
    endsAt: formData.get("endsAt"),
    maxEntries: formData.get("maxEntries") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("sorteos")
    .update({
      name: parsed.data.name,
      slug: parsed.data.slug,
      description: parsed.data.description || null,
      starts_at: toTimestamp(parsed.data.startsAt),
      ends_at: toTimestamp(parsed.data.endsAt),
      max_entries: parsed.data.maxEntries ?? null,
    })
    .eq("id", sorteoId);

  if (error) {
    if (error.code === "23505") return { error: "Ese slug ya está en uso, probá con otro." };
    return { error: "No se pudo guardar." };
  }

  revalidatePath(`/dashboard/sorteos/${sorteoId}`);
  return undefined;
}

export async function setSorteoStatus(sorteoId: string, status: "draft" | "active" | "paused" | "ended") {
  await requireApprovedEducator();
  const supabase = await createClient();
  const { error } = await supabase.from("sorteos").update({ status }).eq("id", sorteoId);
  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/sorteos/${sorteoId}`);
  revalidatePath("/dashboard");
}

export async function deleteSorteo(sorteoId: string) {
  await requireApprovedEducator();
  const supabase = await createClient();
  const { error } = await supabase.from("sorteos").delete().eq("id", sorteoId);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

// --- wheel segments ---

export async function createSegment(sorteoId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireApprovedEducator();
  const parsed = segmentSchema.safeParse({
    label: formData.get("label"),
    color: formData.get("color"),
    weight: formData.get("weight"),
    prizeTier: formData.get("prizeTier"),
    isConsolation: formData.get("isConsolation") === "on",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const supabase = await createClient();
  const { count } = await supabase
    .from("wheel_segments")
    .select("id", { count: "exact", head: true })
    .eq("sorteo_id", sorteoId);

  const { error } = await supabase.from("wheel_segments").insert({
    sorteo_id: sorteoId,
    label: parsed.data.label,
    color: parsed.data.color,
    weight: parsed.data.weight,
    prize_tier: parsed.data.prizeTier || null,
    is_consolation: parsed.data.isConsolation ?? false,
    sort_order: count ?? 0,
  });

  if (error) return { error: "No se pudo crear el segmento." };

  revalidatePath(`/dashboard/sorteos/${sorteoId}/segments`);
  return undefined;
}

export async function updateSegment(
  sorteoId: string,
  segmentId: string,
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await requireApprovedEducator();
  const parsed = segmentSchema.safeParse({
    label: formData.get("label"),
    color: formData.get("color"),
    weight: formData.get("weight"),
    prizeTier: formData.get("prizeTier"),
    isConsolation: formData.get("isConsolation") === "on",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("wheel_segments")
    .update({
      label: parsed.data.label,
      color: parsed.data.color,
      weight: parsed.data.weight,
      prize_tier: parsed.data.prizeTier || null,
      is_consolation: parsed.data.isConsolation ?? false,
    })
    .eq("id", segmentId);

  if (error) return { error: "No se pudo guardar el segmento." };

  revalidatePath(`/dashboard/sorteos/${sorteoId}/segments`);
  return undefined;
}

export async function toggleSegmentActive(sorteoId: string, segmentId: string, isActive: boolean) {
  await requireApprovedEducator();
  const supabase = await createClient();
  const { error } = await supabase
    .from("wheel_segments")
    .update({ is_active: isActive })
    .eq("id", segmentId);
  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/sorteos/${sorteoId}/segments`);
}

export async function deleteSegment(sorteoId: string, segmentId: string) {
  await requireApprovedEducator();
  const supabase = await createClient();
  const { error } = await supabase.from("wheel_segments").delete().eq("id", segmentId);
  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/sorteos/${sorteoId}/segments`);
}
