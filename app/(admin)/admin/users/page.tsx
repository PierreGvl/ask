import { toggleAdminAction } from "@/app/(admin)/admin/actions";
import { listUsers } from "@/lib/admin/queries";

export default async function UsersPage() {
  const users = await listUsers();
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-serif text-2xl font-semibold text-navy">
        Utilisateurs
      </h1>
      <div className="overflow-hidden rounded-card border border-line bg-white">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-left text-faint">
            <tr>
              <th className="px-4 py-2 font-medium">Email</th>
              <th className="px-4 py-2 font-medium">Nom</th>
              <th className="px-4 py-2 font-medium">Admin plateforme</th>
              <th className="px-4 py-2 font-medium">Inscrit le</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-line">
                <td className="px-4 py-2">{u.email}</td>
                <td className="px-4 py-2">{u.name ?? "—"}</td>
                <td className="px-4 py-2">
                  {u.isPlatformAdmin ? (
                    <span className="font-medium text-rose">oui</span>
                  ) : (
                    "non"
                  )}
                </td>
                <td className="px-4 py-2 text-xs text-faint">
                  {new Date(u.createdAt).toLocaleDateString("fr-FR")}
                </td>
                <td className="px-4 py-2 text-right">
                  <form action={toggleAdminAction} className="inline">
                    <input type="hidden" name="userId" value={u.id} />
                    <input
                      type="hidden"
                      name="value"
                      value={(!u.isPlatformAdmin).toString()}
                    />
                    <button
                      type="submit"
                      className="text-xs text-navy-700 hover:text-rose hover:underline"
                    >
                      {u.isPlatformAdmin ? "Retirer l'accès" : "Donner l'accès"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-faint">
                  Aucun utilisateur.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
