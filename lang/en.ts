import type { Atom, Item, Language, ScaleWord } from "../types.ts";

/**
 * The reference language: the interface is in English, and it is the one
 * table whose recordings can be made by the author without a second opinion.
 *
 * Structurally it is German's smaller cousin. Both build the teens and the
 * tens from a stem that is not quite the digit — and English changes the stem
 * *differently* in the two places, which is where its one real trap sits:
 * fourteen keeps the u and forty loses it.
 */
type EnAtom = Atom & {
  /** Shape before -teen: three → thir, five → fif, eight → eigh. */
  beforeTeen?: string;
  /** Shape before -ty. Same as above, plus two → twen and four → for. */
  beforeTy?: string;
};

const atoms: EnAtom[] = [
  { n: 0, form: "zero", note: "“nought”, “oh” and “nil” all appear too, depending on what is being counted." },
  { n: 1, form: "one" },
  { n: 2, form: "two", beforeTy: "twen" },
  { n: 3, form: "three", beforeTeen: "thir", beforeTy: "thir" },
  { n: 4, form: "four", beforeTy: "for", note: "fourteen keeps the u; forty drops it. The commonest English spelling slip." },
  { n: 5, form: "five", beforeTeen: "fif", beforeTy: "fif" },
  { n: 6, form: "six" },
  { n: 7, form: "seven" },
  { n: 8, form: "eight", beforeTeen: "eigh", beforeTy: "eigh" },
  { n: 9, form: "nine" },
  { n: 10, form: "ten" },
  { n: 11, form: "eleven" },
  { n: 12, form: "twelve", note: "The last irregular one: from thirteen the pattern takes over." },
  { n: 100, form: "hundred" },
];

const scale: ScaleWord[] = [
  { power: 2, form: "hundred" },
  { power: 3, form: "thousand" },
  { power: 6, form: "million" },
];

const find = (n: number): EnAtom => {
  const a = atoms.find((x) => x.n === n);
  if (!a) throw new Error(`en: no atom for ${n}`);
  return a;
};

const teenStem = (d: number): string => find(d).beforeTeen ?? find(d).form;
const tyStem = (d: number): string => find(d).beforeTy ?? find(d).form;

function compose(n: number): Item {
  if (n < 0 || n > 100) throw new RangeError(`en: ${n} out of range`);

  if (n <= 12) {
    const a = find(n);
    return { n, form: a.form, parts: [n], note: a.note };
  }
  if (n === 100) {
    return {
      n,
      form: `${find(1).form} ${find(100).form}`,
      parts: [1, 100],
      alt: ["a hundred"],
      note: "“a hundred” is as ordinary as “one hundred” in speech.",
    };
  }

  const ones = n % 10;
  if (n <= 19) {
    return {
      n,
      form: `${teenStem(ones)}teen`,
      parts: [ones, 10],
      note:
        n === 14
          ? "fourteen keeps the u that forty loses — the two stems differ."
          : n === 13
            ? "three becomes thir here, as it does in thirty."
            : undefined,
    };
  }

  const tens = Math.floor(n / 10);
  const tensForm = `${tyStem(tens)}ty`;
  if (ones === 0) {
    return {
      n,
      form: tensForm,
      parts: [tens, 10],
      note: n === 40 ? "forty, not fourty. fourteen keeps the u; forty does not." : undefined,
    };
  }
  // 21-99: hyphenated, always, and with no “and” below a hundred.
  return { n, form: `${tensForm}-${find(ones).form}`, parts: [tens, 10, ones] };
}

export const en: Language = {
  scale,
  code: "en",
  family: "Indo-European",
  branch: "Germanic",
  numerals:
    "Native Germanic, and the interface language — cognate with German throughout: three/drei, ten/zehn.",
  name: "English",
  atoms,
  compose,
};
