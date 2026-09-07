#!/usr/bin/env node
import { writeFileSync } from "node:fs";
import type { Item, Language } from "./types.ts";
import { zh } from "./lang/zh.ts";
import { fr } from "./lang/fr.ts";
import { de } from "./lang/de.ts";
import { pt } from "./lang/pt.ts";
import { es } from "./lang/es.ts";
import { it } from "./lang/it.ts";
import { ja } from "./lang/ja.ts";
import { th } from "./lang/th.ts";
import { vi } from "./lang/vi.ts";
import { hi } from "./lang/hi.ts";
import { golden } from "./golden.ts";
import { accepted, isCorrect, parseNumeral, fold } from "./grade.ts";
import {
  BASE_WEIGHT, EASE_CAP, emptyStat, pickNext, record, solidCount, weightOf,
  type Stats,
} from "./queue.ts";
import { pickVoice, voicesFor, LOCALE_PREFERENCE, type Voice } from "./voices.ts";
import { SOUND_RULES, hintsFor } from "./sounds.ts";

const LANGS: Language[] = [zh, fr, it, pt, es, de, ja, th, vi, hi];
const RANGE = Array.from({ length: 101 }, (_, i) => i);

const all = (l: Language): Item[] => RANGE.map((n) => l.compose(n));


/** Width in terminal columns — CJK glyphs occupy two. */
const width = (s: string) =>
  [...s].reduce((w, c) => w + (/[⺀-鿿＀-｠]/.test(c) ? 2 : 1), 0);
const pad = (s: string, n: number) => s + " ".repeat(Math.max(0, n - width(s)));

function table() {
  const cols = LANGS.map((l) => {
    const cells = all(l).map((i) => i.form + (i.reading ? `  ${i.reading}` : ""));
    return { name: l.name, cells, w: Math.max(width(l.name), ...cells.map(width)) + 2 };
  });
  console.log("    " + cols.map((c) => pad(c.name, c.w)).join(""));
  console.log("    " + cols.map((c) => pad("─".repeat(c.w - 2), c.w)).join(""));
  for (const n of RANGE) {
    console.log(
      String(n).padStart(3) + " " + cols.map((c) => pad(c.cells[n] ?? "", c.w)).join(""),
    );
  }
}

function check(): boolean {
  let bad = 0;
  let checked = 0;
  for (const l of LANGS) {
    const want = golden[l.code] ?? {};
    for (const [k, expected] of Object.entries(want)) {
      checked++;
      const got = l.compose(Number(k)).form;
      if (got !== expected) {
        console.error(`  ✗ ${l.code} ${k}: expected "${expected}", got "${got}"`);
        bad++;
      }
    }
    // Every number must produce something, and only from declared atoms.
    const declared = new Set(l.atoms.map((a) => a.n));
    for (const n of RANGE) {
      const it = l.compose(n);
      if (!it.form.trim()) { console.error(`  ✗ ${l.code} ${n}: empty form`); bad++; }
      for (const p of it.parts) {
        if (!declared.has(p) && !(l.code === "de" && p % 10 === 0)) {
          console.error(`  ✗ ${l.code} ${n}: part ${p} is not a declared atom`); bad++;
        }
      }
    }
    // No two numbers may share a form, or the drills become unanswerable.
    const seen = new Map<string, number>();
    for (const n of RANGE) {
      const f = l.compose(n).form;
      if (seen.has(f)) { console.error(`  ✗ ${l.code}: ${seen.get(f)} and ${n} are both "${f}"`); bad++; }
      seen.set(f, n);
    }
  }
  // Grading. Every number must accept its own form, and the tolerances we
  // advertise must actually hold.
  for (const l of LANGS) {
    for (const n of RANGE) {
      if (!isCorrect(l, n, l.compose(n).form)) {
        console.error(`  ✗ ${l.code} ${n}: does not accept its own written form`); bad++;
      }
      const r = l.compose(n).reading;
      if (r && !isCorrect(l, n, r)) {
        console.error(`  ✗ ${l.code} ${n}: does not accept its own reading`); bad++;
      }
    }
  }
  // Folding is lossy — tones and diacritics go. If two numbers ever fold onto
  // one accepted string, the grader marks a wrong answer correct and a
  // listening drill has two right answers.
  for (const l of LANGS) {
    const owner = new Map<string, number>();
    for (const n of RANGE) {
      for (const a of accepted(l, n)) {
        const prev = owner.get(a);
        if (prev !== undefined) {
          console.error(`  ✗ ${l.code}: ${prev} and ${n} both accept "${a}"`); bad++;
        }
        owner.set(a, n);
      }
    }
  }

  const tolerances: [string, number, string][] = [
    ["fr", 21, "vingt-et-un"],        // 1990 reform hyphenation
    ["fr", 21, "VINGT ET UN"],        // case and separator
    ["fr", 97, "quatre vingt dix sept"],
    ["fr", 0, "zero"],                // missing diacritic
    ["de", 30, "dreissig"],           // no ß on a UK keyboard
    ["de", 36, "sechsunddreissig"],
    ["de", 5, "funf"],
    ["zh", 73, "qi shi san"],         // pinyin without tone marks
    ["zh", 73, "七十三"],
    ["ja", 23, "二十三"],          // kanji
    ["ja", 23, "にじゅうさん"],      // kana, for anyone with an IME
    ["ja", 23, "nijūsan"],         // romaji with a macron
    ["ja", 23, "nijuusan"],        // and without one
    ["ja", 4, "shi"],              // the other reading, standing alone, is real
    ["ja", 0, "ゼロ"],
    ["ja", 0, "〇"],
    ["th", 11, "สิบเอ็ด"],
    ["th", 11, "sip et"],       // romanised, spaced
    ["th", 11, "sipet"],        // or not
    ["vi", 24, "hai mươi tư"],
    ["vi", 24, "hai mươi bốn"], // bốn is still said alongside tư
    ["vi", 24, "hai muoi tu"],  // no Vietnamese keyboard to hand
    ["vi", 11, "mười một"],
    ["vi", 11, "muoi mot"],
    ["de", 5, "fünf"],          // marks typed correctly still pass
    ["es", 22, "veintidós"],
    ["zh", 73, "qī shí sān"],
  ];
  for (const [code, n, typed] of tolerances) {
    const l = LANGS.find((x) => x.code === code)!;
    if (!isCorrect(l, n, typed)) {
      console.error(`  ✗ ${code} ${n}: should accept "${typed}"`); bad++;
    }
  }
  // And it must still reject. A grader that accepts everything passes the above.
  const rejects: [string, number, string][] = [
    ["fr", 21, "vingt deux"],
    ["fr", 80, "quatre-vingt"],       // 80 alone takes the plural -s
    ["de", 36, "sechunddreissig"],    // the stem trap
    ["de", 16, "sechszehn"],
    ["zh", 73, "qi shi si"],
    ["fr", 21, ""],
    // The other readings are wrong *in compounds* — counting says yonjūnana,
    // not yonjūshichi. Accepting them would defeat the point of the drill.
    ["ja", 23, "nijuushi"],
    ["ja", 47, "yonjuushichi"],
    ["th", 20, "สองสิบ"],        // twenty is ยี่สิบ, never สองสิบ
    // An answer carrying tone marks is held to them. Folding the tones away
    // let mười mốt pass for 11 — the exact substitution Vietnamese turns on.
    ["vi", 11, "mười mốt"],
    ["vi", 21, "hai mươi một"],
    ["vi", 15, "mười năm"],
    ["es", 22, "veintidús"],
  ];
  for (const [code, n, typed] of rejects) {
    const l = LANGS.find((x) => x.code === code)!;
    if (isCorrect(l, n, typed)) {
      console.error(`  ✗ ${code} ${n}: should NOT accept "${typed}"`); bad++;
    }
  }
  // The weighted queue. A bug here is invisible: the drill still works, it
  // just teaches badly, so none of this is checkable by looking at the UI.
  {
    // Seeded PRNG — deterministic, and unlike a short cycling list it actually
    // spreads across the range, which a coverage assertion needs.
    const mulberry32 = (seed: number) => () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };

    const settled = record({}, 1, true);
    const m1 = record({}, 2, false);
    const m2 = record(m1, 2, false);
    const m3 = record(m2, 2, false);
    const order = [
      weightOf(settled[1]), weightOf(m1[2]), weightOf(undefined), weightOf(m2[2]), weightOf(m3[2]),
    ];
    // settled < missed once < unseen < missed twice < missed thrice.
    if (!order.every((w, i) => i === 0 || w > order[i - 1]!)) {
      console.error(`  ✗ queue: weight policy out of order: ${order.join(" ")}`); bad++;
    }

    // A miss decays back to the floor as it is got right, and does not overshoot.
    let st: Stats = record({}, 5, false);
    for (let i = 0; i < 10; i++) st = record(st, 5, true);
    if (st[5]!.ease !== 0) { console.error("  ✗ queue: ease never settles"); bad++; }
    if (weightOf(st[5]) !== BASE_WEIGHT) { console.error("  ✗ queue: settled weight wrong"); bad++; }
    if (st[5]!.wrong !== 1 || st[5]!.seen !== 11) { console.error("  ✗ queue: counters wrong"); bad++; }

    // Repeated misses stop compounding.
    st = {};
    for (let i = 0; i < 20; i++) st = record(st, 7, false);
    if (st[7]!.ease !== EASE_CAP) { console.error("  ✗ queue: ease not capped"); bad++; }

    // Never repeats immediately, always in range, and starves nothing.
    st = {};
    const rnd = mulberry32(20260907);
    const hits = new Set<number>();
    let prev: number | null = null;
    for (let i = 0; i < 6000; i++) {
      const n = pickNext(100, st, prev, rnd);
      if (n < 0 || n > 100) { console.error(`  ✗ queue: picked ${n}, out of range`); bad++; break; }
      if (n === prev) { console.error(`  ✗ queue: repeated ${n} immediately`); bad++; break; }
      hits.add(n);
      st = record(st, n, true);
      prev = n;
    }
    if (hits.size !== 101) {
      console.error(`  ✗ queue: only ${hits.size}/101 numbers ever came up`); bad++;
    }

    // A single-number range has nothing else to offer, so it may repeat.
    if (pickNext(0, {}, 0, () => 0.5) !== 0) {
      console.error("  ✗ queue: cannot ask the only number in range"); bad++;
    }

    // The weighting has to actually bite. 13 carries weight 10 against twenty
    // settled numbers at 1, so it should be drawn about a third of the time.
    let biased: Stats = {};
    for (let n = 0; n <= 20; n++) biased = record(biased, n, true);
    for (let i = 0; i < 3; i++) biased = record(biased, 13, false);
    const draws = 20000;
    const fair = mulberry32(1234567);
    let hot = 0;
    for (let i = 0; i < draws; i++) if (pickNext(20, biased, null, fair) === 13) hot++;
    if (hot < draws * 0.28 || hot > draws * 0.39) {
      console.error(`  ✗ queue: missed number drawn ${hot}/${draws}, expected ~1/3`); bad++;
    }

    // Progress readout counts settled numbers only.
    const prog: Stats = record(record({}, 1, true), 2, false);
    if (solidCount(prog, 100) !== 1) { console.error("  ✗ queue: solidCount wrong"); bad++; }
    if (emptyStat().seen !== 0) { console.error("  ✗ queue: emptyStat wrong"); bad++; }
    checked += 12;
  }

  // Language families. The picker groups by them and draws a divider where the
  // family changes, so a family split across the roster would render as two
  // groups with the same name.
  {
    const seen = new Set<string>();
    let prev = "";
    for (const l of LANGS) {
      if (!l.family?.trim()) { console.error(`  ✗ family: ${l.code} has none`); bad++; continue; }
      if (l.family !== prev) {
        if (seen.has(l.family)) {
          console.error(`  ✗ family: ${l.family} is split across the roster — group it`); bad++;
        }
        seen.add(l.family);
        prev = l.family;
      }
    }
    checked += LANGS.length;
  }

  // Voice selection. Picking a zh_HK voice for Mandarin would read every
  // answer aloud in Cantonese, and nothing on screen would look wrong.
  {
    const sample: Voice[] = [
      { name: "Sinji", locale: "zh_HK" },
      { name: "Meijia", locale: "zh_TW" },
      { name: "Tingting", locale: "zh_CN" },
      { name: "Amélie", locale: "fr_CA" },
      { name: "Thomas", locale: "fr_FR" },
      { name: "Anna", locale: "de_DE" },
      { name: "Albert", locale: "en_US" },
    ];
    if (voicesFor("zh", sample).some((v) => v.locale === "zh_HK")) {
      console.error("  ✗ voices: offered a Cantonese voice for Mandarin"); bad++;
    }
    if (pickVoice("zh", sample)?.name !== "Tingting") {
      console.error("  ✗ voices: zh should prefer zh_CN"); bad++;
    }
    if (pickVoice("fr", sample)?.name !== "Thomas") {
      console.error("  ✗ voices: fr should prefer fr_FR over fr_CA"); bad++;
    }
    // The character voices are theatrical by design — the wrong thing to
    // learn pronunciation from, and they sort first alphabetically.
    const withCharacters: Voice[] = [
      { name: "Eddy (French (France))", locale: "fr_FR" },
      { name: "Grandma (French (France))", locale: "fr_FR" },
      { name: "Jacques", locale: "fr_FR" },
      { name: "Thomas", locale: "fr_FR" },
    ];
    if (pickVoice("fr", withCharacters)?.name !== "Jacques") {
      console.error("  ✗ voices: a character voice outranked a standard one"); bad++;
    }
    if (voicesFor("fr", withCharacters).at(-1)?.name !== "Grandma (French (France))") {
      console.error("  ✗ voices: character voices should sort last"); bad++;
    }
    if (pickVoice("de", sample)?.name !== "Anna") {
      console.error("  ✗ voices: de should pick de_DE"); bad++;
    }
    if (voicesFor("fr", sample).some((v) => !v.locale.startsWith("fr"))) {
      console.error("  ✗ voices: leaked a non-French voice into fr"); bad++;
    }
    if (pickVoice("zh", []) !== null) {
      console.error("  ✗ voices: should return null when none are installed"); bad++;
    }
    // Hyphenated locales (BCP-47) must match too.
    if (pickVoice("de", [{ name: "X", locale: "de-DE" }])?.name !== "X") {
      console.error("  ✗ voices: de-DE not recognised"); bad++;
    }
    // Every language the app ships must have a preference list.
    for (const l of LANGS) {
      if (!LOCALE_PREFERENCE[l.code]?.length) {
        console.error(`  ✗ voices: no locale preference for ${l.code}`); bad++;
      }
    }
    checked += 10;
  }

  // Pronunciation hints. A rule that matches nothing is dead weight; a
  // language with poor coverage is the gap worth knowing about.
  {
    const ids = new Set<string>();
    for (const [code, rules] of Object.entries(SOUND_RULES)) {
      const lang = LANGS.find((l) => l.code === code);
      if (!lang) { console.error(`  ✗ sounds: rules for unknown language ${code}`); bad++; continue; }
      for (const r of rules) {
        if (ids.has(r.id)) { console.error(`  ✗ sounds: duplicate rule id ${r.id}`); bad++; }
        ids.add(r.id);
        if (!RANGE.some((n) => r.test.test(lang.compose(n).form))) {
          console.error(`  ✗ sounds: rule ${r.id} matches no number in 0-100`); bad++;
        }
        if (r.evidence && r.evidence[0] === r.evidence[1]) {
          console.error(`  ✗ sounds: rule ${r.id} probes a word against itself`); bad++;
        }
        if (!r.hint.trim()) { console.error(`  ✗ sounds: rule ${r.id} has no hint`); bad++; }
      }
      // Every language the app ships must have some coverage, or the drill
      // reveals a spelling with nothing to stop it being misread.
      const covered = RANGE.filter((n) => hintsFor(code, lang.compose(n).form).length > 0).length;
      // 90%, not 100%: a few words really do read the way an English speaker
      // would guess (null, elf, hundert), and inventing a hint for those would
      // be noise. A new language falling below this has a real gap.
      if (covered < RANGE.length * 0.9) {
        console.error(`  ✗ sounds: ${code} explains only ${covered}/101 numbers`); bad++;
      }
    }
    for (const l of LANGS) {
      if (!SOUND_RULES[l.code]?.length) {
        console.error(`  ✗ sounds: no rules for ${l.code}`); bad++;
      }
    }
    // The limit has to hold, or a compound number buries the drill in prose.
    if (hintsFor("de", "vierundzwanzig", 2).length > 2) {
      console.error("  ✗ sounds: hint limit not applied"); bad++;
    }
    checked += ids.size + LANGS.length;
  }

  if (parseNumeral("073") !== 73 || parseNumeral("101") !== null || parseNumeral("x") !== null) {
    console.error("  ✗ parseNumeral is wrong"); bad++;
  }
  if (fold(" Quatre-Vingts ") !== "quatre vingts") { console.error("  ✗ fold is wrong"); bad++; }
  checked += 303 * 2 + tolerances.length + rejects.length;

  console.log(bad === 0
    ? `✓ ${checked} assertions pass — golden forms, invariants, and grading tolerances`
    : `✗ ${bad} problem(s)`);
  return bad === 0;
}

function stats() {
  console.log("\nAtoms you actually have to memorise:");
  for (const l of LANGS) {
    const irregular = l.atoms.filter((a) => a.note).length;
    console.log(`  ${l.code}  ${String(l.atoms.length).padStart(2)} atoms  →  101 numbers   (${irregular} carry a note)`);
  }
  console.log("\nIrregularities surfaced to the learner:");
  for (const l of LANGS) {
    const noted = RANGE.map((n) => l.compose(n)).filter((i) => i.note);
    console.log(`  ${l.code}  ${noted.length} numbers: ${noted.map((i) => i.n).join(", ")}`);
  }
}

function emit() {
  const data = Object.fromEntries(LANGS.map((l) => [l.code, { name: l.name, atoms: l.atoms, items: all(l) }]));
  writeFileSync("numbers.json", JSON.stringify(data, null, 2));
  const tsv = ["lang\tn\theadword\treading\tparts\tnote"];
  for (const l of LANGS) for (const i of all(l)) {
    tsv.push([l.code, i.n, i.form, i.reading ?? "", i.parts.join("+"), i.note ?? ""].join("\t"));
  }
  writeFileSync("numbers.tsv", tsv.join("\n") + "\n");
  console.log("wrote numbers.json and numbers.tsv");
}

const cmd = process.argv[2] ?? "table";
if (cmd === "table") table();
else if (cmd === "check") process.exit(check() ? 0 : 1);
else if (cmd === "stats") stats();
else if (cmd === "emit") emit();
else if (cmd === "all") { table(); stats(); console.log(); check() || process.exit(1); }
else { console.error(`usage: node compose.ts [table|check|stats|emit|all]`); process.exit(2); }
