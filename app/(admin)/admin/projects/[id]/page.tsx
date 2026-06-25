import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { auth } from "@/auth";
import {
  deleteProjectAction,
  linkCorpusAction,
  revokeApiKeyAction,
  unlinkCorpusAction,
} from "@/app/(admin)/admin/actions";
import { ApiKeyCreator } from "@/components/admin/ApiKeyCreator";
import { IdentityForm } from "@/components/admin/IdentityForm";
import { PlansEditor } from "@/components/admin/PlansEditor";
import { ProjectTabs } from "@/components/admin/ProjectTabs";
import { MembersPanel } from "@/components/projects/MembersPanel";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { TBody, TD, TH, THead, TR, Table } from "@/components/ui/Table";
import { ToastForm } from "@/components/ui/ToastForm";
import {
  getProjectById,
  listApiKeys,
  listProjectCorpora,
  listProjectPlans,
  listSharedCorpora,
  projectStats,
} from "@/lib/admin/queries";
import {
  listPendingInvitations,
  listProjectMembers,
} from "@/lib/projects/queries";

const TYPE_LABEL = {
  white_label: "White Label",
  b2b: "B2B",
  b2c: "B2C",
} as const;
const TYPE_BADGE = {
  white_label: "accent",
  b2b: "warning",
  b2c: "neutral",
} as const;

export default async function ProjectDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;
  const project = await getProjectById(id);
  if (!project) notFound();

  const [
    apiKeys,
    stats,
    members,
    invitations,
    readCorpora,
    sharedCorpora,
    plans,
    session,
  ] = await Promise.all([
    listApiKeys(id),
    projectStats(id),
    listProjectMembers(id),
    listPendingInvitations(id),
    listProjectCorpora(id),
    listSharedCorpora(),
    listProjectPlans(id),
    auth(),
  ]);
  // Candidats à l'abonnement : corpus partagés que le tenant ne lit pas encore.
  const readIds = new Set(readCorpora.map((c) => c.corpusId));
  const candidateCorpora = sharedCorpora.filter((c) => !readIds.has(c.id));

  // --- Contenu des onglets (rendus serveur, basculés côté client) ---

  const identityTab = (
    <Card>
      <CardBody>
        <IdentityForm project={project} />
      </CardBody>
    </Card>
  );

  const plansTab = (
    <Card>
      <CardBody>
        <PlansEditor
          projectId={project.id}
          billingModel={project.billingModel}
          plans={plans}
        />
      </CardBody>
    </Card>
  );

  const corpusTab = (
    <Card>
      <CardBody className="flex flex-col gap-4">
        <p className="text-xs text-faint">
          Le chat de ce tenant puise dans les corpus ci-dessous : son corpus
          privé + les corpus partagés abonnés. La gestion des sources de données
          se fait dans l&apos;onglet{" "}
          <Link href="/admin/corpus" className="text-rose hover:underline">
            Corpus
          </Link>
          .
        </p>
        <Table>
          <THead>
            <tr>
              <TH>Corpus</TH>
              <TH>Type</TH>
              <TH />
            </tr>
          </THead>
          <TBody>
            {readCorpora.map((c) => {
              const isPrivate = c.ownerProjectId === project.id;
              return (
                <TR key={c.corpusId}>
                  <TD className="font-medium text-navy-700">{c.name}</TD>
                  <TD>
                    <Badge variant={isPrivate ? "neutral" : "accent"}>
                      {isPrivate ? "privé" : "partagé"}
                    </Badge>
                  </TD>
                  <TD className="text-right">
                    {!isPrivate && (
                      <ToastForm
                        action={unlinkCorpusAction}
                        className="inline"
                        success="Désabonné"
                      >
                        <input
                          type="hidden"
                          name="projectId"
                          value={project.id}
                        />
                        <input
                          type="hidden"
                          name="corpusId"
                          value={c.corpusId}
                        />
                        <button
                          type="submit"
                          className="text-xs text-faint hover:text-rose"
                        >
                          Désabonner
                        </button>
                      </ToastForm>
                    )}
                  </TD>
                </TR>
              );
            })}
            {readCorpora.length === 0 && (
              <TR>
                <TD colSpan={3} className="py-5 text-center text-faint">
                  Aucun corpus.
                </TD>
              </TR>
            )}
          </TBody>
        </Table>
        {candidateCorpora.length > 0 && (
          <ToastForm
            action={linkCorpusAction}
            className="flex flex-wrap items-end gap-3 border-t border-line pt-4"
            success="Abonné au corpus"
          >
            <input type="hidden" name="projectId" value={project.id} />
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-faint">Abonner à un corpus partagé</span>
              <Select name="corpusId" className="w-56">
                {candidateCorpora.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </label>
            <Button type="submit" variant="outline">
              Abonner
            </Button>
          </ToastForm>
        )}
      </CardBody>
    </Card>
  );

  const keysTab = (
    <Card>
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
                    <ToastForm
                      action={revokeApiKeyAction}
                      className="inline"
                      success="Clé révoquée"
                    >
                      <input type="hidden" name="id" value={k.id} />
                      <input type="hidden" name="projectId" value={project.id} />
                      <button
                        type="submit"
                        className="text-xs text-faint hover:text-rose"
                      >
                        Révoquer
                      </button>
                    </ToastForm>
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
  );

  const membersTab = (
    <Card>
      <CardBody>
        <MembersPanel
          projectId={project.id}
          members={members}
          invitations={invitations}
          currentUserId={session?.user?.id ?? null}
          plans={plans.map((p) => ({ id: p.id, name: p.name }))}
        />
      </CardBody>
    </Card>
  );

  const content: Record<string, ReactNode> = {
    identity: identityTab,
    plans: plansTab,
    corpus: corpusTab,
    members: membersTab,
    // L'onglet Clés API n'a de sens que pour une livraison par widget.
    ...(project.deliveryMode === "widget" ? { keys: keysTab } : {}),
  };
  const tabs = [
    { key: "identity", label: "Identité & configuration" },
    { key: "plans", label: "Offre & paliers" },
    { key: "corpus", label: "Corpus lus par ce tenant" },
    ...(project.deliveryMode === "widget"
      ? [{ key: "keys", label: "Clés API (widget)" }]
      : []),
    { key: "members", label: "Membres & invitations" },
  ];
  const active = tab && content[tab] ? tab : "identity";

  return (
    <div className="flex max-w-4xl flex-col gap-5">
      {/* En-tête */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-semibold tracking-tight text-navy">
            {project.name}
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-mono text-faint">
              #{project.number} · {project.slug}
            </span>
            <Badge variant={TYPE_BADGE[project.type]}>
              {TYPE_LABEL[project.type]}
            </Badge>
            <Badge variant={project.status === "active" ? "success" : "warning"}>
              {project.status}
            </Badge>
            <Badge
              variant={project.accessMode === "private" ? "accent" : "neutral"}
            >
              {project.accessMode === "private" ? "privé" : "public"}
            </Badge>
            <Badge variant="neutral">
              {project.deliveryMode === "widget" ? "widget" : "hébergé"}
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

      <ProjectTabs
        basePath={`/admin/projects/${project.id}`}
        active={active}
        tabs={tabs}
      />
      <div>{content[active]}</div>
    </div>
  );
}
