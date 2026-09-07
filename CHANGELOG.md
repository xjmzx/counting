# Changelog

## v0.6.0 — English recorded

- **A human voice for English, all 101 numbers.** Recorded rather than
  synthesised, and preferred over synthesis wherever a clip exists. English is
  not one of the languages the app teaches — it is the language it is written
  in — so this is the reference layer a contributor's own recording can be
  judged against, and the first evidence that the clip mechanism carries a real
  speaker rather than a TTS voice in a different coat.
- **A recorder that can be lived with.** `make record L=en` prompts with the
  form the drill will show, and `N=39,40` or `N=41-100` redoes named numbers
  over what is kept. `p` plays a take back as often as you like before you
  decide: one listen is rarely enough, and re-recording to hear it again loses
  the take being judged. Only Enter keeps — anything unrecognised asks again,
  because keeping overwrites, and `q` once fell through to the keep branch and
  wrote a take that was being rejected.
- **`make clipcheck L=en`** reports every clip's level and length against the
  speaker's own median, and prints the `make record` line that redoes whatever
  stands out. Length is judged per syllable: against a median drawn from a
  hundred mostly-compound numbers, every round ten reads as clipped, and six
  false alarms buried the one clip that really was short.
- **`make cliptrim L=en`** re-trims saved clips, reporting by default and
  keeping originals when it writes. A human take is not reproducible.
- **Trimming rebuilt, four times, each time by something heard.** It gated on
  single samples, so the click of the Enter that starts a take anchored the
  word and every bit of dead air behind it was kept — thirty of the first
  forty-one takes. It measured level in amplitude alone, so a word-final /s/
  under 6% of its vowel lost all 150 ms of itself: six, dix, sechs, seis, sei
  — the number six ends in a fricative across most of the languages here. It
  cut trailing clicks, which took the release burst off the /d/ of "hundred",
  a rule that could never have reached the keypress it was written for. And it
  required frames to be strictly consecutive, so a fading /n/ ended the word at
  its first dip. What is left works on 10 ms frames, watches sibilance beside
  amplitude, bridges brief dips, cuts on frame boundaries so the operation
  settles, and discards a run only when it is both far from the word and too
  brief to be a syllable.
- Every committed clip is checked for embedded metadata, format, silence and
  length. A WAV can carry the artist, the date and the software that made it.

- The `.deb` now recommends `speech-dispatcher`, `espeak-ng` and the three
  open-jtalk packages. Recommends rather than depends, because reading and
  writing work with no audio at all — but apt installs recommends by default,
  so a normal install gets all ten languages speaking rather than nine and an
  apt line.

## v0.5.0 — Linux

- **The app runs on Linux.** Built, packaged and verified there rather than
  assumed to work: `make check` passes, the window opens, and `make build`
  produces a `.deb` carrying a desktop entry and hicolor icons. The bundle
  ships its own desktop file because the app and the `counting` CLI both want
  that name and `~/.local/bin` comes first on a normal PATH — with a bare
  `Exec` the menu entry starts the composer instead, and `Terminal=false`
  means it fails invisibly. There is no AppImage: it is built from the same
  file tree as the `.deb` and needs the opposite thing from that file.
- **Speech on Linux**, through speech-dispatcher rather than one particular
  synthesiser — the OS's own speech layer, so a better engine installed later
  is picked up without a rebuild. Nine of the ten languages speak. Nothing is
  behind a platform `#[cfg]` except which binary is spawned, so both backends
  compile and are tested everywhere, which is how untested code that looks
  like support gets caught rather than shipped.
- **Japanese is gated on the engine, not on the language.** espeak-ng has no
  kanji dictionary: it announces the character class once per character —
  audibly, "Chinese letter" — so 七十三 is not mispronounced but unpronounced,
  while the drill would still play audio and grade an answer with nothing on
  screen looking wrong. Install `open-jtalk` and a voice, and Japanese simply
  appears. The check is on the data those packages provide rather than on the
  module's name, because speech-dispatcher registers the open-jtalk module on
  every machine whether or not anything is behind it.
- **A recorded clip is preferred over synthesis** wherever one exists, with the
  voice as the fallback. A native recording is not a better synthesiser, it is
  the thing itself, and for a pronunciation drill that is the point.
- **The drill says which source you just heard**, so a clip and a synthesised
  voice are never silently interchangeable.
- **A language that cannot be served says which of the two reasons applies.**
  An excluded language and a machine with nothing installed are different
  situations and used to show the same panel — so Linux advised installing
  espeak-ng for Japanese, which was already installed and is precisely the
  engine that cannot read it.
- **Releases build themselves.** A `v*` tag publishes a GitHub Release with a
  `.deb` for Linux and a `.dmg` for macOS arm64; the Linux job owns the release
  notes and macOS appends its asset, since the two cannot share a runner.
  Checks now run on every push rather than only on a tag, and the `data` job
  deliberately installs nothing, which is what turns "runs on a bare clone"
  from a claim into something enforced.
- **Three ways to ask what a machine can actually say.** `speechcheck` reports
  what the app sees, using the app's own backend and parser so it cannot drift
  from it; `speechprobe` and `scriptcheck` ask the cruder question of whether a
  voice reads a script at all or emits one fixed fallback per character. They
  report and never fail a build.
- Design notes committed rather than decided in passing: what a Linux speech
  backend costs and which language blocks it, and — as a proposal only — a
  multilingual GUI and user-contributed audio over Nostr.

## v0.4.0

- **The transliteration is set large and plays.** Clicking it speaks the
  number, with a slow option beside it — a romanisation is an approximation and
  the audio is what it approximates, so they sit on one line. Only the non-Latin
  languages carry a reading, so the enlargement lands exactly where the spelling
  does not show the sound, and the tone marks are legible at that size.
- **Audio in every language, not just the ones with a transliteration.** The
  Latin-script languages carry no reading — their spelling shows the sound — so
  they get the play controls without a big line rather than the word repeated
  back at them. Vietnamese, French, German, Spanish, Portuguese and Italian all
  have a voice installed.

- **The transliteration plays.** Clicking it speaks the number, with a slow
  option beside it — the romanisation is an approximation and the audio is what
  it approximates, so they belong on one line. Available in every drill, but
  only listening still speaks unprompted, since there the audio is the question.
  Degrades to a disabled control with an honest tooltip where no voice exists,
  which includes `make web`.

- **Vietnamese script hints.** The one that matters: Vietnamese carries two
  independent layers of mark and only one is tone. ă â ê ô ơ ư are separate
  letters — the breve, circumflex and horn belong to the letter — and the tone
  mark sits on top of that, so mười is two horned vowels carrying a grave. The
  character classes are generated from the alphabet rather than typed out.
  Also: word-initial digraphs, unreleased finals, and that the spelling is
  close to one-letter-one-sound so nothing is silent.

- **Script hints**, in their own “How it's written” panel shown above the
  pronunciation one — decoding the writing system comes before pronouncing
  what you decoded. Thai gets five: เ and แ are written to the left of their
  consonant but spoken after it, a final ด reads -t and บ reads -p (hence
  “sip chet”), there are no word spaces, ◌็ shortens the vowel, and tone comes
  from consonant class and vowel length together rather than the mark alone.
  Devanagari, Chinese and Japanese have their own; Latin scripts need none.
- **Branches show as a gap inside the family pill** — Romance, then German,
  then Hindi, all still within Indo-European. Deep grouping is right, but
  flattening Romance away lost a real distinction.
- `make data` now asserts hint text contains no markdown, since these strings
  render literally. A single leading asterisk is exempt: it is the linguistic
  mark for an unattested form, not emphasis.

- Fixed a Hindi hint that wrote ा on its own. A combining mark with no base
  renders as a dotted-circle placeholder — the shaper doing the right thing,
  and a broken glyph to the reader. `make data` now asserts that no hint, note
  or language description contains one, across all ten languages.
- The same rule's character class contained a stray space, so it matched any
  form with a space in it as well as the vowel signs it meant to.

- **Grouping moved to top-level families** — Sino-Tibetan, Indo-European,
  Japonic, Kra-Dai, Austroasiatic — a standard classification rather than a
  judgement call. Five pills instead of seven.
- **A note above each drill** saying what kind of system you are about to meet:
  the family, the branch, where the numerals came from, and whether the range
  is rule or memory. Two things that were invisible until written down —
  Thai borrowed its numbers from Middle Chinese despite being unrelated to
  Chinese, while Vietnamese, full of Chinese vocabulary, counts with native
  words; and nine languages build 101 numbers from 12–29 words where Hindi
  lists all 101.

- **Hindi**, added as the deliberate word-list exception. Its numbers do not
  compose — तेईस holds nothing of तीन or बीस — so it costs 101 atoms for 101
  numbers, `parts` carries one entry and the breakdown stays empty. The app
  reports that rather than hiding it.
- **Its verification is weaker, and the tooling says so.** Every other table is
  generated from a rule written without reference to ICU, so agreement is
  evidence. A word list has no rule, so this one was written from knowledge and
  then diffed: 96 of 101 matched exactly. The five that did not — 15, 44, 63,
  79 and 100 — now carry both spellings, and `make crosscheck` prints a note
  that Hindi's agreement is partly circular.

- **Thai and Vietnamese**, taking the roster to nine. All 202 new forms agreed
  with ICU on the first run; the cross-check now covers 909.
- Thai: twenty is ยี่สิบ, using a word for two found nowhere else in the
  range, and a one in the ones position is เอ็ด, never หนึ่ง. A romanisation
  is carried and accepted as an answer, as pinyin is for Mandarin.
- Vietnamese: three ones-words change shape inside a compound, and not in the
  same places — fourteen is *mười bốn* but twenty-four is *hai mươi tư*. Ten
  shifts tone in the tens, *mười* against *mươi*, which the audio probe
  confirms is a real difference and not just spelling.
- **Grading bug, found by Vietnamese and fixed for every language.** `fold`
  stripped diacritics from both sides, so `mười mốt` passed for eleven — the
  precise substitution the language teaches. An answer carrying marks is now
  held to them; an answer with none is still compared leniently, so no keyboard
  is a disadvantage.

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
