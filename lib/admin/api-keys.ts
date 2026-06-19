import "server-only";
import { createHash, randomBytes } from "node:crypto";

/**
 * Clés API du widget. Le secret n'est montré qu'UNE fois à la création ; on ne
 * stocke que son hash SHA-256 (la clé est à haute entropie → pas besoin d'un
 * KDF lent type argon2) et un préfixe lisible pour l'affichage console.
 */

const PREFIX = "ask_pk_";

export type GeneratedKey = {
  plaintext: string; // à montrer une seule fois
  keyHash: string;
  prefix: string;
};

export function generateApiKey(): GeneratedKey {
  const secret = randomBytes(24).toString("base64url");
  const plaintext = `${PREFIX}${secret}`;
  return {
    plaintext,
    keyHash: hashApiKey(plaintext),
    prefix: plaintext.slice(0, PREFIX.length + 4), // ex. ask_pk_ab12
  };
}

export function hashApiKey(plaintext: string): string {
  return createHash("sha256").update(plaintext).digest("hex");
}
