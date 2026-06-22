import {
  createPlatformAdminAction,
  deletePlatformAdminAction,
  resetPlatformAdminPasswordAction,
} from "@/app/(admin)/admin/actions";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { TBody, TD, TH, THead, TR, Table } from "@/components/ui/Table";
import { listPlatformAdmins } from "@/lib/admin/platform-admins";

export default async function PlatformAdminsPage() {
  const admins = await listPlatformAdmins();
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-semibold tracking-tight text-navy">
        Admins console
      </h1>
      <p className="text-sm text-faint">
        Identités du staff (séparées des comptes des tenants). Elles pilotent
        toute la plateforme.
      </p>

      <Card>
        <Table>
          <THead>
            <tr>
              <TH>Email</TH>
              <TH>Nom</TH>
              <TH>Créé le</TH>
              <TH>Mot de passe</TH>
              <TH />
            </tr>
          </THead>
          <TBody>
            {admins.map((a) => (
              <TR key={a.id}>
                <TD className="font-medium text-navy-700">{a.email}</TD>
                <TD>{a.name ?? "—"}</TD>
                <TD className="text-xs text-faint">
                  {new Date(a.createdAt).toLocaleDateString("fr-FR")}
                </TD>
                <TD>
                  <form
                    action={resetPlatformAdminPasswordAction}
                    className="flex items-center gap-2"
                  >
                    <input type="hidden" name="id" value={a.id} />
                    <Input
                      name="password"
                      type="password"
                      minLength={12}
                      placeholder="Nouveau mot de passe"
                      className="h-8 w-44 text-xs"
                    />
                    <button
                      type="submit"
                      className="text-xs font-medium text-navy-700 hover:text-rose hover:underline"
                    >
                      Réinitialiser
                    </button>
                  </form>
                </TD>
                <TD className="text-right">
                  <form action={deletePlatformAdminAction} className="inline">
                    <input type="hidden" name="id" value={a.id} />
                    <button
                      type="submit"
                      className="text-xs text-faint hover:text-rose"
                    >
                      Supprimer
                    </button>
                  </form>
                </TD>
              </TR>
            ))}
            {admins.length === 0 && (
              <TR>
                <TD colSpan={5} className="py-6 text-center text-faint">
                  Aucun admin console.
                </TD>
              </TR>
            )}
          </TBody>
        </Table>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Nouvel admin console</CardTitle>
        </CardHeader>
        <CardBody>
          <form
            action={createPlatformAdminAction}
            className="grid gap-3 sm:grid-cols-3"
          >
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-faint">Email</span>
              <Input name="email" type="email" required />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-faint">Nom (optionnel)</span>
              <Input name="name" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-faint">Mot de passe (≥ 12)</span>
              <Input name="password" type="password" minLength={12} required />
            </label>
            <div className="sm:col-span-3">
              <Button type="submit">Créer l&apos;admin</Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
