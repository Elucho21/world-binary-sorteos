"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type FormState = { error?: string; success?: string } | undefined;

export async function requestMagicLink(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email || !email.includes("@")) {
    return { error: "Ingresá un email válido." };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${siteUrl}/auth/callback?next=/mis-premios` },
  });

  if (error) {
    return { error: "No se pudo enviar el link. Intentá de nuevo en unos minutos." };
  }

  return { success: `Te enviamos un link a ${email}. Abrilo para ver tus premios.` };
}

export async function participantLogout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/mis-premios");
}
