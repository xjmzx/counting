import { useCallback, useEffect, useRef, useState } from "react";
import { Check, X, ArrowRight } from "lucide-react";
import type { Item, Language } from "../../types.ts";
import { isCorrect, parseNumeral } from "../../grade.ts";
import { cn } from "../lib/cn";
import { Breakdown } from "./Breakdown";

type Verdict = { ok: boolean; item: Item; given: string };

function pick(max: number, avoid: number | null): number {
  // One retry is enough to avoid an immediate repeat without ever looping on
  // a range so small that a repeat is unavoidable.
  const n = Math.floor(Math.random() * (max + 1));
  return n === avoid && max > 0 ? Math.floor(Math.random() * (max + 1)) : n;
}

export function Drill({
  lang,
  skill,
  max,
}: {
  lang: Language;
  skill: "read" | "write";
  max: number;
}) {
  const [n, setN] = useState(() => pick(max, null));
  const [input, setInput] = useState("");
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [score, setScore] = useState({ right: 0, total: 0 });
  const [streak, setStreak] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Changing language, skill or range starts a clean session.
  useEffect(() => {
    setN(pick(max, null));
    setInput("");
    setVerdict(null);
    setScore({ right: 0, total: 0 });
    setStreak(0);
  }, [lang.code, skill, max]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [n, verdict]);

  const item = lang.compose(n);

  const submit = useCallback(() => {
    if (input.trim() === "") return;
    const ok =
      skill === "write"
        ? isCorrect(lang, n, input)
        : parseNumeral(input) === n;
    setVerdict({ ok, item, given: input });
    setScore((s) => ({ right: s.right + (ok ? 1 : 0), total: s.total + 1 }));
    setStreak((s) => (ok ? s + 1 : 0));
  }, [input, skill, lang, n, item]);

  const next = useCallback(() => {
    setN((prev) => pick(max, prev));
    setInput("");
    setVerdict(null);
  }, [max]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    if (verdict) next();
    else submit();
  };

  const readingHint =
    skill === "write" && lang.code === "zh" ? "characters or pinyin — tones optional" : null;

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-panel p-6 sm:p-8 space-y-6">
        {/* prompt */}
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wider text-muted">
            {skill === "read" ? `Read the ${lang.name} — what number is it?` : `Write it in ${lang.name}`}
          </p>
          <p
            className={cn(
              "font-bold tracking-tight text-fg break-words",
              skill === "read" ? "text-4xl sm:text-5xl" : "text-6xl sm:text-7xl tabular-nums",
            )}
          >
            {skill === "read" ? item.form : n}
          </p>
        </div>

        {/* answer */}
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            readOnly={verdict !== null}
            inputMode={skill === "read" ? "numeric" : "text"}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            placeholder={skill === "read" ? "0–100" : "type the word"}
            aria-label="Your answer"
            className={cn(
              "flex-1 min-w-0 px-4 py-3 rounded-md bg-surface text-fg placeholder:text-muted",
              "outline-none ring-1 ring-transparent focus:ring-accent/60 transition",
              verdict?.ok === true && "ring-ok/70",
              verdict?.ok === false && "ring-alert/70",
            )}
          />
          <button
            onClick={verdict ? next : submit}
            disabled={!verdict && input.trim() === ""}
            className={cn(
              "flex items-center justify-center gap-1.5 px-4 py-3 rounded-md text-sm font-medium",
              "text-bg bg-accent hover:bg-accent/90 disabled:opacity-40 transition-colors",
            )}
          >
            {verdict ? (
              <>
                Next <ArrowRight size={16} />
              </>
            ) : (
              "Check"
            )}
          </button>
        </div>

        {readingHint && !verdict && <p className="text-xs text-muted">{readingHint}</p>}

        {/* feedback */}
        {verdict && (
          <div className="space-y-3 pt-1">
            <div
              className={cn(
                "flex items-center gap-2 font-medium",
                verdict.ok ? "text-ok" : "text-alert",
              )}
            >
              {verdict.ok ? <Check size={18} /> : <X size={18} />}
              {verdict.ok ? "Correct" : `Not quite — you wrote “${verdict.given.trim()}”`}
            </div>

            {!verdict.ok && (
              <p className="text-lg">
                <span className="tabular-nums text-muted">{n}</span>
                <span className="text-muted mx-2">is</span>
                <span className="text-fg font-medium">{verdict.item.form}</span>
              </p>
            )}

            {verdict.item.reading && (
              <p className="text-sm text-muted">{verdict.item.reading}</p>
            )}

            <Breakdown lang={lang} item={verdict.item} />

            {verdict.item.note && (
              <p className="text-sm text-warn/90 leading-relaxed max-w-prose">
                {verdict.item.note}
              </p>
            )}
          </div>
        )}
      </div>

      {/* score */}
      <div className="flex items-center gap-4 text-sm text-muted font-mono tabular-nums px-1">
        <span>
          <span className="text-fg">{score.right}</span>/{score.total}
        </span>
        {streak > 1 && <span className="text-accent">streak {streak}</span>}
        <span className="ml-auto">{lang.atoms.length} atoms · 0–{max}</span>
      </div>
    </div>
  );
}
