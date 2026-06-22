import { MembersPanel } from "@/components/projects/MembersPanel";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { requireProjectRole } from "@/lib/projects/access";
import {
  listPendingInvitations,
  listProjectMembers,
} from "@/lib/projects/queries";
import { requireProject } from "@/lib/tenant/resolve";

export default async function ManageMembers() {
  const project = await requireProject();
  const { user } = await requireProjectRole(project.id, "admin");
  const [members, invitations] = await Promise.all([
    listProjectMembers(project.id),
    listPendingInvitations(project.id),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-semibold tracking-tight text-navy">
        Membres
      </h1>
      <Card>
        <CardHeader>
          <CardTitle>Membres & invitations</CardTitle>
        </CardHeader>
        <CardBody>
          <MembersPanel
            projectId={project.id}
            members={members}
            invitations={invitations}
            currentUserId={user.id}
          />
        </CardBody>
      </Card>
    </div>
  );
}
