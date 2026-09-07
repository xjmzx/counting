/**
 * Re-encode a language's clips into the canonical shape: 22 kHz mono 16-bit,
 * trimmed, carrying `fmt ` and `data` and nothing else.
 *
 *     make clipclean L=en
 *
 * This is what `make data` means when it says a clip should be re-encoded. A
 * WAV can hold `LIST`/`INFO` with an artist, a creation date and the software
 * that produced it, so a clip exported from an editor is a small biography of
 * whoever recorded it. Rebuilding the file from its samples drops all of that,
 * because there is nowhere for it to survive.
 *
 * Safe to run twice: a clip already canonical and already trimmed comes out
 * byte-identical.
 */
import { existsSync, readdirSync } from "node:fs";
import { readWav, writeWav, trim, inspectWav, ALLOWED_CHUNKS } from "./wav.ts";

const lang = process.argv[2];
if (!lang || !/^[a-z]{2}$/.test(lang)) {
  console.error("usage: node tools/clean-clips.ts <lang>");
  process.exit(2);
}
const dir = `clips/${lang}`;
if (!existsSync(dir)) {
  console.error(`no ${dir}/`);
  process.exit(1);
}

let changed = 0;
let kept = 0;
for (const f of readdirSync(dir).filter((x) => x.endsWith(".wav")).sort()) {
  const path = `${dir}/${f}`;
  const before = inspectWav(path);
  const w = readWav(path);
  if (!w) {
    console.error(`  ✗ ${path} is not a readable WAV`);
    continue;
  }
  const stripped = before?.chunks.filter((c) => !ALLOWED_CHUNKS.includes(c)) ?? [];
  const { trimmed, after } = trim(w);
  const wasTrimmed = trimmed.samples.length !== w.samples.length;
  if (stripped.length === 0 && !wasTrimmed) {
    kept++;
    continue;
  }
  writeWav(path, trimmed);
  changed++;
  const notes = [
    stripped.length ? `dropped ${stripped.join(", ")}` : "",
    wasTrimmed ? `trimmed to ${after.toFixed(2)}s` : "",
  ].filter(Boolean);
  console.log(`  ${path}  ${notes.join("; ")}`);
}
console.log(`${changed} re-encoded, ${kept} already clean, in ${dir}/`);
