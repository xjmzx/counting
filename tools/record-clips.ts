/**
 * Record a language's number clips, one at a time.
 *
 *     make record L=en
 *
 * Enter starts, Enter stops, it plays back, Enter keeps. `r` re-records the
 * same number, `s` skips it, `q` stops for now — anything already recorded is
 * kept, so a hundred and one takes need not happen in one sitting.
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
    console.error(`usage: node tools/record-clips.ts <lang>   (have: ${LANGS.map((l) => l.code).join(", ")})`);
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
  const done = Array.from({ length: 101 }, (_, n) => n).filter((n) => existsSync(`${dir}/${n}.wav`));

  console.log(`Recording ${lang.name} into ${dir}/  —  ${rec.describe}`);
  if (!player) console.log("  No player found, so takes cannot be heard back.");
  if (done.length) console.log(`  ${done.length} already recorded; those are skipped.`);
  console.log("  Enter starts, Enter stops, Enter keeps.  r redo · s skip · q stop\n");

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const tmp = `${dir}/.take.wav`;

  for (let n = 0; n <= 100; n++) {
    const target = `${dir}/${n}.wav`;
    if (existsSync(target)) continue;
    const item = lang.compose(n);
    const reading = item.reading ? `   ${item.reading}` : "";

    let keep = false;
    while (!keep) {
      const ans = await rl.question(`${String(n).padStart(3)}/100  ${item.form}${reading}  ▸ `);
      const c = ans.trim().toLowerCase();
      if (c === "q") {
        console.log("\nStopped. Run again to carry on.");
        rl.close();
        if (existsSync(tmp)) unlinkSync(tmp);
        return;
      }
      if (c === "s") break;

      const stop = startRecording(rec, tmp);
      await rl.question("        recording — Enter to stop ");
      await stop();

      const w = readWav(tmp);
      if (!w || w.samples.length === 0) {
        console.log("        nothing was captured. On macOS the first run needs microphone");
        console.log("        permission for your terminal; grant it and try again.\n");
        continue;
      }
      const { trimmed, peak, before, after } = trim(w);
      if (peak < SILENCE_PEAK) {
        console.log(`        silent (peak ${(peak * 100).toFixed(1)}%) — check the input device.\n`);
        continue;
      }
      writeWav(tmp, trimmed);
      const warn = peak > CLIP_PEAK ? "  ⚠ clipping" : "";
      console.log(`        ${before.toFixed(2)}s → ${after.toFixed(2)}s trimmed, peak ${(peak * 100).toFixed(0)}%${warn}`);
      if (player) spawnSync(player, [tmp], { stdio: "ignore" });

      const verdict = (await rl.question("        Enter keeps · r redo · s skip ▸ ")).trim().toLowerCase();
      if (verdict === "s") break;
      if (verdict === "r") continue;
      writeFileSync(target, readFileSync(tmp));
      console.log(`        kept ${target}\n`);
      keep = true;
    }
  }

  if (existsSync(tmp)) unlinkSync(tmp);
  rl.close();
  const total = Array.from({ length: 101 }, (_, n) => n).filter((n) => existsSync(`${dir}/${n}.wav`)).length;
  console.log(`\n${total}/101 recorded in ${dir}/`);
  if (total === 101) console.log("Complete. They are preferred over synthesis from the next launch.");
}

await main();
