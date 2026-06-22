import { AccessModeForm } from "@/components/projects/AccessModeForm";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { getProjectRole } from "@/lib/projects/access";
import { requireProjectRole } from "@/lib/projects/access";
import { requireProject } from "@/lib/tenant/resolve";

export default async function ManageSettings() {
  const project = await requireProject();
  const { user } = await requireProjectRole(project.id, "admin");
  const role = await getProjectRole(user.id, project.id);
  const isOwner = role === "owner";

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-semibold tracking-tight text-navy">
        Réglages
      </h1>
      <Card>
        <CardHeader>
          <CardTitle>Confidentialité</CardTitle>
        </CardHeader>
        <CardBody>
          {isOwner ? (
            <AccessModeForm
              projectId={project.id}
              current={project.accessMode}
            />
          ) : (
            <p className="text-sm text-faint">
              Seul un owner du projet peut modifier le mode d&apos;accès. Mode
              actuel :{" "}
              <strong>
                {project.accessMode === "private" ? "privé" : "public"}
              </strong>
              .
            </p>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
