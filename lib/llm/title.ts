import { generateText } from "ai";
import { titleModel } from "./models";
import { TITLE_PROMPT } from "./prompts";

/** Génère un titre court pour une conversation à partir du 1er échange. */
export async function generateTitle(
  userMessage: string,
  assistantMessage: string,
): Promise<string | null> {
  try {
    const { text } = await generateText({
      model: titleModel,
      system: TITLE_PROMPT,
      prompt: `Question : ${userMessage}\n\nRéponse : ${assistantMessage.slice(0, 800)}`,
    });
    const title = text.trim().replace(/^["']|["']$/g, "").slice(0, 80);
    return title || null;
  } catch {
    return null;
  }
}
