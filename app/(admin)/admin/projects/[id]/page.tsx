import { notFound } from "next/navigation";
import { auth } from "@/auth";
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
import { MembersPanel } from "@/components/projects/MembersPanel";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { TBody, TD, TH, THead, TR, Table } from "@/components/ui/Table";
import { Textarea } from "@/components/ui/Textarea";
import {
  getProjectById,
  listApiKeys,
  listDataSources,
  projectStats,
} from "@/lib/admin/queries";
import {
  listPendingInvitations,
  listProjectMembers,
} from "@/lib/projects/queries";

const DATA_SOURCE_KINDS = [
  "public_corpus",
  "upload",
  "url_crawl",
  "prestashop_feed",
  "web_search",
] as const;

const TIER_BADGE = { free: "neutral", pro: "accent", domaine: "accent" } as const;

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

  const [sources, apiKeys, stats, members, invitations, session] =
    await Promise.all([
      listDataSources(id),
      listApiKeys(id),
      projectStats(id),
      listProjectMembers(id),
      listPendingInvitations(id),
      auth(),
    ]);
  const cfg = project.config ?? {};
  const colors = project.theme?.colors ?? {};

  return (
    <div className="flex max-w-4xl flex-col gap-5">
      {/* En-tête */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-semibold tracking-tight text-navy">
            {project.name}
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-mono text-faint">{project.slug}</span>
            <Badge variant={TIER_BADGE[project.tier]}>{project.tier}</Badge>
            <Badge variant={project.status === "active" ? "success" : "warning"}>
              {project.status}
            </Badge>
            <Badge
              variant={project.accessMode === "private" ? "accent" : "neutral"}
            >
              {project.accessMode === "private" ? "privé" : "public"}
            </Badge>
            <span className="text-faint">
              {stats.documents} docs · {stats.chunks} chunks
            </span>
          </div>
        </div>
        <form action={deleteProjectAction}>
          <input type="hidden" name="id" value={project.id} />
          <Button variant="outline" size="sm" type="submit">
            Supprimer
          </Button>
        </form>
      </div>

      {/* Licence */}
      <Card>
        <CardHeader>
          <CardTitle>Licence (tier)</CardTitle>
        </CardHeader>
        <CardBody>
          <form action={setTierAction} className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="id" value={project.id} />
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-faint">Tier actuel : {project.tier}</span>
              <Select name="tier" defaultValue={project.tier} className="w-40">
                <option value="free">free</option>
                <option value="pro">pro</option>
                <option value="domaine">domaine</option>
              </Select>
            </label>
            <Button type="submit" variant="outline">
              Changer le tier
            </Button>
          </form>
        </CardBody>
      </Card>

      {/* Identité & configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Identité & configuration</CardTitle>
        </CardHeader>
        <CardBody>
          <form
            action={updateProjectAction}
            className="grid gap-3 sm:grid-cols-2"
          >
            <input type="hidden" name="id" value={project.id} />
            <TextField name="name" label="Nom" defaultValue={project.name} />
            <TextField name="slug" label="Slug" defaultValue={project.slug} />
            <TextField
              name="customDomain"
              label="Domaine personnalisé"
              defaultValue={project.customDomain ?? ""}
            />
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-faint">Statut</span>
              <Select name="status" defaultValue={project.status}>
                <option value="active">active</option>
                <option value="suspended">suspended</option>
              </Select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-faint">Accès au chat</span>
              <Select name="accessMode" defaultValue={project.accessMode}>
                <option value="public">public (ouvert à tous)</option>
                <option value="private">privé (membres invités)</option>
              </Select>
            </label>
            <TextField
              name="color_navy"
              label="Couleur principale (navy)"
              defaultValue={colors.navy ?? ""}
              placeholder="#141934"
            />
            <TextField
              name="color_rose"
              label="Couleur accent (rose)"
              defaultValue={colors.rose ?? ""}
              placeholder="#e33170"
            />
            <TextField
              name="color_roseLight"
              label="Fond clair (roseLight)"
              defaultValue={colors.roseLight ?? ""}
              placeholder="#fdeef4"
            />
            <TextField
              name="logoUrl"
              label="URL du logo"
              defaultValue={project.theme?.logoUrl ?? ""}
              placeholder="/logo.png"
            />
            <TextField
              name="defaultDomain"
              label="Sous-corpus par défaut"
              defaultValue={cfg.defaultDomain ?? ""}
              placeholder="reglementaire"
            />
            <AreaField
              name="greeting"
              label="Message d'accueil"
              defaultValue={cfg.greeting ?? ""}
            />
            <AreaField
              name="systemPrompt"
              label="Prompt système (persona métier)"
              defaultValue={cfg.systemPrompt ?? ""}
              rows={5}
              full
            />
            <AreaField
              name="searchToolDescription"
              label="Description de l'outil de recherche"
              defaultValue={cfg.searchToolDescription ?? ""}
              full
            />
            <AreaField
              name="suggestions"
              label="Suggestions (une par ligne)"
              defaultValue={(cfg.suggestions ?? []).join("\n")}
              rows={4}
              full
            />
            <div className="sm:col-span-2">
              <Button type="submit">Enregistrer</Button>
            </div>
          </form>
        </CardBody>
      </Card>

      {/* Sources de données */}
      <Card>
        <CardHeader>
          <CardTitle>Sources de données</CardTitle>
        </CardHeader>
        <CardBody className="flex flex-col gap-4">
          <Table>
            <THead>
              <tr>
                <TH>Nom</TH>
                <TH>Type</TH>
                <TH>Statut</TH>
                <TH>Docs</TH>
                <TH>Dernière sync</TH>
                <TH />
              </tr>
            </THead>
            <TBody>
              {sources.map((s) => (
                <TR key={s.id}>
                  <TD className="font-medium text-navy-700">{s.name}</TD>
                  <TD className="font-mono text-xs">{s.kind}</TD>
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
                  <TD>{s.docCount}</TD>
                  <TD className="text-xs text-faint">{fmtDate(s.lastSyncedAt)}</TD>
                  <TD className="whitespace-nowrap text-right">
                    <form action={resyncDataSourceAction} className="inline">
                      <input type="hidden" name="id" value={s.id} />
                      <input type="hidden" name="projectId" value={project.id} />
                      <button
                        type="submit"
                        className="mr-3 text-xs font-medium text-navy-700 hover:text-rose hover:underline"
                      >
                        Re-sync
                      </button>
                    </form>
                    <form action={deleteDataSourceAction} className="inline">
                      <input type="hidden" name="id" value={s.id} />
                      <input type="hidden" name="projectId" value={project.id} />
                      <button
                        type="submit"
                        className="text-xs text-faint hover:text-rose"
                      >
                        Suppr.
                      </button>
                    </form>
                  </TD>
                </TR>
              ))}
              {sources.length === 0 && (
                <TR>
                  <TD colSpan={6} className="py-5 text-center text-faint">
                    Aucune source.
                  </TD>
                </TR>
              )}
            </TBody>
          </Table>

          <form
            action={createDataSourceAction}
            className="grid gap-3 border-t border-line pt-4 sm:grid-cols-3"
          >
            <input type="hidden" name="projectId" value={project.id} />
            <TextField name="name" label="Nom" placeholder="Catalogue produits" />
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
            <TextField name="domain" label="Sous-corpus" placeholder="catalogue" />
            <div className="sm:col-span-3">
              <Button type="submit" variant="outline">
                Ajouter une source
              </Button>
            </div>
          </form>
          <p className="text-xs text-faint">
            « Re-sync » marque la source à resynchroniser (statut <em>syncing</em>)
            ; l&apos;ingestion réelle est exécutée par le pipeline (`npm run
            ingest -- --project {project.slug}`).
          </p>
        </CardBody>
      </Card>

      {/* Membres & invitations */}
      <Card>
        <CardHeader>
          <CardTitle>Membres & invitations</CardTitle>
        </CardHeader>
        <CardBody>
          <MembersPanel
            projectId={project.id}
            members={members}
            invitations={invitations}
            currentUserId={session?.user?.id ?? null}
          />
        </CardBody>
      </Card>

      {/* Clés API */}
      <Card>
        <CardHeader>
          <CardTitle>Clés API (widget)</CardTitle>
        </CardHeader>
        <CardBody className="flex flex-col gap-4">
          <Table>
            <THead>
              <tr>
                <TH>Nom</TH>
                <TH>Préfixe</TH>
                <TH>Origines</TH>
                <TH>État</TH>
                <TH />
              </tr>
            </THead>
            <TBody>
              {apiKeys.map((k) => (
                <TR key={k.id}>
                  <TD className="font-medium text-navy-700">{k.name}</TD>
                  <TD className="font-mono text-xs">{k.prefix}…</TD>
                  <TD className="text-xs text-faint">
                    {(k.allowedOrigins ?? []).join(", ") || "—"}
                  </TD>
                  <TD>
                    {k.revokedAt ? (
                      <Badge>révoquée</Badge>
                    ) : (
                      <Badge variant="success">active</Badge>
                    )}
                  </TD>
                  <TD className="text-right">
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
                  </TD>
                </TR>
              ))}
              {apiKeys.length === 0 && (
                <TR>
                  <TD colSpan={5} className="py-5 text-center text-faint">
                    Aucune clé.
                  </TD>
                </TR>
              )}
            </TBody>
          </Table>
          <div className="border-t border-line pt-4">
            <ApiKeyCreator projectId={project.id} />
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

function TextField({
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
      <Input name={name} defaultValue={defaultValue} placeholder={placeholder} />
    </label>
  );
}

function AreaField({
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
      <Textarea name={name} defaultValue={defaultValue} rows={rows} />
    </label>
  );
}
