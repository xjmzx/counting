import type { Atom, Item, Language, ScaleWord } from "../types.ts";

/**
 * German needs something the other two do not: a word can take a different
 * shape depending on what it is glued to. `beforeSuffix` is the shape used
 * before -zehn and -zig; `inCompound` is the shape used inside an und-compound.
 * They are not the same, which is the trap: sechzehn loses the s, but
 * sechsunddreißig keeps it.
 */
type DeAtom = Atom & { beforeSuffix?: string; inCompound?: string };

const atoms: DeAtom[] = [
  { n: 0, form: "null" },
  { n: 1, form: "eins", inCompound: "ein", note: "Loses its -s inside a compound: einundzwanzig." },
  { n: 2, form: "zwei" },
  { n: 3, form: "drei" },
  { n: 4, form: "vier" },
  { n: 5, form: "fünf" },
  { n: 6, form: "sechs", beforeSuffix: "sech", note: "Drops the -s before -zehn and -zig only." },
  { n: 7, form: "sieben", beforeSuffix: "sieb", note: "Drops the -en before -zehn and -zig only." },
  { n: 8, form: "acht" },
  { n: 9, form: "neun" },
  { n: 10, form: "zehn" },
  { n: 11, form: "elf" },
  { n: 12, form: "zwölf" },
  { n: 20, form: "zwanzig", note: "Irregular: zwei would predict *zweizig." },
  { n: 30, form: "dreißig", note: "Irregular: spelled -ßig, not -zig." },
  { n: 100, form: "hundert", note: '"einhundert" is also correct, but unusual when counting.' },
];

const find = (n: number): DeAtom => {
  const a = atoms.find((x) => x.n === n);
  if (!a) throw new Error(`de: no atom for ${n}`);
  return a;
};

const noteFor = (n: number): string | undefined => atoms.find((x) => x.n === n)?.note;
const at = (n: number): string => find(n).form;
const beforeSuffix = (n: number): string => find(n).beforeSuffix ?? find(n).form;
const inCompound = (n: number): string => find(n).inCompound ?? find(n).form;

// 40-90 are regular; 20 and 30 are listed above because they are not.
const tensForm = (t: number): string => (t === 20 || t === 30 ? at(t) : `${beforeSuffix(t / 10)}zig`);

function compose(n: number): Item {
  if (n < 0 || n > 100) throw new RangeError(`de: ${n} out of range`);

  if (n <= 12) return { n, form: at(n), parts: [n], note: noteFor(n) };
  // ICU's spell-out gives "einhundert" here. Both are correct; "hundert" is
  // what you say when counting, so it leads and the other is accepted.
  if (n === 100)
    return { n, form: at(100), parts: [100], note: noteFor(100), alt: ["einhundert"] };

  // 13-19: unit stem plus zehn.
  if (n <= 19) {
    const u = n - 10;
    return {
      n,
      form: `${beforeSuffix(u)}zehn`,
      parts: [u, 10],
      note: u === 6 || u === 7 ? noteFor(u) : undefined,
    };
  }

  const tens = Math.floor(n / 10) * 10;
  const ones = n % 10;

  if (ones === 0) {
    return { n, form: tensForm(tens), parts: [tens], note: noteFor(tens) };
  }

  // 21-99: ones first, then und, then tens — one unbroken word.
  return {
    n,
    form: `${inCompound(ones)}und${tensForm(tens)}`,
    parts: [ones, tens],
    // True of all of 21-99, so state it once rather than eighty times.
    note:
      n === 21
        ? "Spoken back to front — one-and-twenty — and written as one word. This holds for every number from 21 to 99."
        : undefined,
  };
}

const scale: ScaleWord[] = [
  { power: 2, form: "hundert" },
  { power: 3, form: "tausend", note:
      "Written joined to what precedes it: 35,000 is fünfunddreißigtausend, one word." },
  { power: 6, form: "Million", note:
      "Capitalised and separate, unlike hundert and tausend." },
];

export const de: Language = { scale, code: "de", family: "Indo-European", branch: "Germanic", numerals:
  "Native Germanic, and cognate with English — drei/three, zehn/ten.", name: "German", atoms, compose };
