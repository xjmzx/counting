import { useCallback, useEffect, useRef, useState } from "react";
import { Check, X, ArrowRight, RotateCcw } from "lucide-react";
import type { Item, Language } from "../../types.ts";
import { isCorrect, parseNumeral } from "../../grade.ts";
import { pickNext, solidCount } from "../../queue.ts";
import { useProgress } from "../lib/useProgress";
import { cn } from "../lib/cn";
import { Breakdown } from "./Breakdown";

type Verdict = { ok: boolean; item: Item; given: string };

export function Drill({
  lang,
  skill,
  max,
}: {
  lang: Language;
  skill: "read" | "write";
  max: number;
}) {
  const { stats, best, answer, reset } = useProgress(lang.code, skill);
  const [n, setN] = useState(() => pickNext(max, stats, null));
  const [input, setInput] = useState("");
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [score, setScore] = useState({ right: 0, total: 0 });
  const [streak, setStreak] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Language, skill and range are all in this component's key, so switching
  // any of them remounts and starts a clean session. No effect needed.

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
    const nextStreak = ok ? streak + 1 : 0;
    setVerdict({ ok, item, given: input });
    setScore((s) => ({ right: s.right + (ok ? 1 : 0), total: s.total + 1 }));
    setStreak(nextStreak);
    answer(n, ok, nextStreak);
  }, [input, skill, lang, n, item, streak, answer]);

  // Picks from the progress recorded so far: unseen numbers first, then the
  // ones you keep missing. See queue.ts for the ordering.
  const next = useCallback(() => {
    setN((prev) => pickNext(max, stats, prev));
    setInput("");
    setVerdict(null);
  }, [max, stats]);

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
        {best > 1 && <span title="Best streak, remembered">best {best}</span>}
        <span
          className="ml-auto"
          title="Numbers you have answered correctly and not missed since"
        >
          <span className="text-fg">{solidCount(stats, max)}</span>/{max + 1} solid
        </span>
        <button
          onClick={() => {
            reset();
            setScore({ right: 0, total: 0 });
            setStreak(0);
          }}
          title="Forget progress for this language and skill"
          className="p-1 rounded text-muted hover:text-fg hover:bg-fg/5 transition-colors"
        >
          <RotateCcw size={14} />
        </button>
      </div>
    </div>
  );
}
