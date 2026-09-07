# Large numbers: design notes

**Status:** phase 1 built (the scale ladders); the rest is proposal.
Written 2026-09-07.

**Scope narrowed 2026-09-07, after discussion.** Arbitrary precision is not the
target and never was: nobody says "four hundred seventy-three thousand eight
hundred twenty-nine dong". What is needed is *a one-to-three digit number
attached to a power word, repeated* — which is what a real price is:

    21,950,000₫  Vietnamese  hai mươi mốt triệu · chín trăm năm mươi nghìn
                             two chunks:  21 × 10⁶,  950 × 10³
                 Thai        ยี่สิบเอ็ดล้าน · เก้าแสน · ห้าหมื่น
                             three chunks: 21 × 10⁶,  9 × 10⁵,  5 × 10⁴

Thai never says "nine hundred fifty thousand". It names each power separately.
So the work is not "numbers to ten million"; it is the ladder, then 1–999, then
chunked composition — and the ladder alone already reaches 35,000₫ and 120฿.

## Why

The app stops at 100 because 0–100 is where the *rules* live. But the actual
target is transactional: understanding a price. A coffee in Hanoi is 35,000₫
and a meal in Bangkok is 120฿, and neither is reachable from a drill that ends
at ninety-nine.

This is a real scope change and the README currently says "0–100 and staying
there" in three places. It is worth making, but it is not a small extension of
the existing composers.

## The finding that shapes everything

There are **four** different grouping systems among the ten languages, not two.
The same amount decomposes differently in each:

| | 35,000 | how it groups |
|---|---|---|
| Vietnamese | ba mươi lăm **nghìn** | 35 × 10³ — thousands, like English |
| Thai | สาม**หมื่น**ห้า**พัน** | 3 × 10⁴ + 5 × 10³ — its own word at each power |
| Mandarin | 三**万**五**千** | 3 × 10⁴ + 5 × 10³ — myriad grouping |
| Hindi | पैंतीस **हज़ार** | 35 × 10³, but 10⁵ is लाख and 10⁷ करोड़ |

Each language's scaffolding words:

| | 10² | 10³ | 10⁴ | 10⁵ | 10⁶ | 10⁷ |
|---|---|---|---|---|---|---|
| Mandarin | 百 | 千 | **万** | 十万 | 百万 | 千万 |
| Japanese | 百 | 千 | **万** | 十万 | 百万 | 千万 |
| Thai | ร้อย | พัน | **หมื่น** | **แสน** | **ล้าน** | สิบล้าน |
| Vietnamese | trăm | nghìn | mười nghìn | trăm nghìn | **triệu** | mười triệu |
| Hindi | सौ | हज़ार | दस हज़ार | **लाख** | दस लाख | **करोड़** |
| French | cent | mille | dix mille | cent mille | **million** | dix millions |

Bold = a word that has to be learnt rather than composed.

**Thai carries the most scaffolding of any language here** — five distinct
power words to 10⁶, where French has three. And Thai's หมื่น behaves like
Mandarin 万, while Vietnamese has no 10⁴ word at all.

## What this changes

### 1. The drill unit stops being the number

At 0–100 every number can be drilled individually, and `queue.ts` tracks
progress per number across 101 entries. That does not extend: 0–9,999 is ten
thousand entries in `localStorage`, and most of them are amounts nobody says.

**Proposal: drill by shape above 100.** The thing being learnt is not "4,322"
but "a four-digit number with non-zero hundreds and a teens remainder". Track
progress against a shape key — digit count plus which positions are non-zero —
so the queue keeps working and stays small.

### 2. Scope should be curated, not a range

Three modes rather than one slider:

- **Powers** — just the scaffolding: 100, 1,000, 10,000, 100,000, 1,000,000 in
  each language. Perhaps twenty items, and the highest-value twenty in the
  whole app for a transactional aim.
- **Prices** — realistic amounts per currency. 35,000₫ and 120฿ are worth more
  than 8,231 of anything. Needs a small curated table per currency.
- **Range tiers** — 0–999 and 0–9,999 for systematic coverage, drilled by
  shape.

### 3. Verification gets stronger, not weaker

ICU spells arbitrary integers, so `crosscheck` extends free and can sample
thousands of forms per language instead of 101. This is the single best reason
to think the extension is tractable: the composers get harder, and the check
that catches errors in them gets much stronger at the same time.

Propose a fixed edge-case set plus a seeded random sample per run.

### 4. Grading needs a concession for German

German writes 4,322 as `viertausenddreihundertzweiundzwanzig` — one word,
thirty-four characters. Nobody types that twice.

**Proposal:** compare answers with all whitespace removed as well as with it
collapsed, so a learner may type it spaced. `fold` already collapses runs of
whitespace; it would need a second comparison with whitespace stripped
entirely. Low risk — it cannot make two different numbers collide, since the
existing collision assertion would catch that.

Above some threshold, writing may simply be the wrong skill and read/listen the
right ones.

## Per-language effort

| | difficulty | why |
|---|---|---|
| Mandarin, Japanese | easy | Regular myriad recursion. 千 and 万 are two more atoms. |
| Thai | moderate | Five power words, but each is regular once known. |
| Vietnamese | moderate | Thousands grouping; the existing ones-substitutions still apply inside each group. |
| Hindi | **easier than 1–99** | Above 100 it composes — एक सौ एक. The word list stays confined to 1–99. |
| Spanish, Portuguese, Italian | moderate | *doscientos*, *quinientos* are irregular; Italian keeps gluing. |
| German | moderate | Regular, but the output is one very long word. |
| French | **hardest** | `cent` takes an -s when it ends the number (deux cents) and loses it otherwise (deux cent un). `mille` never takes one. On top of the existing 70s and 80s. |

## Suggested order

1. ~~**Powers mode**, all ten languages.~~ **Done.** Each language carries a
   `scale` ladder of the powers it names with a word of its own, shown in the
   app as "Counting bigger — N scale words". The count differs by language and
   that is the lesson: Thai 5, Hindi 4, everything else 3. All 33 rungs verified
   against ICU by `make crosscheck`.
2. **1–999 for Mandarin, Japanese, Thai, Vietnamese** — the missing piece
   between the atoms and the ladder. A price needs the multiplier as much as
   the power word.
3. **Chunked composition** — N × power, repeated. This is what reaches
   21,950,000₫, and it needs no arbitrary-precision arithmetic.
4. ~~Mandarin, Japanese, Thai, Vietnamese to 999,999~~ — the four that matter
   for the stated aim, and the four where the grouping contrast is the lesson.
3. **Prices mode** with curated per-currency amounts.
4. **The rest of the languages**, French last.

## Open questions

- **Ceiling.** 10⁶ covers Vietnamese prices. 10⁷ would need Hindi करोड़ and
  Chinese 亿. Probably stop at 10⁶ and note the rest.
- **Does the "N words build all 101" line survive?** It becomes stronger —
  twelve words build 101, and roughly fifteen build a million. Worth keeping,
  with the range it describes made explicit.
- **Currency formatting** is a separate problem from number words. 35,000₫
  spoken is often shortened ("ba mươi lăm nghìn" → "băm lăm nghìn" colloquially,
  and Thai drops words too). Out of scope for a first pass, but it is the gap
  between this app and an actual market.

## What could go wrong

The composers stop being small. Today each language is 60–90 lines and reads
like a description of the language; French with the `cent` agreement and the
existing 70/80 rules will not. If a composer stops being readable, that is the
signal to split the range rules from the word tables rather than to keep
adding branches.
