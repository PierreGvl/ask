import { Search } from "lucide-react";
import type { ChatUIMessage } from "@/lib/chat/types";
import { cn } from "@/lib/utils";
import { Citations } from "./Citations";
import { DeclarationDownload } from "./DeclarationDownload";
import { Markdown } from "./Markdown";

function textOf(message: ChatUIMessage): string {
  return message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

/** Vrai si un appel d'outil est en cours (pas encore de résultat). */
function isSearching(message: ChatUIMessage): boolean {
  return message.parts.some(
    (p) =>
      (p.type === "tool-search_documents" || p.type === "tool-web_search") &&
      "state" in p &&
      p.state !== "output-available" &&
      p.state !== "output-error",
  );
}

export function Message({
  message,
  streaming,
}: {
  message: ChatUIMessage;
  streaming?: boolean;
}) {
  const isUser = message.role === "user";
  const text = textOf(message);
  const citations = message.metadata?.citations ?? [];
  const declaration = message.metadata?.declaration;
  const searching = isSearching(message);

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-navy px-4 py-2.5 text-[0.95rem] text-white">
          {text}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[85%]">
        {searching && (
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1 text-xs text-rose-700">
            <Search className="h-3.5 w-3.5 animate-pulse" />
            Recherche dans les sources…
          </div>
        )}
        <div className={cn(streaming && !text && "streaming-cursor")}>
          {text && <Markdown>{text}</Markdown>}
        </div>
        {declaration && <DeclarationDownload declaration={declaration} />}
        {citations.length > 0 && <Citations citations={citations} />}
      </div>
    </div>
  );
}
