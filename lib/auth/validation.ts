import { z } from "zod";

export const credentialsSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(1, "Mot de passe requis"),
  // Portée de la connexion : un tenant (scopé projet) ou la console (admins).
  scope: z.enum(["tenant", "console"]).default("tenant"),
  // Requis quand scope === "tenant" (résolu côté serveur par la page login).
  // Pas de .uuid() strict : l'id seed historique winetech n'a pas un nibble de
  // version conforme. La vraie validation est le lookup (projectId, email).
  projectId: z.string().optional(),
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
