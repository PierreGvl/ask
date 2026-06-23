import Link from "next/link";
import {
  createCorpusAction,
  createDataSourceAction,
  deleteDataSourceAction,
  resyncDataSourceAction,
} from "@/app/(admin)/admin/actions";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { TBody, TD, TH, THead, TR, Table } from "@/components/ui/Table";
import {
  corpusReaders,
  corpusStats,
  listAllDataSources,
  listCorpora,
} from "@/lib/admin/queries";

const DATA_SOURCE_KINDS = [
  "public_corpus",
  "upload",
  "url_crawl",
  "prestashop_feed",
  "web_search",
] as const;

function fmtDate(d: Date | null) {
  return d ? new Date(d).toLocaleDateString("fr-FR") : "—";
}

export default async function CorpusPage() {
  const [sources, corpora] = await Promise.all([
    listAllDataSources(),
    listCorpora(),
  ]);
  // Maps corpus → lecteurs (tenants) + stats, pour enrichir la vue par source.
  const [readersEntries, statsEntries] = await Promise.all([
    Promise.all(corpora.map(async (c) => [c.id, await corpusReaders(c.id)] as const)),
    Promise.all(corpora.map(async (c) => [c.id, await corpusStats(c.id)] as const)),
  ]);
  const readersByCorpus = new Map(readersEntries);
  const statsByCorpus = new Map(statsEntries);

  return (
    <div className="flex max-w-5xl flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-navy">
          Corpus
        </h1>
        <p className="text-sm text-faint">
          Toutes les sources de données qui alimentent le RAG, et les corpus qui
          les regroupent (partagés par domaine, ou privés d&apos;un tenant).
        </p>
      </div>

      {/* Vue À PLAT : toutes les sources de données */}
      <Card>
        <CardHeader>
          <CardTitle>Sources de données</CardTitle>
        </CardHeader>
        <CardBody className="flex flex-col gap-4">
          <Table>
            <THead>
              <tr>
                <TH>Source</TH>
                <TH>Type</TH>
                <TH>Description</TH>
                <TH>Corpus</TH>
                <TH>Utilisé par</TH>
                <TH>Sous-corpus</TH>
                <TH>Docs</TH>
                <TH>Statut</TH>
                <TH>Dernière sync</TH>
                <TH />
              </tr>
            </THead>
            <TBody>
              {sources.map((s) => {
                const readers = readersByCorpus.get(s.corpusId) ?? [];
                return (
                  <TR key={s.id}>
                    <TD className="font-medium text-navy-700">{s.name}</TD>
                    <TD className="font-mono text-xs">{s.kind}</TD>
                    <TD className="max-w-[16rem] text-xs text-faint">
                      {s.description ?? "—"}
                    </TD>
                    <TD>
                      <span className="flex items-center gap-1">
                        {s.corpusName}
                        <Badge variant={s.corpusOwner === null ? "accent" : "neutral"}>
                          {s.corpusOwner === null ? "partagé" : "privé"}
                        </Badge>
                      </span>
                    </TD>
                    <TD className="text-xs text-faint">
                      {readers.length === 0
                        ? "—"
                        : readers.map((r) => r.name).join(", ")}
                    </TD>
                    <TD className="text-xs text-faint">{s.domain ?? "—"}</TD>
                    <TD>{s.docCount}</TD>
                    <TD>
                      <Badge
                        variant={
                          s.status === "error"
                            ? "danger"
                            : s.status === "syncing"
                              ? "accent"
                              : "neutral"
                        }
                      >
                        {s.status}
                      </Badge>
                    </TD>
                    <TD className="text-xs text-faint">
                      {fmtDate(s.lastSyncedAt)}
                    </TD>
                    <TD className="whitespace-nowrap text-right">
                      <form action={resyncDataSourceAction} className="inline">
                        <input type="hidden" name="id" value={s.id} />
                        <button
                          type="submit"
                          className="mr-3 text-xs font-medium text-navy-700 hover:text-rose hover:underline"
                        >
                          Re-sync
                        </button>
                      </form>
                      <form action={deleteDataSourceAction} className="inline">
                        <input type="hidden" name="id" value={s.id} />
                        <button
                          type="submit"
                          className="text-xs text-faint hover:text-rose"
                        >
                          Suppr.
                        </button>
                      </form>
                    </TD>
                  </TR>
                );
              })}
              {sources.length === 0 && (
                <TR>
                  <TD colSpan={10} className="py-5 text-center text-faint">
                    Aucune source de données.
                  </TD>
                </TR>
              )}
            </TBody>
          </Table>

          {/* Ajouter une source (à un corpus) */}
          <form
            action={createDataSourceAction}
            className="grid gap-3 border-t border-line pt-4 sm:grid-cols-5"
          >
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-faint">Corpus</span>
              <Select name="corpusId" required>
                {corpora.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-faint">Nom</span>
              <Input name="name" placeholder="Légifrance AOC" required />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-faint">Type</span>
              <Select name="kind">
                {DATA_SOURCE_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </Select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-faint">Sous-corpus</span>
              <Input name="domain" placeholder="reglementaire" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-faint">Description</span>
              <Input name="description" placeholder="Articles AOC…" />
            </label>
            <div className="sm:col-span-5">
              <Button type="submit" variant="outline">
                Ajouter une source
              </Button>
            </div>
          </form>
          <p className="text-xs text-faint">
            « Re-sync » marque la source à resynchroniser ; l&apos;ingestion
            réelle est CLI :{" "}
            <code className="font-mono">npm run ingest -- --corpus &lt;slug&gt;</code>.
          </p>
        </CardBody>
      </Card>

      {/* Gestion des corpus */}
      <Card>
        <CardHeader>
          <CardTitle>Corpus</CardTitle>
        </CardHeader>
        <CardBody className="flex flex-col gap-4">
          <Table>
            <THead>
              <tr>
                <TH>Corpus</TH>
                <TH>Slug</TH>
                <TH>Type</TH>
                <TH>Propriétaire</TH>
                <TH>Lu par</TH>
                <TH>Docs / chunks</TH>
                <TH>Dernière ingestion</TH>
              </tr>
            </THead>
            <TBody>
              {corpora.map((c) => {
                const shared = c.ownerProjectId === null;
                const st = statsByCorpus.get(c.id);
                const rd = readersByCorpus.get(c.id) ?? [];
                return (
                  <TR key={c.id}>
                    <TD className="font-medium text-navy-700">{c.name}</TD>
                    <TD className="font-mono text-xs text-faint">{c.slug}</TD>
                    <TD>
                      <Badge variant={shared ? "accent" : "neutral"}>
                        {shared ? "partagé" : "privé"}
                      </Badge>
                    </TD>
                    <TD className="text-xs text-faint">{c.ownerName ?? "—"}</TD>
                    <TD className="text-xs text-faint">
                      {rd.length === 0 ? "—" : rd.map((r) => r.name).join(", ")}
                    </TD>
                    <TD className="text-xs text-faint">
                      {st ? `${st.documents} / ${st.chunks}` : "—"}
                    </TD>
                    <TD className="text-xs text-faint">
                      {fmtDate(st?.lastIngestedAt ?? null)}
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
          <p className="text-xs text-faint">
            Les corpus privés se gèrent depuis la fiche du{" "}
            <Link href="/admin/projects" className="text-rose hover:underline">
              projet
            </Link>{" "}
            (abonnement aux corpus partagés).
          </p>
        </CardBody>
      </Card>

      {/* Nouveau corpus partagé */}
      <Card>
        <CardHeader>
          <CardTitle>Nouveau corpus partagé</CardTitle>
        </CardHeader>
        <CardBody>
          <form action={createCorpusAction} className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-faint">Nom</span>
              <Input name="name" placeholder="Réglementation agriculture" required />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-faint">Slug</span>
              <Input name="slug" placeholder="agriculture" required />
            </label>
            <label className="flex flex-col gap-1 text-sm sm:col-span-2">
              <span className="text-faint">Description</span>
              <Input
                name="description"
                placeholder="Réglementation agricole française et européenne"
              />
            </label>
            <div className="sm:col-span-2">
              <Button type="submit">Créer le corpus</Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
