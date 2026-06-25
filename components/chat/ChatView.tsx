"use client";

import { useEffect, useState } from "react";
import { useBranding } from "@/components/branding/BrandingProvider";
import type { ChatUIMessage } from "@/lib/chat/types";
import { ChatPane } from "./ChatPane";

/** Événement global déclenché par le bouton « Nouveau chat » de la sidebar. */
export const NEW_CHAT_EVENT = "awtl:new-chat";

/**
 * Enveloppe qui gère l'identité de la conversation côté client.
 * - Page d'accueil : génère un id stable (non régénéré par router.refresh).
 * - Page /c/[id] : utilise l'id fourni.
 * Un remontage par `key` garantit une réinitialisation propre sur « Nouveau chat ».
 */
export function ChatView({
  conversationId,
  initialMessages,
  isAuthenticated,
}: {
  conversationId?: string;
  initialMessages: ChatUIMessage[];
  isAuthenticated: boolean;
}) {
  const { composerPlaceholder } = useBranding();
  const isNew = !conversationId;
  const [chatId, setChatId] = useState(
    () => conversationId ?? crypto.randomUUID(),
  );

  useEffect(() => {
    if (!isNew) return;
    const handler = () => {
      setChatId(crypto.randomUUID());
      window.history.replaceState(null, "", "/");
    };
    window.addEventListener(NEW_CHAT_EVENT, handler);
    return () => window.removeEventListener(NEW_CHAT_EVENT, handler);
  }, [isNew]);

  return (
    <ChatPane
      key={chatId}
      chatId={chatId}
      initialMessages={isNew ? [] : initialMessages}
      isAuthenticated={isAuthenticated}
      isNew={isNew}
      placeholder={composerPlaceholder}
    />
  );
}
