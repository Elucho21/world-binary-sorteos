"use server";

import { revalidatePath } from "next/cache";
import { requireApprovedEducator } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/notifications";

export type FormState = { error?: string; success?: string } | undefined;

function inviteRedirectTo() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return `${siteUrl}/auth/callback?next=/set-password`;
}

// Distinguishes the handful of ways inviteUserByEmail actually fails instead
// of collapsing everything into "¿ya tiene una cuenta?" — that message was
// wrong for a malformed email or a Supabase send-quota error, which used to
// look identical to the user.
function inviteErrorMessage(message: string | undefined): string {
  const msg = (message ?? "").toLowerCase();
  if (msg.includes("already been registered") || msg.includes("already registered") || msg.includes("already exists")) {
    return "Ese email ya tiene una cuenta en la plataforma (como educador o miembro de otro equipo).";
  }
  if (msg.includes("rate limit") || msg.includes("quota") || msg.includes("too many")) {
    return "Se alcanzó el límite de envío de emails de Supabase por ahora. Probá de nuevo en unos minutos.";
  }
  if (msg.includes("invalid") || msg.includes("unable to validate")) {
    return "Ese email no es válido.";
  }
  return "No se pudo enviar la invitación. Intentá de nuevo.";
}

export async function inviteTeamMember(_prev: FormState, formData: FormData): Promise<FormState> {
  const profile = await requireApprovedEducator();
  if (profile.managed_by) {
    return { error: "Solo el dueño de la cuenta puede invitar miembros del equipo." };
  }

  const email = String(formData.get("email") ?? "").trim();
  if (!email || !email.includes("@")) {
    return { error: "Ingresá un email válido." };
  }

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: inviteRedirectTo(),
  });

  if (error || !data.user) {
    return { error: inviteErrorMessage(error?.message) };
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

// Only for members who never accepted the original invite (no last_sign_in_at
// yet) — an already-active member doesn't need this and inviteUserByEmail
// would just error "already registered" for them anyway.
export async function resendTeamInvite(memberId: string) {
  const profile = await requireApprovedEducator();
  if (profile.managed_by) {
    throw new Error("Solo el dueño de la cuenta puede reenviar invitaciones.");
  }

  const admin = createAdminClient();
  const { data: target } = await admin
    .from("profiles")
    .select("id, managed_by")
    .eq("id", memberId)
    .single();
  if (!target || target.managed_by !== profile.id) {
    throw new Error("No se pudo reenviar la invitación.");
  }

  const { data: userData } = await admin.auth.admin.getUserById(memberId);
  const email = userData.user?.email;
  if (!email) throw new Error("No se pudo reenviar la invitación.");
  if (userData.user?.last_sign_in_at) {
    throw new Error("Esta persona ya activó su cuenta, no hace falta reenviar.");
  }

  const redirectTo = inviteRedirectTo();
  const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo });
  if (!inviteError) {
    revalidatePath("/dashboard/team");
    return;
  }

  // The user row already exists from the first invite, so Supabase won't
  // resend the same email automatically — generate a fresh link and mail it
  // ourselves (best-effort, only works if RESEND_API_KEY is configured).
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "invite",
    email,
    options: { redirectTo },
  });
  if (linkError || !linkData?.properties?.action_link) {
    throw new Error("No se pudo reenviar la invitación.");
  }

  const sent = await sendEmail({
    to: email,
    subject: "Te invitaron a World Binary Sorteos",
    html: `<p>Te invitaron a sumarte como miembro de equipo en World Binary Sorteos.</p><p><a href="${linkData.properties.action_link}">Aceptar invitación</a></p>`,
  });
  if (!sent) {
    throw new Error(
      "La invitación ya existía pero no se pudo reenviar el mail automáticamente (falta configurar el envío de emails). Pedile a la persona que revise spam."
    );
  }

  revalidatePath("/dashboard/team");
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
