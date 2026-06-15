import Image from "next/image";
import { GREETING } from "@/lib/llm/prompts";

export function Greeting() {
  return (
    <div className="flex w-full max-w-3xl flex-col items-center gap-4 text-center">
      <div className="flex items-center justify-center gap-3">
        <Image
          src="/logo.png"
          alt="Ask By la Wine Tech"
          width={120}
          height={120}
          priority
          className="object-contain"
        />
        <h1 className="font-serif text-4xl font-semibold text-navy sm:text-5xl md:text-6xl">
          Bonjour&nbsp;!
        </h1>
      </div>
      <p className="text-[0.95rem] leading-relaxed text-muted">{GREETING}</p>
    </div>
  );
}
