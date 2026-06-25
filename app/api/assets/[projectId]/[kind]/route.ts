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
      "Cache-Control": "public, max-age=31536000, immutable",
      "Last-Modified": asset.updatedAt.toUTCString(),
    },
  });
}
