import type { UIMessage } from "ai";
import type { Citation } from "@/lib/db/schema";

/** Métadonnées attachées à chaque message (citations de l'assistant). */
export type ChatMessageMetadata = {
  citations?: Citation[];
};

/** Type de message UI partagé client/serveur. */
export type ChatUIMessage = UIMessage<ChatMessageMetadata>;
