import { redirect } from "next/navigation";
import { auth } from "@/auth";
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

  // Projet privé : chat réservé aux membres (anonyme ou non-membre → login).
  if (project?.accessMode === "private") {
    if (!user?.id) redirect("/login");
    if (!(await isProjectMember(user.id, project.id))) redirect("/login");
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
