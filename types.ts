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
  atoms: Atom[];
  compose(n: number): Item;
};
