import type { Atom, Item, Language } from "../types.ts";

/**
 * Brazilian spellings lead, European ones are accepted alongside. They differ
 * on exactly three forms — 16, 17 and 19 — and Brazil has the larger share of
 * the language's speakers. Both are correct; `alt` carries the other.
 */
const atoms: Atom[] = [
  { n: 0, form: "zero" },
  { n: 1, form: "um" },
  { n: 2, form: "dois" },
  { n: 3, form: "três" },
  { n: 4, form: "quatro" },
  { n: 5, form: "cinco" },
  { n: 6, form: "seis" },
  { n: 7, form: "sete" },
  { n: 8, form: "oito" },
  { n: 9, form: "nove" },
  { n: 10, form: "dez" },
  { n: 11, form: "onze" },
  { n: 12, form: "doze" },
  { n: 13, form: "treze" },
  { n: 14, form: "catorze", note: "“quatorze” is also written, chiefly in Brazil." },
  { n: 15, form: "quinze" },
  { n: 16, form: "dezesseis", note: "European Portuguese writes dezasseis." },
  { n: 17, form: "dezessete", note: "European Portuguese writes dezassete." },
  { n: 18, form: "dezoito" },
  { n: 19, form: "dezenove", note: "European Portuguese writes dezanove." },
  { n: 20, form: "vinte" },
  { n: 30, form: "trinta" },
  { n: 40, form: "quarenta" },
  { n: 50, form: "cinquenta" },
  { n: 60, form: "sessenta" },
  { n: 70, form: "setenta" },
  { n: 80, form: "oitenta" },
  { n: 90, form: "noventa" },
  { n: 100, form: "cem", note: "“cento” only appears above a hundred: cento e um." },
];

const ALTS: Record<number, string[]> = {
  14: ["quatorze"],
  16: ["dezasseis"],
  17: ["dezassete"],
  19: ["dezanove"],
};

const find = (n: number): Atom => {
  const a = atoms.find((x) => x.n === n);
  if (!a) throw new Error(`pt: no atom for ${n}`);
  return a;
};

function compose(n: number): Item {
  if (n < 0 || n > 100) throw new RangeError(`pt: ${n} out of range`);

  const ones = n % 10;
  if (n <= 20 || ones === 0 || n === 100) {
    const a = find(n);
    return { n, form: a.form, parts: [n], note: a.note, alt: ALTS[n] };
  }

  // 21-99, without a single exception: tens, "e", ones.
  const tens = Math.floor(n / 10) * 10;
  return {
    n,
    form: `${find(tens).form} e ${find(ones).form}`,
    parts: [tens, ones],
    note:
      n === 21
        ? "The “e” is never dropped — unlike Spanish, which fuses its twenties into one word."
        : undefined,
  };
}

export const pt: Language = { code: "pt", family: "Indo-European", branch: "Romance", numerals:
  "From Latin, through each language's own sound changes.", name: "Portuguese", atoms, compose };
