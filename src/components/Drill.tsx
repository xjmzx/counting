import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, X, ArrowRight, RotateCcw, Volume2, Rabbit, Turtle } from "lucide-react";
import type { Item, Language } from "../../types.ts";
import { isCorrect, parseNumeral } from "../../grade.ts";
import { pickNext, solidCount } from "../../queue.ts";
import { voicesFor, voiceId, type Voice } from "../../voices.ts";
import { hintsFor, scriptHintsFor } from "../../sounds.ts";
import { speak, stopSpeaking, speechInfo, type SpeechInfo, type Spoken } from "../lib/tauri";
import { useProgress } from "../lib/useProgress";
import { cn } from "../lib/cn";
import { Breakdown } from "./Breakdown";
import { HintDisclosure } from "./HintDisclosure";

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
  // Which source was last heard. Shown so a synthesised reading never passes
  // for a recorded one, and so a missing clip reads as ordinary rather than
  // as a fault — sparse coverage is the normal case and will be for years.
  const [spoken, setSpoken] = useState<Spoken | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const item = lang.compose(n);
  const langVoices = useMemo(() => voicesFor(lang.code, voices), [lang.code, voices]);

  // The backend's id is stored, not the display name — on speech-dispatcher
  // they differ, and the id is what `speak` needs back.
  const [voice, setVoice] = useState<string>(() => {
    try {
      return localStorage.getItem(`counting.voice.${lang.code}`) ?? "";
    } catch {
      return "";
    }
  });

  const [speech, setSpeech] = useState<SpeechInfo | null>(null);
  useEffect(() => {
    void speechInfo().then(setSpeech);
  }, []);

  // Voices arrive asynchronously, and a remembered choice may no longer be
  // installed, so fall back to the best available rather than staying silent.
  useEffect(() => {
    if (voice && langVoices.some((v) => voiceId(v) === voice)) return;
    const fallback = langVoices[0];
    if (fallback) setVoice(voiceId(fallback));
  }, [langVoices, voice]);

  useEffect(() => {
    if (!voice) return;
    try {
      localStorage.setItem(`counting.voice.${lang.code}`, voice);
    } catch {
      // Not remembering the voice is survivable.
    }
  }, [lang.code, voice]);

  const say = useCallback(
    (rate: number) => {
      if (!voice) return;
      void speak(voice, item.form, rate, lang.code, n).then((r) => {
        setSpeechError(r.error);
        setSpoken(r.spoken);
      });
    },
    [voice, item.form, lang.code, n],
  );

  // Only the listening drill speaks unprompted — there the audio *is* the
  // question. Reading and writing offer it on the answer instead, so nothing
  // makes a noise you did not ask for.
  useEffect(() => {
    if (skill === "listen") say(RATE_NORMAL);
  }, [skill, say]);

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
    setSpoken(null);
  }, [max, stats]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    if (verdict) next();
    else submit();
  };

  const noVoice = skill === "listen" && langVoices.length === 0;
  // An excluded language and an empty machine are different situations. Both
  // produce an empty voice list, and telling a Linux user to install the very
  // engine that cannot read their script is worse than saying nothing.
  const unsupported = speech?.unsupported.find((u) => u.lang === lang.code);
  const voiceLabel = langVoices.find((v) => voiceId(v) === voice)?.name ?? voice;
  const hints = verdict ? hintsFor(lang.code, verdict.item.form) : [];
  const scriptHints = verdict ? scriptHintsFor(lang.code, verdict.item.form) : [];

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
            {unsupported ? (
              <>
                Listening is not available for {lang.name} through{" "}
                <span className="font-mono">{speech?.backend}</span>. {unsupported.reason}
              </>
            ) : (
              <>
                No {lang.name} voice is available.{" "}
                {speech?.installHint ?? "No speech backend was found."}
              </>
            )}
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
              value={voice}
              onChange={(e) => setVoice(e.target.value)}
              className="bg-surface text-fg rounded px-2 py-1 outline-none max-w-[16rem]"
            >
              {langVoices.map((v) => (
                <option key={voiceId(v)} value={voiceId(v)}>
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

            {/* The transliteration, set large on purpose. Only the non-Latin
                languages carry one — the Latin-script tables have no reading
                field — so this is exactly where the sound is not visible in
                the spelling, and it is the line a learner most needs to see.
                Coloured as the sound hints are, so "this is how it sounds"
                reads consistently across the panel. */}
            {/* The transliteration doubles as the play control. A romanisation
                is an approximation; the audio is the thing it approximates, so
                the two belong on the same line rather than in different parts
                of the panel. Focus returns to the input so Enter still moves
                on.

                Latin-script languages carry no reading — their spelling shows
                the sound — so there is nothing to enlarge, but the audio is
                just as useful. They get the controls without the big line
                rather than having the word repeated back at them. */}
            {(verdict.item.reading || voice) && (
              <div className="flex items-baseline gap-3 flex-wrap">
                {verdict.item.reading ? (
                  <button
                    onClick={() => {
                      say(RATE_NORMAL);
                      inputRef.current?.focus();
                    }}
                    disabled={!voice}
                    title={voice ? `Hear it — ${voiceLabel}` : "No voice available for this language"}
                    className={cn(
                      "flex items-baseline gap-2 text-3xl sm:text-4xl font-medium tracking-wide",
                      "text-digital break-words text-left transition-opacity",
                      voice ? "hover:opacity-80" : "opacity-60 cursor-default",
                    )}
                  >
                    {verdict.item.reading}
                    {voice && <Volume2 size={20} className="shrink-0 opacity-50" />}
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      say(RATE_NORMAL);
                      inputRef.current?.focus();
                    }}
                    title={`Hear it — ${voiceLabel}`}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm",
                      "text-digital bg-digital/10 hover:bg-digital/20 transition-colors",
                    )}
                  >
                    <Volume2 size={16} />
                    Hear it
                  </button>
                )}
                {voice && (
                  <button
                    onClick={() => {
                      say(RATE_SLOW);
                      inputRef.current?.focus();
                    }}
                    title="Hear it slowly"
                    aria-label="Hear it slowly"
                    className="p-1.5 rounded text-muted hover:text-fg hover:bg-fg/5 transition-colors"
                  >
                    <Turtle size={18} />
                  </button>
                )}
                {spoken && (
                  <span
                    title={
                      spoken.source === "clip"
                        ? `A recording, played with ${spoken.detail}`
                        : `Synthesised by ${spoken.detail} — no recording exists for this number yet`
                    }
                    className={cn(
                      "text-xs px-1.5 py-0.5 rounded self-center",
                      spoken.source === "clip"
                        ? "text-ok bg-ok/10"
                        : "text-muted bg-fg/5",
                    )}
                  >
                    {spoken.source === "clip" ? "recording" : "synthesised"}
                  </span>
                )}
              </div>
            )}

            <Breakdown lang={lang} item={verdict.item} />

            {verdict.item.note && (
              <p className="text-sm text-warn/90 leading-relaxed max-w-prose">
                {verdict.item.note}
              </p>
            )}

            {/* How the writing system works comes first: if the script cannot
                be decoded, the pronunciation note has nothing to attach to. */}
            <HintDisclosure
              label="How it's written"
              kind="script"
              hints={scriptHints}
              storageKey={`counting.script.${lang.code}`}
              onToggle={() => inputRef.current?.focus()}
            />
            <HintDisclosure
              label="How it sounds"
              kind="sound"
              hints={hints}
              storageKey={`counting.hints.${lang.code}`}
              onToggle={() => inputRef.current?.focus()}
            />
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
