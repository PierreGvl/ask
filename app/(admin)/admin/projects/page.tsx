import Link from "next/link";
import { NewProjectDialog } from "@/components/admin/NewProjectDialog";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { TBody, TD, TH, THead, TR, Table } from "@/components/ui/Table";
import { listProjects } from "@/lib/admin/queries";

const TIER_BADGE = { free: "neutral", pro: "accent", domaine: "accent" } as const;

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
              <TH>Nom</TH>
              <TH>Slug</TH>
              <TH>Tier</TH>
              <TH>Statut</TH>
              <TH>Domaine custom</TH>
            </tr>
          </THead>
          <TBody>
            {projects.map((p) => (
              <TR key={p.id}>
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
                  <Badge variant={TIER_BADGE[p.tier]}>{p.tier}</Badge>
                </TD>
                <TD>
                  <Badge variant={p.status === "active" ? "success" : "warning"}>
                    {p.status}
                  </Badge>
                </TD>
                <TD className="text-faint">{p.customDomain ?? "—"}</TD>
              </TR>
            ))}
            {projects.length === 0 && (
              <TR>
                <TD colSpan={5} className="py-6 text-center text-faint">
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
