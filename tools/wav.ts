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
export function trim(w: Wav): { trimmed: Wav; peak: number; before: number; after: number } {
  const peak = w.samples.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
  const before = w.samples.length / w.rate;
  if (peak === 0) return { trimmed: w, peak: 0, before, after: before };
  const gate = peak * 0.06;
  let first = 0;
  let last = w.samples.length - 1;
  while (first < w.samples.length && Math.abs(w.samples[first]!) < gate) first++;
  while (last > first && Math.abs(w.samples[last]!) < gate) last--;
  const margin = Math.round((MARGIN_MS / 1000) * w.rate);
  first = Math.max(0, first - margin);
  last = Math.min(w.samples.length - 1, last + margin);
  const trimmed = { ...w, samples: w.samples.slice(first, last + 1) };
  return { trimmed, peak: peak / 32768, before, after: trimmed.samples.length / w.rate };
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
