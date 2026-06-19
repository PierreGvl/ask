import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import { CONSOLE_THEME, isConsoleHost } from "@/lib/console";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const consoleMode = await isConsoleHost();

  return (
    <div
      className="flex min-h-dvh flex-col items-center justify-center bg-rose-50 px-4 py-10"
      style={consoleMode ? CONSOLE_THEME : undefined}
    >
      {consoleMode ? (
        <div className="mb-8 flex items-center gap-2 text-xl font-bold tracking-tight text-navy">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose text-base font-bold text-white">
            A
          </span>
          Console
        </div>
      ) : (
        <Link href="/" className="mb-8">
          <Logo size={120} />
        </Link>
      )}
      <div className="w-full max-w-sm rounded-2xl border border-line bg-white p-8 shadow-sm">
        {children}
      </div>
    </div>
  );
}
