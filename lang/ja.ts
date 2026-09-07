import type { Atom, Item, Language } from "../types.ts";

/**
 * Structurally this is Chinese: 二十三 is "two ten three", exceptionlessly.
 * The difficulty is elsewhere — several digits have two readings, and counting
 * uses a specific one.
 *
 * 四 is yon, not shi. 七 is nana, not shichi. 九 is kyū, not ku. All six are
 * real readings of those characters; only the first of each is what you say
 * when counting. Confirmed against the system voice by duration: 九 renders in
 * 0.366s, exactly matching きゅう, where く is 0.239s.
 *
 * One difference from Chinese worth noting: a hundred is 百 alone, never 一百.
 */
type JaAtom = Atom & {
  /** Kana, accepted as an answer from anyone typing with an IME. */
  kana: string;
  /** The other reading of the same character, where one exists. */
  otherReading?: string;
  otherKana?: string;
  /** Further spellings a reader would accept, beyond kana and plain romaji. */
  extraAlt?: string[];
};

const atoms: JaAtom[] = [
  { n: 0, form: "零", reading: "rei", kana: "れい",
    // 〇 is what ICU spells and what appears in vertical text; ゼロ is what
    // most people actually say. All three are right.
    extraAlt: ["〇", "ゼロ", "zero"],
    note: "ゼロ is at least as common as 零 when reading a digit aloud, and 〇 is written too." },
  { n: 1, form: "一", reading: "ichi", kana: "いち" },
  { n: 2, form: "二", reading: "ni", kana: "に" },
  { n: 3, form: "三", reading: "san", kana: "さん" },
  { n: 4, form: "四", reading: "yon", kana: "よん", otherReading: "shi", otherKana: "し",
    note: "四 is also read shi, but counting uses yon." },
  { n: 5, form: "五", reading: "go", kana: "ご" },
  { n: 6, form: "六", reading: "roku", kana: "ろく" },
  { n: 7, form: "七", reading: "nana", kana: "なな", otherReading: "shichi", otherKana: "しち",
    note: "七 is also read shichi, but counting uses nana." },
  { n: 8, form: "八", reading: "hachi", kana: "はち" },
  { n: 9, form: "九", reading: "kyū", kana: "きゅう", otherReading: "ku", otherKana: "く",
    note: "九 is also read ku, but counting uses kyū." },
  { n: 10, form: "十", reading: "jū", kana: "じゅう" },
  { n: 100, form: "百", reading: "hyaku", kana: "ひゃく",
    note: "A hundred is 百 on its own — never 一百, unlike Chinese." },
];

const at = (n: number): JaAtom => {
  const a = atoms.find((x) => x.n === n);
  if (!a) throw new Error(`ja: no atom for ${n}`);
  return a;
};

/** ū → uu, so a learner without macrons on the keyboard is not stuck. */
const plainRomaji = (s: string) => s.replace(/ū/g, "uu").replace(/ō/g, "ou");

function build(parts: number[]): Item {
  const form = parts.map((p) => at(p).form).join("");
  const reading = parts.map((p) => at(p).reading).join("");
  const kana = parts.map((p) => at(p).kana).join("");
  const alt = [kana, plainRomaji(reading)];
  // Single digits also accept their other reading; compounds do not, because
  // shijū and kujū are not how the numbers are counted.
  if (parts.length === 1) {
    const a = at(parts[0]!);
    if (a.otherReading) alt.push(a.otherReading, a.otherKana!);
    if (a.extraAlt) alt.push(...a.extraAlt);
  }
  return {
    n: 0,
    form,
    reading,
    parts,
    alt: [...new Set(alt)].filter((x) => x !== form && x !== reading),
  };
}

function compose(n: number): Item {
  if (n < 0 || n > 100) throw new RangeError(`ja: ${n} out of range`);

  if (n <= 10) return { ...build([n]), n, note: at(n).note };
  if (n === 100) {
    // ICU spells zero as 〇 and this table uses 零; both are written.
    return { ...build([100]), n, note: at(100).note };
  }

  const tens = Math.floor(n / 10);
  const ones = n % 10;
  // 11-19 are "ten-one", not "one-ten-one" — as in Chinese.
  const parts = tens === 1 ? (ones === 0 ? [10] : [10, ones]) : ones === 0 ? [tens, 10] : [tens, 10, ones];
  const item = build(parts);
  return {
    ...item,
    n,
    note:
      n === 11
        ? "Eleven is “ten-one”, with no “one” in front — the same shape as Chinese."
        : undefined,
  };
}

export const ja: Language = { code: "ja", family: "Japonic", name: "Japanese", atoms, compose };
