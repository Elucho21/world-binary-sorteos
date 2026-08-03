"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createHash } from "node:crypto";
import { createClient } from "@/lib/supabase/server";

export type FormState = { error?: string; success?: string } | undefined;

export async function requestMagicLink(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email || !email.includes("@")) {
    return { error: "Ingresá un email válido." };
  }

  const headerList = await headers();
  const forwardedFor = headerList.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim() || headerList.get("x-real-ip") || "unknown";
  const ipHash = createHash("sha256").update(ip).digest("hex");

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const supabase = await createClient();

  const { data: allowed } = await supabase.rpc("register_magic_link_attempt", { p_ip_hash: ipHash });
  if (!allowed) {
    return { error: "Demasiados intentos, probá de nuevo más tarde." };
  }

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
