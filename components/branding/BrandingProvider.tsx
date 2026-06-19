"use client";

import { createContext, useContext } from "react";
import { type Branding, DEFAULT_BRANDING } from "@/lib/tenant/branding";

const BrandingContext = createContext<Branding>(DEFAULT_BRANDING);

/** Fournit le branding du tenant à l'arbre client. Alimenté côté serveur. */
export function BrandingProvider({
  value,
  children,
}: {
  value: Branding;
  children: React.ReactNode;
}) {
  return (
    <BrandingContext.Provider value={value}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding(): Branding {
  return useContext(BrandingContext);
}
