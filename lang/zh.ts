import type { Atom, Item, Language, ScaleWord } from "../types.ts";

// Twelve atoms cover every number to a hundred. Nothing here is irregular.
const atoms: Atom[] = [
  { n: 0, form: "零", reading: "líng" },
  { n: 1, form: "一", reading: "yī" },
  { n: 2, form: "二", reading: "èr" },
  { n: 3, form: "三", reading: "sān" },
  { n: 4, form: "四", reading: "sì" },
  { n: 5, form: "五", reading: "wǔ" },
  { n: 6, form: "六", reading: "liù" },
  { n: 7, form: "七", reading: "qī" },
  { n: 8, form: "八", reading: "bā" },
  { n: 9, form: "九", reading: "jiǔ" },
  { n: 10, form: "十", reading: "shí" },
  { n: 100, form: "百", reading: "bǎi" },
];

const at = (n: number): Atom => {
  const a = atoms.find((x) => x.n === n);
  if (!a) throw new Error(`zh: no atom for ${n}`);
  return a;
};

function compose(n: number): Item {
  if (n < 0 || n > 100) throw new RangeError(`zh: ${n} out of range`);

  // 0-10 are simply the atoms.
  if (n <= 10) {
    const a = at(n);
    return { n, form: a.form, reading: a.reading, parts: [n] };
  }

  // 100 is the only place a tone changes: 一 yī -> yì before 百 bǎi (3rd tone).
  if (n === 100) {
    return {
      n,
      form: at(1).form + at(100).form,
      reading: "yì bǎi",
      parts: [1, 100],
      note: "Tone sandhi: 一 is yì here, not yī, because 百 carries a third tone.",
    };
  }

  const tens = Math.floor(n / 10);
  const ones = n % 10;

  // 11-19 say "ten-one", not "one-ten-one".
  if (tens === 1) {
    return {
      n,
      form: at(10).form + at(ones).form,
      reading: `${at(10).reading} ${at(ones).reading}`,
      parts: [10, ones],
    };
  }

  // 20-99: "two ten three" and so on, exceptionlessly.
  const parts = ones === 0 ? [tens, 10] : [tens, 10, ones];
  return {
    n,
    form: parts.map((p) => at(p).form).join(""),
    reading: parts.map((p) => at(p).reading).join(" "),
    parts,
  };
}

const scale: ScaleWord[] = [
  { power: 2, form: "百", reading: "bǎi" },
  { power: 3, form: "千", reading: "qiān" },
  { power: 4, form: "万", reading: "wàn", note:
      "The break is here, not at a thousand. 100,000 is 十万, “ten wàn”, and a million is 一百万, “a hundred wàn”." },
];

export const zh: Language = { scale, code: "zh", family: "Sino-Tibetan", branch: "Sinitic", numerals:
  "Native Sinitic — and the system Japanese, Korean and Thai all borrowed from.", name: "Mandarin Chinese", atoms, compose };
