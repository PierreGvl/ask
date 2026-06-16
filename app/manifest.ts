import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ask By la Wine Tech",
    short_name: "Ask",
    description:
      "Une IA Souveraine pour répondre à toutes les questions des vignerons.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#141934",
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
