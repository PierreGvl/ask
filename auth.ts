import { and, eq } from "drizzle-orm";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { verifyPassword } from "@/lib/auth/password";
import { credentialsSchema } from "@/lib/auth/validation";
import { db } from "@/lib/db";
import { platformAdmins, users } from "@/lib/db/schema";

/**
 * Authentification scopée par tenant (marque blanche). Deux populations :
 *  - tenant : compte d'un projet, identifié par (projectId, email). Le projectId
 *    est résolu côté serveur par la page login (host → projet) et transmis dans
 *    les credentials ; il est INDICATIF (il ne donne aucun accès cross-tenant :
 *    il faut des creds valides du projet, le cookie est host-only, et chaque
 *    garde revérifie kind/projectId contre le projet résolu par host).
 *  - console : admin plateforme (table platform_admins), login sur CONSOLE_HOST.
 *
 * authorize() n'a pas accès au host → d'où le passage de scope/projectId.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
        scope: { label: "Scope", type: "text" },
        projectId: { label: "Project", type: "text" },
      },
      authorize: async (raw) => {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password, scope, projectId } = parsed.data;
        const lc = email.toLowerCase();

        if (scope === "console") {
          const admin = await db.query.platformAdmins.findFirst({
            where: eq(platformAdmins.email, lc),
          });
          if (!admin) return null;
          if (!(await verifyPassword(admin.passwordHash, password))) return null;
          return {
            id: admin.id,
            email: admin.email,
            name: admin.name,
            kind: "console" as const,
          };
        }

        // Tenant : identité scopée au projet.
        if (!projectId) return null;
        const user = await db.query.users.findFirst({
          where: and(eq(users.projectId, projectId), eq(users.email, lc)),
        });
        if (!user) return null;
        if (!(await verifyPassword(user.passwordHash, password))) return null;
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          kind: "tenant" as const,
          projectId: user.projectId,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        const u = user as {
          id: string;
          kind?: "tenant" | "console";
          projectId?: string;
        };
        token.id = u.id;
        token.kind = u.kind;
        token.projectId = u.projectId;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.kind = (token.kind ?? "tenant") as "tenant" | "console";
        session.user.projectId = token.projectId as string | undefined;
      }
      return session;
    },
  },
});
