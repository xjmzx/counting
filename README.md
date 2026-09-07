# counting

0–100 in ten languages — Mandarin, French, German, Spanish, Portuguese,
Italian, Japanese, Thai, Vietnamese and Hindi — generated
from a small table of lexical atoms plus one rule set per language. Groundwork for a Tauri app that drills
the four skills — reading, writing, listening, speaking — over that range.

A Tauri 2 · React app with two of the four skills working, and the other two
present but honestly marked unbuilt.

```bash
make dev        # the app, hot reload
make web        # frontend only in a browser — the built drills need no Rust
make check      # data + typecheck + cargo test
make data       # golden forms, invariants, grading — works on a bare clone
make crosscheck # compare every form against ICU        [macOS only]
make soundcheck # verify pronunciation rules by audio   [macOS only]
make scriptcheck # does each voice read its script?     [macOS only]
                # all three refuse with a one-line reason elsewhere
make table      # all 303 forms, side by side
make stats      # what each language actually costs in atoms
make emit       # regenerate numbers.json + numbers.tsv

./install.sh    # build the .app and put it in /Applications   [macOS]
make version V=0.3.1   # bump the version in all five files at once
make install    # put the 'counting' CLI on PATH under ~/.local
make uninstall  # remove the CLI
```

**Two different installs, and they are not alternatives.** `./install.sh`
(also `make install-app`) does a release `tauri build`, quits any running copy,
puts `counting.app` in `/Applications` and relaunches it — that is the one to
make a Dock or Spotlight shortcut to. `make install` puts the *command-line*
composer on your PATH; it has no bundle, no icon and nothing the Dock will
show. `./install.sh --skip-build` reinstalls the last build without rebuilding.

`make install` copies the sources to `$PREFIX/share/counting` and drops a
`counting` wrapper in `$PREFIX/bin`, so `counting table` works from anywhere.
It stays unguarded by platform — the CLI has no bundle and no `.desktop` entry,
so one target is correct on macOS and Linux. The wrapper refuses to run on Node
older than 23, where the types would not be stripped.

**Releases are built by CI, not by hand.** Pushing a `v*` tag runs
`.github/workflows/release.yml`, which publishes a GitHub Release carrying a
`.deb` for Linux x86_64 and a `.dmg` for macOS arm64. The Linux job creates the
release and owns its notes; the macOS job only appends its asset, because the
two cannot share a runner. Both are unsigned. `./install.sh` stays the local
path on macOS, since it also quits the running copy and relaunches.

The Linux `.deb` installs the app to `/usr/bin/counting` with a `.desktop`
entry and hicolor icons. Note that it and `make install` both claim the name
`counting`, which is why the bundle ships its own desktop file — see
`src-tauri/counting.desktop`. No AppImage: it is built from the same file tree
as the `.deb` and cannot use that desktop file, so shipping one again means
giving it a launcher of its own.

Node 26 strips the types natively, so `node compose.ts` runs the TypeScript
directly with no build step and no dependencies. The two devDependencies exist
only for `typecheck`, and the frontend will be able to import `compose.ts`
rather than keeping a second copy of the logic.

`numbers.json` and `numbers.tsv` are generated but committed on purpose: when a
rule changes, the diff shows exactly which of the 303 forms moved.

## What the first cut settled

**The premise holds.** 101 numbers cost between 12 and 29 lexical items:

| | atoms | irregular |
|---|---|---|
| Mandarin | 12 | 1 (tone sandhi at 一百) |
| German | 16 | 9 |
| French | 23 | 9 |
| Spanish | 25 | 6 |
| Portuguese | 29 | 6 |
| Italian | 29 | 4 |
| Japanese | 12 | 5 |
| Thai | 12 | 3 |
| Vietnamese | 12 | 5 |
| **Hindi** | **101** | — |

Portuguese is the most regular of the six after Mandarin — *tens* + *e* + *ones*
with no exception anywhere. Spanish splits in two: 16–29 fuse into one word and
the fusion forces a written accent (*veintidós*, *veintiséis*), while from 31 the
pieces separate again and the accents vanish — *treinta y seis*, never
*treinta y séis*. Italian glues its compounds with no separator and drops the
tens word's final vowel before the only two ones-words starting with a vowel:
*venti* + *uno* is **ventuno**, *venti* + *otto* is **ventotto**.

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

## CI

Every push runs `check.yml`: the data assertions on Linux *and* macOS, both
typecheck projects, `cargo test`, and the ICU cross-check. Tagging `v*` runs
`release.yml`, which builds a `.deb` and a `.dmg` and publishes them.

The data job installs no dependencies, which is not an optimisation — it is how
the claim that `make data` runs on a bare clone gets enforced.

## Recording clips

    make record L=en

Enter starts, Enter stops, it plays back, Enter keeps. `r` re-records the same
number, `s` skips it, `q` stops — anything already recorded is kept, so a
hundred and one takes need not happen in one sitting.

Each take is trimmed to the word with a 60 ms margin either side, because a
human take has a variable run-up and dead air before the word reads as the app
being slow. Silence and clipping are reported rather than written.

macOS records through AVFoundation via `swift`, which is already required here
by the ICU cross-check, so it adds no dependency; Linux uses `parecord` or
`arecord`, the capture half of the package that already provides playback. The
first run on macOS raises a microphone permission prompt against your terminal,
and until it is granted capture yields an empty file rather than an error —
which the tool checks for and says so.

## Verification

**`make crosscheck` is the check that is not marking its own homework.** It
compares all 1010 forms against ICU's rule-based spell-out via Foundation — a
separate implementation of the same ten languages, by people who are not us.
All 1010 agree, and every generated table matched on the first run.

**Hindi is the exception, and `crosscheck` says so when it runs.** Every other
table comes from a rule written without reference to ICU, so agreement means
something. A word list has no rule: this table was written out from knowledge
and then diffed, 96 of 101 matching first time, and the five that differed now
carry both spellings. Agreement there is partly circular, and the tool prints
that rather than counting Hindi as verified. French matches on every one of its 101 forms, including the
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

- **The Mandarin hints carry no audio evidence.** The probe compares two
  spellings in one script, and these are facts about pinyin, which the voice is
  not reading. They rest on description alone.
- **The `.deb` recommends the speech stack.** `speech-dispatcher`, `espeak-ng`
and the three open-jtalk packages are `Recommends:`, not `Depends:` — the app
is useful with no audio at all, since reading and writing work, so a missing
synthesiser must not block installation. apt installs recommends by default, so
a normal `apt install ./counting_*.deb` gets all ten languages speaking,
Japanese included; `--no-install-recommends` gets a working app with a
listening drill that explains what is absent.

**Speech is macOS-only.** `say` is wired up; `espeak-ng` is the intended
  backend elsewhere but is deliberately unimplemented rather than guessed at,
  which is what this repo's own notes are about. The listening drill reports it
  rather than showing a mute button. The rest of the app *has* now been run on
  Linux — `make check` passes there and the window opens — so speech is the
  only gap on that platform, not the app. What a Linux backend would cost, and
  the one language that blocks it, are measured in
  `docs/linux-audio-design-2026-09-07.md`.
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
| **Listen** | hear it → type the number | **working** (macOS) |
| Speaking | see it → say it → checked | parked — a long-term aim |

The unbuilt two appear in the UI with a panel saying what is missing, rather
than being hidden. They are part of the plan; pretending otherwise would make
the app look finished when it is half-built.

**The transliteration is the play button.** A romanisation is an approximation
of a sound; clicking it gives you the sound itself, at normal speed or slow.
Only the non-Latin languages carry a reading, so this appears exactly where the
spelling does not show the pronunciation. Reading and writing offer audio on
the answer rather than playing unprompted — only the listening drill speaks
first, because there the audio is the question.

**Listening speaks the written form through a system voice.** No phonetic
transcription is involved — a voice carries its own pronunciation model, so it
says *soixante-treize* correctly from the string the composer produced. It runs
in Rust (`src-tauri/src/tts.rs`), not the webview, for the reason `SUITE.md`
records against `nchat`. There is a normal and a slow replay, because a
compound like *vierundsiebzig* goes past quickly.

**Two kinds of hint, and the script one comes first.** How a writing system
works is a different question from how the words sound, and for some scripts
the harder one: a learner meeting เจ็ด has to know that the first glyph is a
vowel *pronounced after* the consonant beside it, or the word will not decode
at all. `SCRIPT_RULES` covers that — pre-posed vowels, the limited values a
final consonant takes (ด is read -t, which is why สิบเจ็ด is “sip chet”), the
absence of word spaces, and that Thai tone comes from consonant class and
vowel length together rather than the tone mark alone. Devanagari, Chinese and
Japanese have their own. Latin-script languages have none, because the letters
run in the order you say them.

**Every revealed spelling also comes with a pronunciation hint**, collapsed behind
a “How it sounds” disclosure so it does not crowd the answer. The choice is
remembered per language: expand it once for German and it stays expanded, while
a language you already read stays quiet. Without it an English reader reads
*vier* with English values and learns the wrong sound. German ⟨v⟩ is /f/, ⟨z⟩ is /ts/, ⟨ei⟩ is "eye" and ⟨ie⟩ is "ee";
French *vingt* is "van" and the ⟨x⟩ in *soixante* is /s/. Almost every German
number in the range hits at least one of these — 81 of 101 contain a ⟨z⟩ alone.
Coverage is 101/101 for Mandarin and French and 98/101 for German; the three
left bare — *null*, *elf*, *hundert* — genuinely do read the way an English
speaker would guess, and `make data` asserts each language explains at least
90% of the range.

**`make soundcheck` proves the rules that can be proved.** Each rule may carry
an alternative spelling that should sound identical; the tool speaks both and
compares the audio byte for byte. `vier` and `fier` produce the same file, so
⟨v⟩ = /f/ is a fact about the engine's phonemes, not an opinion. 21 of 22 probes confirm. There are three kinds. `evidence` claims two spellings sound the same;
`contrast` claims they must differ (Italian *sette* against *sete* — if those
matched, the rule saying gemination is real would be false); and
`durationEvidence` compares rendered length instead of bytes, which is the only
one that works for Japanese, where the voice times kanji and kana differently
even for identical phonemes. That last is how 九 was established as kyū: it
renders in 0.366s, matching きゅう exactly, where く is 0.239s.

**The test is one-way**: a mismatch proves nothing, since the
alternative spelling may simply be invalid orthography — German ⟨z⟩ *is* /ts/,
so "zieben" reads as "tsieben" and the probe fails while the rule stays true.
Rules without a probe are not weaker claims, just ones with no clean test.

**Picking the voice is not "any voice whose locale starts with the language
code".** macOS ships `Sinji zh_HK`, which is **Cantonese** — it will read 七十三
aloud in a language this app does not teach, and nothing on screen would look
wrong. So `voices.ts` names the acceptable locales per language, best first,
and excludes everything else. `make data` asserts a Cantonese voice can never
be offered for Mandarin.

It also ranks **standard voices above character voices**. macOS ships
`Grandma (French (France))`, `Rocko`, `Eddy` and friends alongside `Jacques`
and `Thomas`; the bracketed names are deliberately theatrical and the wrong
thing to learn pronunciation from. They sort last, and alphabetical order alone
would have made `Eddy` the default.

**The queue is weighted, not random.** Uniform random spends as much time on
the numbers you know as on the one that keeps catching you out. `queue.ts`
scores each number and picks accordingly:

| | weight |
|---|---|
| settled | 1 |
| missed once | 4 |
| never seen | 6 |
| missed twice | 7 |
| missed three times or more | 10 |

A single slip does not outrank material you have never met — covering the range
matters more than chasing one mistake. Miss the same number twice and it jumps
ahead of new material, which is the point at which it has stopped being a slip.
Getting it right afterwards walks it back down, so nothing haunts the queue
forever, and nothing ever drops to zero. `make data` asserts that ordering,
that no number is starved, that none repeats immediately, and that a
repeatedly-missed number really is drawn about a third of the time in a
21-number range.

Progress is kept per language **and per skill** in `localStorage`, but not per
range: what you know about 73 is the same fact whether you met it drilling
0–100 or 0–50. The readout shows current streak, best streak, and how many of
the range are settled.

**Grading is lenient about keyboards and strict about choices.** An answer with
no diacritics is compared with the marks stripped from both sides — nobody is
marked wrong for lacking a key, so `zero`, `dreissig`, `nijuusan` and
`hai muoi tu` all pass. An answer that *carries* marks must carry the right
ones, because in a tonal language they are the answer rather than decoration.
Vietnamese forced that distinction: with tones folded away the grader accepted
`mười mốt` for eleven, which is the exact substitution the language turns on.

`grade.ts` is tested by `make data` rather than left to the UI. Hyphens and spaces are equivalent, so the 1990
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
