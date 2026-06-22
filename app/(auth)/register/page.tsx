import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { isConsoleHost } from "@/lib/console";
import { requireProject } from "@/lib/tenant/resolve";

export const metadata = { title: "Créer un compte" };

export default async function RegisterPage() {
  // Pas d'inscription publique sur la console.
  if (await isConsoleHost()) notFound();

  const session = await auth();
  if (session?.user) redirect("/");

  const project = await requireProject();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-center text-xl font-semibold tracking-tight text-navy">
        Créer un compte
      </h1>
      <RegisterForm projectId={project.id} />
    </div>
  );
}
