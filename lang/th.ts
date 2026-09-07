import type { Atom, Item, Language } from "../types.ts";

/**
 * Thai composes cleanly except in two places, and both are worth knowing:
 *
 *   20 is ยี่สิบ, not สองสิบ — two-ten uses ยี่, a form that appears
 *   nowhere else in the range.
 *
 *   A one in the ones position becomes เอ็ด, never หนึ่ง — 11 is สิบเอ็ด
 *   and 21 is ยี่สิบเอ็ด.
 *
 * The script gives no clue to the sound, so a romanisation is carried as the
 * reading and accepted as an answer, the way pinyin is for Mandarin.
 */
type ThAtom = Atom & { romanisation: string };

const atoms: ThAtom[] = [
  { n: 0, form: "ศูนย์", romanisation: "sun" },
  { n: 1, form: "หนึ่ง", romanisation: "nueng" },
  { n: 2, form: "สอง", romanisation: "song" },
  { n: 3, form: "สาม", romanisation: "sam" },
  { n: 4, form: "สี่", romanisation: "si" },
  { n: 5, form: "ห้า", romanisation: "ha" },
  { n: 6, form: "หก", romanisation: "hok" },
  { n: 7, form: "เจ็ด", romanisation: "chet" },
  { n: 8, form: "แปด", romanisation: "paet" },
  { n: 9, form: "เก้า", romanisation: "kao" },
  { n: 10, form: "สิบ", romanisation: "sip" },
  { n: 100, form: "ร้อย", romanisation: "roi" },
];

/** One in the ones position of any compound. Never หนึ่ง there. */
const ET = { form: "เอ็ด", romanisation: "et" };
/** Two in the tens position, and only there. */
const YI = { form: "ยี่", romanisation: "yi" };

const at = (n: number): ThAtom => {
  const a = atoms.find((x) => x.n === n);
  if (!a) throw new Error(`th: no atom for ${n}`);
  return a;
};

type Piece = { form: string; romanisation: string };

function assemble(pieces: Piece[], parts: number[], n: number, note?: string): Item {
  const reading = pieces.map((p) => p.romanisation).join(" ");
  return {
    n,
    form: pieces.map((p) => p.form).join(""),
    reading,
    parts,
    note,
    // Thai is written without spaces; a learner romanising it may or may not
    // separate the syllables, so both are accepted.
    alt: [reading.replace(/ /g, "")],
  };
}

function compose(n: number): Item {
  if (n < 0 || n > 100) throw new RangeError(`th: ${n} out of range`);

  if (n <= 10) return assemble([at(n)], [n], n);
  if (n === 100) return assemble([at(1), at(100)], [1, 100], n, "A hundred takes หนึ่ง in front: หนึ่งร้อย.");

  const tens = Math.floor(n / 10);
  const ones = n % 10;
  const pieces: Piece[] = [];
  const parts: number[] = [];

  // 11-19 are just สิบ plus the ones, with no digit in front.
  if (tens > 1) {
    pieces.push(tens === 2 ? YI : at(tens));
    parts.push(tens);
  }
  pieces.push(at(10));
  parts.push(10);
  if (ones > 0) {
    pieces.push(ones === 1 ? ET : at(ones));
    parts.push(ones);
  }

  const note =
    n === 20
      ? "Twenty is ยี่สิบ, not สองสิบ — ยี่ is an old form of two that survives only here."
      : ones === 1 && n === 11
        ? "A one in the ones position is เอ็ด, never หนึ่ง — 11 is สิบเอ็ด."
        : undefined;

  return assemble(pieces, parts, n, note);
}

export const th: Language = { code: "th", family: "Kra-Dai", name: "Thai", atoms, compose };
