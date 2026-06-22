import {
  Database,
  FolderKanban,
  MessagesSquare,
  Users,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { TBody, TD, TH, THead, TR, Table } from "@/components/ui/Table";
import { listProjects, overviewCounts } from "@/lib/admin/queries";

const TIER_BADGE = {
  free: "neutral",
  pro: "accent",
  domaine: "accent",
} as const;

export default async function AdminDashboard() {
  const [counts, projects] = await Promise.all([
    overviewCounts(),
    listProjects(),
  ]);

  const stats = [
    { label: "Projets", value: counts.projects, icon: FolderKanban, href: "/admin/projects" },
    { label: "Corpus", value: counts.corpora, icon: Database, href: "/admin/corpus" },
    { label: "Utilisateurs", value: counts.users, icon: Users, href: "/admin/users" },
    { label: "Conversations", value: counts.conversations, icon: MessagesSquare, href: "/admin/projects" },
  ];

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-semibold tracking-tight text-navy">
        Tableau de bord
      </h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="group">
            <Card className="transition-colors group-hover:border-rose/40">
              <CardBody className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-50 text-rose">
                  <s.icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs text-faint">{s.label}</p>
                  <p className="text-2xl font-bold text-navy">{s.value}</p>
                </div>
              </CardBody>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Projets</CardTitle>
          <Link
            href="/admin/projects"
            className="text-sm font-medium text-rose hover:underline"
          >
            Tout voir
          </Link>
        </CardHeader>
        <Table>
          <THead>
            <tr>
              <TH>Nom</TH>
              <TH>Slug</TH>
              <TH>Tier</TH>
              <TH>Statut</TH>
            </tr>
          </THead>
          <TBody>
            {projects.slice(0, 6).map((p) => (
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
              </TR>
            ))}
            {projects.length === 0 && (
              <TR>
                <TD colSpan={4} className="py-6 text-center text-faint">
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
