import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, CodeBatchOrigin, CodeBatchMethod, PrizeCodeSource } from "@/types/database.types";

export async function insertCodeBatch(
  supabase: SupabaseClient<Database>,
  params: {
    educatorId: string;
    createdBy: string;
    origin: CodeBatchOrigin;
    method: CodeBatchMethod;
    source: PrizeCodeSource;
    codes: string[];
    sorteoId?: string | null;
  }
): Promise<{ inserted: number; error?: string }> {
  const uniqueCodes = Array.from(new Set(params.codes.map((c) => c.trim()).filter(Boolean)));
  if (uniqueCodes.length === 0) {
    return { inserted: 0, error: "No se encontraron códigos válidos." };
  }

  const { data: batch, error: batchError } = await supabase
    .from("code_batches")
    .insert({
      created_by: params.createdBy,
      educator_id: params.educatorId,
      origin: params.origin,
      method: params.method,
      total_codes: uniqueCodes.length,
    })
    .select("id")
    .single();

  if (batchError || !batch) {
    return { inserted: 0, error: "No se pudo registrar el lote de códigos." };
  }

  const rows = uniqueCodes.map((code) => ({
    educator_id: params.educatorId,
    sorteo_id: params.sorteoId ?? null,
    batch_id: batch.id,
    code,
    status: params.sorteoId ? ("available" as const) : ("unassigned" as const),
    created_by: params.createdBy,
    source: params.source,
  }));

  const { data: insertedRows, error: insertError } = await supabase
    .from("prize_codes")
    .upsert(rows, { onConflict: "educator_id,code", ignoreDuplicates: true })
    .select("id");

  if (insertError) {
    return { inserted: 0, error: "No se pudieron cargar los códigos." };
  }

  return { inserted: insertedRows?.length ?? 0 };
}
