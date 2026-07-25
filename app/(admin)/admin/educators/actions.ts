"use server";

import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import type { ProfileStatus } from "@/types/database.types";

export async function setEducatorStatus(profileId: string, status: ProfileStatus) {
  await requireSuperAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ status }).eq("id", profileId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/educators");
}
