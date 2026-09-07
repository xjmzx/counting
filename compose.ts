#!/usr/bin/env node
import { existsSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
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
import { en } from "./lang/en.ts";
import { golden } from "./golden.ts";
import { accepted, isCorrect, parseNumeral, fold } from "./grade.ts";
import {
  BASE_WEIGHT, EASE_CAP, emptyStat, pickNext, record, solidCount, weightOf,
  type Stats,
} from "./queue.ts";
import { pickVoice, voicesFor, LOCALE_PREFERENCE, type Voice } from "./voices.ts";
import { SOUND_RULES, SCRIPT_RULES, hintsFor, scriptHintsFor } from "./sounds.ts";
import { readWav, writeWav, trim, inspectWav, ALLOWED_CHUNKS, MARGIN_MS, type Wav } from "./tools/wav.ts";
import { parseNumbers, describeNumbers } from "./tools/numspec.ts";
import { keyOf } from "./tools/keys.ts";
import { syllables } from "./tools/syllables.ts";

const LANGS: Language[] = [zh, fr, it, pt, es, en, de, hi, ja, th, vi];
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
      if (!l.branch?.trim()) { console.error(`  ✗ family: ${l.code} has no branch`); bad++; }
      if (!l.numerals?.trim()) { console.error(`  ✗ family: ${l.code} says nothing about its numerals`); bad++; }
      if (l.family !== prev) {
        if (seen.has(l.family)) {
          console.error(`  ✗ family: ${l.family} is split across the roster — group it`); bad++;
        }
        seen.add(l.family);
        prev = l.family;
      }
    }
    // Branches must be contiguous inside a family too, or the note flips back
    // and forth as you move along one pill.
    const seenBranch = new Set<string>();
    let prevBranch = "";
    for (const l of LANGS) {
      const key = `${l.family}/${l.branch}`;
      if (key !== prevBranch) {
        if (seenBranch.has(key)) {
          console.error(`  ✗ family: branch ${key} is split across the roster`); bad++;
        }
        seenBranch.add(key);
        prevBranch = key;
      }
    }
    checked += LANGS.length * 2;
  }

  // Script rules: same discipline as the sound rules. A rule matching nothing
  // is dead weight, and one firing on a single-word form while talking about
  // word boundaries is worse than nothing.
  {
    const ids = new Set<string>();
    for (const [code, rules] of Object.entries(SCRIPT_RULES)) {
      const lang = LANGS.find((l) => l.code === code);
      if (!lang) { console.error(`  ✗ script: rules for unknown language ${code}`); bad++; continue; }
      for (const r of rules) {
        if (ids.has(r.id)) { console.error(`  ✗ script: duplicate rule id ${r.id}`); bad++; }
        ids.add(r.id);
        if (!RANGE.some((n) => r.test.test(lang.compose(n).form))) {
          console.error(`  ✗ script: rule ${r.id} matches no number in 0-100`); bad++;
        }
      }
    }
    // The word-boundary rule must not fire on a form that is one word.
    const thTen = LANGS.find((l) => l.code === "th")!.compose(10).form;
    if (scriptHintsFor("th", thTen, 9).some((r) => r.id === "th-no-spaces")) {
      console.error("  ✗ script: th-no-spaces fires on สิบ, which is a single word"); bad++;
    }
    checked += ids.size + 1;
  }

  // The scale ladder. Only powers with a word of their own belong on it, and
  // that is the point: Vietnamese has no rung at 10^4 while Thai has one at
  // every power to a million. A stray composed entry would flatten exactly the
  // difference the ladder exists to show.
  {
    for (const l of LANGS) {
      if (!l.scale?.length) { console.error(`  ✗ scale: ${l.code} has none`); bad++; continue; }
      let prev = 0;
      for (const w of l.scale) {
        if (w.power <= prev) {
          console.error(`  ✗ scale: ${l.code} powers not ascending at 10^${w.power}`); bad++;
        }
        prev = w.power;
        if (!w.form.trim()) { console.error(`  ✗ scale: ${l.code} 10^${w.power} has no form`); bad++; }
        if (w.power < 2) { console.error(`  ✗ scale: ${l.code} 10^${w.power} belongs in atoms`); bad++; }
      }
      // A hundred is named in every language here, so its absence is a slip.
      if (!l.scale.some((w) => w.power === 2)) {
        console.error(`  ✗ scale: ${l.code} has no word for a hundred`); bad++;
      }
    }
    // The ladders really do differ in length; if they ever all matched, the
    // table would have been filled in from one language rather than each.
    const lengths = new Set(LANGS.map((l) => l.scale.length));
    if (lengths.size < 2) { console.error("  ✗ scale: every ladder is the same length"); bad++; }
    checked += LANGS.length;
  }

  // Clip trimming. This writes the files the app plays, and the way it fails
  // is by eating the first phoneme — inaudible in a spectrogram, obvious only
  // to someone listening to all 101 takes in order.
  {
    const rate = 22050;
    const tone = (n: number, amp: number) =>
      Int16Array.from({ length: n }, (_, i) => Math.round(Math.sin(i / 8) * amp));
    const silence = (n: number) => new Int16Array(n);
    const join = (...xs: Int16Array[]) => {
      const out = new Int16Array(xs.reduce((k, x) => k + x.length, 0));
      let o = 0;
      for (const x of xs) { out.set(x, o); o += x.length; }
      return out;
    };
    // Half a second of nothing, a fifth of a second of "speech", a second of
    // nothing: the shape of a real take with a run-up and a pause after.
    const lead = Math.round(rate * 0.5);
    const word = Math.round(rate * 0.2);
    const w: Wav = { rate, channels: 1, samples: join(silence(lead), tone(word, 12000), silence(rate)) };
    const { trimmed, peak, after } = trim(w);
    const margin = (MARGIN_MS / 1000) * 2;

    if (Math.abs(after - (0.2 + margin)) > 0.03) {
      console.error(`  ✗ wav: trimmed to ${after.toFixed(3)}s, expected the word plus two margins`); bad++;
    }
    if (trimmed.samples.length >= w.samples.length) {
      console.error("  ✗ wav: trimming removed nothing"); bad++;
    }
    // The margin must survive: a word that starts on sample zero sounds clipped.
    const head = trimmed.samples.slice(0, Math.round(rate * 0.03));
    if (head.some((v) => Math.abs(v) > 2000)) {
      console.error("  ✗ wav: no lead-in left; the word would start abruptly"); bad++;
    }
    if (Math.abs(peak - 12000 / 32768) > 0.01) {
      console.error(`  ✗ wav: peak reported as ${peak.toFixed(3)}`); bad++;
    }
    // The take as it actually arrives: Enter is pressed, the click lands at the
    // head of the file, and the word follows after a beat. The click is made
    // louder than the voice on purpose — that is the real case, and it is what
    // defeated the previous single-sample gate, which anchored to the click and
    // kept the gap behind it. Thirty of the first forty-one English takes came
    // out of the recorder that way.
    {
      const click = Int16Array.from({ length: Math.round(rate * 0.004) }, (_, i) =>
        Math.round(Math.sin(i / 2) * 20000 * (1 - i / Math.round(rate * 0.004))));
      const gap = Math.round(rate * 0.7);
      const real: Wav = { rate, channels: 1, samples: join(click, silence(gap), tone(word, 9000), silence(Math.round(rate * 0.4))) };
      const t = trim(real);
      if (Math.abs(t.after - (0.2 + margin)) > 0.04) {
        console.error(`  ✗ wav: a take with a keypress trimmed to ${t.after.toFixed(3)}s, expected the word plus two margins`); bad++;
      }
      // The click must be gone, not merely off the front — if any of it were
      // kept the clip would open on a snap.
      if (t.trimmed.samples.some((v) => Math.abs(v) > 15000)) {
        console.error("  ✗ wav: the keypress survived into the clip"); bad++;
      }
      // And the level reported must be the voice, not the click, or a quiet
      // take with a heavy keypress reads as well recorded.
      if (Math.abs(t.peak - 9000 / 32768) > 0.01) {
        console.error(`  ✗ wav: peak reported as ${t.peak.toFixed(3)}, which is the keypress, not the word`); bad++;
      }
      checked += 3;

      // A word ending in a fricative. This is the case that amplitude alone
      // cannot see: /s/ carries a fraction of the energy of the vowel before
      // it, and in "six" the /k/ is a silent closure, so the /s/ also sits
      // behind a gap and looks exactly like a stray click. Under a broadband
      // gate a final /s/ below 6% of the vowel lost all 150 ms of itself —
      // measured, not supposed — and the speaker hears it as their own
      // mispronunciation rather than as the tool eating the word.
      //
      // six, dix, sechs, seis, sei: this is most of the languages here.
      {
        // Deterministic noise, so a failure is reproducible.
        let seed = 12345;
        const noise = (ms: number, amp: number) =>
          Int16Array.from({ length: Math.round(rate * ms / 1000) }, () => {
            seed = (seed * 1103515245 + 12345) & 0x7fffffff;
            return Math.round((seed / 0x3fffffff - 1) * amp);
          });
        const vowel = 12000;
        for (const pct of [5, 8, 20]) {
          const six: Wav = { rate, channels: 1, samples: join(
            silence(Math.round(rate * 0.3)),
            tone(Math.round(rate * 0.2), vowel),
            silence(Math.round(rate * 0.06)),     // the /k/ closure
            noise(150, Math.round(vowel * pct / 100)),
            silence(Math.round(rate * 0.4))) };
          const t = trim(six);
          // The fricative ends 0.71s in. Everything up to there must be kept.
          const kept = t.head + t.after;
          if (kept < 0.71) {
            console.error(`  ✗ wav: a final fricative at ${pct}% of the vowel was cut — kept to ${kept.toFixed(2)}s of 0.71s`); bad++;
          }
          checked++;
        }
        // A word ending in a stop: "hundred". The /d/ is a closure — silence —
        // followed by a release burst about 10 ms long and a tenth the level
        // of the vowel. That is a gap followed by a transient, which is the
        // exact shape of a keypress, and a rule that cut trailing clicks
        // removed it. The rule is gone: measured on real takes, the keypress
        // that stops a recording lands 230 ms after the last syllable and is
        // already outside the margin, while everything a tail rule could
        // actually reach belongs to the word.
        {
          const hundred: Wav = { rate, channels: 1, samples: join(
            silence(Math.round(rate * 0.3)),
            tone(Math.round(rate * 0.25), vowel),
            silence(Math.round(rate * 0.05)),      // the closure
            noise(12, Math.round(vowel * 0.08)),   // the release
            silence(Math.round(rate * 0.4))) };
          const t = trim(hundred);
          // The release ends at 0.612s; losing it entirely ends the clip near
          // 0.42s, so a frame of slack here still separates the two outcomes.
          if (t.head + t.after < 0.61) {
            console.error(`  ✗ wav: a final stop release was cut — kept to ${(t.head + t.after).toFixed(3)}s of 0.612s`); bad++;
          }
          checked++;
        }

        // A syllable that fades in steps rather than smoothly — a nasal on its
        // way out dips below the gate and returns. Requiring frames to be
        // strictly consecutive ends the word at the first dip.
        {
          const fading: Wav = { rate, channels: 1, samples: join(
            silence(Math.round(rate * 0.3)),
            tone(Math.round(rate * 0.2), vowel),
            ...[0.5, 0.28, 0.16, 0.09].flatMap((f) => [
              tone(Math.round(rate * 0.03), Math.round(vowel * f)),
              silence(Math.round(rate * 0.02)),
            ]),
            silence(Math.round(rate * 0.4))) };
          const t = trim(fading);
          if (t.head + t.after < 0.69) {
            console.error(`  ✗ wav: a fading syllable was cut at its first dip — kept to ${(t.head + t.after).toFixed(3)}s of 0.70s`); bad++;
          }
          checked++;
        }

        // The Enter that stops a take, landing well after the last syllable.
        // It sustains long enough to count as sound, so unless it is discarded
        // it becomes the end of the word and everything between is kept — nine
        // of the finished English clips ran on for up to a further second.
        {
          const withStray: Wav = { rate, channels: 1, samples: join(
            silence(Math.round(rate * 0.3)),
            tone(Math.round(rate * 0.35), vowel),
            silence(Math.round(rate * 0.55)),
            noise(70, Math.round(vowel * 0.2)),
            silence(Math.round(rate * 0.3))) };
          const t = trim(withStray);
          if (t.after > 0.35 + 2 * MARGIN_MS / 1000 + 0.02) {
            console.error(`  ✗ wav: a stray after the word was kept — ${t.after.toFixed(2)}s for a 0.35s word`); bad++;
          }
          checked++;
        }

        // But a real syllable after a real pause is not a stray, however long
        // the pause. Only brevity separates the two, which is why both
        // conditions are required: losing speech here cannot be undone.
        {
          const slow: Wav = { rate, channels: 1, samples: join(
            silence(Math.round(rate * 0.3)),
            tone(Math.round(rate * 0.35), vowel),
            silence(Math.round(rate * 0.55)),
            tone(Math.round(rate * 0.3), Math.round(vowel * 0.5)),
            silence(Math.round(rate * 0.3))) };
          const t = trim(slow);
          if (t.after < 1.2) {
            console.error(`  ✗ wav: a drawn-out second syllable was discarded — kept ${t.after.toFixed(2)}s of 1.2s`); bad++;
          }
          checked++;
        }

        // And the opposite error: room hiss must not read as a word.
        const hissOnly: Wav = { rate, channels: 1, samples: join(
          noise(300, 300), tone(Math.round(rate * 0.2), vowel), noise(400, 300)) };
        const h = trim(hissOnly);
        if (h.after > 0.45) {
          console.error(`  ✗ wav: hiss counted as speech — kept ${h.after.toFixed(2)}s of a 0.2s word`); bad++;
        }
        checked++;
      }

      // Everything the trim removes has to be accounted for at one end or the
      // other. This is what the recorder now prints, and the reason it prints
      // it: "1.80s → 0.80s" on its own reads as though a second of the word
      // had gone missing, and someone holding a microphone will re-record four
      // times over that. head + word + tail = what was captured, exactly.
      for (const [what, t] of [["a clean take", trim(w)], ["a take with a keypress", trim(real)]] as const) {
        if (Math.abs(t.head + t.after + t.tail - t.before) > 1e-6) {
          console.error(`  ✗ wav: ${what} — ${t.head.toFixed(3)} + ${t.after.toFixed(3)} + ${t.tail.toFixed(3)} is not ${t.before.toFixed(3)}`); bad++;
        }
        if (t.head < 0 || t.tail < 0) {
          console.error(`  ✗ wav: ${what} reports negative silence`); bad++;
        }
        checked += 2;
      }

      // Trimming has to settle. It is applied to a fresh take by the recorder
      // and again by `make cliptrim` to files the old one produced, so "trim
      // of a trimmed clip is that clip" is what makes the second safe to run
      // at all. It did not hold at first: the margin was a whole number of
      // milliseconds but not of frames, so every pass moved the word three
      // samples off the grid and took three more — inaudible, and unbounded.
      const once = trim(real);
      const twice = trim(once.trimmed);
      const thrice = trim(twice.trimmed);
      // A pass may legitimately follow the first, since discarding a click
      // louder than the voice changes what counts as loud. By the third there
      // is nothing left to learn and it must stand still.
      if (thrice.trimmed.samples.length !== twice.trimmed.samples.length) {
        console.error(`  ✗ wav: trimming does not settle — ${twice.trimmed.samples.length} then ${thrice.trimmed.samples.length} samples`); bad++;
      }
      // Clean input, no click: settled from the very first pass.
      const plain = trim(w);
      if (trim(plain.trimmed).trimmed.samples.length !== plain.trimmed.samples.length) {
        console.error("  ✗ wav: trimming a clean take twice is not the same as once"); bad++;
      }
      checked += 2;
    }

    // Silence must survive rather than being trimmed to nothing, so a failed
    // take is reported as silent instead of being written as a valid clip.
    const quiet = trim({ rate, channels: 1, samples: silence(rate) });
    if (quiet.peak !== 0) { console.error("  ✗ wav: silence has a peak"); bad++; }

    // Round-trip: what is written must read back identically.
    const tmp = `${tmpdir()}/counting-wav-check.wav`;
    writeWav(tmp, trimmed);
    const back = readWav(tmp);
    rmSync(tmp, { force: true });
    if (!back || back.rate !== rate || back.channels !== 1) {
      console.error("  ✗ wav: header did not survive a round trip"); bad++;
    } else if (back.samples.length !== trimmed.samples.length) {
      console.error(`  ✗ wav: ${trimmed.samples.length} samples in, ${back.samples.length} out`); bad++;
    } else if (back.samples.some((v, i) => v !== trimmed.samples[i])) {
      console.error("  ✗ wav: samples changed in a round trip"); bad++;
    }
    checked += 7;
  }

  // Committed clips carry no metadata.
  //
  // A WAV can hold LIST/INFO with an artist, a date and the software that made
  // it, so a clip exported from an editor is a small biography of whoever
  // recorded it. The recorder strips all of that by rebuilding the file from
  // samples — but a contributed clip need not have come through the recorder,
  // and this is the check that stands between one and the repository.
  {
    // Nothing is written by writeWav that is not fmt and data.
    const tmp2 = `${tmpdir()}/counting-meta-check.wav`;
    writeWav(tmp2, { rate: 22050, channels: 1, samples: new Int16Array(2205) });
    const own = inspectWav(tmp2);
    rmSync(tmp2, { force: true });
    if (!own || own.chunks.join(",") !== ALLOWED_CHUNKS.join(",")) {
      console.error(`  ✗ clips: writeWav emitted ${own?.chunks.join(", ")}`); bad++;
    }

    // And every clip actually committed. Absent on a bare clone, which is
    // normal — synthesised languages are gitignored by design.
    let scanned = 0;
    for (const dir of existsSync("clips") ? readdirSync("clips") : []) {
      const langDir = `clips/${dir}`;
      if (!statSync(langDir).isDirectory()) continue;
      for (const f of readdirSync(langDir).filter((x) => x.endsWith(".wav"))) {
        const path = `${langDir}/${f}`;
        const w = inspectWav(path);
        scanned++;
        if (!w) { console.error(`  ✗ clips: ${path} is not a readable WAV`); bad++; continue; }
        const extra = w.chunks.filter((c) => !ALLOWED_CHUNKS.includes(c));
        if (extra.length) {
          console.error(`  ✗ clips: ${path} carries ${extra.join(", ")} — run \`make clipclean L=${dir}\``); bad++;
        }
        if (w.rate !== 22050 || w.channels !== 1 || w.bits !== 16) {
          console.error(`  ✗ clips: ${path} is ${w.rate}Hz ${w.channels}ch ${w.bits}bit, want 22050/1/16`); bad++;
        }
        if (w.peak < 0.01) { console.error(`  ✗ clips: ${path} is silent`); bad++; }
        if (w.seconds > 6) { console.error(`  ✗ clips: ${path} is ${w.seconds.toFixed(1)}s — too long for a number`); bad++; }
      }
    }
    checked += 1 + scanned;
  }

  // Counting syllables, which is the denominator `make clipcheck` divides a
  // clip's length by. It only has to be proportional — but it has to be
  // proportional in every language here, and it was not: `y` was treated as a
  // vowel throughout, so the romaji "juyon" ran into a single vowel group and
  // every Japanese reading with a y in it read as half its true length. The
  // clips were then judged twice as slow as they are.
  {
    const same = (form: string, reading: string | undefined, want: number) => {
      const got = syllables(form, reading);
      if (got !== want) { console.error(`  ✗ syllables: ${reading ?? form} counted ${got}, want ${want}`); bad++; }
      checked++;
    };
    same("ten", undefined, 1);
    same("twenty", undefined, 2);          // y is a vowel here
    same("forty-eight", undefined, 3);
    same("seventy-eight", undefined, 4);
    same("十四", "jūyon", 2);               // and a consonant here
    same("十七", "jūnana", 3);
    same("九", "kyū", 1);                   // ky- is one onset, not two beats
    // Every language must give every number a count of at least one, or a
    // clip's length is divided by zero and the report says nothing at all.
    for (const l of LANGS) {
      for (let n = 0; n <= 100; n++) {
        const it = l.compose(n);
        const c = syllables(it.form, it.reading);
        if (!Number.isFinite(c) || c < 1) {
          console.error(`  ✗ syllables: ${l.code} ${n} (${it.form}) counted ${c}`); bad++;
        }
      }
      checked++;
    }
  }

  // What a key means at a recorder prompt. The recorder cannot be tested by
  // pressing keys at it, but this can, and it is where the damage happens:
  // keeping a take overwrites whatever was there and moves on. `q` once fell
  // through to that branch and wrote a take that was being rejected.
  {
    const same = (input: string, want: string) => {
      const got = keyOf(input);
      if (got !== want) { console.error(`  ✗ keys: "${input}" read as ${got}, want ${want}`); bad++; }
      checked++;
    };
    same("", "go");
    same("   ", "go");
    same("q", "quit");
    same(" Q ", "quit");
    same("quit", "quit");
    same("p", "play");
    same("r", "redo");
    same("s", "skip");
    // The property that matters: only Enter means keep. Anything the tool does
    // not understand must say so rather than defaulting to the destructive
    // branch — a typo, a stray character, a key meant for something else.
    for (const stray of ["x", "y", "n", "1", "k", "keep", "rr", "sq", "\u001b[A", "?", "pp"]) {
      if (keyOf(stray) !== "unknown") {
        console.error(`  ✗ keys: "${stray}" was understood as ${keyOf(stray)} — only Enter may mean keep`); bad++;
      }
      checked++;
    }
  }

  // The number spec, which is a handshake between two tools: `make clipcheck`
  // names the takes worth doing again and prints a `make record N=` line, and
  // the recorder has to read back exactly the set that was meant. A drift
  // between them would not error — it would quietly re-record the wrong words
  // over good ones. So the round trip is asserted rather than assumed.
  {
    const sets = [[39], [39, 40], [0], [100], [38, 39, 40, 55], [1, 3, 5, 7],
                  Array.from({ length: 60 }, (_, i) => i + 41),
                  Array.from({ length: 101 }, (_, i) => i)];
    for (const set of sets) {
      const printed = describeNumbers(set);
      // A drift can make the printed line unreadable rather than merely wrong,
      // so the throw is caught here and reported like any other failure.
      let back: number[] | null = null;
      let why = "";
      try { back = parseNumbers(printed); } catch (e) { why = ` (${(e as Error).message})`; }
      if (back?.join(",") !== set.join(",")) {
        console.error(`  ✗ numspec: "${printed}" read back as ${back?.join(",")}${why}`); bad++;
      }
      checked++;
    }
    // Shorthand a person types by hand, rather than one we printed.
    const same = (spec: string, want: number[]) => {
      const got = parseNumbers(spec);
      if (got?.join(",") !== want.join(",")) {
        console.error(`  ✗ numspec: "${spec}" gave ${got?.join(",")}, want ${want.join(",")}`); bad++;
      }
      checked++;
    };
    same("39", [39]);
    same(" 40 , 39 ", [39, 40]);   // unordered and spaced
    same("39,39,39", [39]);        // repeated
    same("38-40,39", [38, 39, 40]); // overlapping
    same("0-2", [0, 1, 2]);
    if (parseNumbers(undefined) !== null || parseNumbers("") !== null || parseNumbers("  ") !== null) {
      console.error("  ✗ numspec: an absent spec must mean \"whatever is missing\", not an empty set"); bad++;
    }
    checked++;
    // And what must be refused, because each of these would otherwise record
    // over something: a typo, a number off the end, a backwards range.
    for (const spec of ["4x", "39,4x", "101", "0-101", "40-39", "-1", "39-"]) {
      let threw = false;
      try { parseNumbers(spec); } catch { threw = true; }
      if (!threw) { console.error(`  ✗ numspec: "${spec}" was accepted`); bad++; }
      checked++;
    }
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

  // A combining mark with nothing to attach to renders as a dotted-circle
  // placeholder — correct behaviour by the shaper, and a broken glyph to the
  // reader. Every mark in user-visible text needs a base before it.
  {
    const orphans = (s: string): string[] => {
      const cs = [...s];
      return cs.filter((c, i) => {
        if (!/\p{M}/u.test(c)) return false;
        const prev = cs[i - 1];
        // U+25CC DOTTED CIRCLE is the standard placeholder for showing a
        // combining mark deliberately, as the Unicode charts do. Written
        // explicitly it is correct; the fault is letting the shaper supply
        // one because nothing else was there.
        return prev === undefined || !/[\p{L}\p{N}\p{M}\u25CC]/u.test(prev);
      });
    };
    const visible: [string, string][] = [];
    for (const [, rules] of Object.entries(SOUND_RULES)) {
      for (const r of rules) visible.push([`sounds:${r.id}`, r.hint]);
    }
    for (const [, rules] of Object.entries(SCRIPT_RULES)) {
      for (const r of rules) visible.push([`script:${r.id}`, r.hint]);
    }
    for (const l of LANGS) {
      visible.push([`numerals:${l.code}`, l.numerals]);
      for (const a of l.atoms) if (a.note) visible.push([`atom:${l.code}:${a.n}`, a.note]);
      for (const n of RANGE) {
        const note = l.compose(n).note;
        if (note) visible.push([`item:${l.code}:${n}`, note]);
      }
    }
    for (const [where, text] of visible) {
      const orphaned = orphans(text);
      if (orphaned.length) {
        const cps = orphaned
          .map((c) => `U+${c.codePointAt(0)!.toString(16).toUpperCase()}`)
          .join(", ");
        console.error(`  ✗ text: ${where} has a combining mark with no base (${cps})`); bad++;
      }
      // These strings render as plain text, so markdown emphasis appears
      // literally — *before* showed on screen with its asterisks. Only PAIRED
      // asterisks are markdown: a single leading one is the linguistic
      // convention for a form that does not exist, as in "zwei would predict
      // *zweizig", and that is correct usage worth keeping.
      if (/\*[^*\s][^*]*\*|`/.test(text)) {
        console.error(`  ✗ text: ${where} contains markdown, which renders literally`); bad++;
      }
    }
    checked += visible.length;
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
