import type { DefaultSession } from "next-auth";

type IdentityKind = "tenant" | "console";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      // Population d'identité : utilisateur d'un tenant, ou admin console.
      kind: IdentityKind;
      // Projet du compte (présent si kind === "tenant").
      projectId?: string;
    } & DefaultSession["user"];
  }
  interface User {
    kind?: IdentityKind;
    projectId?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    kind?: IdentityKind;
    projectId?: string;
  }
}
