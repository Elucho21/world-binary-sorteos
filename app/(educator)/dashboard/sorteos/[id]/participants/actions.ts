"use server";

import { revalidatePath } from "next/cache";
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
