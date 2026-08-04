"use server";

import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { insertCodeBatch } from "@/lib/codes";
import { parseCodesFile } from "@/lib/csv";
import { manualCodesSchema } from "@/lib/validation";

export type FormState = { error?: string; success?: string } | undefined;

async function codesFromFormData(
  formData: FormData
): Promise<{ codes: string[]; method: "manual" | "file"; error?: string }> {
  const file = formData.get("file");
  if (file instanceof File && file.size > 0) {
    const text = await file.text();
    return { codes: parseCodesFile(text), method: "file" };
  }
  const parsed = manualCodesSchema.safeParse({ codes: formData.get("codes") });
  if (!parsed.success) {
    return { codes: [], method: "manual", error: "Pegá códigos o subí un archivo." };
  }
  return { codes: parsed.data.codes, method: "manual" };
}

export async function adminUploadToWallet(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireSuperAdmin();
  const educatorId = String(formData.get("educatorId") ?? "");
  if (!educatorId) return { error: "Elegí un educador." };

  const parsedCodes = await codesFromFormData(formData);
  if (parsedCodes.error) return { error: parsedCodes.error };

  const supabase = await createClient();
  const result = await insertCodeBatch(supabase, {
    educatorId,
    createdBy: admin.id,
    origin: "admin",
    method: parsedCodes.method,
    source: "admin_bulk",
    codes: parsedCodes.codes,
  });
  if (result.error) return { error: result.error };

  revalidatePath("/admin/codes");
  revalidatePath("/dashboard/codes");
  return { success: `Se cargaron ${result.inserted} códigos a la bolsa general del educador. Todavía no están asignados a ningún sorteo — usá "Asignar desde la bolsa general" o pedile al educador que los asigne desde su panel.` };
}

interface SorteoWithEducator {
  id: string;
  educator_id: string;
}

export async function adminUploadToSorteo(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireSuperAdmin();
  const sorteoId = String(formData.get("sorteoId") ?? "");
  if (!sorteoId) return { error: "Elegí un sorteo." };

  const supabase = await createClient();
  const { data } = await supabase
    .from("sorteos")
    .select("id, educator_id")
    .eq("id", sorteoId)
    .single();

  const sorteo = data as unknown as SorteoWithEducator | null;
  const educatorId = sorteo?.educator_id;
  if (!educatorId) return { error: "No se pudo determinar el educador de ese sorteo." };

  const parsedCodes = await codesFromFormData(formData);
  if (parsedCodes.error) return { error: parsedCodes.error };

  const result = await insertCodeBatch(supabase, {
    educatorId,
    createdBy: admin.id,
    origin: "admin",
    method: parsedCodes.method,
    source: "admin_bulk",
    codes: parsedCodes.codes,
    sorteoId,
  });
  if (result.error) return { error: result.error };

  revalidateSorteoViews(sorteoId);
  return { success: `Se cargaron ${result.inserted} códigos directo a ese sorteo — ya quedan disponibles para activar/sortear.` };
}

// Codes already sitting unassigned in an educator's general pool (uploaded
// via "Distribuir de antemano") don't count toward any sorteo's available
// prizes until something moves them there — normally the educator does this
// from their own Premios page (assignFromPool). This lets a super admin do
// the same move directly, without depending on the educator to act, so a
// sorteo the admin already stocked doesn't sit blocked from activating/
// sorting on the educator's inaction.
export async function adminAssignFromWallet(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireSuperAdmin();
  const sorteoId = String(formData.get("sorteoId") ?? "");
  const quantity = Number(formData.get("quantity") ?? 0);
  if (!sorteoId) return { error: "Elegí un sorteo." };
  if (!Number.isFinite(quantity) || quantity < 1) return { error: "Ingresá una cantidad válida." };

  const supabase = await createClient();
  const { data } = await supabase.from("sorteos").select("id, educator_id").eq("id", sorteoId).single();
  const sorteo = data as unknown as SorteoWithEducator | null;
  if (!sorteo) return { error: "Sorteo no encontrado." };

  const { data: candidates, error: selectError } = await supabase
    .from("prize_codes")
    .select("id")
    .eq("educator_id", sorteo.educator_id)
    .eq("status", "unassigned")
    .limit(quantity);

  if (selectError) return { error: "No se pudo leer la bolsa general de ese educador." };
  const ids = (candidates ?? []).map((c) => c.id);
  if (ids.length === 0) return { error: "Ese educador no tiene códigos sin asignar en su bolsa general." };

  const { error } = await supabase.from("prize_codes").update({ sorteo_id: sorteoId, status: "available" }).in("id", ids);
  if (error) return { error: "No se pudo asignar los códigos." };

  revalidateSorteoViews(sorteoId);
  revalidatePath("/dashboard/codes");
  return { success: `Se asignaron ${ids.length} código(s) de la bolsa general a ese sorteo — ya quedan disponibles.` };
}

function revalidateSorteoViews(sorteoId: string) {
  revalidatePath("/admin/codes");
  revalidatePath("/admin/sorteos");
  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/sorteos/${sorteoId}`);
  revalidatePath(`/dashboard/sorteos/${sorteoId}/codes`);
}
