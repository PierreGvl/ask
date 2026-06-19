import { type NextRequest, NextResponse } from "next/server";

/**
 * Proxy (ex-middleware, Next 16). Pose des en-têtes de sécurité de base.
 *
 * Framing : l'application est NON-framable (anti-clickjacking), SAUF /embed et
 * /widget.js qui doivent l'être pour le widget. La restriction par site
 * autorisé (frame-ancestors = origines de la clé) reste un durcissement futur
 * (nécessite un lookup DB côté Node, impossible en Edge).
 *
 * NB : la résolution du tenant se fait côté Node via headers() (cf.
 * lib/tenant/resolve.ts), pas ici — on n'accède pas à la base en Edge.
 */
export function proxy(req: NextRequest) {
  const res = NextResponse.next();
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  const path = req.nextUrl.pathname;
  const embeddable = path.startsWith("/embed") || path === "/widget.js";
  if (embeddable) {
    // Embarquable partout (le contrôle d'accès réel = clé API + CORS).
    res.headers.set("Content-Security-Policy", "frame-ancestors *");
  } else {
    res.headers.set("X-Frame-Options", "DENY");
    res.headers.set("Content-Security-Policy", "frame-ancestors 'none'");
  }
  return res;
}

export const config = {
  // S'applique à tout sauf les assets internes Next et fichiers statiques.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
