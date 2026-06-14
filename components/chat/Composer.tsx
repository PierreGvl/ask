"use client";

import { ArrowUp, Square } from "lucide-react";
import {
  type FormEvent,
  type KeyboardEvent,
  useRef,
  useState,
} from "react";

export function Composer({
  onSend,
  onStop,
  busy,
}: {
  onSend: (text: string) => void;
  onStop: () => void;
  busy: boolean;
}) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  function submit() {
    const text = value.trim();
    if (!text || busy) return;
    onSend(text);
    setValue("");
    if (ref.current) ref.current.style.height = "auto";
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    submit();
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  function autosize(el: HTMLTextAreaElement) {
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto w-full max-w-3xl">
      <div className="flex items-end gap-2 rounded-3xl border border-line bg-white p-2 shadow-sm focus-within:border-rose/50">
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            autosize(e.target);
          }}
          onKeyDown={onKeyDown}
          rows={1}
          placeholder="Posez votre question sur le vin…"
          className="max-h-[200px] flex-1 resize-none bg-transparent px-3 py-2 text-[0.95rem] text-ink placeholder:text-faint focus:outline-none"
        />
        {busy ? (
          <button
            type="button"
            onClick={onStop}
            aria-label="Arrêter"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy text-white hover:bg-navy-700"
          >
            <Square className="h-4 w-4" fill="currentColor" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!value.trim()}
            aria-label="Envoyer"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose text-white transition-colors hover:bg-rose-600 disabled:opacity-40"
          >
            <ArrowUp className="h-5 w-5" />
          </button>
        )}
      </div>
      <p className="mt-2 text-center text-xs text-faint">
        Ask By la Wine Tech peut faire des erreurs. Vérifiez les informations
        réglementaires importantes.
      </p>
    </form>
  );
}
