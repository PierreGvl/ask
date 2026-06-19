import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LoginForm } from "@/components/auth/LoginForm";
import { isConsoleHost } from "@/lib/console";

export const metadata = { title: "Connexion — Ask By la Wine Tech" };

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/");
  const consoleMode = await isConsoleHost();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-center text-xl font-semibold tracking-tight text-navy">
        Connexion
      </h1>
      {/* Pas d'auto-inscription sur la console (réservée au staff). */}
      <LoginForm showRegister={!consoleMode} />
    </div>
  );
}
