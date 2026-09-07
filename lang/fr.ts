import type { Atom, Item, Language } from "../types.ts";

// French runs out of atoms at 16 and then improvises. Twenty-three to learn.
const atoms: Atom[] = [
  { n: 0, form: "zéro" },
  { n: 1, form: "un" },
  { n: 2, form: "deux" },
  { n: 3, form: "trois" },
  { n: 4, form: "quatre" },
  { n: 5, form: "cinq" },
  { n: 6, form: "six" },
  { n: 7, form: "sept" },
  { n: 8, form: "huit" },
  { n: 9, form: "neuf" },
  { n: 10, form: "dix" },
  { n: 11, form: "onze" },
  { n: 12, form: "douze" },
  { n: 13, form: "treize" },
  { n: 14, form: "quatorze" },
  { n: 15, form: "quinze" },
  { n: 16, form: "seize", note: "The last of the simple teens; 17 starts compounding." },
  { n: 20, form: "vingt" },
  { n: 30, form: "trente" },
  { n: 40, form: "quarante" },
  { n: 50, form: "cinquante" },
  { n: 60, form: "soixante", note: "The last tens word. 70-99 are built from 60 and 4x20." },
  { n: 100, form: "cent" },
];

const at = (n: number): string => {
  const a = atoms.find((x) => x.n === n);
  if (!a) throw new Error(`fr: no atom for ${n}`);
  return a.form;
};

function compose(n: number): Item {
  if (n < 0 || n > 100) throw new RangeError(`fr: ${n} out of range`);

  if (n <= 16) return { n, form: at(n), parts: [n] };
  if (n === 100) return { n, form: at(100), parts: [100] };

  // 17-19: dix-sept, dix-huit, dix-neuf.
  if (n <= 19) return { n, form: `dix-${at(n - 10)}`, parts: [10, n - 10] };

  // 20-69: regular, except that x1 takes "et" and drops the hyphens.
  if (n <= 69) {
    const tens = Math.floor(n / 10) * 10;
    const ones = n % 10;
    if (ones === 0) return { n, form: at(tens), parts: [tens] };
    if (ones === 1) {
      return {
        n,
        form: `${at(tens)} et un`,
        parts: [tens, 1],
        note: 'The "et" appears only at x1, and takes no hyphens.',
      };
    }
    return { n, form: `${at(tens)}-${at(ones)}`, parts: [tens, ones] };
  }

  // 70-79: sixty plus a teen. 71 keeps the "et"; nothing above it does.
  if (n <= 79) {
    const rest = compose(n - 60); // 10-19
    if (n === 71) {
      return {
        n,
        form: "soixante et onze",
        parts: [60, 11],
        note: 'The last "et" in the language. 81 and 91 do not take one.',
      };
    }
    return { n, form: `soixante-${rest.form}`, parts: [60, ...rest.parts] };
  }

  // 80-99: four twenties, plus whatever is left over.
  if (n === 80) {
    return {
      n,
      form: "quatre-vingts",
      parts: [4, 20],
      note: "Takes a plural -s only when it ends the number. 81-99 drop it.",
    };
  }
  const rest = compose(n - 80); // 1-19
  return {
    n,
    form: `quatre-vingt-${rest.form}`,
    parts: [4, 20, ...rest.parts],
    note: n === 81 || n === 91 ? 'No "et" here, unlike 21-71.' : undefined,
  };
}

export const fr: Language = { code: "fr", name: "French", atoms, compose };
