# counting

0–100 in Mandarin, French and German, generated from a small table of lexical
atoms plus one rule set per language. Groundwork for a Tauri app that drills
the four skills — reading, writing, listening, speaking — over that range.

Right now it is the composer and its tests. There is no UI yet.

```bash
make check      # golden forms + invariants — works on a bare clone
make table      # all 303 forms, side by side
make stats      # what each language actually costs in atoms
make emit       # regenerate numbers.json + numbers.tsv
make typecheck  # tsc --noEmit (run 'make deps' first)

make install    # put a 'counting' command on PATH under ~/.local
make uninstall  # remove it
```

`make install` copies the sources to `$PREFIX/share/counting` and drops a
`counting` wrapper in `$PREFIX/bin`, so `counting table` works from anywhere.
Unlike the Tauri repos there is no `install-guard` and no `install.sh`: with no
bundle and no `.desktop` entry, the same target is correct on macOS and Linux.
The wrapper refuses to run on Node older than 23, where the types would not be
stripped.

Node 26 strips the types natively, so `node compose.ts` runs the TypeScript
directly with no build step and no dependencies. The two devDependencies exist
only for `typecheck`, and the frontend will be able to import `compose.ts`
rather than keeping a second copy of the logic.

`numbers.json` and `numbers.tsv` are generated but committed on purpose: when a
rule changes, the diff shows exactly which of the 303 forms moved.

## What the first cut settled

**The premise holds.** 101 numbers cost between 12 and 23 lexical items:

| | atoms | irregular |
|---|---|---|
| Mandarin | 12 | 1 (tone sandhi at 一百) |
| German | 16 | 9 |
| French | 23 | 9 |

**One generic rule engine would have been a mistake.** French 71 vs 81, German
stem alternation, and Chinese exceptionlessness have nothing in common. What
generalises is the *shape* — `atoms` plus `compose(n)` — not the rules. Each
language is ~60 lines and reads like a description of the language. A unified
engine would have been three times the code and readable as none of them.

**German needed a concept the others didn't:** a word changes shape depending
on what it is glued to, and there are *two* different contexts.
`sechs` → `sech` before `-zehn`/`-zig` (sechzehn, sechzig) but stays `sechs`
inside an und-compound (sechsunddreißig). Getting that wrong produces
*sechunddreißig, which is the kind of error that survives a demo and fails a
learner. It lives in `lang/de.ts` as `beforeSuffix` vs `inCompound` and is not
in the shared `Atom` type, because only German needs it.

**`parts` is the interesting output, not `form`.** It records the atoms in
*spoken* order:

```
73   zh  7+10+3      seven ten three
     fr  60+13       sixty thirteen
     de  3+70        three and seventy   ← opposite order to the numeral
```

That asymmetry is teaching content. It is also what a drill needs in order to
say *why* an answer was wrong rather than just marking it red.

## Verification

`golden.ts` holds 56 hand-checked forms — every number where the language does
something you would not have guessed. `check` also asserts that all 303 forms
are non-empty, that every `parts` entry is a declared atom, and that no two
numbers share a form.

The last one matters more than it looks: if two numbers collide, a
listening drill has no correct answer. Nothing collides in these three.

## Known gaps

- **No IPA for French or German.** The written form is not the spoken form —
  *vingt* is /vɛ̃/ alone but /vɛ̃t/ in *vingt-deux*, and *six*/*dix*/*huit*
  change under liaison. Needed before the listening and speaking drills are
  honest; not needed to check the composer. Pinyin is emitted for Mandarin
  because there the script genuinely withholds the pronunciation.
- **Traditional French hyphenation.** `vingt et un`, not the 1990 reform's
  `vingt-et-un`. Both are correct; a grader should accept either.
- **Regional variants not implemented.** Belgian and Swiss French replace
  70/80/90 with *septante*/*huitante*/*nonante* and make the whole range
  regular — about six lines in `lang/fr.ts`, and a good demonstration that the
  shape holds.
- **`check`'s atom-closure test exempts German multiples of ten**, because
  40–90 are derived rather than declared. Those forms are covered by golden
  values instead.

## Where this is going

A Tauri 2 · React app in the shape of the neighbouring repos, with four drills
over the same data:

| Skill | Mechanic | State |
|---|---|---|
| Reading | numeral → word | composer is enough |
| Writing | numeral → type the word | composer is enough |
| Listening | hear it → type the numeral | needs TTS in Rust, and IPA |
| Speaking | see it → say it → checked | needs ASR; self-assessment first |

Two things are settled by the neighbours rather than by this repo. Audio must
live in Rust, not the webview — `ndisc/SUITE.md` records `nchat` shipping Web
Audio that was silent on Linux, and WebKit2GTK cannot play media from app URL
schemes. And speaking is not general recognition: it is a check against one of
101 known strings, which is a much smaller problem than it first looks.

This is **not** an `n`-suite app. It lives beside them but shares no Nostr
layer, no keys and no shared suite directory. See `CLAUDE.md`.
