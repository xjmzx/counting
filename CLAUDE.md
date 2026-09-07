# counting — notes for Claude

0–100 in three languages, composed from a small table of atoms. A Tauri 2 ·
React app over that data, with two of the four skills built (read, write) and
two visibly unbuilt (listen, speak).

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
make check      # data + typecheck + cargo check — the suite's 'check' shape
make dev        # the app, hot reload
make web        # frontend only in a browser
make install    # the 'counting' CLI under ~/.local — NOT the app bundle
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

## Traps specific to this repo

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
- **`make install` is deliberately not guarded by platform.** The Tauri repos
  split it (`make install` for the Linux bare-binary layout, `./install.sh` for
  a macOS `.app`) because they produce a bundle and a `.desktop` entry. This
  produces neither, so one target is correct on both. Do not copy the guard
  across.
- **`grade.ts` lives at the repo root, not in `src/`.** It is pure, it has no
  DOM, and `compose.ts check` tests it. Moved into `src/` it would become the
  one piece of load-bearing logic with no test. Same for anything else the
  drills need to be *right* about.
- **Folding is lossy, so collisions are a real risk.** Grading strips tones and
  diacritics and folds `ß`→`ss`, hyphen→space. If two numbers ever fold onto
  one accepted string the grader silently marks a wrong answer right. `data`
  asserts no collisions; do not widen `fold()` without re-running it.
- **The unbuilt skills stay visible.** Listen and Speak render a panel saying
  what is missing. Do not hide them to make the app look finished, and do not
  wire them up with a browser API — see the audio note above.
- **The written form is not the spoken form** for French or German. Anything
  that claims to teach listening or speaking needs a pronunciation layer first
  — see the gaps section of the README.

## Not here

Machine-local paths and per-box ops belong in a machine-local `CLAUDE.md`.
**This repo is intended to be public.**
