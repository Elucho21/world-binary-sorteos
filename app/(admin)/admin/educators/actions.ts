"use server";

import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import type { ProfileStatus } from "@/types/database.types";

export async function setEducatorStatus(profileId: string, status: ProfileStatus) {
  const admin = await requireSuperAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ status }).eq("id", profileId);
  if (error) throw new Error(error.message);
  await supabase.from("audit_log").insert({
    actor_id: admin.id,
    action: `educator_status_${status}`,
    target_id: profileId,
  });
  revalidatePath("/admin/educators");
  revalidatePath("/admin/audit");
}

export async function bulkSetEducatorStatus(profileIds: string[], status: ProfileStatus) {
  const admin = await requireSuperAdmin();
  if (profileIds.length === 0) return;
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ status }).in("id", profileIds);
  if (error) throw new Error(error.message);
  await supabase
    .from("audit_log")
    .insert(profileIds.map((id) => ({ actor_id: admin.id, action: `educator_status_${status}`, target_id: id })));
  revalidatePath("/admin/educators");
  revalidatePath("/admin/audit");
}
