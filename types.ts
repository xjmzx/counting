/** One lexical item you actually have to learn. Everything else is composed. */
export type Atom = {
  n: number;
  form: string;
  /** Pronunciation, where the script does not give it away. */
  reading?: string;
  /** Why this one has to be listed rather than derived. */
  note?: string;
};

/** One number, 0-100, as the language says it. */
export type Item = {
  n: number;
  form: string;
  reading?: string;
  /** Atom values in *spoken* order — not magnitude order. See German. */
  parts: number[];
  /** An irregularity worth showing the learner. */
  note?: string;
  /**
   * Other spellings a speaker would accept. Not typing tolerance — `fold`
   * in grade.ts handles case, hyphens and diacritics — but genuinely
   * different correct words, like German's einhundert beside hundert.
   */
  alt?: string[];
};

/**
 * A word that names a power of ten — the scaffolding a price is built on.
 *
 * Only the powers a language names with a *word of its own* belong here.
 * Vietnamese has no word for ten thousand (10,000 is mười nghìn, "ten
 * thousands"), so 10^4 is absent from its ladder; Thai names every power to a
 * million and has five rungs where French has three. That difference is the
 * whole lesson, and it is only visible if the composed powers are left out.
 */
export type ScaleWord = {
  /** The exponent it names: 2 is a hundred, 6 a million. */
  power: number;
  form: string;
  reading?: string;
  note?: string;
};

export type Language = {
  code: string;
  name: string;
  /**
   * Top-level family, and what the picker groups by. Deliberately the deep
   * one — Indo-European rather than Romance — so the grouping is a standard
   * classification rather than a judgement call.
   */
  family: string;
  /** The branch within it: Romance, Germanic, Indo-Aryan, Sinitic, Tai… */
  branch: string;
  /**
   * Where this language's *numerals* came from, which is not always where the
   * language came from. Thai is Kra-Dai and unrelated to Chinese, yet borrowed
   * its numbers from Middle Chinese — so สิบ sits beside Mandarin shí while
   * Vietnamese, whose vocabulary is full of Chinese loans, counts with native
   * words instead. Genetic descent and numeral descent are different questions
   * and the app should not let its tab layout imply otherwise.
   */
  numerals: string;
  /**
   * The powers of ten this language names. Ascending, and only the ones with
   * a word of their own. Groundwork for prices — see
   * docs/large-numbers-design-2026-09-07.md.
   */
  scale: ScaleWord[];
  atoms: Atom[];
  compose(n: number): Item;
};
