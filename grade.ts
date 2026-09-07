import type { Language } from "./types.ts";

/**
 * Grading a typed answer. Kept out of `src/` deliberately: it is pure, it has
 * no DOM, and `compose.ts check` tests it. If it lived beside the React code
 * it would be the one piece of load-bearing logic with no test.
 */

/** Strip combining marks: zéro -> zero, qī shí -> qi shi, fünf -> funf. */
const stripDiacritics = (s: string): string =>
  s.normalize("NFD").replace(/\p{Diacritic}/gu, "");

/**
 * Fold a typed answer to the form comparisons happen in.
 *
 * Hyphen and space collapse to a single space, so `quatre-vingt-dix-sept` and
 * `quatre vingt dix sept` agree — which also makes the 1990 French spelling
 * reform (`vingt-et-un`) accepted alongside the traditional `vingt et un`
 * without a special case. `ß` folds to `ss`, because a learner on a UK
 * keyboard cannot type `dreißig` and should not be marked wrong for it.
 */
/**
 * Does the answer carry any diacritics at all?
 *
 * This is the hinge of the grading rule below. Someone typing plain ASCII is
 * doing the best their keyboard allows; someone typing marks has chosen them,
 * and in a tonal language the choice is the answer.
 */
export function hasDiacritics(s: string): boolean {
  const n = s.normalize("NFC");
  return stripDiacritics(n) !== n;
}

/** Everything `fold` does except removing the marks. */
export function foldKeepingMarks(s: string): string {
  return s
    .normalize("NFC")
    .trim()
    .toLowerCase()
    .replace(/ß/g, "ss")
    .replace(/[\u00AD\u200B-\u200D\uFEFF]/g, "")
    .replace(/[\s\-‐‑–—]+/g, " ")
    .trim();
}

export function fold(s: string): string {
  return stripDiacritics(s.trim().toLowerCase())
    .replace(/ß/g, "ss")
    // Soft hyphens and zero-width characters are invisible, so a learner who
    // pasted a word carrying them could not see why they were marked wrong.
    // ICU's German spell-out emits U+00AD between every element.
    .replace(/[\u00AD\u200B-\u200D\uFEFF]/g, "")
    .replace(/[\s\-‐‑–—]+/g, " ")
    .trim();
}

/**
 * Every spelling accepted for one number. The written form always counts; for
 * a language whose script withholds the pronunciation, the reading counts too,
 * so Mandarin can be answered in pinyin by someone with no IME to hand. `alt`
 * carries genuine alternatives — spellings a speaker would call correct, not
 * typing tolerances, which `fold` handles.
 */
export function accepted(lang: Language, n: number): string[] {
  const item = lang.compose(n);
  const out = [item.form];
  if (item.reading) out.push(item.reading);
  if (item.alt) out.push(...item.alt);
  // ß folds to ss, so a German answer typed either way lands on one key.
  return [...new Set(out.map(fold))];
}

/**
 * Grading is lenient about what a keyboard can produce and strict about what a
 * learner chose to type.
 *
 * Plain ASCII is compared with the marks removed from both sides, so `zero`,
 * `dreissig` and `hai muoi tu` all pass — nobody should be marked wrong for
 * lacking a key. But an answer that *does* carry marks is held to them,
 * because in a tonal language they are not decoration. Vietnamese 11 is
 * mười một; mười mốt is a different word, and folding the tones away made the
 * grader accept it — the very substitution the language turns on.
 */
export function isCorrect(lang: Language, n: number, answer: string): boolean {
  if (answer.trim() === "") return false;
  const item = lang.compose(n);
  const forms = [item.form, item.reading, ...(item.alt ?? [])].filter(
    (f): f is string => typeof f === "string" && f !== "",
  );
  if (hasDiacritics(answer)) {
    const a = foldKeepingMarks(answer);
    return forms.some((f) => foldKeepingMarks(f) === a);
  }
  return accepted(lang, n).includes(fold(answer));
}

/** Parse the numeral side of a reading drill. Rejects anything not 0-100. */
export function parseNumeral(answer: string): number | null {
  const t = answer.trim();
  if (!/^\d{1,3}$/.test(t)) return null;
  const n = Number(t);
  return n >= 0 && n <= 100 ? n : null;
}
