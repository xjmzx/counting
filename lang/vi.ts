import type { Atom, Item, Language, ScaleWord } from "../types.ts";

/**
 * Vietnamese looks regular and is not. Three different ones-words change shape
 * inside a compound, and — the part that catches people — they do not all
 * change in the same place:
 *
 *   teens (11-19)   only five changes:  mười lăm, but mười một and mười bốn
 *   21-99           one, four and five: mốt, tư, lăm
 *
 * So fourteen is mười bốn while twenty-four is hai mươi tư. On top of that the
 * word for ten itself shifts tone in the tens: mười alone, mươi in hai mươi.
 */
type ViAtom = Atom & {
  /** Shape inside 21-99, where it differs. */
  inCompound?: string;
  /** Shape inside 11-19, where that differs again. */
  inTeens?: string;
};

const atoms: ViAtom[] = [
  { n: 0, form: "không" },
  { n: 1, form: "một", inCompound: "mốt", note: "One becomes mốt from 21 up — but stays một in mười một." },
  { n: 2, form: "hai" },
  { n: 3, form: "ba" },
  { n: 4, form: "bốn", inCompound: "tư", note: "Four becomes tư from 21 up — but stays bốn in mười bốn." },
  { n: 5, form: "năm", inCompound: "lăm", inTeens: "lăm", note: "Five becomes lăm in every compound, teens included." },
  { n: 6, form: "sáu" },
  { n: 7, form: "bảy" },
  { n: 8, form: "tám" },
  { n: 9, form: "chín" },
  { n: 10, form: "mười", inCompound: "mươi", note: "Ten is mười alone but mươi in the tens — a tone change, not a typo." },
  { n: 100, form: "trăm" },
];

const at = (n: number): ViAtom => {
  const a = atoms.find((x) => x.n === n);
  if (!a) throw new Error(`vi: no atom for ${n}`);
  return a;
};

function compose(n: number): Item {
  if (n < 0 || n > 100) throw new RangeError(`vi: ${n} out of range`);

  if (n <= 10) return { n, form: at(n).form, parts: [n], note: at(n).note };
  if (n === 100) return { n, form: `${at(1).form} ${at(100).form}`, parts: [1, 100] };

  const tens = Math.floor(n / 10);
  const ones = n % 10;

  // 11-19: ten, then the ones — where only five changes shape.
  if (tens === 1) {
    const a = at(ones);
    return {
      n,
      form: `${at(10).form} ${a.inTeens ?? a.form}`,
      parts: [10, ones],
      note: n === 15 ? a.note : n === 11 ? at(1).note : n === 14 ? at(4).note : undefined,
    };
  }

  // 21-99: the tens digit, mươi, then the ones — where one, four and five all
  // change. Four also accepts bốn, which is still said.
  const words = [at(tens).form, at(10).inCompound!];
  const parts = [tens, 10];
  let alt: string[] | undefined;
  if (ones > 0) {
    const a = at(ones);
    words.push(a.inCompound ?? a.form);
    parts.push(ones);
    if (ones === 4) alt = [`${at(tens).form} ${at(10).inCompound} ${at(4).form}`];
  }

  return {
    n,
    form: words.join(" "),
    parts,
    alt,
    note: n === 20 ? at(10).note : ones === 1 && n === 21 ? at(1).note : ones === 4 && n === 24 ? at(4).note : undefined,
  };
}

const scale: ScaleWord[] = [
  { power: 2, form: "trăm" },
  { power: 3, form: "nghìn", note:
      "Southern Vietnam says ngàn for the same thing. There is no word for ten thousand: 10,000 is mười nghìn, ten thousands, exactly as English does it." },
  { power: 6, form: "triệu", note:
      "Prices jump from nghìn straight to triệu. 21,950,000₫ is hai mươi mốt triệu chín trăm năm mươi nghìn — two chunks, not three." },
];

export const vi: Language = { scale, code: "vi", family: "Austroasiatic", branch: "Vietic", numerals:
  "Native Austroasiatic. Vietnamese has a Sino set too — nhất, nhị, tam — but does not count with it, so these are the numbers here least like Chinese.", name: "Vietnamese", atoms, compose };
