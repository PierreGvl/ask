import { toggleAdminAction } from "@/app/(admin)/admin/actions";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { TBody, TD, TH, THead, TR, Table } from "@/components/ui/Table";
import { listUsers } from "@/lib/admin/queries";

export default async function UsersPage() {
  const users = await listUsers();
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-semibold tracking-tight text-navy">
        Utilisateurs
      </h1>
      <Card>
        <Table>
          <THead>
            <tr>
              <TH>Email</TH>
              <TH>Nom</TH>
              <TH>Admin plateforme</TH>
              <TH>Inscrit le</TH>
              <TH />
            </tr>
          </THead>
          <TBody>
            {users.map((u) => (
              <TR key={u.id}>
                <TD className="font-medium text-navy-700">{u.email}</TD>
                <TD>{u.name ?? "—"}</TD>
                <TD>
                  {u.isPlatformAdmin ? (
                    <Badge variant="accent">admin</Badge>
                  ) : (
                    <Badge>—</Badge>
                  )}
                </TD>
                <TD className="text-xs text-faint">
                  {new Date(u.createdAt).toLocaleDateString("fr-FR")}
                </TD>
                <TD className="text-right">
                  <form action={toggleAdminAction} className="inline">
                    <input type="hidden" name="userId" value={u.id} />
                    <input
                      type="hidden"
                      name="value"
                      value={(!u.isPlatformAdmin).toString()}
                    />
                    <button
                      type="submit"
                      className="text-xs font-medium text-navy-700 hover:text-rose hover:underline"
                    >
                      {u.isPlatformAdmin ? "Retirer l'accès" : "Donner l'accès"}
                    </button>
                  </form>
                </TD>
              </TR>
            ))}
            {users.length === 0 && (
              <TR>
                <TD colSpan={5} className="py-6 text-center text-faint">
                  Aucun utilisateur.
                </TD>
              </TR>
            )}
          </TBody>
        </Table>
      </Card>
    </div>
  );
}
