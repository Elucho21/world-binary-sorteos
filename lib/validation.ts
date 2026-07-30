import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export const signupSchema = z.object({
  displayName: z.string().trim().min(2, "Ingresá tu nombre o el de tu marca."),
  email: z.string().trim().email(),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres."),
});

export const sorteoSchema = z.object({
  name: z.string().trim().min(3, "El nombre debe tener al menos 3 caracteres."),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Solo minúsculas, números y guiones."),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  startsAt: z.string().optional().or(z.literal("")),
  endsAt: z.string().optional().or(z.literal("")),
  maxEntries: z.coerce.number().int().positive().optional(),
  winnersCount: z.coerce.number().int().min(1, "Tiene que haber al menos 1 ganador.").default(1),
});

export const manualCodesSchema = z.object({
  codes: z
    .string()
    .trim()
    .min(1, "Pegá al menos un código.")
    .transform((val) =>
      val
        .split(/[\n,]/)
        .map((c) => c.trim())
        .filter(Boolean)
    ),
});

export const bannerSchema = z.object({
  title: z.string().trim().min(2),
  imageUrl: z.string().trim().url("Tiene que ser una URL válida."),
  linkUrl: z.string().trim().url().optional().or(z.literal("")),
  placement: z.enum(["public_sorteo_page", "participant_dashboard"]),
  startsAt: z.string().optional().or(z.literal("")),
  endsAt: z.string().optional().or(z.literal("")),
});

export const registrationSchema = z.object({
  name: z.string().trim().min(2, "Ingresá tu nombre."),
  email: z.string().trim().email("Ingresá un email válido."),
  honeypot: z.string().max(0).optional().or(z.literal("")),
  turnstileToken: z.string().optional(),
});

export const checkPrizeSchema = z.object({
  slug: z.string().trim().min(1),
  participantId: z.string().trim().uuid(),
});
