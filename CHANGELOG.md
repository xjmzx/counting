# Changelog

## v0.3.0

- **A version chip in the header**, in the suite's format: `major.minor.patch`
  on the face, the full string in the tooltip, so the chip keeps a fixed width
  across releases. It reads the version from the running bundle via Tauri
  rather than from `package.json`, so it cannot disagree with what was
  installed, and it is absent in `make web` where there is no bundle to ask.
- **`make version V=x.y.z`**, borrowed from `nplay`, bumping all five files
  that carry the version at once.
- Fixed a duplicate `v0.1.0` heading here: the composer-only release and the
  app release both claimed it. Nothing was ever tagged, so the app release is
  now `v0.2.0` and everything since is `v0.3.0` — which is what the chip has
  been added to show, and the app had been reporting `v0.1.0` while carrying
  the whole UI, audio, the weighted queue, hints and seven languages.

- **Japanese.** Structurally Mandarin — 二十三 is “two ten three” — but the
  difficulty sits in the readings: counting uses yon, nana and kyū, not shi,
  shichi and ku. Answers are accepted as kanji, kana or romaji with or without
  macrons. The other readings are accepted for a standalone digit, where they
  are real, and rejected inside a compound, where counting does not use them.
- **`durationEvidence` probes.** Byte comparison fails for Japanese: the voice
  times kanji and kana differently even for identical phonemes, so 百 and ひゃく
  differ as files. Comparing rendered length works, and established that 九 is
  kyū — 0.366s against きゅう's 0.366s, where く is 0.239s.
- Cross-check now covers 707 forms; Japanese matched ICU on the first run.

- **The language picker groups by family** — Sinitic, Romance, Germanic — one
  pill per family with a gap between. `Language` gained a `family` field, and
  `make data` fails if a family is split across the roster, since the picker
  groups by runs and a split would silently render as two groups of the same
  name.

- **Spanish, Portuguese and Italian.** One family, added together because their
  pronunciation rules overlap. All 303 new forms agreed with ICU on the first
  run, taking the cross-check to 606/606.
- Portuguese is the most regular of the six after Mandarin; Spanish fuses 16–29
  into accented single words and separates again from 31; Italian elides the
  tens vowel before *uno* and *otto*.
- **`contrast` probes**, for rules claiming a distinction rather than an
  equivalence. Italian gemination is the case: `sette` and `sete` *must* differ,
  and the probe now asserts that. 20 of 21 probes confirm.
- The language tab list wraps instead of overflowing — six languages are wider
  than the 420px minimum window, and the sixth was being hidden with nothing to
  show it was there.
- The header and footer counts are derived from the roster rather than written
  out; they said "three languages" the moment there were six.

- **Hints collapse behind a “How it sounds” disclosure**, remembered per
  language — expand once for German and it stays open, while a language you
  already read stays quiet. Focus returns to the input so Enter still moves on.
- Filled the coverage gaps the disclosure exposed: German ⟨eu⟩ (*neun* is
  “noyn”), ⟨ü⟩ and the ⟨ch⟩ of *acht*; French ⟨r⟩, ⟨ei⟩, nasal *un* and the
  silent final -e. Coverage is now 101/101 for Mandarin and French, 98/101 for
  German, and `make data` asserts at least 90% per language.
- 15 of 16 audio probes confirm, up from 12 of 13. `acht ~ achd` was dropped as
  evidence for the ⟨ch⟩ rule — it demonstrates final devoicing, not the ⟨ch⟩
  sound, and the rule it appeared to support now carries no probe instead.

- **Pronunciation hints.** Revealing the spelling without explaining it taught
  the wrong sound: an English reader reads *vier* as "veer". Rules in
  `sounds.ts` explain why the word does not sound like it looks, shown wherever
  the written form is revealed.
- **`make soundcheck`** verifies the rules that can be verified, by speaking a
  word and an alternative spelling and comparing the audio byte for byte.
  `vier` and `fier` render identically, so ⟨v⟩ = /f/ is demonstrable rather
  than asserted. 12 of 13 probes confirm; the test is one-way and reports
  rather than fails.
- **Standard voices now outrank character voices.** `Grandma (French (France))`
  and `Rocko` are theatrical by design; plain alphabetical order was making
  `Eddy` the French default. Standard voices — Jacques, Anna, Tingting — sort
  first now.

- **The listening drill works.** A system voice speaks the composed form; a
  normal and a slow replay are offered. Speech runs in Rust
  (`src-tauri/src/tts.rs`), not the webview.
- **Voice choice is an allowlist, not a prefix match.** macOS ships
  `Sinji zh_HK`, which is Cantonese — picking it would read Mandarin numbers
  aloud in the wrong language with nothing on screen looking wrong. `voices.ts`
  names acceptable locales per language and `make data` asserts the exclusion.
  Four Rust unit tests cover the `say -v '?'` parser, whose entries include
  multi-word names like `Eddy (German (Germany))`.
- macOS only. `espeak-ng` is the intended Linux backend but is left
  unimplemented rather than guessed at; the drill reports that instead of
  showing a mute button. `make web` says the same, since a browser has no host.

- **`./install.sh`** builds a release `.app` and installs it to
  `/Applications`, quitting any running copy and relaunching — so the app can
  be pinned to the Dock or found in Spotlight. `make install-app` and
  `npm run install:app` are the same thing. macOS only; it checks the composer
  before building.
- `make help` now separates the two installs explicitly, because `make install`
  (the CLI) and `./install.sh` (the app) are not alternatives and the names
  gave no hint of that.

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

## v0.2.0 — the app

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
