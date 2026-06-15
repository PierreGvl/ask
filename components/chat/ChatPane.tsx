"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import type { ChatUIMessage } from "@/lib/chat/types";
import { Composer } from "./Composer";
import { Greeting } from "./Greeting";
import { Message } from "./Message";
import { Suggestions } from "./Suggestions";

export function ChatPane({
  chatId,
  initialMessages,
  isAuthenticated,
  isNew,
}: {
  chatId: string;
  initialMessages: ChatUIMessage[];
  isAuthenticated: boolean;
  isNew: boolean;
}) {
  const router = useRouter();
  const navigatedRef = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status, stop } = useChat<ChatUIMessage>({
    id: chatId,
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: "/api/chat",
      prepareSendMessagesRequest: ({ messages, id }) => ({
        body: { messages, conversationId: id },
      }),
    }),
  });

  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Fin du 1er échange (utilisateur connecté) : rafraîchit la barre latérale
  // pour faire apparaître la nouvelle conversation et son titre.
  useEffect(() => {
    if (status === "ready" && navigatedRef.current) router.refresh();
  }, [status, router]);

  function handleSend(text: string) {
    if (isNew && isAuthenticated && !navigatedRef.current) {
      navigatedRef.current = true;
      window.history.replaceState(null, "", `/c/${chatId}`);
    }
    sendMessage({ text });
  }

  const empty = messages.length === 0;

  return (
    <div className="flex h-full flex-col">
      {!isAuthenticated && (
        <div className="border-b border-line bg-rose-50 px-4 py-2 text-center text-sm text-navy-700">
          Vous discutez en mode invité.{" "}
          <Link href="/login" className="font-medium text-rose hover:underline">
            Connectez-vous
          </Link>{" "}
          pour conserver votre historique de conversations.
        </div>
      )}

      {empty ? (
        <div className="scrollbar-thin flex-1 overflow-y-auto">
          <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col items-center justify-center gap-8 px-4 py-8">
            <Greeting />
            <Suggestions onPick={handleSend} />
            <div className="w-full">
              <Composer onSend={handleSend} onStop={stop} busy={busy} large />
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="scrollbar-thin flex-1 overflow-y-auto">
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
              {messages.map((m, i) => (
                <Message
                  key={m.id}
                  message={m}
                  streaming={
                    busy && i === messages.length - 1 && m.role === "assistant"
                  }
                />
              ))}
              <div ref={bottomRef} />
            </div>
          </div>

          <div className="border-t border-line bg-white/80 px-4 py-4 backdrop-blur">
            <Composer onSend={handleSend} onStop={stop} busy={busy} />
          </div>
        </>
      )}
    </div>
  );
}
