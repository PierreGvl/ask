import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LoginForm } from "@/components/auth/LoginForm";
import { isConsoleHost } from "@/lib/console";
import { resolveProject } from "@/lib/tenant/resolve";

export const metadata = { title: "Connexion" };

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/");
  const consoleMode = await isConsoleHost();

  // Console → identité plateforme ; tenant → identité scopée au projet (host).
  const project = consoleMode ? null : await resolveProject();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-center text-xl font-semibold tracking-tight text-navy">
        Connexion
      </h1>
      {consoleMode ? (
        <LoginForm scope="console" showRegister={false} />
      ) : (
        <LoginForm scope="tenant" projectId={project?.id} showRegister />
      )}
    </div>
  );
}
