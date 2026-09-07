# Changelog

## Unreleased

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
