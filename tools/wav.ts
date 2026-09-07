/**
 * Minimal WAV handling for the clip recorder: 16-bit PCM, which is all this
 * project writes.
 *
 * Separate from `record-clips.ts` so it can be tested without a microphone.
 * These functions produce the files the app plays, and a trim that eats the
 * first phoneme is invisible until someone listens to all 101 of them.
 */
import { readFileSync, writeFileSync } from "node:fs";

const SAMPLE_RATE = 22050;
/** Silence kept either side of the word, so it does not start abruptly. */
export const MARGIN_MS = 60;
/** Frames for onset detection: fine enough to place a word, coarse enough
 *  that a single click cannot fill one. */
const FRAME_MS = 10;
/** How long energy must persist before it counts as the word. A keypress or a
 *  desk knock rings for a few milliseconds; a spoken syllable does not. */
const VOICE_MS = 50;
/** Silence this long marks a separate event rather than a pause in a word. */
const SEPARATION_MS = 400;
/** And an event this brief, that far out, is not a syllable. */
const STRAY_MS = 200;
/** Dips shorter than this are inside a syllable, not the end of one. */
const BRIDGE_MS = 30;
/** Silence this long between a loud frame and the word makes that frame a
 *  separate event — a click — rather than the word's own quiet opening. */
const GAP_MS = 20;

export type Wav = { rate: number; channels: number; samples: Int16Array };

/** Minimal RIFF reader: 16-bit PCM only, which is all this tool writes. */
export function readWav(path: string): Wav | null {
  const b = readFileSync(path);
  if (b.length < 12 || b.toString("ascii", 0, 4) !== "RIFF") return null;
  let off = 12;
  let rate = SAMPLE_RATE;
  let channels = 1;
  let data: Buffer | null = null;
  while (off + 8 <= b.length) {
    const id = b.toString("ascii", off, off + 4);
    const size = b.readUInt32LE(off + 4);
    const body = off + 8;
    if (id === "fmt ") {
      channels = b.readUInt16LE(body + 2);
      rate = b.readUInt32LE(body + 4);
    } else if (id === "data") {
      data = b.subarray(body, Math.min(body + size, b.length));
    }
    off = body + size + (size % 2);
  }
  if (!data) return null;
  const n = Math.floor(data.length / 2);
  const samples = new Int16Array(n);
  for (let i = 0; i < n; i++) samples[i] = data.readInt16LE(i * 2);
  return { rate, channels, samples };
}

export function writeWav(path: string, w: Wav): void {
  const bytes = w.samples.length * 2;
  const h = Buffer.alloc(44);
  h.write("RIFF", 0, "ascii");
  h.writeUInt32LE(36 + bytes, 4);
  h.write("WAVEfmt ", 8, "ascii");
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(w.channels, 22);
  h.writeUInt32LE(w.rate, 24);
  h.writeUInt32LE(w.rate * w.channels * 2, 28);
  h.writeUInt16LE(w.channels * 2, 32);
  h.writeUInt16LE(16, 34);
  h.write("data", 36, "ascii");
  h.writeUInt32LE(bytes, 40);
  const body = Buffer.alloc(bytes);
  for (let i = 0; i < w.samples.length; i++) body.writeInt16LE(w.samples[i]!, i * 2);
  writeFileSync(path, Buffer.concat([h, body]));
}

/**
 * Cut the silence either side, keeping a small margin.
 *
 * A human take has a variable run-up — reaching for the key, drawing breath —
 * and in a listening drill that dead air reads as the app being slow. The
 * threshold is relative to the take's own peak, so a quiet recording is
 * trimmed like a loud one rather than being erased.
 */
export function trim(w: Wav): { trimmed: Wav; peak: number; before: number; after: number; head: number; tail: number } {
  const before = w.samples.length / w.rate;
  const loudest = w.samples.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
  if (loudest === 0) return { trimmed: w, peak: 0, before, after: before, head: 0, tail: 0 };

  // Work in frames rather than samples, because the thing that has to be told
  // apart from speech is a keypress — and the difference is not how loud it is
  // but how long it lasts. Pressing Enter to start a take puts a click at the
  // head of the file that is routinely louder than the voice; a gate on single
  // samples anchors to it and keeps every bit of dead air between the click
  // and the word. Thirty of the first forty-one English takes came out that
  // way, one of them with three quarters of a second of silence at the front.
  const frame = Math.max(1, Math.round((FRAME_MS / 1000) * w.rate));

  // Two envelopes per frame, because loudness alone cannot see a fricative.
  // /s/ carries very little amplitude and a great deal of high frequency: in
  // "six" it runs at under a tenth of the vowel it follows, so a gate set as a
  // fraction of the loudest sample is blind to it — and since /k/ is a silent
  // closure, the /s/ also sits behind a gap and looks for all the world like a
  // click. Measured on real takes, a final /s/ below 6% of the vowel lost all
  // 150 ms of itself. The first difference of the signal is a crude high-pass
  // that lifts sibilance about twelvefold against a vowel, which is enough to
  // put the two on speaking terms.
  //
  // This is not an English problem. six, dix, sechs, seis, sei — the number
  // six ends in a fricative across most of the languages here.
  const amp: number[] = [];
  const sib: number[] = [];
  for (let i = 0; i < w.samples.length; i += frame) {
    let a = 0;
    let d = 0;
    for (let j = i; j < Math.min(i + frame, w.samples.length); j++) {
      a = Math.max(a, Math.abs(w.samples[j]!));
      if (j > 0) d = Math.max(d, Math.abs(w.samples[j]! - w.samples[j - 1]!));
    }
    amp.push(a);
    sib.push(d);
  }
  const level = amp;
  const need = Math.max(1, Math.round(VOICE_MS / FRAME_MS));

  /**
   * Stretches of at least VOICE_MS of sound. A frame counts if it clears
   * either gate — loud, or sibilant — so a vowel and an /s/ both register
   * while the silence between them registers as neither.
   */
  const runs = (gateAmp: number, gateSib: number): Array<[number, number]> => {
    const sound = (i: number) => amp[i]! >= gateAmp || sib[i]! >= gateSib;
    const bridge = Math.max(1, Math.round(BRIDGE_MS / FRAME_MS));
    const found: Array<[number, number]> = [];
    let i = 0;
    while (i < amp.length) {
      if (!sound(i)) { i++; continue; }
      let j = i;
      // Speech is modulated, so a syllable dips below the gate and comes back
      // — a fading /n/ does it several times on the way out. Requiring frames
      // to be strictly consecutive ends the word at the first dip and loses
      // the rest of the decay. Brief dips are bridged; a real silence is not.
      for (;;) {
        let k = j + 1;
        while (k < amp.length && k - j <= bridge && !sound(k)) k++;
        if (k < amp.length && k - j <= bridge && sound(k)) { j = k; continue; }
        break;
      }
      if (j - i + 1 >= need) found.push([i, j]);
      i = j + 1;
    }
    return found;
  };

  // Two passes. The first, deliberately permissive, only asks where the voice
  // is, so that the second can set its gates from how loud the *word* is
  // rather than from the loudest sample in the file. Doing it in one pass
  // means a heavy keypress silently raises the bar on the speech beneath it.
  const loudestSib = sib.reduce((m, v) => Math.max(m, v), 0);
  const rough = runs(loudest * 0.02, loudestSib * 0.02);
  const within = (xs: number[]) =>
    rough.length ? Math.max(...rough.map(([a, b]) => Math.max(...xs.slice(a, b + 1)))) : xs.reduce((m, v) => Math.max(m, v), 0);
  const speech = within(amp);
  const speechSib = within(sib);

  const gate = speech * 0.06;
  const gateSib = speechSib * 0.06;
  const isSound = (i: number) => amp[i]! >= gate || sib[i]! >= gateSib;
  const voiced = runs(gate, gateSib);

  // Drop a run that is both far from the word and too short to be part of it.
  // The Enter that stops a take lands half a second or more after the last
  // syllable and lasts a twentieth of one; it sustains long enough to count as
  // sound, so without this it becomes the end of the "word" and everything
  // between is kept — eleven of a hundred and one English takes ran on that
  // way, one of them for a further second.
  //
  // Both conditions are needed, and the reason is that removing speech here is
  // unrecoverable: the recorder writes what this returns and the original is
  // gone. Across 202 finished clips in two languages the pauses *inside* a
  // number word never reached 300 ms and the strays never came in under
  // 430 ms, so the threshold sits in an empty band rather than on a boundary.
  // A genuine syllable after a pause that long would still be far longer than
  // STRAY_MS, which is what the second condition is for.
  const far = Math.round(SEPARATION_MS / FRAME_MS);
  const brief = Math.round(STRAY_MS / FRAME_MS);
  // `run` is the one being judged and `next` its neighbour towards the word.
  // It is the candidate's own length that decides — measuring the shorter of
  // the two would let a brief main body condemn a long final syllable.
  const stray = (run: [number, number], next: [number, number]) => {
    const silence = run[0] < next[0] ? next[0] - run[1] - 1 : run[0] - next[1] - 1;
    return silence > far && run[1] - run[0] + 1 < brief;
  };
  while (voiced.length > 1 && stray(voiced[voiced.length - 1]!, voiced[voiced.length - 2]!)) voiced.pop();
  while (voiced.length > 1 && stray(voiced[0]!, voiced[1]!)) voiced.shift();

  // Nothing sustained anywhere: a click alone, or a take with no word in it.
  // Keep the file whole and let the caller's silence check speak for it.
  if (voiced.length === 0) return { trimmed: w, peak: loudest / 32768, before, after: before, head: 0, tail: 0 };

  // Cut on frame boundaries, margin included. Trimming an arbitrary number of
  // samples leaves the word sitting a few samples off the grid, so the next
  // run of this function reads the onset one frame along and shaves a little
  // more — three samples a pass, inaudible, but it means trimming has no
  // settled result. Whole frames make the operation idempotent, which is what
  // lets `make cliptrim` re-trim a file and know when it is done.
  //
  // The margin also runs backwards past the onset, which is what protects a
  // quiet opening consonant: a leading /th/ or /s/ can fall under the gate,
  // and six frames of lead-in is longer than the run this needs to see.
  const margin = Math.round(MARGIN_MS / FRAME_MS);
  const gap = Math.max(1, Math.round(GAP_MS / FRAME_MS));
  const firstVoiced = voiced[0]![0];
  const lastVoiced = voiced[voiced.length - 1]![1];

  // The margin is there to give a soft entry, so it has to be quiet. Excluding
  // a click from what counts as speech is not enough on its own: if the click
  // lands within 60 ms of the word, the lead-in reaches back over it and pulls
  // it in again. Three of the first forty-one English takes came out with the
  // click still on the front for exactly that reason.
  //
  // What separates a click from a quiet opening consonant is not level but
  // silence: a keypress has a gap behind it, a leading /s/ or /th/ runs
  // straight into the vowel. So a loud frame is only cut away from when
  // something silent sits between it and the word — which is what stops this
  // from eating the phoneme the margin exists to protect.
  let head = Math.max(0, firstVoiced - margin);
  for (let i = firstVoiced - 1; i >= head; i--) {
    if (isSound(i) && firstVoiced - i - 1 >= gap) { head = i + 1; break; }
  }
  // No matching rule at the tail, and that is deliberate. It was there, and it
  // could only ever do harm: the scan reaches just `margin` frames past the
  // word, so a keypress on the way to stopping a take — measured at 230 ms
  // after the last syllable — is already outside the kept region and excluded
  // by the margin alone. The only events close enough for such a rule to see
  // are the ones that belong to the word. A final stop is a closure followed
  // by a release burst 10 ms later, which is a gap followed by a transient:
  // indistinguishable in shape from a click, and the /d/ of "hundred" was
  // being cut off because of it.
  const tail = Math.min(level.length - 1, lastVoiced + margin);

  const first = head * frame;
  const last = Math.min(w.samples.length - 1, (tail + 1) * frame - 1);
  const trimmed = { ...w, samples: w.samples.slice(first, last + 1) };
  // Reported from what was kept, not from what arrived, so that a discarded
  // click cannot make a quiet take look well recorded.
  const peak = trimmed.samples.reduce((m, v) => Math.max(m, Math.abs(v)), 0) / 32768;
  // How much went from each end, reported separately because the total on its
  // own reads as though the word were being cut. It is not: everything removed
  // is outside the speech, and saying which end it came from is what makes
  // that visible to whoever is holding the microphone.
  return {
    trimmed,
    peak,
    before,
    after: trimmed.samples.length / w.rate,
    head: first / w.rate,
    tail: (w.samples.length - 1 - last) / w.rate,
  };
}


/** Everything a check needs to know about a clip, without decoding it twice. */
export type WavFacts = {
  chunks: string[];
  rate: number;
  channels: number;
  bits: number;
  seconds: number;
  peak: number;
};

/**
 * Read a clip's shape, including which RIFF chunks it carries.
 *
 * The chunk list is the point. A WAV can hold `LIST`/`INFO` with an artist,
 * a creation date and the software that made it — so a clip exported from an
 * editor carries a small biography of whoever recorded it. Files written by
 * `writeWav` carry `fmt ` and `data` and nothing else; anything more came from
 * somewhere else and should be re-encoded before it is committed.
 *
 * CoreAudio's own output is a case in point: `say -o` adds `JUNK` and `FLLR`
 * padding. Harmless in content, but it is the same door.
 */
export function inspectWav(path: string): WavFacts | null {
  const b = readFileSync(path);
  if (b.length < 12 || b.toString("ascii", 0, 4) !== "RIFF") return null;
  const chunks: string[] = [];
  let off = 12;
  let rate = 0;
  let channels = 0;
  let bits = 0;
  let frames = 0;
  let peak = 0;
  while (off + 8 <= b.length) {
    const id = b.toString("ascii", off, off + 4);
    const size = b.readUInt32LE(off + 4);
    const body = off + 8;
    chunks.push(id);
    if (id === "fmt ") {
      channels = b.readUInt16LE(body + 2);
      rate = b.readUInt32LE(body + 4);
      bits = b.readUInt16LE(body + 14);
    } else if (id === "data") {
      const end = Math.min(body + size, b.length);
      frames = Math.floor((end - body) / 2);
      for (let i = body; i + 1 < end; i += 2) {
        const v = Math.abs(b.readInt16LE(i));
        if (v > peak) peak = v;
      }
    }
    off = body + size + (size % 2);
  }
  return { chunks, rate, channels, bits, seconds: rate ? frames / rate : 0, peak: peak / 32768 };
}

/** The only chunks a clip in this repository may carry. */
export const ALLOWED_CHUNKS = ["fmt ", "data"];
