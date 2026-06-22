import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PrivateAccessNotice } from "@/components/auth/PrivateAccessNotice";
import { ChatShell } from "@/components/sidebar/ChatShell";
import { listConversations } from "@/lib/db/queries";
import { isProjectMember } from "@/lib/projects/access";
import { resolveProject } from "@/lib/tenant/resolve";

export default async function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const user = session?.user ?? null;
  const project = await resolveProject();

  // Projet privé : chat réservé aux membres.
  //  - anonyme → /login
  //  - connecté mais non-membre → écran « accès réservé » (PAS de redirect vers
  //    /login : connecté, /login renverrait vers / → boucle infinie).
  if (project?.accessMode === "private") {
    if (!user?.id) redirect("/login");
    if (!(await isProjectMember(user.id, project.id))) {
      return <PrivateAccessNotice projectName={project.name} />;
    }
  }

  const conversations =
    user?.id && project
      ? (await listConversations(project.id, user.id)).map((c) => ({
          id: c.id,
          title: c.title,
        }))
      : [];

  return (
    <ChatShell
      user={user ? { name: user.name, email: user.email } : null}
      conversations={conversations}
    >
      {children}
    </ChatShell>
  );
}
