import { auth } from "@/auth";
import { ChatView } from "@/components/chat/ChatView";

export default async function HomePage() {
  const session = await auth();
  // L'id de conversation est généré côté client (stable) pour ne pas être
  // régénéré par les rafraîchissements de la barre latérale.
  return (
    <ChatView initialMessages={[]} isAuthenticated={Boolean(session?.user)} />
  );
}
