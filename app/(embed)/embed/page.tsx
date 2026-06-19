import { EmbedChat } from "@/components/chat/EmbedChat";

export default async function EmbedPage({
  searchParams,
}: {
  searchParams: Promise<{ key?: string }>;
}) {
  const { key } = await searchParams;
  if (!key) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted">
        Clé API manquante. Ajoutez <code>?key=ask_pk_…</code> à l&apos;URL du
        widget.
      </div>
    );
  }
  return <EmbedChat apiKey={key} />;
}
