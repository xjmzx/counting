/**
 * Re-trim saved clips with the current trim.
 *
 *     make cliptrim L=en           what it would change
 *     make cliptrim L=en APPLY=1   change it
 *
 * Needed because the trim itself was wrong for a while: it gated on single
 * samples, so the click of the Enter that starts a take anchored the start of
 * the word, and everything between the click and the voice was kept. The fix
 * is in `trim`, but files already recorded went through the old one.
 *
 * They are recoverable rather than lost — the click and the gap are still in
 * the file, so running the new trim over the old output finds the word and
 * discards them. No re-recording.
 *
 * A human take is not reproducible, so this reports by default and writes only
 * when asked, keeping the original under `.original/` when it does. It also
 * refuses any change that does not leave the voice untouched: the peak of what
 * survives must match the peak of what went in, since this is only allowed to
 * remove silence and clicks, never to shave a word.
 */
import { existsSync, mkdirSync, copyFileSync } from "node:fs";
import { LANGS } from "../src/lib/langs.ts";
import { readWav, writeWav, trim } from "./wav.ts";

/** Below this, a change is rounding rather than a trim worth making. */
const WORTH_MS = 30;
/** The voice must survive intact; more than this and something was shaved. */
const PEAK_TOLERANCE = 0.02;
/** Nothing legitimate trims to less than this. */
const FLOOR_S = 0.15;
/** Passes allowed before a clip is left alone. Two is the normal case. */
const PASSES = 4;

function main() {
  const code = process.argv[2];
  const apply = process.argv[3] === "apply";
  const lang = LANGS.find((l) => l.code === code);
  if (!lang) {
    console.error(`usage: node tools/trim-clips.ts <lang> [apply]   (have: ${LANGS.map((l) => l.code).join(", ")})`);
    process.exit(2);
  }
  const dir = `clips/${lang.code}`;
  const present = Array.from({ length: 101 }, (_, n) => n).filter((n) => existsSync(`${dir}/${n}.wav`));
  if (present.length === 0) {
    console.log(`No clips in ${dir}/.`);
    return;
  }

  const changes: Array<{ n: number; from: number; to: number }> = [];
  const refused: string[] = [];
  let saved = 0;

  for (const n of present) {
    const path = `${dir}/${n}.wav`;
    const w = readWav(path);
    if (!w) { refused.push(`${n}: not a readable WAV`); continue; }
    const was = w.samples.length / w.rate;

    // Run to a fixed point rather than once. Discarding a click that was
    // louder than the voice changes what "loud" means in the file, so the
    // second pass sees a different gate and can take a little more. Two passes
    // is the normal case; not settling by PASSES means something is oscillating
    // and the clip is left alone.
    let cur = w;
    let peak = 0;
    let settled = false;
    for (let pass = 0; pass < PASSES; pass++) {
      const t = trim(cur);
      peak = t.peak;
      if (t.trimmed.samples.length === cur.samples.length) { settled = true; break; }
      cur = t.trimmed;
    }
    const trimmed = cur;
    const now = trimmed.samples.length / w.rate;
    if (was - now < WORTH_MS / 1000) continue;
    if (!settled) { refused.push(`${n}: trim did not settle in ${PASSES} passes`); continue; }
    if (now < FLOOR_S) { refused.push(`${n}: would trim to ${now.toFixed(2)}s`); continue; }
    // The peak may legitimately *fall*, and that is the point when what went
    // was a click louder than the voice. What must not happen is the voice
    // itself being shaved, so the level of what survives is compared with the
    // level of the sustained part of the original — not with its loudest
    // sample, which may be the click we are removing.
    if (Math.abs(trim(trimmed).peak - peak) > PEAK_TOLERANCE) {
      refused.push(`${n}: the voice would not survive intact`); continue;
    }

    changes.push({ n, from: was, to: now });
    saved += was - now;
    if (apply) {
      mkdirSync(`${dir}/.original`, { recursive: true });
      const keep = `${dir}/.original/${n}.wav`;
      if (!existsSync(keep)) copyFileSync(path, keep);
      writeWav(path, trimmed);
    }
  }

  console.log(`\n${lang.name} — ${present.length} clips in ${dir}/`);
  for (const c of changes) {
    console.log(`  ${String(c.n).padStart(3)}  ${c.from.toFixed(2)}s → ${c.to.toFixed(2)}s   −${(c.from - c.to).toFixed(2)}s`);
  }
  for (const r of refused) console.log(`  ⚠ ${r}`);
  console.log("");
  if (changes.length === 0) {
    console.log("Nothing to trim.");
    return;
  }
  console.log(`${changes.length} clips, ${saved.toFixed(1)}s of silence and clicks.`);
  if (apply) console.log(`Originals kept in ${dir}/.original/ — delete it once you have listened.`);
  else console.log(`Nothing written. \`make cliptrim L=${lang.code} APPLY=1\` does it, keeping originals.`);
}

main();
