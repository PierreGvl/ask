import { Logo } from "@/components/ui/Logo";
import { GREETING, SUGGESTIONS } from "@/lib/llm/prompts";

export function Greeting({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center px-4 text-center">
      <Logo size={72} />
      <h1 className="mt-6 font-serif text-3xl font-semibold text-navy">
        Bonjour&nbsp;!
      </h1>
      <p className="mt-3 max-w-xl text-[0.975rem] leading-relaxed text-muted">
        {GREETING}
      </p>
      <div className="mt-8 grid w-full gap-2.5 sm:grid-cols-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onPick(s)}
            className="rounded-xl border border-line bg-white px-4 py-3 text-left text-sm text-ink transition-colors hover:border-rose/40 hover:bg-rose-50"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
