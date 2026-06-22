/**
 * Pipeline d'ingestion RAG (CLI).
 *
 * Usage :
 *   npm run ingest -- --corpus vin-reglementaire --path ./corpus [--source legifrance] [--domain reglementaire]
 *   npm run ingest -- --project hervai --path ./data   # alias : corpus PRIVÉ du tenant
 *
 * --corpus est le slug du corpus cible (partagé ou privé). --project est un alias
 * pratique qui résout le corpus privé du tenant. L'un des deux est requis.
 *
 * Parcourt un dossier de fichiers (.pdf, .html, .txt, .md), les parse,
 * les découpe, calcule les embeddings Mistral et les upsert dans pgvector.
 * Idempotent : un fichier inchangé (même hash) est ignoré.
 */
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import { config } from "dotenv";

config({ path: ".env" });

const SUPPORTED = new Set([".pdf", ".html", ".htm", ".txt", ".md"]);

function parseArgs(argv: string[]) {
  const args: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const val = argv[i + 1]?.startsWith("--") ? "true" : argv[++i];
      args[key] = val ?? "true";
    }
  }
  return args;
}

type DocMeta = {
  title?: string;
  url?: string;
  reference?: string;
  source?: string;
  domain?: string;
};

/** Lit un descripteur optionnel `<fichier>.meta.json` à côté du document. */
async function readMeta(file: string): Promise<DocMeta> {
  try {
    const raw = await readFile(`${file}.meta.json`, "utf8");
    return JSON.parse(raw) as DocMeta;
  } catch {
    return {};
  }
}

async function listFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) files.push(...(await listFiles(full)));
    else if (e.name.toLowerCase() === "readme.md") continue; // doc, pas du corpus
    else if (SUPPORTED.has(extname(e.name).toLowerCase())) files.push(full);
  }
  return files;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const dir = resolve(args.path ?? "./corpus");
  const source = args.source ?? "upload";
  const domain = args.domain ?? "reglementaire";
  const corpusSlug = args.corpus;
  const projectSlug = args.project;
  if (!corpusSlug && !projectSlug) {
    console.error(
      "❌ --corpus <slug> (ou --project <slug> pour le corpus privé du tenant) est requis.",
    );
    process.exit(1);
  }

  // Imports différés (après chargement de .env, validé par lib/env).
  const { parseFile } = await import("./parse");
  const { chunkText } = await import("./chunk");
  const { upsertDocument } = await import("./embed-upsert");
  const { eq } = await import("drizzle-orm");
  const { db } = await import("@/lib/db");
  const { corpora, projects } = await import("@/lib/db/schema");

  // Résolution du corpus cible.
  let corpus: { id: string; name: string } | undefined;
  if (corpusSlug) {
    corpus = await db.query.corpora.findFirst({
      where: eq(corpora.slug, corpusSlug),
      columns: { id: true, name: true },
    });
    if (!corpus) {
      console.error(`❌ Corpus introuvable pour le slug « ${corpusSlug} ».`);
      process.exit(1);
    }
  } else {
    const project = await db.query.projects.findFirst({
      where: eq(projects.slug, projectSlug!),
      columns: { id: true, name: true },
    });
    if (!project) {
      console.error(`❌ Projet introuvable pour le slug « ${projectSlug} ».`);
      process.exit(1);
    }
    corpus = await db.query.corpora.findFirst({
      where: eq(corpora.ownerProjectId, project.id),
      columns: { id: true, name: true },
    });
    if (!corpus) {
      console.error(`❌ Aucun corpus privé pour le tenant « ${projectSlug} ».`);
      process.exit(1);
    }
  }
  console.log(`Corpus : ${corpus.name}`);

  const files = await listFiles(dir);
  if (files.length === 0) {
    console.log(`Aucun fichier supporté trouvé dans ${dir}`);
    return;
  }
  console.log(`${files.length} fichier(s) à traiter depuis ${dir}\n`);

  let ingested = 0;
  let skipped = 0;
  for (const file of files) {
    console.log(`• ${file}`);
    const { title: parsedTitle, text } = await parseFile(file);
    if (!text) {
      console.log("  (vide, ignoré)");
      continue;
    }
    const meta = await readMeta(file);
    const contentHash = createHash("sha256").update(text).digest("hex");
    const docChunks = await chunkText(text);
    console.log(`  ${docChunks.length} chunk(s)`);

    const status = await upsertDocument({
      corpusId: corpus.id,
      source: meta.source ?? source,
      domain: meta.domain ?? domain,
      title: meta.title ?? parsedTitle,
      url: meta.url ?? null,
      reference: meta.reference ?? null,
      contentHash,
      chunks: docChunks,
    });
    if (status === "skipped") {
      skipped++;
      console.log("  ↪ inchangé, ignoré");
    } else {
      ingested++;
      console.log("  ✓ ingéré");
    }
  }

  // Met à jour la source de données du corpus (panneau de pilotage console).
  try {
    const { and: andOp, count, eq: eqOp } = await import("drizzle-orm");
    const { dataSources, documents } = await import("@/lib/db/schema");
    const KIND: Record<string, string> = {
      eurlex: "public_corpus",
      legifrance: "public_corpus",
      inao: "public_corpus",
      upload: "upload",
    };
    const [{ n: docCount }] = await db
      .select({ n: count() })
      .from(documents)
      .where(
        andOp(
          eqOp(documents.corpusId, corpus.id),
          eqOp(documents.domain, domain),
        ),
      );
    const name = `${source} · ${domain}`;
    const existing = await db.query.dataSources.findFirst({
      where: andOp(
        eqOp(dataSources.corpusId, corpus.id),
        eqOp(dataSources.name, name),
      ),
      columns: { id: true },
    });
    const values = {
      status: "idle" as const,
      docCount,
      lastSyncedAt: new Date(),
      lastError: null,
      updatedAt: new Date(),
    };
    if (existing) {
      await db
        .update(dataSources)
        .set(values)
        .where(eqOp(dataSources.id, existing.id));
    } else {
      await db.insert(dataSources).values({
        corpusId: corpus.id,
        kind: (KIND[source] ?? "upload") as never,
        name,
        domain,
        ...values,
      });
    }
  } catch (err) {
    console.warn("  ⚠ statut data_sources non mis à jour :", err);
  }

  console.log(`\n✅ Terminé : ${ingested} ingéré(s), ${skipped} ignoré(s).`);
  process.exit(0);
}

main().catch((err) => {
  console.error("\n❌ Ingestion échouée :", err);
  process.exit(1);
});
