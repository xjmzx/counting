# Linux audio: design notes

**Status:** built, and **verified on Linux** 2026-09-07. Both checks this
section previously listed as outstanding have been run on Ubuntu / X11, and
both pass. Nine languages speak; Japanese is excluded by design and the drill
says so.

1. **The `spd-say -L` output format** — `parse_spd_line` handles real output.
   All nine mapped languages resolve, 101 voices each, and `ja` is dropped as
   intended while `yue` maps to `zh_HK` so the allowlist rejects it for the
   documented reason.

   One quirk the manual does not mention: **`spd-say -L` is not lossless.** Its
   fixed-width columns overflow on long variant names and butt the language
   field against the variant — `afHalf-LifeAnnouncementSystem` — which
   `looks_like_language` correctly refuses. About 1,000 of 13,000 lines drop
   this way. All are joke character variants and no target language loses a
   voice, so this needs no fix; it is recorded so that a future voice count
   that looks short is not mistaken for a parser bug.
2. **That `spd-say -l <tag> -r <n> -- <text>` speaks** — it does; confirmed by
   ear, across the nine.

**One defect found in the confirming, still open.** A language excluded from a
backend and a machine with nothing installed are different situations, and the
drill currently shows the same panel for both. On Linux, Japanese reads:

    No Japanese voice is available. Install a synthesiser speech-dispatcher
    can drive — `sudo apt install espeak-ng` covers most languages.

espeak-ng is already installed, and installing it can never fix Japanese —
it is precisely the engine that cannot read kanji. The advice is not merely
unhelpful, it sends someone to do a thing that will not work and cannot tell
them why. The reason is written in `normalise_spd_language`, in this document
and in `CLAUDE.md`; the one place it does not reach is the person looking at
the panel. An exclusion needs to carry its own sentence.

Originally: Written 2026-09-07, on Ubuntu / X11 / WebKitGTK 2.52.6.

`tts.rs` parks Linux speech with an honest error and gives the reason: nothing
here had ever been run on Linux, so an espeak-ng backend would have been
guessed at rather than tested. That reason has now expired. The app builds on
Linux, `make check` passes there, the window opens, and read and write both
work. **Listen is the only skill that does not**, so the question is no longer
hypothetical: it is the one thing standing between this app and being whole on
a second platform.

The short answer: **a Linux backend is buildable and the plumbing is easy, but
espeak-ng is not a drop-in substitute for `say`.** Nine languages are usable.
Japanese is not merely poor — it is silent about the actual word.

## The architecture is already right

Nothing here needs redesigning, which is the happy part.

- **Audio never touches the webview.** `tts.rs` spawns a process; the two
  Linux walls recorded elsewhere in the suite — transient activation, and
  element volume pinned low — are webview problems and do not apply. The
  decision to put speech in Rust, made for macOS reasons, is what makes Linux
  cheap.
- **`voices.ts` is backend-agnostic.** It wants `{ name, locale }` pairs and an
  allowlist per language. It does not care what produced them.
- **The IPC surface is already the right shape.** `list_voices`, `speak(voice,
  text, rate)`, `stop_speaking`, and failure modelled as state rather than an
  exception — `useVoices` already renders a backend that refuses.

So the work is a backend behind an existing seam, not a new feature.

## What is actually on a Linux box

Measured on a stock desktop Ubuntu, nothing installed for this test:

| | present | note |
|---|---|---|
| `speech-dispatcher` + `spd-say` | **yes** | the OS-level TTS abstraction — Linux's nearest equivalent to `say` |
| `libespeak-ng.so.1` + `espeak-ng-data` | **yes** | the *library*, without the `espeak-ng` CLI |
| `sd_openjtalk` module | yes | present, but no HTS voice installed |
| `mecab` + `mecab-ipadic-utf8` | yes | the Japanese morphological dictionary — the hard half of reading kanji |
| `espeak-ng` CLI, `festival`, `pico2wave`, `piper` | no | all installable from the archive |

speech-dispatcher reports **168 languages**. All ten of this app's languages
are covered.

**One thing is better on Linux than on macOS.** The trap that `voices.ts`
exists to prevent — macOS shipping `Sinji zh_HK`, a Cantonese voice that will
happily read Mandarin numerals — is easier to avoid here, because espeak-ng
names Mandarin `cmn` and Cantonese `yue` as *distinct codes* rather than two
regions of one language. The allowlist discipline still applies; it just has a
sharper instrument.

## The finding that shapes everything: Japanese is broken, not poor

Driving `libespeak-ng` directly (ctypes, `AUDIO_OUTPUT_RETRIEVAL`, rate 150)
and measuring rendered duration — the same `durationEvidence` technique
`soundcheck` already uses for Japanese, and for the same reason: byte
comparison cannot discriminate a reading from a non-reading:

| text | what it is | duration |
|---|---|---|
| 七十三 | 73, as the app shows it | 3.00s |
| ななじゅうさん | its true kana reading | 0.80s |
| `nanajūsan` | the app's own `reading` field | 3.31s |
| 三 | 3 | 1.04s |
| 十 | 10 | 1.04s |
| 百 | 100 | 1.04s |

**Every kanji takes exactly 1.04 seconds regardless of which kanji it is.**
That is not a pronunciation, it is a constant — the signature of a fallback.
Confirmed by ear: it says *"Chinese letter, Chinese letter, Chinese letter"*.
espeak-ng has no kanji dictionary, so it announces the character class once per
character. 七十三 is not mispronounced; it is not pronounced at all, and 3.00s
is simply 3 × 1.04.

This is the exact failure this repo's notes single out as the worst kind. The
drill would still work — a number appears, audio plays, an answer is graded —
and nothing on screen would look wrong. A learner would be listening for a
Japanese word that was never spoken.

**The `reading` field does not rescue it.** Romaji is *worse* than the kanji
(3.31s), because a Japanese voice does not read Latin script either. Only kana
works, and the app stores romaji, not kana. Rescuing Japanese therefore means
either a real engine (`open-jtalk` plus an HTS voice — `mecab` and its
dictionary are already installed, which is the expensive half) or a new kana
field in `lang/ja.ts`. It is not a configuration change.

## The other nine are usable

Judged by ear, against the trap numbers this repo already names — *soixante-
treize*, *sechsunddreißig*, 七十三, *mười một*, เจ็ดสิบสาม: **passable. Some
better than others, but all fine.** Robotic, as a formant synthesiser will be,
but the words are the right words.

Thai and Hindi deserve a specific note, because they were the other risk. Their
native script and their stored romanisation render to near-identical durations
(th 1.36s vs 1.13s; hi 0.56s vs 0.53s), so espeak-ng is genuinely reading the
script rather than falling back the way it does for kanji.

## The namespace does not match, and `fr_FR` is rejected outright

espeak-ng's identifiers are not the `xx_YY` strings `voices.ts` is written
against, and the mismatch is not cosmetic — `espeak_SetVoiceByName("fr-FR")`
**fails**. Metropolitan French is bare `fr`.

| app | macOS `say` | espeak-ng |
|---|---|---|
| zh | `zh_CN`, `zh_TW` | `cmn` (Cantonese is `yue`, separately) |
| fr | `fr_FR`, `fr_CA` | `fr` — plus `fr-BE`, `fr-CH` |
| de | `de_DE` | `de` |
| es | `es_ES`, `es_MX` | `es`, `es-419` |
| pt | `pt_BR`, `pt_PT` | `pt-BR`, `pt` |
| it | `it_IT` | `it` |
| ja | `ja_JP` | `ja` — but see above |
| th / vi / hi | `th_TH` / `vi_VN` / `hi_IN` | `th` / `vi` (+2 regional) / `hi` |

So a Linux backend needs a translation layer, and `make data`'s locale
assertion has to learn a second namespace. Note the accident worth catching:
`fr-BE` and `fr-CH` are exactly the *septante/nonante* regions the README lists
as unimplemented — a Belgian voice would read the tables' `soixante-dix`
correctly, since it is reading the string it is given, but the pairing is
misleading and they should stay out of the allowlist for now.

## Proposal: target speech-dispatcher, not espeak-ng

Both are one `Command::new` away, so this is a question of what the abstraction
buys, and it buys three things:

1. **It is the honest analogue of `say`** — the OS's own speech layer, not one
   particular synthesiser. Enumeration, rate and cancellation all exist.
2. **It inherits improvements without a code change.** A user who installs
   Piper's neural voices or `open-jtalk` gets them through the same path. Wiring
   espeak-ng directly freezes the app at the quality floor.
3. **It is already installed** on a stock desktop, where the `espeak-ng` CLI is
   not.

The cost is a layer whose configuration the app does not control, and a rate
parameter in a different unit (`spd-say -r` is −100..100, against `say -r`'s
words per minute). `speak`'s `rate: Option<u32>` is a wpm contract today and
would need mapping rather than passing through.

## Per-language state

| | on Linux | why |
|---|---|---|
| French, German, Spanish, Italian, Portuguese | **usable** | espeak's strongest area; all five verified by ear |
| Thai, Hindi | **usable** | native script genuinely read, confirmed by duration |
| Vietnamese, Mandarin | **usable** | tonal, and tones are the answer — worth a second listen before shipping |
| Japanese | **blocked** | no kanji dictionary; needs `open-jtalk` or a kana field |

## Testing an open-jtalk install on Linux

Japanese is excluded by **module**, not by language: `japanese_module()` looks
for an open-jtalk output module, and when one is there the exclusion lifts and
Japanese is spoken with `-o <module>`. So installing the engine should be the
whole fix, with no code change. Three steps settle whether it is.

### 1. Is it visible to speech-dispatcher?

    make speechcheck

Look for the line beginning `Japanese engine:`.

- **`Japanese engine: <module name>`** — speech-dispatcher can see it, and the
  app will offer Japanese. Go to step 2.
- **`Japanese engine: none`** — installed but not visible, which is a
  speech-dispatcher configuration matter rather than an app one. The module has
  to appear in `spd-say -O`.

Japanese should also read a voice count rather than `excluded` in the table
below that line.

### 2. Does it actually read kanji, or fall back?

This is the question the whole exclusion exists for, and it cannot be answered
by whether audio comes out — espeak-ng produces audio too, and says "Chinese
letter".

    make speechprobe L=ja

It speaks six distinct atoms and times each, best of two runs.

- **`Varies`** — the words are being read. Not proof the reading is *correct*,
  but the fallback is ruled out.
- **`FLAT`** — every word takes the same time, which a real reading cannot do.
  That is espeak-ng answering, not open-jtalk, whatever step 1 said.

For reference, macOS with Kyoko spreads about 0.2s across those six; espeak-ng
renders every kanji in exactly 1.04s. The failure is not subtle.

`make scriptcheck` is the sharper version of this test and is macOS-only: it
measures rendered files with `afinfo`, which speech-dispatcher cannot produce
because it will not write audio to disk. `speechprobe` times the blocking
utterance instead and runs anywhere.

### 3. Listen to it

Open the app, choose Japanese and Listen. The marker beside the play buttons
will read **synthesised**, because the clips are gitignored and a Linux build
has none — that is expected and not a fault. What matters is whether 七十三
sounds like a number.

### If it works

Nothing to change: the exclusion lifts by itself. Worth recording in this doc
that open-jtalk is the supported Japanese engine on Linux, and worth deciding
whether the `.deb` should `Recommends:` it.

### If it does not

The clip route is the fallback, and it is blocked on the licensing question in
`clips/README.md` rather than on any code. A recording by a Japanese speaker
answers both that question and the collaboration doc's Phase 1 at once.

## Resolved in the build

- **Japanese does not block the feature, and needed no new UI.** The capability
  matrix already existed as a side-effect of the voice allowlist: `voicesFor()`
  returns an empty list when nothing acceptable is installed, and the drill
  already renders a panel for that. So `normalise_spd_language` simply does not
  map `ja`, and Japanese listening shows the existing no-voice panel on Linux
  while the other nine work. Honest, per-language, no new surface.
- **`voices.ts` did not gain a namespace.** Normalisation happens in Rust:
  `list_voices` returns locales already in the app's `xx_YY` convention, and
  `Voice` carries an `id` — the tag the backend needs back — alongside the name
  shown to the user. The frontend stays backend-agnostic, which is the property
  that made the port cheap in the first place.
- **The install hint comes from Rust too.** "System Settings → Accessibility"
  is nonsense on Ubuntu; the backend names its own package.

## Open questions
- **Who installs the engine?** The `.deb` still depends on nothing. The backend
  refuses honestly when absent and now names the package: `sudo apt install
  speech-dispatcher espeak-ng`. Whether the `.deb` should `Recommends:` them is
  open.
- **What does `make soundcheck` mean here?** It is macOS-only and one-way by
  design. A Linux probe would be a *second* implementation's opinion, which is
  closer to `crosscheck`'s role than to `soundcheck`'s.

## What could go wrong

The tempting version of this work is a fifteen-line `Command::new("spd-say")`
that makes the listening drill light up on Linux. It would demo perfectly, and
it would ship a Japanese drill that says "Chinese letter" three times while the
UI shows 七十三 and waits to grade the answer.

That is precisely the failure `tts.rs` was written to avoid, and the reason the
error message there is worth keeping until this is done properly. **An honest
error beats untested code that looks like support** — and now that the quality
is measured rather than assumed, the only part still untested is Japanese.
