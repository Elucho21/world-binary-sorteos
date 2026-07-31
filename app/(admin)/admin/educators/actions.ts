"use server";

import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ProfileStatus } from "@/types/database.types";

async function confirmEmailBestEffort(profileIds: string[]) {
  try {
    const admin = createAdminClient();
    await Promise.all(profileIds.map((id) => admin.auth.admin.updateUserById(id, { email_confirm: true })));
  } catch {
    // Best-effort only — if this fails, the educator falls back to the
    // real email-confirmation link (if one was ever sent/configured).
  }
}

export async function setEducatorStatus(profileId: string, status: ProfileStatus) {
  const admin = await requireSuperAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ status }).eq("id", profileId);
  if (error) throw new Error(error.message);
  if (status === "approved") await confirmEmailBestEffort([profileId]);
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
  if (status === "approved") await confirmEmailBestEffort(profileIds);
  await supabase
    .from("audit_log")
    .insert(profileIds.map((id) => ({ actor_id: admin.id, action: `educator_status_${status}`, target_id: id })));
  revalidatePath("/admin/educators");
  revalidatePath("/admin/audit");
}
