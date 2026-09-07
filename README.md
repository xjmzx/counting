# counting

0–100 in Mandarin, French and German, generated from a small table of lexical
atoms plus one rule set per language. Groundwork for a Tauri app that drills
the four skills — reading, writing, listening, speaking — over that range.

A Tauri 2 · React app with two of the four skills working, and the other two
present but honestly marked unbuilt.

```bash
make dev        # the app, hot reload
make web        # frontend only in a browser — the built drills need no Rust
make check      # data + typecheck + cargo check
make data       # golden forms, invariants, grading — works on a bare clone
make crosscheck # compare every form against ICU        [macOS only]
make table      # all 303 forms, side by side
make stats      # what each language actually costs in atoms
make emit       # regenerate numbers.json + numbers.tsv

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

**`make crosscheck` is the check that is not marking its own homework.** It
compares all 303 forms against ICU's rule-based spell-out via Foundation — a
separate implementation of the same three languages, by people who are not us.
All 303 agree. French matches on every one of its 101 forms, including the
awkward ones (71, 80, 81, 91, 97).

Two differences are settled rather than fixed, because both forms are correct:
ICU gives 〇 for Mandarin zero, which is the digit-by-digit form used in dates
rather than the counting form 零; and it prefers *einhundert* to *hundert*,
which is now carried as an accepted alternative. It is macOS-only, so it is its
own target rather than part of `check`.

`golden.ts` holds 56 hand-checked forms — every number where the language does
something you would not have guessed. `check` also asserts that all 303 forms
are non-empty, that every `parts` entry is a declared atom, and that no two
numbers share a form.

The last one matters more than it looks: if two numbers collide, a
listening drill has no correct answer. Nothing collides in these three.

## Known gaps

- **No speaker of French or German has reviewed the tables.** `make crosscheck`
  now covers most of what that review would catch, but a second implementation
  agreeing is not the same as a person judging what sounds right when counting
  aloud.

- **No IPA for French or German.** The written form is not the spoken form —
  *vingt* is /vɛ̃/ alone but /vɛ̃t/ in *vingt-deux*, and *six*/*dix*/*huit*
  change under liaison. This does **not** block audio: a TTS voice handles it.
  It blocks only *showing* a learner how a word sounds. Pinyin is emitted for
  Mandarin because there the script genuinely withholds the pronunciation.
- **Traditional French hyphenation.** `vingt et un`, not the 1990 reform's
  `vingt-et-un`. Both are correct; a grader should accept either.
- **Regional variants not implemented.** Belgian and Swiss French replace
  70/80/90 with *septante*/*huitante*/*nonante* and make the whole range
  regular — about six lines in `lang/fr.ts`, and a good demonstration that the
  shape holds.
- **`check`'s atom-closure test exempts German multiples of ten**, because
  40–90 are derived rather than declared. Those forms are covered by golden
  values instead.

## The app

| Skill | Mechanic | State |
|---|---|---|
| **Read** | see the word → type the number | **working** |
| **Write** | see the number → type the word | **working** |
| Listening | hear it → type the number | next — needs a voice, in Rust |
| Speaking | see it → say it → checked | parked — a long-term aim |

The unbuilt two appear in the UI with a panel saying what is missing, rather
than being hidden. They are part of the plan; pretending otherwise would make
the app look finished when it is half-built.

**Grading is deliberately tolerant**, and `grade.ts` is tested by `make data`
rather than left to the UI. Hyphens and spaces are equivalent, so the 1990
French reform spelling `vingt-et-un` is accepted alongside `vingt et un`. `ß`
folds to `ss`, because nobody on a UK keyboard can type `dreißig`. Diacritics
are optional, which also lets Mandarin be answered in toneless pinyin by
someone with no IME to hand — the written characters are accepted too.

It still refuses what it should: `sechunddreissig` (the German stem trap),
`quatre-vingt` for 80 (the plural `-s` is not optional there), and `vingt deux`
for 21. `make data` asserts both directions, and separately asserts that no two
numbers fold onto the same accepted string — otherwise the grader would mark a
wrong answer right.

**Only the palette is borrowed from the n-suite.** `tailwind.config.ts` and the
theme tokens in `src/index.css` come from `nping`, which took them from
`ndisc`; the title toggles between the fizx and upleb schemes. The top-bar
three-zone grammar is **not** used — `SUITE.md` scopes it to
`ndisc`/`nplay`/`ntree`/`nsmpl`, and this app has no transport, no Nostr
identity and nothing to catalogue. The `n`-wordmark convention is not used
either, because there is no `n`. See `CLAUDE.md`.
