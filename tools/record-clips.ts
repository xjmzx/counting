/**
 * Record a language's number clips, one at a time.
 *
 *     make record L=en              everything not yet recorded
 *     make record L=en N=39,40      those two again, over what is there
 *     make record L=en N=41-100     a range
 *
 * Enter starts, Enter stops, it plays back, Enter keeps. `p` plays it again,
 * as often as you like; `r` re-records the same number, `s` skips it, `q`
 * stops for now — anything already recorded is kept, so a hundred and one
 * takes need not happen in one sitting.
 *
 * A take is only judged by ear, and an ear judges level poorly while wearing
 * headphones. `make clipcheck L=en` prints the level of every clip beside its
 * neighbours, which is how a quiet one gets found after the fact — and it
 * prints back the `N=` line that redoes whatever it flagged.
 *
 * A separate tool rather than a mode in the app, per
 * docs/collaboration-design-2026-09-07.md: keeping the recorder outside is
 * what keeps `counting` the small, verifiable, offline thing it is.
 *
 * The prompt shows the form the drill will display, so a contributor records
 * the words this app actually asks about rather than their own paraphrase of
 * them. It reads those from the app's tables; there is no second list.
 *
 * **Microphone permission.** The first run on macOS raises a prompt against
 * the terminal application. Until it is granted, capture yields a valid but
 * empty WAV rather than an error, so every take is checked for silence.
 */
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { LANGS } from "../src/lib/langs.ts";
import { readWav, writeWav, trim } from "./wav.ts";
import { parseNumbers } from "./numspec.ts";
import { keyOf, type Key } from "./keys.ts";

const SAMPLE_RATE = 22050;
/** Silence kept either side of the word, so it does not start abruptly. */
/** Below this fraction of full scale, a take is silence rather than speech. */
const SILENCE_PEAK = 0.01;
/** Above this, it is clipping. */
const CLIP_PEAK = 0.98;

const has = (bin: string, args: string[] = ["--help"]): boolean => {
  const r = spawnSync(bin, args, { stdio: "ignore" });
  return !r.error;
};

type Recorder = { kind: "swift" | "parecord" | "arecord"; describe: string };

function detectRecorder(): Recorder | null {
  // macOS first on macOS: `swift` is already required here by crosscheck, so
  // AVFoundation costs no new dependency. Linux uses the capture half of the
  // package that already provides playback.
  if (process.platform === "darwin" && has("swift", ["--version"])) {
    return { kind: "swift", describe: "AVFoundation via swift" };
  }
  if (has("parecord")) return { kind: "parecord", describe: "parecord (PulseAudio)" };
  if (has("arecord")) return { kind: "arecord", describe: "arecord (ALSA)" };
  if (process.platform === "darwin") return null;
  return null;
}

function detectPlayer(): string | null {
  for (const p of process.platform === "darwin" ? ["afplay", "paplay", "aplay"] : ["paplay", "aplay", "afplay"]) {
    if (has(p)) return p;
  }
  return null;
}

/** Start capturing to `out`. The returned function stops it and resolves. */
function startRecording(rec: Recorder, out: string): () => Promise<void> {
  let child: ChildProcess;
  switch (rec.kind) {
    case "swift":
      // A 60s ceiling so a forgotten session cannot record forever.
      child = spawn("swift", ["tools/record-macos.swift", out, "60"], { stdio: ["pipe", "inherit", "inherit"] });
      break;
    case "parecord":
      child = spawn("parecord", ["--file-format=wav", `--rate=${SAMPLE_RATE}`, "--channels=1", "--format=s16le", out], { stdio: "inherit" });
      break;
    case "arecord":
      child = spawn("arecord", ["-f", "S16_LE", "-r", String(SAMPLE_RATE), "-c", "1", out], { stdio: "inherit" });
      break;
  }
  return () =>
    new Promise<void>((resolve) => {
      child.once("close", () => resolve());
      // swift stops on a line; the other two finalise their header on SIGINT.
      if (rec.kind === "swift") child.stdin?.write("\n");
      else child.kill("SIGINT");
    });
}

async function main() {
  const code = process.argv[2];
  const lang = LANGS.find((l) => l.code === code);
  if (!lang) {
    console.error(`usage: node tools/record-clips.ts <lang> [numbers]   (have: ${LANGS.map((l) => l.code).join(", ")})`);
    process.exit(2);
  }
  let wanted: number[] | null;
  try {
    wanted = parseNumbers(process.argv[3]);
  } catch (e) {
    console.error(`${(e as Error).message} — expected something like 39, 39,40 or 38-45.`);
    process.exit(2);
  }
  const rec = detectRecorder();
  if (!rec) {
    console.error("No way to record on this machine.");
    console.error(process.platform === "darwin"
      ? "  `swift` is missing — install the Xcode command line tools."
      : "  Install pulseaudio-utils (parecord) or alsa-utils (arecord).");
    process.exit(1);
  }
  const player = detectPlayer();

  const dir = `clips/${lang.code}`;
  mkdirSync(dir, { recursive: true });
  const all = Array.from({ length: 101 }, (_, n) => n);
  const done = all.filter((n) => existsSync(`${dir}/${n}.wav`));
  const targets = wanted ?? all.filter((n) => !existsSync(`${dir}/${n}.wav`));
  const over = targets.filter((n) => existsSync(`${dir}/${n}.wav`));

  console.log(`Recording ${lang.name} into ${dir}/  —  ${rec.describe}`);
  if (!player) console.log("  No player found, so takes cannot be heard back.");
  if (wanted) console.log(`  Asked for ${targets.join(", ")}${over.length ? ` — ${over.length} of those replace a kept take.` : "."}`);
  else if (done.length) console.log(`  ${done.length} already recorded; those are skipped.`);
  if (targets.length === 0) {
    console.log("\nNothing left to record.");
    return;
  }
  console.log("  Enter starts, Enter stops, Enter keeps.  r redo · s skip · q stop\n");

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const tmp = `${dir}/.take.wav`;

  for (const n of targets) {
    const target = `${dir}/${n}.wav`;
    // A kept take is only overwritten at the very end, so quitting or skipping
    // part way through a redo leaves the old one where it was.
    const mark = existsSync(target) ? " ↻" : "  ";
    const item = lang.compose(n);
    const reading = item.reading ? `   ${item.reading}` : "";

    let keep = false;
    while (!keep) {
      const ans = keyOf(await rl.question(`${String(n).padStart(3)}/100${mark} ${item.form}${reading}  ▸ `));
      if (ans === "quit") {
        console.log("\nStopped. Run again to carry on.");
        rl.close();
        if (existsSync(tmp)) unlinkSync(tmp);
        return;
      }
      if (ans === "skip") break;
      if (ans !== "go") continue;   // r or an unrecognised key: ask again

      const stop = startRecording(rec, tmp);
      await rl.question("        recording — Enter to stop ");
      await stop();

      const w = readWav(tmp);
      if (!w || w.samples.length === 0) {
        console.log("        nothing was captured. On macOS the first run needs microphone");
        console.log("        permission for your terminal; grant it and try again.\n");
        continue;
      }
      const { trimmed, peak, before, after, head, tail } = trim(w);
      if (peak < SILENCE_PEAK) {
        console.log(`        silent (peak ${(peak * 100).toFixed(1)}%) — check the input device.\n`);
        continue;
      }
      writeWav(tmp, trimmed);
      const warn = peak > CLIP_PEAK ? "  ⚠ clipping" : "";
      // The mic was open `before` seconds; the word is `after` long. Saying
      // where the difference went stops the arrow reading as a warning that
      // something was cut out of the middle.
      console.log(`        ${before.toFixed(2)}s open, word is ${after.toFixed(2)}s  ` +
        `(silence removed: ${head.toFixed(2)}s before, ${tail.toFixed(2)}s after)  peak ${(peak * 100).toFixed(0)}%${warn}`);
      if (player) spawnSync(player, [tmp], { stdio: "ignore" });

      // Stay on this take until something decisive is typed. Playing it again
      // and typing something unrecognised both come back here: neither is an
      // answer, and dropping out of this loop would throw the take away and
      // demand it be recorded afresh — the same fault as keeping it uninvited,
      // the other way round. One listen is rarely enough to judge a take, and
      // recording it again to hear it a second time loses the one being judged.
      let verdict: Key;
      for (;;) {
        verdict = keyOf(await rl.question("        Enter keeps · p play · r redo · s skip · q stop ▸ "));
        if (verdict === "play") {
          if (player) spawnSync(player, [tmp], { stdio: "ignore" });
          else console.log("        Nothing here can play it back.");
          continue;
        }
        if (verdict === "unknown") continue;
        break;
      }
      if (verdict === "quit") {
        console.log("\n        Not kept. Run again to carry on.");
        rl.close();
        if (existsSync(tmp)) unlinkSync(tmp);
        return;
      }
      if (verdict === "skip") break;
      if (verdict === "redo") continue;
      // Keeping overwrites whatever was there, so it happens on Enter and on
      // nothing else. `q` reached here and fell through to this line, which is
      // how a take that was being rejected came to be written.
      writeFileSync(target, readFileSync(tmp));
      console.log(`        kept ${target}\n`);
      keep = true;
    }
  }

  if (existsSync(tmp)) unlinkSync(tmp);
  rl.close();
  const total = all.filter((n) => existsSync(`${dir}/${n}.wav`)).length;
  console.log(`\n${total}/101 recorded in ${dir}/`);
  if (total === 101) console.log("Complete. They are preferred over synthesis from the next launch.");
}

await main();
