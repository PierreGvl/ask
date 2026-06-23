import { z } from "zod";
import { auth } from "@/auth";
import { resolveUserFeatures } from "@/lib/features/tiers";
import { buildDeclarationPdf } from "@/lib/pdf/declaration";
import { resolveProject } from "@/lib/tenant/resolve";

export const runtime = "nodejs";

const schema = z.object({
  title: z.string().min(1).max(200),
  subtitle: z.string().max(300).optional(),
  fields: z
    .array(z.object({ label: z.string().max(120), value: z.string().max(5000) }))
    .max(100),
  footer: z.string().max(300).optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Non authentifié", { status: 401 });
  }
  const project = await resolveProject();
  if (!project || project.status !== "active") {
    return new Response("Projet introuvable", { status: 404 });
  }
  // Génération de documents = fonctionnalité du palier de l'utilisateur.
  const features = await resolveUserFeatures(session.user.id, project.id);
  if (!features.pdfGeneration) {
    return new Response("Fonctionnalité non incluse dans votre palier", {
      status: 403,
    });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return new Response("Requête invalide", { status: 400 });
  }

  const pdf = await buildDeclarationPdf(parsed.data);
  const filename = `${parsed.data.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.pdf`;
  return new Response(pdf as BlobPart, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
