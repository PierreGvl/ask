"use client";

import { useState } from "react";
import { createApiKeyAction } from "@/app/(admin)/admin/actions";

/**
 * Création de clé API widget. Le secret renvoyé n'est affiché qu'UNE fois
 * (jamais restocké en clair). Appelle le server action et montre le résultat
 * inline, sans navigation (donc sans fuite dans l'URL/historique).
 */
export function ApiKeyCreator({ projectId }: { projectId: string }) {
  const [name, setName] = useState("");
  const [origins, setOrigins] = useState("");
  const [secret, setSecret] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      const { plaintext } = await createApiKeyAction(projectId, name, origins);
      setSecret(plaintext);
      setName("");
      setOrigins("");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-3">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-faint">Nom de la clé</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Site Prestashop"
          className="rounded-lg border border-line px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-faint">
          Origines autorisées (CORS, une par ligne ou séparées par virgule)
        </span>
        <textarea
          value={origins}
          onChange={(e) => setOrigins(e.target.value)}
          placeholder="https://shop.acme.com"
          rows={2}
          className="rounded-lg border border-line px-3 py-2 font-mono text-xs"
        />
      </label>
      <div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-pill bg-navy px-5 py-2 text-sm font-semibold text-white hover:bg-navy-700 disabled:opacity-50"
        >
          {pending ? "Génération…" : "Générer une clé"}
        </button>
      </div>

      {secret && (
        <div className="rounded-lg border border-rose/40 bg-rose-50 p-3 text-sm">
          <p className="mb-1 font-semibold text-rose">
            Copiez cette clé maintenant — elle ne sera plus affichée :
          </p>
          <code className="block break-all rounded bg-white px-2 py-1 font-mono text-xs">
            {secret}
          </code>
        </div>
      )}
    </form>
  );
}
