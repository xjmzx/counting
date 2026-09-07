#!/usr/bin/env node
import { writeFileSync } from "node:fs";
import type { Item, Language } from "./types.ts";
import { zh } from "./lang/zh.ts";
import { fr } from "./lang/fr.ts";
import { de } from "./lang/de.ts";
import { golden } from "./golden.ts";
import { accepted, isCorrect, parseNumeral, fold } from "./grade.ts";
import {
  BASE_WEIGHT, EASE_CAP, emptyStat, pickNext, record, solidCount, weightOf,
  type Stats,
} from "./queue.ts";

const LANGS: Language[] = [zh, fr, de];
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
