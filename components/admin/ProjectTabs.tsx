import Link from "next/link";

/**
 * Barre d'onglets de la sous-page projet, pilotée par l'URL (`?tab=`). Composant
 * SERVEUR (simples liens) : le contenu de l'onglet actif est rendu côté serveur
 * par la page — les formulaires (server actions) ne traversent PAS de frontière
 * client, donc le dispatch JS fonctionne.
 */
export function ProjectTabs({
  basePath,
  active,
  tabs,
}: {
  basePath: string;
  active: string;
  tabs: { key: string; label: string }[];
}) {
  return (
    <div className="flex flex-wrap gap-1 border-b border-line">
      {tabs.map((t) => {
        const on = t.key === active;
        return (
          <Link
            key={t.key}
            href={`${basePath}?tab=${t.key}`}
            scroll={false}
            className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              on
                ? "border-rose text-rose"
                : "border-transparent text-faint hover:text-navy-700"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
