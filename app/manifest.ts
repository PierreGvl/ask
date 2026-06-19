import type { MetadataRoute } from "next";
import { getBranding } from "@/lib/tenant/branding";
import { resolveProject } from "@/lib/tenant/resolve";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const project = await resolveProject();
  const { name, description } = getBranding(project);
  return {
    name,
    short_name: "Ask",
    description,
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: project?.theme?.colors?.navy ?? "#141934",
    lang: "fr",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
