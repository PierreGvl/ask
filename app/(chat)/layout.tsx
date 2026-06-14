import { auth } from "@/auth";
import { ChatShell } from "@/components/sidebar/ChatShell";
import { listConversations } from "@/lib/db/queries";

export default async function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const user = session?.user ?? null;

  const conversations = user?.id
    ? (await listConversations(user.id)).map((c) => ({
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
