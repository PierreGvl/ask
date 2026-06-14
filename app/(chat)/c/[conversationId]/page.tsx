import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { ChatView } from "@/components/chat/ChatView";
import { toUIMessages } from "@/lib/chat/serialize";
import { getConversation, getMessages } from "@/lib/db/queries";

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const conversation = await getConversation(conversationId, session.user.id);
  if (!conversation) notFound();

  const rows = await getMessages(conversationId);

  return (
    <ChatView
      conversationId={conversationId}
      initialMessages={toUIMessages(rows)}
      isAuthenticated
    />
  );
}
