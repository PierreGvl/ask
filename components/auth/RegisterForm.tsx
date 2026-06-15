"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function RegisterForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email"));
    const password = String(form.get("password"));
    const firstName = String(form.get("firstName") ?? "").trim();
    const lastName = String(form.get("lastName") ?? "").trim();
    const name = [firstName, lastName].filter(Boolean).join(" ");

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name: name || undefined }),
    });

    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "Une erreur est survenue.");
      setLoading(false);
      return;
    }

    // Connexion automatique après inscription.
    await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    router.push("/");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex gap-3">
        <div className="flex flex-1 flex-col gap-1.5">
          <label htmlFor="firstName" className="text-sm font-medium text-ink">
            Prénom
          </label>
          <Input
            id="firstName"
            name="firstName"
            type="text"
            required
            autoComplete="given-name"
          />
        </div>
        <div className="flex flex-1 flex-col gap-1.5">
          <label htmlFor="lastName" className="text-sm font-medium text-ink">
            Nom
          </label>
          <Input
            id="lastName"
            name="lastName"
            type="text"
            required
            autoComplete="family-name"
          />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium text-ink">
          Email
        </label>
        <Input id="email" name="email" type="email" required autoComplete="email" />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-medium text-ink">
          Mot de passe
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          minLength={12}
          autoComplete="new-password"
        />
        <p className="text-xs text-faint">Au moins 12 caractères.</p>
      </div>
      {error && <p className="text-sm text-rose-700">{error}</p>}
      <Button type="submit" disabled={loading}>
        {loading ? "Création…" : "Créer mon compte"}
      </Button>
      <p className="text-center text-sm text-muted">
        Déjà un compte ?{" "}
        <Link href="/login" className="font-medium text-rose hover:underline">
          Se connecter
        </Link>
      </p>
    </form>
  );
}
