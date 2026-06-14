import { readFile } from "node:fs/promises";
import { basename, extname } from "node:path";

export type ParsedDoc = {
  title: string;
  text: string;
};

/** Nettoie le texte extrait : espaces multiples, césures, lignes vides. */
function clean(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/-\n(\p{Ll})/gu, "$1") // recolle les césures de fin de ligne
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function parsePdf(path: string): Promise<string> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const buf = await readFile(path);
  const pdf = await getDocumentProxy(new Uint8Array(buf));
  const { text } = await extractText(pdf, { mergePages: true });
  return Array.isArray(text) ? text.join("\n") : text;
}

async function parseHtml(path: string): Promise<string> {
  const { load } = await import("cheerio");
  const html = await readFile(path, "utf8");
  const $ = load(html);
  $("script, style, nav, header, footer, noscript").remove();
  return $("main").text() || $("body").text();
}

/** Parse un fichier local (.pdf, .html/.htm, .txt/.md) en texte propre. */
export async function parseFile(path: string): Promise<ParsedDoc> {
  const ext = extname(path).toLowerCase();
  let raw: string;

  if (ext === ".pdf") raw = await parsePdf(path);
  else if (ext === ".html" || ext === ".htm") raw = await parseHtml(path);
  else raw = await readFile(path, "utf8");

  return { title: basename(path, ext), text: clean(raw) };
}
