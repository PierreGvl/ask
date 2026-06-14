import { z } from "zod";

export const credentialsSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(1, "Mot de passe requis"),
});

export const registerSchema = z.object({
  name: z.string().trim().min(1, "Nom requis").max(120).optional(),
  email: z.string().email("Email invalide"),
  password: z
    .string()
    .min(12, "Le mot de passe doit contenir au moins 12 caractères")
    .max(200),
});

export type RegisterInput = z.infer<typeof registerSchema>;
