import Link from "next/link";
import { createProjectAction } from "@/app/(admin)/admin/actions";
import { listProjects } from "@/lib/admin/queries";

export default async function ProjectsPage() {
  const projects = await listProjects();
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-serif text-2xl font-semibold text-navy">Projets</h1>

      <div className="overflow-hidden rounded-card border border-line bg-white">
        <table className="w-full text-sm">
          <thead className="bg-surface-2 text-left text-faint">
            <tr>
              <th className="px-4 py-2 font-medium">Nom</th>
              <th className="px-4 py-2 font-medium">Slug</th>
              <th className="px-4 py-2 font-medium">Tier</th>
              <th className="px-4 py-2 font-medium">Statut</th>
              <th className="px-4 py-2 font-medium">Domaine custom</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => (
              <tr key={p.id} className="border-t border-line hover:bg-surface-2">
                <td className="px-4 py-2">
                  <Link
                    href={`/admin/projects/${p.id}`}
                    className="font-medium text-navy-700 hover:text-rose hover:underline"
                  >
                    {p.name}
                  </Link>
                </td>
                <td className="px-4 py-2 font-mono text-xs">{p.slug}</td>
                <td className="px-4 py-2">{p.tier}</td>
                <td className="px-4 py-2">{p.status}</td>
                <td className="px-4 py-2 text-faint">
                  {p.customDomain ?? "—"}
                </td>
              </tr>
            ))}
            {projects.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-faint">
                  Aucun projet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="rounded-card border border-line bg-white p-5">
        <h2 className="mb-3 font-semibold text-navy">Nouveau projet</h2>
        <form
          action={createProjectAction}
          className="grid gap-3 sm:grid-cols-2"
        >
          <Field name="name" label="Nom" placeholder="HervAI" required />
          <Field name="slug" label="Slug" placeholder="hervai" required />
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-faint">Tier</span>
            <select
              name="tier"
              className="rounded-lg border border-line px-3 py-2"
            >
              <option value="free">free</option>
              <option value="pro">pro</option>
              <option value="domaine">domaine</option>
            </select>
          </label>
          <Field
            name="customDomain"
            label="Domaine personnalisé (optionnel)"
            placeholder="ask.hervai.fr"
          />
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="rounded-pill bg-rose px-5 py-2 text-sm font-semibold text-white hover:bg-rose-600"
            >
              Créer le projet
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  name,
  label,
  placeholder,
  required,
}: {
  name: string;
  label: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-faint">{label}</span>
      <input
        name={name}
        placeholder={placeholder}
        required={required}
        className="rounded-lg border border-line px-3 py-2"
      />
    </label>
  );
}
