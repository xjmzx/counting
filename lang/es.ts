import type { Atom, Item, Language } from "../types.ts";

/**
 * Spanish splits its compounds in two. 16-29 fuse into a single word and the
 * stress shift forces a written accent — dieciséis, veintidós. From 31 the
 * pieces separate again and the accents vanish: treinta y seis, not *treinta y
 * séis. Getting that boundary right is most of the work here.
 */
const atoms: Atom[] = [
  { n: 0, form: "cero" },
  { n: 1, form: "uno" },
  { n: 2, form: "dos" },
  { n: 3, form: "tres" },
  { n: 4, form: "cuatro" },
  { n: 5, form: "cinco" },
  { n: 6, form: "seis" },
  { n: 7, form: "siete" },
  { n: 8, form: "ocho" },
  { n: 9, form: "nueve" },
  { n: 10, form: "diez" },
  { n: 11, form: "once" },
  { n: 12, form: "doce" },
  { n: 13, form: "trece" },
  { n: 14, form: "catorce" },
  { n: 15, form: "quince" },
  { n: 20, form: "veinte" },
  { n: 30, form: "treinta" },
  { n: 40, form: "cuarenta" },
  { n: 50, form: "cincuenta" },
  { n: 60, form: "sesenta" },
  { n: 70, form: "setenta" },
  { n: 80, form: "ochenta" },
  { n: 90, form: "noventa" },
  { n: 100, form: "cien", note: "“ciento” only appears above a hundred: ciento uno." },
];

/**
 * Inside a fused compound the word carries the stress and so takes an accent.
 * Only these three change; cuatro, cinco, siete, ocho and nueve do not.
 */
const FUSED: Record<number, string> = { 2: "dós", 3: "trés", 6: "séis" };

const find = (n: number): Atom => {
  const a = atoms.find((x) => x.n === n);
  if (!a) throw new Error(`es: no atom for ${n}`);
  return a;
};
const fused = (n: number): string => FUSED[n] ?? find(n).form;

function compose(n: number): Item {
  if (n < 0 || n > 100) throw new RangeError(`es: ${n} out of range`);

  if (n <= 15 || n === 20 || n === 100 || (n % 10 === 0 && n >= 30)) {
    const a = find(n);
    return { n, form: a.form, parts: [n], note: a.note };
  }

  // 16-19 and 21-29 fuse onto a stem, and the accent comes with the fusion.
  if (n <= 29) {
    const stem = n <= 19 ? "dieci" : "veinti";
    const ones = n % 10;
    const accented = FUSED[ones] !== undefined;
    return {
      n,
      form: stem + fused(ones),
      parts: [n <= 19 ? 10 : 20, ones],
      note: accented
        ? "The accent appears only because the word fused — treinta y seis, thirty later, has none."
        : n === 16 || n === 21
          ? "16 to 29 are written as one word; from 31 the pieces separate again."
          : undefined,
    };
  }

  // 31-99: separate words, joined by "y", and no accents.
  const tens = Math.floor(n / 10) * 10;
  const ones = n % 10;
  return { n, form: `${find(tens).form} y ${find(ones).form}`, parts: [tens, ones] };
}

export const es: Language = { code: "es", family: "Romance", name: "Spanish", atoms, compose };
