import Link from "next/link";
import { Logo } from "@/components/ui/Logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-rose-50 px-4 py-10">
      <Link href="/" className="mb-8">
        <Logo size={64} />
      </Link>
      <div className="w-full max-w-sm rounded-2xl border border-line bg-white p-8 shadow-sm">
        {children}
      </div>
      <p className="mt-6 max-w-sm text-center text-xs text-faint">
        Une IA Souveraine pour répondre à toutes les questions des vignerons.
      </p>
    </div>
  );
}
