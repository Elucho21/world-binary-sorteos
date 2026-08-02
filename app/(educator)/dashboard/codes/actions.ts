"use server";

import { revalidatePath } from "next/cache";
import { requireApprovedEducator, effectiveEducatorId } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { insertCodeBatch } from "@/lib/codes";
import { parseCodesFile } from "@/lib/csv";
import { manualCodesSchema, tieredCodesSchema } from "@/lib/validation";

export type FormState = { error?: string; success?: string } | undefined;

export async function uploadManualCodes(_prev: FormState, formData: FormData): Promise<FormState> {
  const profile = await requireApprovedEducator();
  const parsed = manualCodesSchema.safeParse({ codes: formData.get("codes") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Pegá al menos un código." };
  }

  const supabase = await createClient();
  const result = await insertCodeBatch(supabase, {
    educatorId: effectiveEducatorId(profile),
    createdBy: profile.id,
    origin: "educator",
    method: "manual",
    source: "educator_manual",
    codes: parsed.data.codes,
  });

  if (result.error) return { error: result.error };

  revalidatePath("/dashboard/codes");
  return { success: `Se cargaron ${result.inserted} códigos a tu pool.` };
}

export async function uploadFileCodes(_prev: FormState, formData: FormData): Promise<FormState> {
  const profile = await requireApprovedEducator();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Subí un archivo con los códigos." };
  }

  const text = await file.text();
  const codes = parseCodesFile(text);

  const supabase = await createClient();
  const result = await insertCodeBatch(supabase, {
    educatorId: effectiveEducatorId(profile),
    createdBy: profile.id,
    origin: "educator",
    method: "file",
    source: "educator_csv",
    codes,
  });

  if (result.error) return { error: result.error };

  revalidatePath("/dashboard/codes");
  return { success: `Se cargaron ${result.inserted} códigos a tu pool.` };
}

export async function assignFromPool(
  sorteoId: string,
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const profile = await requireApprovedEducator();
  const quantity = Number(formData.get("quantity") ?? 0);
  if (!Number.isFinite(quantity) || quantity < 1) {
    return { error: "Ingresá una cantidad válida." };
  }

  const supabase = await createClient();
  const { data: candidates, error: selectError } = await supabase
    .from("prize_codes")
    .select("id")
    .eq("educator_id", effectiveEducatorId(profile))
    .eq("status", "unassigned")
    .limit(quantity);

  if (selectError) return { error: "No se pudo leer tu pool de códigos." };
  const ids = (candidates ?? []).map((c) => c.id);
  if (ids.length === 0) return { error: "No tenés códigos sin asignar disponibles." };

  const { error } = await supabase
    .from("prize_codes")
    .update({ sorteo_id: sorteoId, status: "available" })
    .in("id", ids);

  if (error) return { error: "No se pudo asignar los códigos." };

  revalidatePath("/dashboard/codes");
  revalidatePath(`/dashboard/sorteos/${sorteoId}/codes`);
  return { success: `Se asignaron ${ids.length} código(s).` };
}

export async function unassignCode(sorteoId: string, prizeCodeId: string) {
  const profile = await requireApprovedEducator();
  const supabase = await createClient();
  const { error } = await supabase
    .from("prize_codes")
    .update({ sorteo_id: null, status: "unassigned" })
    .eq("id", prizeCodeId)
    .eq("educator_id", effectiveEducatorId(profile))
    .eq("status", "available");
  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/sorteos/${sorteoId}/codes`);
  revalidatePath("/dashboard/codes");
}

export async function uploadManualCodesToSorteo(
  sorteoId: string,
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  const profile = await requireApprovedEducator();
  const parsed = tieredCodesSchema.safeParse({
    codes: formData.get("codes"),
    tier: formData.get("tier") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Pegá al menos un código." };
  }

  const supabase = await createClient();
  const result = await insertCodeBatch(supabase, {
    educatorId: effectiveEducatorId(profile),
    createdBy: profile.id,
    origin: "educator",
    method: "manual",
    source: "educator_manual",
    codes: parsed.data.codes,
    sorteoId,
    tier: parsed.data.tier,
  });

  if (result.error) return { error: result.error };

  revalidatePath(`/dashboard/sorteos/${sorteoId}/codes`);
  return { success: `Se cargaron ${result.inserted} códigos a este sorteo.` };
}
