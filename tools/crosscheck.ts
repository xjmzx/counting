/**
 * Compare every composed form against ICU's spell-out for the same locale.
 *
 * This is the only check in the repo that is not marking its own homework:
 * `golden.ts` was written by the same hand as the composer, so it proves
 * consistency, not correctness. ICU is a separate implementation.
 *
 * Differences are not automatically failures — a language can have two correct
 * forms, and ICU picks one. Anything reported here needs a human to decide.
 * Known and settled differences are listed in ACCEPTED below.
 */
import { execFileSync } from "node:child_process";
import type { Language } from "../types.ts";
import { zh } from "../lang/zh.ts";
import { fr } from "../lang/fr.ts";
import { de } from "../lang/de.ts";
import { pt } from "../lang/pt.ts";
import { es } from "../lang/es.ts";
import { it } from "../lang/it.ts";
import { ja } from "../lang/ja.ts";
import { accepted, fold } from "../grade.ts";

const LANGS: Record<string, Language> = {
  zh_CN: zh, fr_FR: fr, de_DE: de, pt_BR: pt, es_ES: es, it_IT: it, ja_JP: ja,
};

/** Settled: both forms are correct, and we prefer ours for counting. */
const ACCEPTED: Record<string, string> = {
  "zh_CN:0": "ICU gives 〇, the digit-by-digit form used in dates. 零 is the counting form.",
};

const raw = execFileSync("swift", [new URL("spell.swift", import.meta.url).pathname], {
  encoding: "utf8",
});

let unexplained = 0;
let compared = 0;
const settled: string[] = [];

for (const line of raw.trim().split("\n")) {
  const [code, ns, icu] = line.split("\t");
  const lang = LANGS[code!];
  if (!lang || icu === undefined) continue;
  const n = Number(ns);
  compared++;
  // Compare through the grader: if we would accept ICU's string from a
  // learner, we do not disagree with ICU.
  if (accepted(lang, n).includes(fold(icu))) continue;

  const key = `${code}:${n}`;
  if (ACCEPTED[key]) {
    settled.push(`  · ${key} — ${ACCEPTED[key]}`);
    continue;
  }
  console.error(`  ✗ ${key}: ours "${lang.compose(n).form}" — ICU "${icu}"`);
  unexplained++;
}

if (settled.length) {
  console.log("Settled differences (both forms correct):");
  settled.forEach((s) => console.log(s));
}
console.log(
  unexplained === 0
    ? `✓ ${compared} forms agree with ICU (or differ only where settled)`
    : `✗ ${unexplained} unexplained disagreement(s) with ICU`,
);
process.exit(unexplained === 0 ? 0 : 1);
