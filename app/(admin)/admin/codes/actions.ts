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
  return { success: `Se cargaron ${result.inserted} códigos a la bolsa general del educador.` };
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

  revalidatePath("/admin/codes");
  return { success: `Se cargaron ${result.inserted} códigos directo a ese sorteo.` };
}
