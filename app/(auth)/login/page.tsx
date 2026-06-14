import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata = { title: "Connexion — Ask By la Wine Tech" };

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/");

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h1 className="font-serif text-2xl font-semibold text-navy">
          Connexion
        </h1>
        <p className="mt-1 text-sm text-muted">
          Accédez à votre historique de conversations.
        </p>
      </div>
      <LoginForm />
    </div>
  );
}
