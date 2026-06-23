"use client";

import { type ReactNode, useState } from "react";

type Tab = { key: string; label: string; content: ReactNode };

/**
 * Onglets de la sous-page projet. Le contenu de chaque onglet est rendu côté
 * serveur (formulaires + server actions) et passé en slot ; ce composant ne fait
 * que basculer l'affichage.
 */
export function ProjectTabs({ tabs }: { tabs: Tab[] }) {
  const [active, setActive] = useState(tabs[0]?.key);
  const current = tabs.find((t) => t.key === active) ?? tabs[0];
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-1 border-b border-line">
        {tabs.map((t) => {
          const on = t.key === active;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setActive(t.key)}
              className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                on
                  ? "border-rose text-rose"
                  : "border-transparent text-faint hover:text-navy-700"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>
      <div>{current?.content}</div>
    </div>
  );
}
