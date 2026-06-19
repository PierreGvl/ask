/** Types partagés (client/serveur) pour la génération de documents. */
export type DeclarationField = { label: string; value: string };

export type DeclarationData = {
  title: string;
  subtitle?: string;
  fields: DeclarationField[];
  footer?: string;
};
