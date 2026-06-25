import { getProjectAsset } from "@/lib/admin/queries";

export const runtime = "nodejs";

/**
 * Sert un asset binaire d'un projet (logo…) stocké en base.
 * Public : un logo est une donnée de marque. theme.logoUrl ajoute un `?v=`
 * (mtime) qui change à chaque téléversement → cache long sans cache-bust manuel.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ projectId: string; kind: string }> },
) {
  const { projectId, kind } = await params;
  const asset = await getProjectAsset(projectId, kind);
  if (!asset) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(asset.bytes), {
    headers: {
      "Content-Type": asset.mime,
      // Revalidation courte (le `?v=` busté à chaque upload évite le stale) :
      // pas d'`immutable` pour ne jamais figer une réponse erronée côté client.
      "Cache-Control": "public, max-age=60, must-revalidate",
      "Last-Modified": asset.updatedAt.toUTCString(),
    },
  });
}
