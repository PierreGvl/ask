import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { encode } from "gpt-tokenizer";

export type Chunk = {
  index: number;
  content: string;
  tokenCount: number;
};

/**
 * Découpe un texte en chunks adaptés au RAG.
 * Séparateurs orientés documents structurés (articles, sections), puis
 * repli sur paragraphes/phrases. ~700 tokens/chunk avec recouvrement.
 *
 * NB : les tailles du splitter sont en caractères ; on vise ~4 car/token.
 */
export async function chunkText(text: string): Promise<Chunk[]> {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 2800, // ≈ 700 tokens
    chunkOverlap: 350, // ≈ 90 tokens
    separators: [
      "\nArticle ",
      "\nArt. ",
      "\nChapitre ",
      "\nSection ",
      "\nTITRE ",
      "\n\n",
      "\n",
      ". ",
      " ",
      "",
    ],
  });

  const parts = await splitter.splitText(text);
  return parts
    .map((content, index) => ({
      content: content.trim(),
      index,
      tokenCount: encode(content).length,
    }))
    .filter((c) => c.content.length > 0);
}
