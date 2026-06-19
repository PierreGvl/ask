"use client";

import { useState } from "react";
import { ChatPane } from "./ChatPane";

/**
 * Chat embarqué (iframe widget). Réutilise ChatPane mais pointe vers
 * /api/widget/chat, authentifié par la clé API publique du projet. Mode invité,
 * sans persistance ni bandeau de connexion.
 */
export function EmbedChat({ apiKey }: { apiKey: string }) {
  const [chatId] = useState(() => crypto.randomUUID());
  return (
    <ChatPane
      chatId={chatId}
      initialMessages={[]}
      isAuthenticated={false}
      isNew
      embedded
      api="/api/widget/chat"
      headers={{ Authorization: `Bearer ${apiKey}` }}
    />
  );
}
