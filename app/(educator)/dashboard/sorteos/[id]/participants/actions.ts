"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireApprovedEducator } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

export async function markCodeRedeemed(sorteoId: string, prizeCodeId: string) {
  await requireApprovedEducator();
  const supabase = await createClient();
  const { error } = await supabase
    .from("prize_codes")
    .update({ status: "redeemed", redeemed_at: new Date().toISOString() })
    .eq("id", prizeCodeId);
  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/sorteos/${sorteoId}/participants`);
}

export async function bulkMarkCodeRedeemed(sorteoId: string, prizeCodeIds: string[]) {
  await requireApprovedEducator();
  if (prizeCodeIds.length === 0) return;
  const supabase = await createClient();
  const { error } = await supabase
    .from("prize_codes")
    .update({ status: "redeemed", redeemed_at: new Date().toISOString() })
    .in("id", prizeCodeIds);
  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/sorteos/${sorteoId}/participants`);
}

const emailSchema = z.string().trim().toLowerCase().email();

// Only allowed before the draw: after drawn_at is set, a participant's email
// may already be the one a winner record/code got tied to, so editing it
// here would silently disconnect it from what was actually drawn.
export async function updateParticipantEmail(sorteoId: string, participantId: string, formData: FormData) {
  await requireApprovedEducator();
  const supabase = await createClient();

  const { data: sorteo } = await supabase.from("sorteos").select("drawn_at").eq("id", sorteoId).single();
  if (!sorteo) throw new Error("Sorteo no encontrado.");
  if (sorteo.drawn_at) throw new Error("No se puede editar el email después de sortear.");

  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) throw new Error("Ingresá un email válido.");

  const { error } = await supabase
    .from("participants")
    .update({ email: parsed.data })
    .eq("id", participantId)
    .eq("sorteo_id", sorteoId);

  if (error) {
    if (error.code === "23505") throw new Error("Ese email ya está registrado en este sorteo.");
    throw new Error("No se pudo actualizar el email.");
  }

  revalidatePath(`/dashboard/sorteos/${sorteoId}/participants`);
}
