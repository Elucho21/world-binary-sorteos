"use server";

import { revalidatePath } from "next/cache";
import { requireApprovedEducator } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";

export type FormState = { error?: string; success?: string } | undefined;

export async function inviteTeamMember(_prev: FormState, formData: FormData): Promise<FormState> {
  const profile = await requireApprovedEducator();
  if (profile.managed_by) {
    return { error: "Solo el dueño de la cuenta puede invitar miembros del equipo." };
  }

  const email = String(formData.get("email") ?? "").trim();
  if (!email || !email.includes("@")) {
    return { error: "Ingresá un email válido." };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${siteUrl}/auth/callback?next=/set-password`,
  });

  if (error || !data.user) {
    return { error: "No se pudo invitar a ese email (¿ya tiene una cuenta?)." };
  }

  const { error: updateError } = await admin
    .from("profiles")
    .update({ managed_by: profile.id, status: "approved" })
    .eq("id", data.user.id);

  if (updateError) {
    return { error: "El usuario se creó pero no se pudo vincular al equipo." };
  }

  revalidatePath("/dashboard/team");
  return { success: `Invitación enviada a ${email}.` };
}

export async function removeTeamMember(memberId: string) {
  const profile = await requireApprovedEducator();
  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ managed_by: null })
    .eq("id", memberId)
    .eq("managed_by", profile.id);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/team");
}
