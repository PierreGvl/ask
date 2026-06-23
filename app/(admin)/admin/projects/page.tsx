import Link from "next/link";
import { NewProjectDialog } from "@/components/admin/NewProjectDialog";
import { WidgetTestModal } from "@/components/admin/WidgetTestModal";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { TBody, TD, TH, THead, TR, Table } from "@/components/ui/Table";
import { listProjects } from "@/lib/admin/queries";

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

export default async function ProjectsPage() {
  const projects = await listProjects();
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-navy">
          Projets
        </h1>
        <NewProjectDialog />
      </div>

      <Card>
        <Table>
          <THead>
            <tr>
              <TH>#</TH>
              <TH>Nom</TH>
              <TH>Slug</TH>
              <TH>Type</TH>
              <TH>Statut</TH>
              <TH>Accès / Domaine</TH>
            </tr>
          </THead>
          <TBody>
            {projects.map((p) => (
              <TR key={p.id}>
                <TD className="font-mono text-xs text-faint">{p.number ?? "—"}</TD>
                <TD>
                  <Link
                    href={`/admin/projects/${p.id}`}
                    className="font-medium text-navy-700 hover:text-rose hover:underline"
                  >
                    {p.name}
                  </Link>
                </TD>
                <TD className="font-mono text-xs text-faint">{p.slug}</TD>
                <TD>
                  <Badge variant={TYPE_BADGE[p.type]}>{TYPE_LABEL[p.type]}</Badge>
                </TD>
                <TD>
                  <Badge variant={p.status === "active" ? "success" : "warning"}>
                    {p.status}
                  </Badge>
                </TD>
                <TD>
                  {p.deliveryMode === "widget" ? (
                    <WidgetTestModal projectId={p.id} projectName={p.name} />
                  ) : p.customDomain ? (
                    <a
                      href={`https://${p.customDomain}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-rose hover:underline"
                    >
                      {p.customDomain} ↗
                    </a>
                  ) : (
                    <span className="text-xs text-faint">—</span>
                  )}
                </TD>
              </TR>
            ))}
            {projects.length === 0 && (
              <TR>
                <TD colSpan={6} className="py-6 text-center text-faint">
                  Aucun projet.
                </TD>
              </TR>
            )}
          </TBody>
        </Table>
      </Card>
    </div>
  );
}
