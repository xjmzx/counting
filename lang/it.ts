import type { Atom, Item, Language } from "../types.ts";

/**
 * Italian glues its compounds together with no separator at all, and the tens
 * word loses its final vowel before a ones word that starts with one:
 * venti + uno is ventuno, venti + otto is ventotto. Only uno and otto begin
 * with a vowel, so only those two trigger it. Separately, tre takes an accent
 * when it ends a compound — ventitré — because that is where the stress lands.
 */
const atoms: Atom[] = [
  { n: 0, form: "zero" },
  { n: 1, form: "uno" },
  { n: 2, form: "due" },
  { n: 3, form: "tre" },
  { n: 4, form: "quattro" },
  { n: 5, form: "cinque" },
  { n: 6, form: "sei" },
  { n: 7, form: "sette" },
  { n: 8, form: "otto" },
  { n: 9, form: "nove" },
  { n: 10, form: "dieci" },
  { n: 11, form: "undici" },
  { n: 12, form: "dodici" },
  { n: 13, form: "tredici" },
  { n: 14, form: "quattordici" },
  { n: 15, form: "quindici" },
  { n: 16, form: "sedici", note: "The last of the -dici teens; 17 flips to dici- in front." },
  { n: 17, form: "diciassette" },
  { n: 18, form: "diciotto" },
  { n: 19, form: "diciannove" },
  { n: 20, form: "venti" },
  { n: 30, form: "trenta" },
  { n: 40, form: "quaranta" },
  { n: 50, form: "cinquanta" },
  { n: 60, form: "sessanta" },
  { n: 70, form: "settanta" },
  { n: 80, form: "ottanta" },
  { n: 90, form: "novanta" },
  { n: 100, form: "cento" },
];

const find = (n: number): Atom => {
  const a = atoms.find((x) => x.n === n);
  if (!a) throw new Error(`it: no atom for ${n}`);
  return a;
};

function compose(n: number): Item {
  if (n < 0 || n > 100) throw new RangeError(`it: ${n} out of range`);

  const ones = n % 10;
  if (n <= 20 || ones === 0 || n === 100) {
    const a = find(n);
    return { n, form: a.form, parts: [n], note: a.note };
  }

  const tens = Math.floor(n / 10) * 10;
  const tensForm = find(tens).form;
  let form: string;
  let note: string | undefined;

  if (ones === 1 || ones === 8) {
    // uno and otto are the only ones words beginning with a vowel.
    form = tensForm.slice(0, -1) + find(ones).form;
    note =
      n === 21 || n === 28
        ? "The tens word drops its final vowel before uno and otto — venti becomes vent-."
        : undefined;
  } else if (ones === 3) {
    form = tensForm + "tré";
    note = n === 23 ? "tre takes an accent when it ends a compound: the stress falls on it." : undefined;
  } else {
    form = tensForm + find(ones).form;
  }

  return { n, form, parts: [tens, ones], note };
}

export const it: Language = { code: "it", name: "Italian", atoms, compose };
