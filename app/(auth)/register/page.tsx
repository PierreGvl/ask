import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { RegisterForm } from "@/components/auth/RegisterForm";

export const metadata = { title: "Créer un compte — Ask By la Wine Tech" };

export default async function RegisterPage() {
  const session = await auth();
  if (session?.user) redirect("/");

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h1 className="font-serif text-2xl font-semibold text-navy">
          Créer un compte
        </h1>
        <p className="mt-1 text-sm text-muted">
          Conservez vos échanges et retrouvez votre historique.
        </p>
      </div>
      <RegisterForm />
    </div>
  );
}
