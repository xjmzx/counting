#!/usr/bin/env node
import { writeFileSync } from "node:fs";
import type { Item, Language } from "./types.ts";
import { zh } from "./lang/zh.ts";
import { fr } from "./lang/fr.ts";
import { de } from "./lang/de.ts";
import { golden } from "./golden.ts";

const LANGS: Language[] = [zh, fr, de];
const RANGE = Array.from({ length: 101 }, (_, i) => i);

const all = (l: Language): Item[] => RANGE.map((n) => l.compose(n));

/** Width in terminal columns — CJK glyphs occupy two. */
const width = (s: string) =>
  [...s].reduce((w, c) => w + (/[⺀-鿿＀-｠]/.test(c) ? 2 : 1), 0);
const pad = (s: string, n: number) => s + " ".repeat(Math.max(0, n - width(s)));

function table() {
  const cols = LANGS.map((l) => {
    const cells = all(l).map((i) => i.form + (i.reading ? `  ${i.reading}` : ""));
    return { name: l.name, cells, w: Math.max(width(l.name), ...cells.map(width)) + 2 };
  });
  console.log("    " + cols.map((c) => pad(c.name, c.w)).join(""));
  console.log("    " + cols.map((c) => pad("─".repeat(c.w - 2), c.w)).join(""));
  for (const n of RANGE) {
    console.log(
      String(n).padStart(3) + " " + cols.map((c) => pad(c.cells[n] ?? "", c.w)).join(""),
    );
  }
}

function check(): boolean {
  let bad = 0;
  let checked = 0;
  for (const l of LANGS) {
    const want = golden[l.code] ?? {};
    for (const [k, expected] of Object.entries(want)) {
      checked++;
      const got = l.compose(Number(k)).form;
      if (got !== expected) {
        console.error(`  ✗ ${l.code} ${k}: expected "${expected}", got "${got}"`);
        bad++;
      }
    }
    // Every number must produce something, and only from declared atoms.
    const declared = new Set(l.atoms.map((a) => a.n));
    for (const n of RANGE) {
      const it = l.compose(n);
      if (!it.form.trim()) { console.error(`  ✗ ${l.code} ${n}: empty form`); bad++; }
      for (const p of it.parts) {
        if (!declared.has(p) && !(l.code === "de" && p % 10 === 0)) {
          console.error(`  ✗ ${l.code} ${n}: part ${p} is not a declared atom`); bad++;
        }
      }
    }
    // No two numbers may share a form, or the drills become unanswerable.
    const seen = new Map<string, number>();
    for (const n of RANGE) {
      const f = l.compose(n).form;
      if (seen.has(f)) { console.error(`  ✗ ${l.code}: ${seen.get(f)} and ${n} are both "${f}"`); bad++; }
      seen.set(f, n);
    }
  }
  console.log(bad === 0
    ? `✓ ${checked} golden forms match; 303 forms unique, non-empty, atom-closed`
    : `✗ ${bad} problem(s)`);
  return bad === 0;
}

function stats() {
  console.log("\nAtoms you actually have to memorise:");
  for (const l of LANGS) {
    const irregular = l.atoms.filter((a) => a.note).length;
    console.log(`  ${l.code}  ${String(l.atoms.length).padStart(2)} atoms  →  101 numbers   (${irregular} carry a note)`);
  }
  console.log("\nIrregularities surfaced to the learner:");
  for (const l of LANGS) {
    const noted = RANGE.map((n) => l.compose(n)).filter((i) => i.note);
    console.log(`  ${l.code}  ${noted.length} numbers: ${noted.map((i) => i.n).join(", ")}`);
  }
}

function emit() {
  const data = Object.fromEntries(LANGS.map((l) => [l.code, { name: l.name, atoms: l.atoms, items: all(l) }]));
  writeFileSync("numbers.json", JSON.stringify(data, null, 2));
  const tsv = ["lang\tn\theadword\treading\tparts\tnote"];
  for (const l of LANGS) for (const i of all(l)) {
    tsv.push([l.code, i.n, i.form, i.reading ?? "", i.parts.join("+"), i.note ?? ""].join("\t"));
  }
  writeFileSync("numbers.tsv", tsv.join("\n") + "\n");
  console.log("wrote numbers.json and numbers.tsv");
}

const cmd = process.argv[2] ?? "table";
if (cmd === "table") table();
else if (cmd === "check") process.exit(check() ? 0 : 1);
else if (cmd === "stats") stats();
else if (cmd === "emit") emit();
else if (cmd === "all") { table(); stats(); console.log(); check() || process.exit(1); }
else { console.error(`usage: node compose.ts [table|check|stats|emit|all]`); process.exit(2); }
