import { notFound } from "next/navigation";
import {
  createDataSourceAction,
  deleteDataSourceAction,
  deleteProjectAction,
  resyncDataSourceAction,
  revokeApiKeyAction,
  setTierAction,
  updateProjectAction,
} from "@/app/(admin)/admin/actions";
import { ApiKeyCreator } from "@/components/admin/ApiKeyCreator";
import {
  getProjectById,
  listApiKeys,
  listDataSources,
  projectStats,
} from "@/lib/admin/queries";

const DATA_SOURCE_KINDS = [
  "public_corpus",
  "upload",
  "url_crawl",
  "prestashop_feed",
  "web_search",
] as const;

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-card border border-line bg-white p-5">
      <h2 className="mb-4 font-semibold text-navy">{title}</h2>
      {children}
    </section>
  );
}

function fmtDate(d: Date | null) {
  return d ? new Date(d).toLocaleString("fr-FR") : "—";
}

export default async function ProjectDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProjectById(id);
  if (!project) notFound();

  const [sources, apiKeys, stats] = await Promise.all([
    listDataSources(id),
    listApiKeys(id),
    projectStats(id),
  ]);
  const cfg = project.config ?? {};
  const colors = project.theme?.colors ?? {};

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-navy">
            {project.name}
          </h1>
          <p className="font-mono text-xs text-faint">
            {project.slug} · {stats.documents} docs · {stats.chunks} chunks
          </p>
        </div>
        <form action={deleteProjectAction}>
          <input type="hidden" name="id" value={project.id} />
          <button
            type="submit"
            className="rounded-pill border border-line px-4 py-1.5 text-sm text-faint hover:border-rose hover:text-rose"
          >
            Supprimer
          </button>
        </form>
      </div>

      <Section title="Licence (tier)">
        <form action={setTierAction} className="flex items-end gap-3">
          <input type="hidden" name="id" value={project.id} />
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-faint">Tier actuel : {project.tier}</span>
            <select
              name="tier"
              defaultValue={project.tier}
              className="rounded-lg border border-line px-3 py-2"
            >
              <option value="free">free</option>
              <option value="pro">pro</option>
              <option value="domaine">domaine</option>
            </select>
          </label>
          <button
            type="submit"
            className="rounded-pill bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-navy-700"
          >
            Changer le tier
          </button>
        </form>
      </Section>

      <Section title="Identité & configuration">
        <form action={updateProjectAction} className="grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="id" value={project.id} />
          <Input name="name" label="Nom" defaultValue={project.name} />
          <Input name="slug" label="Slug" defaultValue={project.slug} />
          <Input
            name="customDomain"
            label="Domaine personnalisé"
            defaultValue={project.customDomain ?? ""}
          />
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-faint">Statut</span>
            <select
              name="status"
              defaultValue={project.status}
              className="rounded-lg border border-line px-3 py-2"
            >
              <option value="active">active</option>
              <option value="suspended">suspended</option>
            </select>
          </label>
          <Input
            name="color_navy"
            label="Couleur principale (navy)"
            defaultValue={colors.navy ?? ""}
            placeholder="#141934"
          />
          <Input
            name="color_rose"
            label="Couleur accent (rose)"
            defaultValue={colors.rose ?? ""}
            placeholder="#e33170"
          />
          <Input
            name="color_roseLight"
            label="Fond clair (roseLight)"
            defaultValue={colors.roseLight ?? ""}
            placeholder="#fdeef4"
          />
          <Input
            name="logoUrl"
            label="URL du logo"
            defaultValue={project.theme?.logoUrl ?? ""}
            placeholder="/logo.png"
          />
          <Input
            name="defaultDomain"
            label="Sous-corpus par défaut"
            defaultValue={cfg.defaultDomain ?? ""}
            placeholder="reglementaire"
          />
          <Textarea
            name="greeting"
            label="Message d'accueil"
            defaultValue={cfg.greeting ?? ""}
          />
          <Textarea
            name="systemPrompt"
            label="Prompt système (persona métier)"
            defaultValue={cfg.systemPrompt ?? ""}
            rows={5}
            full
          />
          <Textarea
            name="searchToolDescription"
            label="Description de l'outil de recherche"
            defaultValue={cfg.searchToolDescription ?? ""}
            full
          />
          <Textarea
            name="suggestions"
            label="Suggestions (une par ligne)"
            defaultValue={(cfg.suggestions ?? []).join("\n")}
            rows={4}
            full
          />
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="rounded-pill bg-rose px-5 py-2 text-sm font-semibold text-white hover:bg-rose-600"
            >
              Enregistrer
            </button>
          </div>
        </form>
      </Section>

      <Section title="Sources de données">
        <table className="mb-4 w-full text-sm">
          <thead className="text-left text-faint">
            <tr>
              <th className="py-1 font-medium">Nom</th>
              <th className="py-1 font-medium">Type</th>
              <th className="py-1 font-medium">Statut</th>
              <th className="py-1 font-medium">Docs</th>
              <th className="py-1 font-medium">Dernière sync</th>
              <th className="py-1" />
            </tr>
          </thead>
          <tbody>
            {sources.map((s) => (
              <tr key={s.id} className="border-t border-line">
                <td className="py-2">{s.name}</td>
                <td className="py-2 font-mono text-xs">{s.kind}</td>
                <td className="py-2">
                  <StatusBadge status={s.status} />
                </td>
                <td className="py-2">{s.docCount}</td>
                <td className="py-2 text-xs text-faint">
                  {fmtDate(s.lastSyncedAt)}
                </td>
                <td className="py-2 text-right">
                  <form
                    action={resyncDataSourceAction}
                    className="inline"
                  >
                    <input type="hidden" name="id" value={s.id} />
                    <input
                      type="hidden"
                      name="projectId"
                      value={project.id}
                    />
                    <button
                      type="submit"
                      className="mr-2 text-xs text-navy-700 hover:text-rose hover:underline"
                    >
                      Re-sync
                    </button>
                  </form>
                  <form action={deleteDataSourceAction} className="inline">
                    <input type="hidden" name="id" value={s.id} />
                    <input
                      type="hidden"
                      name="projectId"
                      value={project.id}
                    />
                    <button
                      type="submit"
                      className="text-xs text-faint hover:text-rose"
                    >
                      Suppr.
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {sources.length === 0 && (
              <tr>
                <td colSpan={6} className="py-4 text-center text-faint">
                  Aucune source.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <form
          action={createDataSourceAction}
          className="grid gap-3 sm:grid-cols-3"
        >
          <input type="hidden" name="projectId" value={project.id} />
          <Input name="name" label="Nom" placeholder="Catalogue produits" />
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-faint">Type</span>
            <select
              name="kind"
              className="rounded-lg border border-line px-3 py-2"
            >
              {DATA_SOURCE_KINDS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </label>
          <Input name="domain" label="Sous-corpus" placeholder="catalogue" />
          <div className="sm:col-span-3">
            <button
              type="submit"
              className="rounded-pill border border-line px-4 py-2 text-sm font-semibold text-navy-700 hover:border-rose hover:text-rose"
            >
              Ajouter une source
            </button>
          </div>
        </form>
        <p className="mt-2 text-xs text-faint">
          « Re-sync » marque la source à resynchroniser (statut{" "}
          <em>syncing</em>) ; l&apos;ingestion réelle est exécutée par le pipeline
          (`npm run ingest -- --project {project.slug}`).
        </p>
      </Section>

      <Section title="Clés API (widget)">
        <table className="mb-4 w-full text-sm">
          <thead className="text-left text-faint">
            <tr>
              <th className="py-1 font-medium">Nom</th>
              <th className="py-1 font-medium">Préfixe</th>
              <th className="py-1 font-medium">Origines</th>
              <th className="py-1 font-medium">État</th>
              <th className="py-1" />
            </tr>
          </thead>
          <tbody>
            {apiKeys.map((k) => (
              <tr key={k.id} className="border-t border-line">
                <td className="py-2">{k.name}</td>
                <td className="py-2 font-mono text-xs">{k.prefix}…</td>
                <td className="py-2 text-xs text-faint">
                  {(k.allowedOrigins ?? []).join(", ") || "—"}
                </td>
                <td className="py-2">
                  {k.revokedAt ? (
                    <span className="text-faint">révoquée</span>
                  ) : (
                    <span className="text-rose">active</span>
                  )}
                </td>
                <td className="py-2 text-right">
                  {!k.revokedAt && (
                    <form action={revokeApiKeyAction} className="inline">
                      <input type="hidden" name="id" value={k.id} />
                      <input
                        type="hidden"
                        name="projectId"
                        value={project.id}
                      />
                      <button
                        type="submit"
                        className="text-xs text-faint hover:text-rose"
                      >
                        Révoquer
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
            {apiKeys.length === 0 && (
              <tr>
                <td colSpan={5} className="py-4 text-center text-faint">
                  Aucune clé.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <ApiKeyCreator projectId={project.id} />
      </Section>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "error"
      ? "bg-rose-100 text-rose-700"
      : status === "syncing"
        ? "bg-rose-50 text-rose"
        : "bg-surface-2 text-faint";
  return (
    <span className={`rounded-pill px-2 py-0.5 text-xs font-medium ${cls}`}>
      {status}
    </span>
  );
}

function Input({
  name,
  label,
  defaultValue,
  placeholder,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-faint">{label}</span>
      <input
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="rounded-lg border border-line px-3 py-2"
      />
    </label>
  );
}

function Textarea({
  name,
  label,
  defaultValue,
  rows = 2,
  full,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  rows?: number;
  full?: boolean;
}) {
  return (
    <label
      className={`flex flex-col gap-1 text-sm ${full ? "sm:col-span-2" : ""}`}
    >
      <span className="text-faint">{label}</span>
      <textarea
        name={name}
        defaultValue={defaultValue}
        rows={rows}
        className="rounded-lg border border-line px-3 py-2"
      />
    </label>
  );
}
