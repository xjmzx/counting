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
  atoms: Atom[];
  compose(n: number): Item;
};
