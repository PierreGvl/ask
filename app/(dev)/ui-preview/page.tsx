import { FileText, FolderKanban, MessagesSquare, Users } from "lucide-react";
import { notFound } from "next/navigation";
import { AdminNav } from "@/components/admin/AdminNav";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { TBody, TD, TH, THead, TR, Table } from "@/components/ui/Table";
import { Textarea } from "@/components/ui/Textarea";
import { CONSOLE_THEME } from "@/lib/console";

// Page de prévisualisation des primitives + look console. DEV uniquement.
export default function UiPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();

  const stats = [
    { label: "Projets", value: 3, icon: FolderKanban },
    { label: "Utilisateurs", value: 12, icon: Users },
    { label: "Documents", value: 873, icon: FileText },
    { label: "Conversations", value: 41, icon: MessagesSquare },
  ];
  const projects = [
    { name: "Ask by La Wine Tech", slug: "winetech", tier: "free", status: "active" },
    { name: "HervAI", slug: "hervai", tier: "domaine", status: "active" },
    { name: "Imprimerie Acme", slug: "acme", tier: "pro", status: "suspended" },
  ];

  return (
    <div
      className="flex min-h-screen flex-col bg-surface-2 text-ink md:flex-row"
      style={CONSOLE_THEME}
    >
      <AdminNav />
      <main className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight text-navy">
            Vue d&apos;ensemble
          </h1>
          <p className="text-sm text-faint">Aperçu des primitives — console</p>
        </header>

        {/* Stat cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <Card key={s.label}>
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
          ))}
        </div>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>Projets</CardTitle>
            <Button size="sm">+ Nouveau projet</Button>
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
              {projects.map((p) => (
                <TR key={p.slug}>
                  <TD className="font-medium text-navy-700">{p.name}</TD>
                  <TD className="font-mono text-xs text-faint">{p.slug}</TD>
                  <TD>
                    <Badge variant={p.tier === "domaine" ? "accent" : "neutral"}>
                      {p.tier}
                    </Badge>
                  </TD>
                  <TD>
                    <Badge
                      variant={p.status === "active" ? "success" : "warning"}
                    >
                      {p.status}
                    </Badge>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </Card>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>Nouveau projet</CardTitle>
          </CardHeader>
          <CardBody className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-faint">Nom</span>
              <Input placeholder="HervAI" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-faint">Tier</span>
              <Select defaultValue="free">
                <option value="free">free</option>
                <option value="pro">pro</option>
                <option value="domaine">domaine</option>
              </Select>
            </label>
            <label className="flex flex-col gap-1 text-sm sm:col-span-2">
              <span className="text-faint">Prompt système</span>
              <Textarea rows={3} placeholder="Persona métier…" />
            </label>
            <div className="sm:col-span-2 flex gap-2">
              <Button>Enregistrer</Button>
              <Button variant="outline">Annuler</Button>
            </div>
          </CardBody>
        </Card>

        {/* Badges */}
        <Card>
          <CardHeader>
            <CardTitle>Badges</CardTitle>
          </CardHeader>
          <CardBody className="flex flex-wrap gap-2">
            <Badge>neutral</Badge>
            <Badge variant="accent">accent</Badge>
            <Badge variant="success">success</Badge>
            <Badge variant="warning">warning</Badge>
            <Badge variant="danger">danger</Badge>
          </CardBody>
        </Card>
      </main>
    </div>
  );
}
