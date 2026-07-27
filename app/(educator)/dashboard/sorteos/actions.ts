"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireApprovedEducator, effectiveEducatorId } from "@/lib/auth/dal";
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
      educator_id: effectiveEducatorId(profile),
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

export async function setSorteoStatus(
  sorteoId: string,
  status: "draft" | "active" | "paused" | "ended"
): Promise<FormState> {
  await requireApprovedEducator();
  const supabase = await createClient();

  if (status === "active") {
    const { data: segments } = await supabase
      .from("wheel_segments")
      .select("id, is_consolation")
      .eq("sorteo_id", sorteoId)
      .eq("is_active", true);

    const hasConsolation = (segments ?? []).some((s) => s.is_consolation);
    if (!hasConsolation) {
      const prizeSegmentIds = (segments ?? []).filter((s) => !s.is_consolation).map((s) => s.id);
      const availableCount = prizeSegmentIds.length
        ? (
            await supabase
              .from("prize_codes")
              .select("id", { count: "exact", head: true })
              .in("segment_id", prizeSegmentIds)
              .eq("status", "available")
          ).count ?? 0
        : 0;

      if (availableCount === 0) {
        return {
          error:
            "No podés activar este sorteo: ningún segmento tiene códigos disponibles ni hay un segmento de consuelo. Cargá premios o agregá un segmento sin premio primero.",
        };
      }
    }
  }

  const { error } = await supabase.from("sorteos").update({ status }).eq("id", sorteoId);
  if (error) return { error: "No se pudo cambiar el estado del sorteo." };
  revalidatePath(`/dashboard/sorteos/${sorteoId}`);
  revalidatePath("/dashboard");
  return undefined;
}

export async function cloneSorteo(sorteoId: string) {
  await requireApprovedEducator();
  const supabase = await createClient();

  const { data: original } = await supabase.from("sorteos").select("*").eq("id", sorteoId).single();
  if (!original) throw new Error("Sorteo no encontrado.");

  const slug = `${original.slug}-copia-${Date.now().toString(36)}`;

  const { data: newSorteo, error } = await supabase
    .from("sorteos")
    .insert({
      educator_id: original.educator_id,
      name: `${original.name} (copia)`,
      slug,
      description: original.description,
      max_entries: original.max_entries,
    })
    .select("id")
    .single();

  if (error || !newSorteo) throw new Error("No se pudo duplicar el sorteo.");

  const { data: segments } = await supabase.from("wheel_segments").select("*").eq("sorteo_id", sorteoId);
  if (segments && segments.length > 0) {
    await supabase.from("wheel_segments").insert(
      segments.map((s) => ({
        sorteo_id: newSorteo.id,
        label: s.label,
        color: s.color,
        weight: s.weight,
        prize_tier: s.prize_tier,
        sort_order: s.sort_order,
        is_active: s.is_active,
        is_consolation: s.is_consolation,
      }))
    );
  }

  revalidatePath("/dashboard");
  redirect(`/dashboard/sorteos/${newSorteo.id}`);
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
