import type { Atom, Item, Language } from "../types.ts";

/**
 * The exception, added deliberately.
 *
 * Every other language here costs between 12 and 29 lexical items because the
 * rest are composed. Hindi costs 101, because its numbers fused long ago and
 * were never re-analysed: तेईस (23) carries no trace of तीन (3) or बीस (20),
 * and इकहत्तर (71) none of एक or सत्तर. Measured against the other eight it
 * scores 0% on ones-visibility, where the next lowest is Vietnamese at 69%.
 *
 * So there is no `compose` here worth the name — it is a lookup. The atom
 * count reads 101, `parts` has a single entry and the breakdown panel stays
 * empty. That is not a defect to paper over; it is what this language is, and
 * the app says so rather than pretending otherwise.
 *
 * **Verification here is weaker than elsewhere.** For every other language the
 * table was generated from a rule written independently, so ICU agreeing meant
 * something. A word list has no rule, so this table was written out from
 * knowledge first and then diffed: 96 of 101 matched ICU exactly. The five that
 * did not are carried with both spellings and marked below. They look like
 * known variants rather than mistakes, but no Hindi reader has checked, and
 * "they are all variants" is a conclusion that happens to flatter whoever wrote
 * the table.
 */
/** Alternative spellings live on the entry here, since every number is one. */
type HiAtom = Atom & { alt?: string[] };

const atoms: HiAtom[] = [
  { n: 0, form: "शून्य", reading: "shunya" },
  { n: 1, form: "एक", reading: "ek" },
  { n: 2, form: "दो", reading: "do" },
  { n: 3, form: "तीन", reading: "teen" },
  { n: 4, form: "चार", reading: "char" },
  { n: 5, form: "पाँच", reading: "panch" },
  { n: 6, form: "छह", reading: "chhah" },
  { n: 7, form: "सात", reading: "sat" },
  { n: 8, form: "आठ", reading: "aath" },
  { n: 9, form: "नौ", reading: "nau" },
  { n: 10, form: "दस", reading: "das" },
  { n: 11, form: "ग्यारह", reading: "gyarah" },
  { n: 12, form: "बारह", reading: "barah" },
  { n: 13, form: "तेरह", reading: "terah" },
  { n: 14, form: "चौदह", reading: "chaudah" },
  { n: 15, form: "पंद्रह", reading: "pandrah", alt: ["पन्द्रह"], note: "ICU spells this पन्द्रह, with the conjunct rather than the anusvara. Both are written; both are accepted here." },
  { n: 16, form: "सोलह", reading: "solah" },
  { n: 17, form: "सत्रह", reading: "satrah" },
  { n: 18, form: "अठारह", reading: "atharah" },
  { n: 19, form: "उन्नीस", reading: "unnis" },
  { n: 20, form: "बीस", reading: "bis", note: "Nothing in बीस comes from दो — Hindi numbers are learnt one by one, not built." },
  { n: 21, form: "इक्कीस", reading: "ikkis" },
  { n: 22, form: "बाईस", reading: "bais" },
  { n: 23, form: "तेईस", reading: "teis", note: "तेईस carries no trace of तीन or बीस. This is why Hindi is the exception in this app." },
  { n: 24, form: "चौबीस", reading: "chaubis" },
  { n: 25, form: "पच्चीस", reading: "pachchis" },
  { n: 26, form: "छब्बीस", reading: "chhabbis" },
  { n: 27, form: "सत्ताईस", reading: "sattais" },
  { n: 28, form: "अट्ठाईस", reading: "atthais" },
  { n: 29, form: "उनतीस", reading: "untis" },
  { n: 30, form: "तीस", reading: "tis" },
  { n: 31, form: "इकतीस", reading: "ikatis" },
  { n: 32, form: "बत्तीस", reading: "battis" },
  { n: 33, form: "तैंतीस", reading: "taintis" },
  { n: 34, form: "चौंतीस", reading: "chauntis" },
  { n: 35, form: "पैंतीस", reading: "paintis" },
  { n: 36, form: "छत्तीस", reading: "chhattis" },
  { n: 37, form: "सैंतीस", reading: "saintis" },
  { n: 38, form: "अड़तीस", reading: "adtis" },
  { n: 39, form: "उनतालीस", reading: "untalis" },
  { n: 40, form: "चालीस", reading: "chalis" },
  { n: 41, form: "इकतालीस", reading: "ikatalis" },
  { n: 42, form: "बयालीस", reading: "bayalis" },
  { n: 43, form: "तैंतालीस", reading: "taintalis" },
  { n: 44, form: "चवालीस", reading: "chavalis", alt: ["चौवालीस"], note: "ICU spells this चौवालीस. Both forms are attested; both are accepted." },
  { n: 45, form: "पैंतालीस", reading: "paintalis" },
  { n: 46, form: "छियालीस", reading: "chhiyalis" },
  { n: 47, form: "सैंतालीस", reading: "saintalis" },
  { n: 48, form: "अड़तालीस", reading: "adtalis" },
  { n: 49, form: "उनचास", reading: "unchas" },
  { n: 50, form: "पचास", reading: "pachas" },
  { n: 51, form: "इक्यावन", reading: "ikyavan" },
  { n: 52, form: "बावन", reading: "bavan" },
  { n: 53, form: "तिरेपन", reading: "tirepan" },
  { n: 54, form: "चौवन", reading: "chauvan" },
  { n: 55, form: "पचपन", reading: "pachpan" },
  { n: 56, form: "छप्पन", reading: "chhappan" },
  { n: 57, form: "सत्तावन", reading: "sattavan" },
  { n: 58, form: "अट्ठावन", reading: "atthavan" },
  { n: 59, form: "उनसठ", reading: "unsath" },
  { n: 60, form: "साठ", reading: "sath" },
  { n: 61, form: "इकसठ", reading: "ikasath" },
  { n: 62, form: "बासठ", reading: "basath" },
  { n: 63, form: "तिरसठ", reading: "tirsath", alt: ["तिरेसठ"], note: "ICU spells this तिरेसठ. Both forms are attested; both are accepted." },
  { n: 64, form: "चौंसठ", reading: "chaunsath" },
  { n: 65, form: "पैंसठ", reading: "painsath" },
  { n: 66, form: "छियासठ", reading: "chhiyasath" },
  { n: 67, form: "सड़सठ", reading: "sadsath" },
  { n: 68, form: "अड़सठ", reading: "adsath" },
  { n: 69, form: "उनहत्तर", reading: "unhattar" },
  { n: 70, form: "सत्तर", reading: "sattar" },
  { n: 71, form: "इकहत्तर", reading: "ikahattar" },
  { n: 72, form: "बहत्तर", reading: "bahattar" },
  { n: 73, form: "तिहत्तर", reading: "tihattar" },
  { n: 74, form: "चौहत्तर", reading: "chauhattar" },
  { n: 75, form: "पचहत्तर", reading: "pachhattar" },
  { n: 76, form: "छिहत्तर", reading: "chhihattar" },
  { n: 77, form: "सतहत्तर", reading: "satahattar" },
  { n: 78, form: "अठहत्तर", reading: "athhattar" },
  { n: 79, form: "उन्यासी", reading: "unyasi", alt: ["उनासी"], note: "ICU spells this उनासी. Both forms are attested; both are accepted." },
  { n: 80, form: "अस्सी", reading: "assi" },
  { n: 81, form: "इक्यासी", reading: "ikyasi" },
  { n: 82, form: "बयासी", reading: "bayasi" },
  { n: 83, form: "तिरासी", reading: "tirasi" },
  { n: 84, form: "चौरासी", reading: "chaurasi" },
  { n: 85, form: "पचासी", reading: "pachasi" },
  { n: 86, form: "छियासी", reading: "chhiyasi" },
  { n: 87, form: "सत्तासी", reading: "sattasi" },
  { n: 88, form: "अट्ठासी", reading: "atthasi" },
  { n: 89, form: "नवासी", reading: "navasi" },
  { n: 90, form: "नब्बे", reading: "nabbe" },
  { n: 91, form: "इक्यानबे", reading: "ikyanabe" },
  { n: 92, form: "बानबे", reading: "banabe" },
  { n: 93, form: "तिरानबे", reading: "tiranabe" },
  { n: 94, form: "चौरानबे", reading: "chauranabe" },
  { n: 95, form: "पंचानबे", reading: "panchanabe" },
  { n: 96, form: "छियानबे", reading: "chhiyanabe" },
  { n: 97, form: "सत्तानबे", reading: "sattanabe" },
  { n: 98, form: "अट्ठानबे", reading: "atthanabe" },
  { n: 99, form: "निन्यानबे", reading: "ninyanabe" },
  { n: 100, form: "सौ", reading: "sau", alt: ["एक सौ"], note: "सौ on its own is what you say counting; एक सौ spells out the one. Both are accepted." },
];

const find = (n: number): HiAtom => {
  const a = atoms.find((x) => x.n === n);
  if (!a) throw new Error(`hi: no atom for ${n}`);
  return a;
};

function compose(n: number): Item {
  if (n < 0 || n > 100) throw new RangeError(`hi: ${n} out of range`);
  const a = find(n);
  // One part, always. There is nothing to take apart.
  return { n, form: a.form, reading: a.reading, parts: [n], note: a.note, alt: a.alt };
}

export const hi: Language = { code: "hi", family: "Indo-Aryan", name: "Hindi", atoms, compose };
