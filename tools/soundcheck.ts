/**
 * Verify the pronunciation rules that can be verified.
 *
 * Each rule may carry a probe: the word, and an alternative spelling that
 * should sound the same. Both are spoken through a system voice and the audio
 * compared byte for byte. Identical output means the engine maps them to the
 * same phonemes, so the rule is a fact about the language rather than an
 * opinion about it.
 *
 * **One-way.** A match confirms. A mismatch proves nothing — the alternative
 * spelling may simply be invalid orthography, in which case the probe fails
 * while the rule stays true. So this reports coverage; it does not fail a
 * build. macOS only.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { SOUND_RULES } from "../sounds.ts";
import { pickVoice, type Voice } from "../voices.ts";

const say = (args: string[]) => execFileSync("say", args, { encoding: "buffer" });

function voices(): Voice[] {
  const out = execFileSync("say", ["-v", "?"], { encoding: "utf8" });
  return out
    .split("\n")
    .map((line) => {
      const head = line.split("#")[0]?.trimEnd() ?? "";
      const i = head.lastIndexOf(" ");
      if (i < 0) return null;
      const name = head.slice(0, i).trim();
      const locale = head.slice(i + 1).trim();
      return name && locale ? { name, locale } : null;
    })
    .filter((v): v is Voice => v !== null);
}

function digest(voice: string, text: string): string {
  const f = join(tmpdir(), `counting-sound-${process.pid}.aiff`);
  try {
    say(["-v", voice, "-o", f, text]);
    return createHash("sha256").update(readFileSync(f)).digest("hex");
  } finally {
    rmSync(f, { force: true });
  }
}

const all = voices();
let probed = 0;
let confirmed = 0;
const unprovable: string[] = [];

for (const [code, rules] of Object.entries(SOUND_RULES)) {
  const voice = pickVoice(code, all);
  console.log(`\n${code}${voice ? `  (${voice.name} · ${voice.locale})` : "  — no voice installed"}`);
  for (const r of rules) {
    if (!r.evidence) {
      console.log(`  ·  ${r.id} — no probe`);
      unprovable.push(r.id);
      continue;
    }
    if (!voice) {
      console.log(`  ?  ${r.id} — cannot test, no voice`);
      continue;
    }
    probed++;
    const [word, alt] = r.evidence;
    const same = digest(voice.name, word) === digest(voice.name, alt);
    if (same) confirmed++;
    console.log(`  ${same ? "✓" : "✗"}  ${r.id}  ${word} ~ ${alt}`);
  }
}

console.log(
  `\n${confirmed}/${probed} probes confirmed; ${unprovable.length} rules carry no probe.`,
);
if (confirmed < probed) {
  console.log(
    "A failed probe does not refute its rule — the alternative spelling may not be\n" +
      "valid orthography. It means the rule rests on description alone.",
  );
}
