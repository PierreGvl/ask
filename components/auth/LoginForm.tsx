"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function LoginForm({
  scope = "tenant",
  projectId,
  showRegister = true,
  redirectTo = "/",
  defaultEmail,
}: {
  scope?: "tenant" | "console";
  projectId?: string;
  showRegister?: boolean;
  redirectTo?: string;
  defaultEmail?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const res = await signIn("credentials", {
      email: String(form.get("email")),
      password: String(form.get("password")),
      scope,
      projectId: projectId ?? "",
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError("Email ou mot de passe incorrect.");
      return;
    }
    router.push(redirectTo);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium text-ink">
          Email
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          defaultValue={defaultEmail}
        />
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
          autoComplete="current-password"
        />
      </div>
      {error && <p className="text-sm text-rose-700">{error}</p>}
      <Button type="submit" disabled={loading}>
        {loading ? "Connexion…" : "Se connecter"}
      </Button>
      {showRegister && (
        <p className="text-center text-sm text-muted">
          Pas encore de compte ?{" "}
          <Link
            href="/register"
            className="font-medium text-rose hover:underline"
          >
            Créer un compte
          </Link>
        </p>
      )}
    </form>
  );
}
