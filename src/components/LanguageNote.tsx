import type { Language } from "../../types.ts";

/**
 * What kind of number system you are about to meet, before you meet it.
 *
 * Two facts that are usually left implicit and are worth stating. First, where
 * the numerals came from, which is not always where the language came from —
 * Thai is Kra-Dai and unrelated to Chinese, yet counts with Chinese loans,
 * while Vietnamese is full of Chinese vocabulary and counts with native words.
 * Grouping the picker by family cannot show that, so it is said here instead.
 *
 * Second, how much of the range is memory and how much is rule. Nine of these
 * languages build 101 numbers from between 12 and 29 pieces; Hindi does not
 * build them at all. That is the single most useful thing to know before
 * starting, and it was invisible until it was written down.
 */
export function LanguageNote({ lang }: { lang: Language }) {
  const atoms = lang.atoms.length;
  const composes = atoms < 101;

  return (
    <p className="text-xs text-muted leading-relaxed max-w-prose">
      <span className="text-fg/70">{lang.family}</span>
      {lang.branch !== lang.family && <> · {lang.branch}</>}
      <> · {lang.numerals}</>
      <br />
      {composes ? (
        <>
          <span className="text-accent">{atoms} words</span> build all 101 — the rest is a
          rule, not memory.
        </>
      ) : (
        <>
          <span className="text-warn">All 101 are separate words.</span> Nothing composes, so
          there is no rule to learn here — only the list.
        </>
      )}
    </p>
  );
}
