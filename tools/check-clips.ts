/**
 * Report on a language's recorded clips.
 *
 *     make clipcheck L=en
 *
 * `make data` already refuses a clip that is silent, carries metadata or has
 * the wrong format — those are faults, and a fault stops a commit. This is the
 * softer question: which takes are unlike the others? A word recorded off-axis
 * is a perfectly valid WAV. It is only quiet next to its neighbours, and the
 * ear misses that while wearing headphones, which is exactly how 39 and 40 of
 * the first English sitting came in at a fifth of the usual level.
 *
 * So every threshold here is relative to this speaker's own median rather than
 * absolute. Mic, gain and voice differ per contributor; what does not differ is
 * that one clip out of a hundred should not stand out from the rest.
 *
 * It ends by printing the `make record` line that would redo whatever it
 * flagged, since that is invariably the next thing you want to type.
 *
 * **There is deliberately no check for a stray noise after the word.** It is
 * the obvious thing to add — the Enter that stops a take can land in the
 * recording — and it was added here and then taken out again. Gap alone does
 * not separate the cases: across forty-one English takes the silence *inside*
 * a word reached 150 ms and the silence before a stray event reached 190 ms.
 * The version that shipped for an hour flagged three clips, and all three were
 * wrong — two breaths at a tenth of the level of the word, and one that was
 * the second syllable of "twenty-four". Adding level and duration to the rule
 * fixes those three, but by then the only clip that would have justified any
 * of it had been re-recorded, so there was nothing left to test against. A
 * detector with no confirmed positive is a way of wasting a listener's
 * attention. Find a real example first.
 */
import { existsSync } from "node:fs";
import { LANGS } from "../src/lib/langs.ts";
import { inspectWav, ALLOWED_CHUNKS } from "./wav.ts";
import { describeNumbers as describe } from "./numspec.ts";
import { syllables } from "./syllables.ts";

/** Quiet: this fraction of the median peak. A fifth is obvious; a half is not. */
const QUIET = 0.45;
/** Clipping, in absolute terms — this one does not depend on the speaker. */
const CLIPPING = 0.98;
/** Short and long, as fractions of the median time *per syllable*.
 *
 *  Not of the median duration: "ten" is half the length of "seventy-seven"
 *  because it is a shorter word, and against a median drawn from a hundred
 *  mostly-compound numbers every round ten reads as clipped. Measured on a
 *  complete English set that gave six false alarms — eight, ten, twelve,
 *  twenty, thirty, forty — and buried the one clip that really was short.
 *  Per syllable they are all ordinary, and the odd one stands out. */
const SHORT = 0.5;
const LONG = 2.0;


const median = (xs: number[]): number => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length === 0 ? 0 : (s[s.length >> 1] ?? 0);
};

function main() {
  const code = process.argv[2];
  const lang = LANGS.find((l) => l.code === code);
  if (!lang) {
    console.error(`usage: node tools/check-clips.ts <lang>   (have: ${LANGS.map((l) => l.code).join(", ")})`);
    process.exit(2);
  }
  const dir = `clips/${lang.code}`;
  const all = Array.from({ length: 101 }, (_, n) => n);
  const present = all.filter((n) => existsSync(`${dir}/${n}.wav`));
  if (present.length === 0) {
    console.log(`No clips in ${dir}/ yet. \`make record L=${lang.code}\` starts one.`);
    return;
  }

  type Row = { n: number; form: string; syllables: number; seconds: number; peak: number; flags: string[] };
  const rows: Row[] = [];
  for (const n of present) {
    const path = `${dir}/${n}.wav`;
    const w = inspectWav(path);
    if (!w) {
      const it = lang.compose(n);
      rows.push({ n, form: it.form, syllables: syllables(it.form, it.reading), seconds: 0, peak: 0, flags: ["UNREADABLE"] });
      continue;
    }
    const flags: string[] = [];
    // Faults first — these are what `make data` would stop a commit over.
    const extra = w.chunks.filter((c) => !ALLOWED_CHUNKS.includes(c));
    if (extra.length) flags.push(`METADATA ${[...new Set(extra)].join(",")}`);
    if (w.rate !== 22050 || w.channels !== 1 || w.bits !== 16) {
      flags.push(`FORMAT ${w.rate}/${w.channels}ch/${w.bits}bit`);
    }
    const it = lang.compose(n);
    rows.push({ n, form: it.form, syllables: syllables(it.form, it.reading), seconds: w.seconds, peak: w.peak, flags });
  }

  const heard = rows.filter((r) => r.peak > 0);
  const midPeak = median(heard.map((r) => r.peak));
  const midRate = median(heard.map((r) => r.seconds / r.syllables));
  for (const r of rows) {
    const each = r.seconds / r.syllables;
    if (r.peak > 0 && r.peak < midPeak * QUIET) r.flags.push("QUIET");
    if (r.peak > CLIPPING) r.flags.push("CLIPPING");
    if (r.seconds > 0 && each < midRate * SHORT) r.flags.push("SHORT");
    if (each > midRate * LONG) r.flags.push("LONG");
  }

  const width = Math.max(...rows.map((r) => [...r.form].length), 4);
  console.log(`\n${lang.name} — ${present.length}/101 recorded in ${dir}/`);
  console.log(`median ${(midRate * 1000).toFixed(0)}ms per syllable, median peak ${(midPeak * 100).toFixed(0)}%\n`);
  for (const r of rows) {
    const bar = "▁▂▃▄▅▆▇█"[Math.min(7, Math.floor((r.peak / Math.max(midPeak * 1.6, 0.01)) * 8))] ?? "▁";
    const line =
      `  ${String(r.n).padStart(3)}  ${r.form.padEnd(width)}  ` +
      `${r.seconds.toFixed(2)}s  ${String(Math.round(r.peak * 100)).padStart(3)}% ${bar}` +
      (r.flags.length ? `  ${r.flags.join(" ")}` : "");
    console.log(line);
  }

  const flagged = rows.filter((r) => r.flags.length);
  const missing = all.filter((n) => !present.includes(n));
  console.log("");
  if (missing.length) console.log(`${missing.length} not yet recorded: ${describe(missing)}`);
  if (flagged.length === 0) {
    console.log("Nothing stands out.");
    return;
  }
  console.log(`${flagged.length} worth listening to again:`);
  console.log(`  make record L=${lang.code} N=${describe(flagged.map((r) => r.n))}`);
}


main();
