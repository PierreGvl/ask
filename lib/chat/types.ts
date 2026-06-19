import type { UIMessage } from "ai";
import type { Citation } from "@/lib/db/schema";
import type { DeclarationData } from "@/lib/pdf/types";

/** Métadonnées attachées à chaque message (citations + document généré). */
export type ChatMessageMetadata = {
  citations?: Citation[];
  /** Déclaration prête à télécharger (tier Domaine). */
  declaration?: DeclarationData;
};

/** Type de message UI partagé client/serveur. */
export type ChatUIMessage = UIMessage<ChatMessageMetadata>;
