import Link from "next/link";
import { projectStats } from "@/lib/admin/queries";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { requireProject } from "@/lib/tenant/resolve";

export default async function ManageOverview() {
  const project = await requireProject();
  const stats = await projectStats(project.id);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-navy">
          {project.name}
        </h1>
        <Badge
          variant={project.accessMode === "private" ? "accent" : "neutral"}
        >
          {project.accessMode === "private" ? "privé" : "public"}
        </Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Base de connaissances</CardTitle>
          </CardHeader>
          <CardBody className="text-sm text-faint">
            {stats.documents} documents · {stats.chunks} extraits indexés
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Accès</CardTitle>
          </CardHeader>
          <CardBody className="flex flex-col gap-2 text-sm text-faint">
            <span>
              {project.accessMode === "private"
                ? "Chat réservé aux membres invités."
                : "Chat ouvert à tous les visiteurs."}
            </span>
            <div className="flex gap-3">
              <Link href="/manage/members" className="text-rose hover:underline">
                Gérer les membres
              </Link>
              <Link href="/manage/settings" className="text-rose hover:underline">
                Réglages
              </Link>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
