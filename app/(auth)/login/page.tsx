import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LoginForm } from "@/components/auth/LoginForm";
import { isConsoleHost } from "@/lib/console";
import { resolveProject } from "@/lib/tenant/resolve";

export const metadata = { title: "Connexion" };

export default async function LoginPage() {
  const session = await auth();
  const consoleMode = await isConsoleHost();

  // Console → identité plateforme ; tenant → identité scopée au projet (host).
  const project = consoleMode ? null : await resolveProject();

  // Ne rediriger que si la session est VALIDE pour CE contexte ; sinon (cookie
  // périmé / mauvais type) laisser (re)se connecter — le login écrase le cookie.
  const valid =
    session?.user &&
    (consoleMode
      ? session.user.kind === "console"
      : session.user.kind === "tenant" &&
        (!project || session.user.projectId === project.id));
  if (valid) redirect("/");

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
