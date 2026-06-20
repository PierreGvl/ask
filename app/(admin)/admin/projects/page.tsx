import Link from "next/link";
import { createProjectAction } from "@/app/(admin)/admin/actions";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { TBody, TD, TH, THead, TR, Table } from "@/components/ui/Table";
import { listProjects } from "@/lib/admin/queries";

const TIER_BADGE = { free: "neutral", pro: "accent", domaine: "accent" } as const;

export default async function ProjectsPage() {
  const projects = await listProjects();
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-semibold tracking-tight text-navy">Projets</h1>

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

      <Card>
        <CardHeader>
          <CardTitle>Nouveau projet</CardTitle>
        </CardHeader>
        <CardBody>
          <form
            action={createProjectAction}
            className="grid gap-3 sm:grid-cols-2"
          >
            <Field name="name" label="Nom" placeholder="HervAI" required />
            <Field name="slug" label="Slug" placeholder="hervai" required />
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-faint">Tier</span>
              <Select name="tier" defaultValue="free">
                <option value="free">free</option>
                <option value="pro">pro</option>
                <option value="domaine">domaine</option>
              </Select>
            </label>
            <Field
              name="customDomain"
              label="Domaine personnalisé (optionnel)"
              placeholder="ask.hervai.fr"
            />
            <div className="sm:col-span-2">
              <Button type="submit">Créer le projet</Button>
            </div>
          </form>
        </CardBody>
      </Card>
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
      <Input name={name} placeholder={placeholder} required={required} />
    </label>
  );
}
