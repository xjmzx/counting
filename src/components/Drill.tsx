import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, X, ArrowRight, RotateCcw, Volume2, Rabbit, Turtle, ChevronRight } from "lucide-react";
import type { Item, Language } from "../../types.ts";
import { isCorrect, parseNumeral } from "../../grade.ts";
import { pickNext, solidCount } from "../../queue.ts";
import { voicesFor, type Voice } from "../../voices.ts";
import { hintsFor } from "../../sounds.ts";
import { speak, stopSpeaking } from "../lib/tauri";
import { useProgress } from "../lib/useProgress";
import { cn } from "../lib/cn";
import { Breakdown } from "./Breakdown";

type Verdict = { ok: boolean; item: Item; given: string };

export type DrillSkill = "read" | "write" | "listen";

const RATE_NORMAL = 175;
const RATE_SLOW = 110;

/** Listening and reading both answer with the numeral; writing types the word. */
const answersWithNumeral = (skill: DrillSkill) => skill !== "write";

export function Drill({
  lang,
  skill,
  max,
  voices,
}: {
  lang: Language;
  skill: DrillSkill;
  max: number;
  voices: Voice[];
}) {
  const { stats, best, answer, reset } = useProgress(lang.code, skill);
  const [n, setN] = useState(() => pickNext(max, stats, null));
  const [input, setInput] = useState("");
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [score, setScore] = useState({ right: 0, total: 0 });
  const [streak, setStreak] = useState(0);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const item = lang.compose(n);
  const langVoices = useMemo(() => voicesFor(lang.code, voices), [lang.code, voices]);

  const [voiceName, setVoiceName] = useState<string>(() => {
    try {
      return localStorage.getItem(`counting.voice.${lang.code}`) ?? "";
    } catch {
      return "";
    }
  });

  // Voices arrive asynchronously, and a remembered choice may no longer be
  // installed, so fall back to the best available rather than staying silent.
  useEffect(() => {
    if (voiceName && langVoices.some((v) => v.name === voiceName)) return;
    const fallback = langVoices[0]?.name;
    if (fallback) setVoiceName(fallback);
  }, [langVoices, voiceName]);

  useEffect(() => {
    if (!voiceName) return;
    try {
      localStorage.setItem(`counting.voice.${lang.code}`, voiceName);
    } catch {
      // Not remembering the voice is survivable.
    }
  }, [lang.code, voiceName]);

  const [showHints, setShowHints] = useState<boolean>(() => {
    try {
      return localStorage.getItem(`counting.hints.${lang.code}`) === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(`counting.hints.${lang.code}`, showHints ? "1" : "0");
    } catch {
      // Not remembering the preference is survivable.
    }
  }, [lang.code, showHints]);

  const say = useCallback(
    (rate: number) => {
      if (skill !== "listen" || !voiceName) return;
      void speak(voiceName, item.form, rate).then(setSpeechError);
    },
    [skill, voiceName, item.form],
  );

  // Speak each new number once, as it comes up.
  useEffect(() => {
    say(RATE_NORMAL);
  }, [say]);

  // Never leave a voice talking into an empty room.
  useEffect(() => () => void stopSpeaking(), []);

  useEffect(() => {
    inputRef.current?.focus();
  }, [n, verdict]);

  const submit = useCallback(() => {
    if (input.trim() === "") return;
    const ok = answersWithNumeral(skill) ? parseNumeral(input) === n : isCorrect(lang, n, input);
    const nextStreak = ok ? streak + 1 : 0;
    setVerdict({ ok, item, given: input });
    setScore((s) => ({ right: s.right + (ok ? 1 : 0), total: s.total + 1 }));
    setStreak(nextStreak);
    answer(n, ok, nextStreak);
  }, [input, skill, lang, n, item, streak, answer]);

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

  const noVoice = skill === "listen" && langVoices.length === 0;
  const hints = verdict ? hintsFor(lang.code, verdict.item.form) : [];

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-panel p-6 sm:p-8 space-y-6">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-wider text-muted">
            {skill === "read"
              ? `Read the ${lang.name} — what number is it?`
              : skill === "listen"
                ? `Listen — what number is it?`
                : `Write it in ${lang.name}`}
          </p>

          {skill === "listen" ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => say(RATE_NORMAL)}
                disabled={noVoice}
                title="Play again"
                aria-label="Play again"
                className={cn(
                  "flex items-center gap-2 px-5 py-4 rounded-md text-bg bg-accent",
                  "hover:bg-accent/90 disabled:opacity-40 transition-colors",
                )}
              >
                <Volume2 size={24} />
                <Rabbit size={16} className="opacity-70" />
              </button>
              <button
                onClick={() => say(RATE_SLOW)}
                disabled={noVoice}
                title="Play slowly"
                aria-label="Play slowly"
                className={cn(
                  "flex items-center gap-2 px-4 py-4 rounded-md text-fg bg-surface",
                  "hover:bg-surfaceHover disabled:opacity-40 transition-colors",
                )}
              >
                <Volume2 size={20} />
                <Turtle size={16} className="opacity-70" />
              </button>
            </div>
          ) : (
            <p
              className={cn(
                "font-bold tracking-tight text-fg break-words",
                skill === "read" ? "text-4xl sm:text-5xl" : "text-6xl sm:text-7xl tabular-nums",
              )}
            >
              {skill === "read" ? item.form : n}
            </p>
          )}
        </div>

        {noVoice && (
          <p className="text-sm text-warn/90 leading-relaxed max-w-prose">
            No {lang.name} voice is installed. Add one in System Settings →
            Accessibility → Spoken Content → System Voice → Manage Voices.
          </p>
        )}
        {speechError && !noVoice && (
          <p className="text-sm text-alert/90 leading-relaxed max-w-prose">{speechError}</p>
        )}

        <div className="flex flex-col sm:flex-row gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            readOnly={verdict !== null}
            inputMode={answersWithNumeral(skill) ? "numeric" : "text"}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            placeholder={answersWithNumeral(skill) ? `0–${max}` : "type the word"}
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

        {skill === "write" && lang.code === "zh" && !verdict && (
          <p className="text-xs text-muted">characters or pinyin — tones optional</p>
        )}

        {skill === "listen" && langVoices.length > 1 && (
          <label className="flex items-center gap-2 text-xs text-muted">
            Voice
            <select
              value={voiceName}
              onChange={(e) => setVoiceName(e.target.value)}
              className="bg-surface text-fg rounded px-2 py-1 outline-none max-w-[16rem]"
            >
              {langVoices.map((v) => (
                <option key={v.name} value={v.name}>
                  {v.name} · {v.locale}
                </option>
              ))}
            </select>
          </label>
        )}

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

            {/* Listening always reveals the spelling: hearing it right and
                being able to read it are different things. */}
            {(!verdict.ok || skill === "listen") && (
              <p className="text-lg">
                <span className="tabular-nums text-muted">{n}</span>
                <span className="text-muted mx-2">is</span>
                <span className="text-fg font-medium">{verdict.item.form}</span>
              </p>
            )}

            {verdict.item.reading && <p className="text-sm text-muted">{verdict.item.reading}</p>}

            <Breakdown lang={lang} item={verdict.item} />

            {verdict.item.note && (
              <p className="text-sm text-warn/90 leading-relaxed max-w-prose">
                {verdict.item.note}
              </p>
            )}

            {/* Why it does not sound like it looks. Collapsed by default so it
                does not crowd the answer, but the choice is remembered: a
                learner who needs these should not reopen them every question.
                Focus goes back to the input so Enter still moves on. */}
            {hints.length > 0 && (
              <div className="space-y-2 pt-1">
                <button
                  onClick={() => {
                    setShowHints((v) => !v);
                    inputRef.current?.focus();
                  }}
                  aria-expanded={showHints}
                  aria-controls="sound-hints"
                  className={cn(
                    "flex items-center gap-1 text-sm text-digital/90",
                    "hover:text-digital transition-colors",
                  )}
                >
                  <ChevronRight
                    size={14}
                    className={cn("transition-transform", showHints && "rotate-90")}
                  />
                  How it sounds
                  {!showHints && <span className="text-muted ml-1">({hints.length})</span>}
                </button>
                {showHints && (
                  <div id="sound-hints" className="space-y-2">
                    {hints.map((h) => (
                      <p
                        key={h.id}
                        className="text-sm text-digital/90 leading-relaxed max-w-prose flex gap-2"
                      >
                        <Volume2 size={14} className="shrink-0 mt-1 opacity-70" />
                        <span>{h.hint}</span>
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-4 text-sm text-muted font-mono tabular-nums px-1">
        <span>
          <span className="text-fg">{score.right}</span>/{score.total}
        </span>
        {streak > 1 && <span className="text-accent">streak {streak}</span>}
        {best > 1 && <span title="Best streak, remembered">best {best}</span>}
        <span className="ml-auto" title="Numbers you have answered correctly and not missed since">
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
