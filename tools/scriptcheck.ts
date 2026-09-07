/**
 * Does the platform's voice actually *read* each language's script?
 *
 * This is a different question from `soundcheck`, which asks whether a
 * pronunciation rule is true. This asks something cruder and more alarming:
 * whether the voice is reading the writing system at all, or quietly saying
 * something else while the UI shows the right word.
 *
 * **The test.** A voice with no dictionary for a script does not vary: it
 * emits one fixed fallback per character. So render several *distinct* atoms
 * and compare their durations. Real readings differ — 三 and 百 are not the
 * same length in any language that can say them. A flat spread across three or
 * more different words is not a coincidence, it is a fallback.
 *
 * This was found on Linux, where espeak-ng renders every kanji in exactly
 * 1.04s — 三, 十 and 百 indistinguishable — because it has no kanji dictionary
 * and announces the character class instead: audibly, "Chinese letter". The
 * drill still showed 七十三, still played audio, still graded the answer. See
 * docs/linux-audio-design-2026-09-07.md. This tool exists so that failure
 * cannot arrive unnoticed on a platform where it was assumed impossible.
 *
 * **One-way, like soundcheck.** A flat spread is proof of a fallback. A varied
 * spread is not proof of a correct reading — only that something script-aware
 * is happening. It reports; it never fails a build.
 */
import { execFileSync } from "node:child_process";
import { rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Language } from "../types.ts";
import { zh } from "../lang/zh.ts";
import { fr } from "../lang/fr.ts";
import { de } from "../lang/de.ts";
import { pt } from "../lang/pt.ts";
import { es } from "../lang/es.ts";
import { it } from "../lang/it.ts";
import { ja } from "../lang/ja.ts";
import { th } from "../lang/th.ts";
import { vi } from "../lang/vi.ts";
import { hi } from "../lang/hi.ts";
import { pickVoice, type Voice } from "../voices.ts";

// macOS only, like crosscheck and soundcheck: `say` and `afinfo` are the
// instruments. The Linux half of this measurement is already recorded in
// docs/linux-audio-design-2026-09-07.md, taken through libespeak-ng directly.
if (process.platform !== "darwin") {
  console.error("scriptcheck is macOS-only: it renders with `say` and measures with `afinfo`.");
  console.error("The Linux measurements are in docs/linux-audio-design-2026-09-07.md.");
  process.exit(1);
}

const LANGS: Language[] = [zh, fr, de, pt, es, it, ja, th, vi, hi];

/**
 * Kana for the Japanese atoms, in their *counting* readings — なな not しち,
 * よん not し, きゅう not く, matching what lang/ja.ts composes.
 *
 * It lives here rather than in lang/ja.ts on purpose. This is probe data for
 * one diagnostic, not something the app shows or grades; adding a field to the
 * language tables to serve a test would be the tail wagging the dog. If a
 * Japanese backend ever needs kana at runtime, that is a different decision,
 * taken deliberately — see the design doc.
 */
const JA_KANA: Record<number, string> = {
  0: "れい", 1: "いち", 2: "に", 3: "さん", 4: "よん", 5: "ご",
  6: "ろく", 7: "なな", 8: "はち", 9: "きゅう", 10: "じゅう", 100: "ひゃく",
};

/** Every voice the machine has, as `say` reports them. */
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

/** Rendered length in seconds. Same method soundcheck uses. */
function duration(voice: string, text: string): number {
  const f = join(tmpdir(), `counting-script-${process.pid}.aiff`);
  try {
    execFileSync("say", ["-v", voice, "-o", f, text]);
    const info = execFileSync("afinfo", [f], { encoding: "utf8" });
    return Number(/estimated duration:\s*([\d.]+)/.exec(info)?.[1] ?? NaN);
  } finally {
    rmSync(f, { force: true });
  }
}

/**
 * A spread this tight across distinct words means the voice is not reading
 * them. espeak-ng's kanji fallback measured 0.00 — every character identical
 * to the centisecond. Anything genuinely read varies by far more than this.
 */
const FLAT = 0.06;

const all = voices();
let fallbacks = 0;
const missing: string[] = [];

console.log("Does each voice read its script, or fall back?\n");
console.log(
  `${"lang".padEnd(5)} ${"voice".padEnd(22)} ${"atoms".padEnd(6)} ${"spread".padEnd(8)} verdict`,
);

for (const lang of LANGS) {
  const voice = pickVoice(lang.code, all);
  if (!voice) {
    missing.push(lang.code);
    console.log(
      `${lang.code.padEnd(5)} ${"—".padEnd(22)} ${"—".padEnd(6)} ${"—".padEnd(8)} no acceptable voice installed`,
    );
    continue;
  }

  // Distinct forms only: repeating one word proves nothing about variation.
  const forms = [...new Map(lang.atoms.map((a) => [a.form, a])).values()].slice(0, 6);
  const ds = forms.map((a) => duration(voice.name, a.form));
  const spread = Math.max(...ds) - Math.min(...ds);
  const flat = forms.length >= 3 && spread < FLAT;
  if (flat) fallbacks++;

  console.log(
    `${lang.code.padEnd(5)} ${voice.name.padEnd(22)} ${String(forms.length).padEnd(6)} ` +
      `${spread.toFixed(2).padEnd(8)} ${flat ? "FALLBACK — not reading the script" : "reads distinctly"}`,
  );
}

// Japanese gets a second, sharper probe, because it is the one that failed on
// Linux and because a duration spread alone cannot tell a correct reading from
// a merely varied one. Kanji against its own kana is the discriminator this
// repo already uses for Japanese, and the two should agree closely.
const jaVoice = pickVoice("ja", all);
if (jaVoice) {
  console.log(`\nJapanese, kanji against its kana reading — ${jaVoice.name}:`);
  console.log(`  ${"n".padStart(4)}  ${"kanji".padEnd(8)} ${"kana".padEnd(10)} kanji  kana   agree?`);
  for (const atom of ja.atoms) {
    const kana = JA_KANA[atom.n];
    if (!kana) continue;
    const a = duration(jaVoice.name, atom.form);
    const b = duration(jaVoice.name, kana);
    const agree = Math.abs(a - b) < 0.12;
    console.log(
      `  ${String(atom.n).padStart(4)}  ${atom.form.padEnd(8)} ${kana.padEnd(10)} ` +
        `${a.toFixed(2)}  ${b.toFixed(2)}   ${agree ? "yes" : "NO — differs"}`,
    );
  }
  console.log("\n  For contrast, espeak-ng on Linux renders every one of these");
  console.log("  kanji in 1.04s flat, and says \"Chinese letter\" instead.");
}

console.log("");
if (missing.length) {
  console.log(
    `${missing.length} language(s) have no acceptable voice installed here: ${missing.join(", ")}.`,
  );
  console.log("That is a missing voice, not a broken one — macOS downloads many on demand.");
}
console.log(
  fallbacks === 0
    ? "No fallback detected. Every voice varies across distinct atoms."
    : `${fallbacks} language(s) show a flat spread — the voice is not reading that script.`,
);
console.log("Reports only; never fails a build. A varied spread is not proof of a correct reading.");
