# counting — notes for Claude

0–100 in ten languages, composed from a small table of atoms. A Tauri 2 ·
React app over that data, with three of the four skills built (read, write,
listen) and speaking parked by decision.

## Not an n-suite app

This lives under `xjmzx/` but is **not** part of the `n` suite, and
`ndisc/SUITE.md` does not govern it. That document is the hub for a personal
music library published over Nostr — this shares none of it: no Nostr, no keys,
no shared suite directory, no `published.json`. Do not n-prefix it and do not
reach for the suite's conventions by default.

**One thing there is still worth reading before writing any audio**, when the
app arrives: SUITE.md records that `nchat` shipped Web Audio tones that worked
on macOS and were silent on Linux, and that WebKit2GTK cannot play media from
app URL schemes. Text-to-speech for the listening drill will hit exactly that,
so it belongs in Rust, not the webview.

## Build and verify

```
make data       # golden forms, invariants, grading — bare clone, no install
make scriptcheck # does each voice read its script at all?   [macOS only]
make check      # data + typecheck + cargo test — the suite's 'check' shape
make dev        # the app, hot reload
make web        # frontend only in a browser
make install    # the 'counting' CLI under ~/.local — NOT the app
./install.sh    # the .app into /Applications — this is the shortcut target

git push --tags # a v* tag makes CI publish a .deb and a .dmg
```

`make data` has no dependencies: Node 26 strips the types natively, so
`node compose.ts` runs the TypeScript as-is. Keep it that way — it is what
makes the data layer checkable without a toolchain, and `make install` depends
on it rather than on `check` for the same reason.

## What is borrowed, and what is not

Only the **palette** comes from the suite: `tailwind.config.ts` and the theme
tokens in `src/index.css`, taken from `nping`. Do not reach further.

- **The top-bar three-zone grammar does not apply.** SUITE.md scopes it to
  `ndisc`/`nplay`/`ntree`/`nsmpl`. This app has no transport for the centre
  zone, no Nostr identity, and no view-switch. `nchat` and `nping` already sit
  outside that list while using the palette, so this is the existing pattern.
- **There is no `n` wordmark.** The identity convention is `n` in `--c-accent`
  plus the app suffix in `--c-mauve`; using it would assert suite membership
  this app does not have. The title still toggles the theme, which is the part
  worth keeping.

## Adding a language

Six places. `make data` fails until the first five are done — and **the sixth
is the one it cannot catch**, because it is Rust and it is platform-specific.

1. `lang/xx.ts` — atoms plus `compose(n)`; its `family` (top-level, e.g.
   Indo-European), `branch` (Romance, Tai…) and `numerals` (where the number
   words came from, which is **not** always where the language came from); and
   its `scale` ladder.
2. `golden.ts` — hand-checked forms for every irregularity.
3. `voices.ts` — acceptable locales, best first. Never a bare prefix match.
4. `sounds.ts` — pronunciation rules, and `SCRIPT_RULES` too if the script is
   not Latin. At least 90% of the range must be explained by the sound rules,
   which the check enforces.
5. The `LANGS` arrays in `compose.ts` and `src/lib/langs.ts` — **keep each
   family contiguous**, since the picker groups by runs and `make data` fails
   on a split family — plus the locale in `tools/spell.swift` and
   `tools/crosscheck.ts`.
6. **`normalise_spd_language` in `src-tauri/src/tts.rs`, or the language is
   mute on Linux** — plus the two tables in `src-tauri/examples/speechcheck.rs`
   so the diagnostic can see it too.

**Why the sixth is easy to miss, and why nothing red will tell you.** macOS
enumerates its own voices: `say -v '?'` reports `en_GB` and the language works
the moment `voices.ts` accepts it. speech-dispatcher reports espeak's tags
instead, and every tag this app does not explicitly map is dropped — so on
Linux the language has no voices, the drill disables its play buttons, and the
panel offers to install a synthesiser that is already installed. Everything
passes: `make data` does not read Rust, `cargo test` does not know the language
list, and a developer on macOS sees a working app.

This has happened. English shipped with all 101 recordings and could not be
listened to on Linux at all, because the recordings sit *behind* the voice
check. Adding a language means adding it here as well, and `make speechcheck`
on a Linux box is what shows you whether you did.

Then `make crosscheck` for free verification against ICU, and `make soundcheck`
for whatever the audio probes can confirm.

**Hindi is the one language exempt from the compositionality bar**, and it is
exempt on purpose rather than by oversight. Do not "fix" its atom count or
invent a decomposition for `parts`; 101 atoms is the true answer and the point.

**Check compositionality before starting.** If the word for 23 does not contain
the word for 3, the composer contributes nothing and the language is a word
list wearing the app's clothes. Hindi is the example: 0% ones-visibility, where
every other language surveyed scored 69% or more.

## CI

`.github/workflows/check.yml` runs on every push: the data assertions on both
platforms, both typecheck projects, `cargo test`, and the ICU cross-check on
macOS. `release.yml` fires only on a `v*` tag and builds the `.deb` and `.dmg`.

- **The `data` job installs nothing on purpose.** `make data` is documented as
  running on a bare clone, and omitting `npm ci` is what turns that from a
  claim into something enforced — an accidental dependency in the data layer
  fails there rather than years later. Do not add an install step to it.
- **A red `icu` job with a green `data` job means suspect ICU, not the
  composers.** A macOS runner image update can change a spelling. The fix is a
  settled difference in crosscheck's ACCEPTED map, or an `alt` on the form —
  not an edit to a table that `golden.ts` still agrees with.
- **`soundcheck` is deliberately not in CI.** It reports rather than fails, and
  the runners have a different set of installed voices, so it would be noise
  with no signal.

## Traps specific to this repo

- **The version chip is borrowed; the top-bar grammar still is not.** The chip
  follows the suite format exactly — short version on the face, full string in
  the tooltip — because it is a component, not a layout. That does not open the
  door to the three-zone header, which SUITE.md scopes to the media apps.
- **Bump with `make version V=x.y.z`, never by hand.** Five files carry the
  version and the chip reads the bundle's, so a partial bump shows a number
  that disagrees with what is installed.
- **Group by the top-level family, and say the rest in words.** Thai is
  Kra-Dai but counts with Chinese loans; Vietnamese is stuffed with Chinese
  vocabulary but counts with native words. A tab layout implies a claim it
  cannot qualify, so the grouping stays a standard classification and
  `LanguageNote` carries the interesting part.
- **The language picker groups into one pill per family, not one list with
  dividers.** A divider element is wrong because the list wraps: at the 420px
  minimum window each family lands on its own line and a leading divider reads
  as a stray tick. Separate pills survive wrapping and stay legible on one line
  or three.

- **`golden.ts` is the specification, not a regression net.** If the composer
  disagrees with it, the composer is wrong. Never edit a golden value to make a
  test pass — check the language first, and add a row whenever a new
  irregularity turns up.
- **German has two combining contexts and they differ.** `sechs` → `sech`
  before `-zehn`/`-zig` (*sechzehn*, *sechzig*) but stays `sechs` inside an
  und-compound (*sechsunddreißig*). One stem field produces \*sechunddreißig,
  which reads plausibly and is wrong.
- **The uniqueness invariant is load-bearing.** If two numbers ever share a
  form, a listening drill has no correct answer. `check` asserts it.
- **`noUncheckedIndexedAccess` is on.** Do not turn it off to quiet an array
  access; it has already caught one unproven index here.
- **Two installs, easily confused.** `make install` is the *CLI* and is
  deliberately unguarded by platform — it ships no bundle and no `.desktop`
  entry, so one target is right on macOS and Linux. `./install.sh` is the
  *app*, is macOS-only, and is what a Dock or Spotlight shortcut points at. Do
  not merge them, and do not let `make install` start producing a bundle: the
  CLI install must keep working without a Rust toolchain.
- **The .deb and the CLI both want the name `counting`, and the CLI wins.**
  The bundle installs the app at `/usr/bin/counting`; `make install` puts the
  composer wrapper at `~/.local/bin/counting`, which comes first on a normal
  PATH. Since the two installs are documented as *not* alternatives, both being
  present is the expected state. `src-tauri/counting.desktop` exists solely to
  make `Exec` absolute — without it the menu entry runs the CLI, and
  `Terminal=false` means it fails silently: no window, no error. Do not drop
  the template, and do not "simplify" `Exec` back to a bare name.
- **That desktop template is also why there is no AppImage.** Tauri builds the
  AppImage from the same file tree as the deb, so the one template serves both
  — and they want opposite things. AppRun `execvp`s whatever `Exec` names, and
  a path containing a slash skips the PATH lookup that would otherwise find the
  AppImage's own bundled binary first, so an absolute `Exec` sends it to the
  host's copy instead. Measured, not reasoned: the AppImage died with `Error
  executing '/usr/bin/counting'`. Adding AppImage back means giving it a
  desktop file of its own, not deleting the deb's.
- **CI pins Node 24, not the suite's 20.** Every other release workflow in the
  suite sets `node-version: "20"`, and copying one in unchanged breaks this
  repo quietly: `node compose.ts check` needs the native type stripping of Node
  23+, so on 20 the release's data check does not run at all. `engines` says
  `>=23` for the same reason.
- **The release workflow builds two platforms and the Linux job owns the
  release.** It creates the GitHub Release and its notes; macOS only appends
  its `.dmg`. Do not give the macOS job `generate_release_notes` — two jobs
  writing the same release clobber each other. Windows is absent on purpose:
  the app has never been run there, and a bundle that has never been launched
  is the "untested code that looks like support" this repo argues against.
- **Hint text is plain text, not markdown.** `*before*` renders with its
  asterisks visible. `make data` asserts against paired asterisks and
  backticks — but a *single leading* asterisk is the linguistic convention for
  an unattested form (`zwei would predict *zweizig`) and is allowed on purpose.
- **`SCRIPT_RULES` is separate from `SOUND_RULES`** and shown first. How to
  decode the writing system precedes how to pronounce what you decoded. Only
  non-Latin scripts need entries.
- **Never write a combining mark on its own in user-visible text.** With no
  base to attach to, the shaper draws a dotted-circle placeholder (U+25CC) and
  it reads as a broken glyph — this is correct behaviour, not a font or
  encoding fault. Devanagari ा, Thai tone marks and Arabic harakat are all
  combining. Name the sound in words and show it inside a word instead.
  `make data` asserts it across every hint, note and language description.
- **`queue.ts` and `grade.ts` live at the repo root, not in `src/`.** It is pure, it has no
  DOM, and `compose.ts check` tests it. Moved into `src/` it would become the
  one piece of load-bearing logic with no test. Same for anything else the
  drills need to be *right* about. A queue bug is the worst kind: the drill
  still works, it just teaches badly, so nothing looks wrong on screen.
- **`useProgress` deliberately has no reload effect.** The Drill's key includes
  language and skill, so switching either remounts and the hook initialises
  fresh. An effect that reloaded on a prop change would race the save effect
  and write the previous language's progress under the new key. Verified by
  hand: switching zh → fr leaves the zh entry intact.
- **Every `localStorage` access is wrapped.** Private windows, cleared site
  data and storage-blocking settings all throw rather than returning null. An
  unremembered session is still a usable one; a crashed one is not.
- **Grading is lenient about keyboards and strict about choices.** An answer
  with no diacritics is compared with the marks stripped from both sides —
  nobody is marked wrong for lacking a key. An answer that *carries* marks must
  carry the right ones, because in a tonal language they are the answer. This
  was found in Vietnamese: folding tones away made the grader accept
  `mười mốt` for 11, which is the very substitution the language turns on.
- **Folding is lossy, so collisions are a real risk.** Grading strips tones and
  diacritics and folds `ß`→`ss`, hyphen→space. If two numbers ever fold onto
  one accepted string the grader silently marks a wrong answer right. `data`
  asserts no collisions; do not widen `fold()` without re-running it.
- **The unbuilt skills stay visible.** Listen and Speak render a panel saying
  what is missing. Do not hide them to make the app look finished, and do not
  wire them up with a browser API — see the audio note above.
- **Byte-comparison probes do not work for Japanese.** The voice renders kanji
  and kana with different timing even for identical phonemes, so 百 and ひゃく
  produce different files while plainly being the same word. Use
  `durationEvidence` there; it discriminates a one-mora reading from a
  two-mora one, which is what the counting readings turn on.
- **`make scriptcheck` answers a different question from `soundcheck`.**
  soundcheck asks whether a pronunciation rule is true; scriptcheck asks the
  cruder thing — whether the voice is reading the writing system at all. A
  voice with no dictionary for a script emits one fixed fallback per character,
  so a flat duration spread across distinct atoms is proof it is not reading
  them. That is how espeak-ng's missing kanji dictionary was caught. It is
  one-way in the same way soundcheck is, and it never fails a build.
  `speechcheck`/`speechprobe` is its cross-platform half, timing the utterance
  because speech-dispatcher will not write audio to disk. Two instruments, one
  question — keep their verdicts agreeing.
- **Measure the audio, not the file.** A rendered file carries whatever silence
  the engine pads with, and that padding is **not** the same for every word —
  if it were, it would cancel out of a difference and leave the spread alone.
  Measured on macOS `say`, where the padding is near-constant, the file spread
  and the audible spread agree to within 4%. open-jtalk is the case that bites:
  its padding varies the other way, squeezing a genuine 0.10s spread into
  0.055s — under the 0.06s threshold this once used, which would have convicted
  a working engine of being a fallback. Assume nothing about an engine's
  trailing silence; trim to the audible span and the question does not arise. `scriptcheck`
  trims to the audible span for exactly this reason. The same caution applies
  to `speechprobe` from the other direction: wall-clock timing adds process
  startup, and noise *widens* a spread, so it errs toward clearing a fallback,
  which is the more dangerous mistake of the two.
- **A fallback's spread is zero, not merely small.** It is the same utterance
  every time — "Chinese letter" for every kanji alike — so the threshold sits
  just above nothing (0.03s) rather than halfway to the first real reading.
  Measured, trimmed: fallback 0.00s, open-jtalk reading kanji 0.10s, the nine
  other languages 0.15–0.50s.
- **`make soundcheck` is one-way, and the code says so.** A confirmed probe is
  real evidence; a failed one means no clean probe exists, not that the rule is
  wrong. Never delete a rule because its probe fails, and never make soundcheck
  fail a build.
- **Probes are voice-dependent.** `fr-sept` confirms with Thomas and not with
  Jacques. If a probe result changes, suspect the voice before the rule.
- **Standard voices rank above character voices.** The bracketed macOS names
  (`Grandma (…)`, `Rocko (…)`, `Eddy (…)`) are theatrical by design. Plain
  alphabetical order picks `Eddy` for French, which is wrong for a
  pronunciation drill.
- **Never pick a voice by language prefix.** `zh_HK` is Cantonese, and a
  Cantonese voice reading Mandarin numbers is wrong in a way nothing on screen
  shows. `voices.ts` holds an allowlist of acceptable locales per language and
  `make data` asserts it. Adding a language means adding its locales there.
- **Never add a second `[[bin]]` to `src-tauri`.** The Tauri bundler picks a
  binary to ship and picked the wrong one: the `.app` launched `speechcheck`
  instead of the drill, with `Contents/MacOS/` holding only the diagnostic.
  Extra tools go in `src-tauri/examples/`, which is never bundled.
- **Resources are mapped, not passed as `../` paths.** `"resources": ["../clips"]`
  lands them under `Resources/_up_/clips`, which no lookup expects. The object
  form `{"../clips": "clips"}` puts them where the code looks.
- **A recorded clip beats synthesis, and the app says which you heard.** Clips
  live at `clips/<lang>/<n>.wav` and nothing in the mechanism knows about any
  particular language — a contributed recording drops in and is preferred from
  the next launch. Sparse coverage is permanent, not temporary: over a thousand
  recordings would be a full set, so the synthesised path never goes away and a
  missing clip must never read as a fault.
- **A committed clip carries `fmt ` and `data` and nothing else.** WAV holds
  `LIST`/`INFO` — artist, date, the software that made it — so an editor's
  export is a small biography of whoever recorded it, and committing one makes
  that public permanently. `make data` fails on any other chunk, on the wrong
  sample rate, on silence, and on a clip too long to be a number.
  `make clipclean L=xx` re-encodes from samples, which is the only reliable
  strip, and is idempotent. Verified by planting a LIST/INFO chunk and watching
  the check fail.
- **The recorder is a `tools/` CLI, not a mode in the app.** That is
  `docs/collaboration-design-2026-09-07.md`'s decision, not an accident: a
  separate recorder is what keeps `counting` small, verifiable and offline.
- **`tools/wav.ts` is split out so it can be tested without a microphone.** It
  writes the files the app plays, and its failure mode is eating the first
  phoneme — inaudible in isolation, obvious only to someone listening to all
  101 takes in order. `make data` asserts the word survives, the margin
  survives, silence stays silent, and a round trip is byte-identical.
- **The clip audio is not committed, and that is a hold rather than a verdict.**
  `make clips` renders Japanese with Apple's voices, and whether that output may
  be redistributed is unanswered. `clips/README.md` states it; one line of
  `.gitignore` reverses it once it is settled.
- **`make speechprobe L=xx` is the cross-platform half of `scriptcheck`.**
  That one measures rendered files with `afinfo` and cannot run off macOS,
  because speech-dispatcher will not write audio to disk. This times the
  blocking utterance instead, best of two, and reports a spread. Wall time
  carries about a second of constant overhead, so its threshold is 0.10s
  against scriptcheck's 0.06s — and like every check of this kind it reports
  and never fails a build.
- **The speech stack is `Recommends:`, never `Depends:`.** Reading and writing
  work with no audio, so a missing synthesiser must not block installation —
  but apt installs recommends by default, so the normal case is all ten
  languages speaking. Tauri exposes no `suggests`, and it would be the wrong
  strength anyway: apt skips those, leaving the listening drill dead on a
  standard install. **Nothing in CI builds a `.deb`**, so a bad key in the deb
  config surfaces only at the next tag — validate against
  `node_modules/@tauri-apps/cli/config.schema.json` after editing it.
- **Japanese on Linux is excluded by module, not by language.** `japanese_module`
  looks for an open-jtalk output module; when one is there the exclusion lifts
  and Japanese is spoken with `-o <module>`. `make speechcheck` reports what a
  given machine actually has.
- **Nothing in `tts.rs` is behind `#[cfg]` except which binary is spawned.**
  Gating the Linux implementation out on macOS would mean neither a developer
  machine nor CI's Rust job ever compiled it — which is precisely how untested
  code that looks like support gets shipped. Parsing, locale mapping and the
  rate conversion are ordinary functions with ordinary tests.
- **An excluded language and an empty machine must not show the same panel.**
  Both produce an empty voice list, so the panel has to be told them apart:
  `speech_info` carries an `unsupported` list with the reason in the user's
  words, and a test asserts every entry in it is genuinely unmapped. Without
  that, Japanese on Linux advised installing espeak-ng — already present, and
  the very engine that cannot read kanji.
- **A language is excluded from a backend by not mapping it.** That is the
  whole capability matrix: `voicesFor()` already returns an empty list when
  nothing acceptable is installed and the drill already explains it. Japanese
  is absent from `normalise_spd_language` because espeak-ng has no kanji
  dictionary and says "Chinese letter" once per character — the drill would
  play audio, grade an answer, and look entirely correct. The measurements
  behind that, for all ten languages, are in
  `docs/linux-audio-design-2026-09-07.md`; `make scriptcheck` is the standing
  test for it.
- **Locale namespaces are normalised in Rust, never in `voices.ts`.** The
  allowlist holds one namespace. `Voice.id` carries whatever the backend needs
  back, which on speech-dispatcher is a bare `fr` — `fr_FR` is rejected.
- **Audio does not need a pronunciation layer.** A TTS voice says
  *soixante-treize* correctly from the written string; IPA is only wanted for
  *showing* a learner how a word sounds. An earlier version of these notes had
  this backwards and made listening look far more expensive than it is.
- **The range is 0–100, and extending it is a decided direction, not a whim.**
  See `docs/large-numbers-design-2026-09-07.md`. The aim behind the app is
  transactional — understanding a price — which 0–100 cannot reach. The scale
  ladders are the first step and are already in the data. Do not extend a
  composer past 100 without reading that document: the drill unit has to stop
  being the number and become the shape, or the queue puts ten thousand
  entries in `localStorage`.
- **Speaking is parked by decision, not by oversight** — do not propose it as a
  next step.
- **`golden.ts` marks its own homework; `make crosscheck` does not.** The
  golden file was written by whoever wrote the composer, so it proves
  consistency. ICU's spell-out is a separate implementation — run
  `make crosscheck` after any change to a language table. A difference there
  needs a human decision, not an automatic fix: both forms may be correct, in
  which case add the other to `alt` or to the crosscheck's ACCEPTED map.
- **A `scale` rung is a power with a word of its own, not every power.**
  Vietnamese has no rung at 10⁴ because 10,000 is *mười nghìn*, ten thousands;
  Thai has one at every power to a million. Filling in the composed powers
  would erase the difference the ladder exists to show. `make data` asserts the
  ladders are not all the same length, since that is what filling them in from
  one language would produce.
- **Only the listening drill speaks unprompted.** Reading and writing offer
  audio on the answer, through the transliteration. Do not add autoplay to
  them: an app that makes a noise you did not ask for is one people use with
  the sound off, which costs more than it gains.
- **The transliteration is deliberately the largest thing after the prompt.**
  `reading` is only set for non-Latin scripts, so making it prominent targets
  exactly the languages where the spelling does not show the sound. Do not
  shrink it back to a caption.
- **`alt` is for real alternatives, not typing tolerance.** Case, hyphens,
  diacritics and invisible characters are `fold`'s job. `alt` is for words a
  speaker would call equally correct, like *einhundert* beside *hundert*.

## Not here

Machine-local paths and per-box ops belong in a machine-local `CLAUDE.md`.
**This repo is intended to be public.**
