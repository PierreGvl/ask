/** Layout du widget embarqué : plein écran, sans barre latérale ni chrome. */
export default function EmbedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="h-screen bg-rose-50">{children}</div>;
}
