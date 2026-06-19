import Link from "next/link";
import { overviewCounts } from "@/lib/admin/queries";

export default async function AdminDashboard() {
  const c = await overviewCounts();
  const cards = [
    { label: "Projets", value: c.projects, href: "/admin/projects" },
    { label: "Utilisateurs", value: c.users, href: "/admin/users" },
    { label: "Documents", value: c.documents, href: "/admin/projects" },
    { label: "Conversations", value: c.conversations, href: "/admin/projects" },
  ];
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-serif text-2xl font-semibold text-navy">
        Tableau de bord
      </h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="rounded-card border border-line bg-white p-5 transition-colors hover:border-rose/40"
          >
            <p className="text-sm text-faint">{card.label}</p>
            <p className="mt-1 text-3xl font-bold text-navy">{card.value}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
