import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond } from "next/font/google";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Ask By la Wine Tech",
  description:
    "Une IA Souveraine pour répondre à toutes les questions des vignerons.",
  applicationName: "Ask By la Wine Tech",
  appleWebApp: {
    capable: true,
    title: "Ask",
    statusBarStyle: "default",
  },
  other: {
    // Compatibilité iOS plus anciens (mode plein écran depuis l'écran d'accueil)
    "apple-mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#141934",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${cormorant.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
