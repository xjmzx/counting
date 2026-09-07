# Changelog

## Unreleased

- **The drill queue is weighted.** Unseen numbers come first, missed ones come
  back sooner, and getting them right walks them back down. A single slip does
  not outrank unseen material; a second miss does. `queue.ts` is at the repo
  root and `make data` asserts the weight ordering, that nothing is starved,
  that nothing repeats immediately, and that the bias actually bites over
  20,000 seeded draws.
- **Progress persists** per language and per skill, but not per range. Current
  streak, best streak and a settled count are shown, with a reset that scopes
  to the current language and skill only.

- **`make crosscheck`** compares every form against ICU's spell-out through
  Foundation — an independent implementation of the same three languages. All
  303 agree. French matches on all 101 forms including 71, 80, 81, 91 and 97.
  macOS-only, so it is its own target rather than part of `check`.
- **Grading bug found by that cross-check:** `fold` did not strip soft hyphens
  or zero-width characters, so a word pasted from a web page could be marked
  wrong for a reason the learner could not see. ICU's German emits U+00AD
  between every element, which is what surfaced it.
- German 100 now accepts *einhundert* alongside *hundert* — both are correct,
  and ICU prefers the former. `Item.alt` carries genuine alternative spellings,
  as distinct from the typing tolerance `fold` handles.

- Scope narrowed on purpose: **0–100, refined**, rather than more skills or
  more languages. Listening stays the next target; speaking is parked as a
  long-term aim.
- **Corrected a claim that made listening look expensive.** Audio does not need
  a phonetic layer — a TTS voice carries its own pronunciation model. The
  README, `CLAUDE.md` and the in-app panels all said or implied otherwise.
- Recorded that Mandarin has been spot-checked by an intermediate speaker,
  while French and German have not been checked by anyone who speaks them.

## v0.1.0 — the app

- A Tauri 2 · React window over the composed data, scaffolded from `nping`.
- **Read** and **Write** drills work: prompt, tolerant grading, score and
  streak, and — after a wrong answer — the correct form, its reading, the
  atoms it is built from in spoken order, and any note attached to it.
- **Listen** and **Speak** are present but unbuilt, each rendering what is
  missing. Both need a pronunciation layer; listening additionally needs
  speech synthesis in Rust, for the reason recorded in `CLAUDE.md`.
- `grade.ts` folds hyphens/spaces, `ß`→`ss` and diacritics, so `vingt-et-un`,
  `dreissig` and toneless pinyin are all accepted. It is tested by `make data`,
  which also asserts that no two numbers fold onto one accepted string.
- Only the palette is taken from the suite; the top-bar grammar and the `n`
  wordmark deliberately are not.
- `make check` now means data + typecheck + `cargo check`, matching the
  neighbouring repos. `make data` keeps the zero-dependency guarantee.

## v0.1.0

First cut: the composer only. No app yet.

- Generates 0–100 in Mandarin, French and German from a per-language table of
  atoms plus a `compose(n)`. 12 atoms for Mandarin, 16 for German, 23 for
  French.
- `golden.ts` holds 56 hand-checked forms — every number where the language
  does something you would not have guessed. `make check` also asserts all 303
  forms are non-empty, atom-closed, and mutually distinct.
- **No generic rule engine.** French 71 vs 81, German stem alternation and
  Mandarin's exceptionlessness share no rules worth unifying. Only the *shape*
  is shared: `atoms` + `compose(n)`.
- German carries a concept the other two do not: two distinct combining
  contexts (`beforeSuffix`, `inCompound`). It is local to `lang/de.ts`, not in
  the shared `Atom` type.
- `make install` puts a `counting` command under `$PREFIX` (default
  `~/.local`), so the drills can be exercised from a shell before any UI
  exists. One target for both platforms — there is no bundle to get wrong.
- No IPA for French or German yet. This blocks honest listening and speaking
  drills; see README.
