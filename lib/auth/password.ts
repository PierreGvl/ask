import { hash, verify } from "@node-rs/argon2";

// Paramètres argon2id raisonnables (OWASP) pour un usage serveur.
const OPTS = {
  memoryCost: 19456, // ~19 Mo
  timeCost: 2,
  outputLen: 32,
  parallelism: 1,
};

export function hashPassword(password: string): Promise<string> {
  return hash(password, OPTS);
}

export function verifyPassword(
  passwordHash: string,
  password: string,
): Promise<boolean> {
  return verify(passwordHash, password, OPTS);
}
