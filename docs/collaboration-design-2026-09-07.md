# Collaboration: multilingual GUI, and audio over Nostr

**Status:** proposal. Nothing built, nothing decided. Written 2026-09-07.

`counting` has two jobs, and both are worth stating before anything is added
to it. The first is to teach its author to count. The second is to be a
**working model to build up from** — a small, complete thing whose mechanisms
can be proven before a larger one inherits them.

The idea recorded here is what it might become if other people used it, which
is a different app with different obligations. The honest thing is to say so
rather than slide from one to the other without noticing.

## What "a working model" implies

The range is 0–100 and the languages are ten, and the smallness is the point:
it is a bounded domain, so every mechanism in it can be shown to be correct
rather than merely believed. That is what makes it a model worth building from.

**What generalises is not the number tables. It is the apparatus:**

1. a **specification** that is not the implementation — `golden.ts`;
2. an **independent check** — ICU, via `crosscheck`, which is the only thing
   here not marking its own homework;
3. **assertions over the prose**, not just the data — the combining-mark rule,
   the paired-asterisk rule;
4. **failures that explain themselves** — the no-voice panel, the unbuilt-skill
   panels, `tts.rs` refusing honestly rather than guessing.

A bigger language tool inherits those four or it inherits nothing worth having,
and each proposal below should be read against them. That is not a rhetorical
flourish: **crowdsourced audio is the first thing ever proposed for this app
that cannot inherit the second one.** There is no independent implementation to
check a human recording against. That single fact is why the trust section
below is the longest one, and why it is the design rather than a detail.

## The shape of the confusion, and the rule that resolves it

The pattern behind this repo is: build the thing I want, then notice it might
be useful to someone in the same position. That is a good way to start
software and a bad way to plan it, because the second half arrives as an
enthusiasm rather than as a decision, and enthusiasm does not say what to build
first.

So one rule governs everything below, and it is the whole point of staging it:

> **Every phase must be worth doing for one user — the author — with no
> collaborators at all.** If a phase only pays off when other people show up,
> it is infrastructure built on a hope, and it comes later.

That rule is not risk-aversion. It is what makes the two halves compatible:
a personal tool that gets better, which *happens* to become a collaborative one
if anybody turns up, and loses nothing if nobody does.

## This is two ideas, not one

They arrived together because both are "let users contribute", but they share
almost no engineering, and their risk profiles are opposite ends of a scale.

| | **A — multilingual GUI** | **B — crowdsourced audio** |
|---|---|---|
| Contribution | a pull request | a signed event plus a media file |
| Infrastructure | none | relays, hosting, bandwidth |
| Needs Nostr | **no** | yes |
| Moderation | code review | ongoing, adversarial |
| Correctness | reviewable by reading | no oracle exists |
| If it fails | a bad string, fixed in a commit | a learner is taught the wrong sound |
| Reversible | entirely | published events are not |

**They must not be welded together.** A is not a stepping stone to B in any
technical sense — it shares no code with it. It is a stepping stone in the only
sense that matters, which is that it answers the question B depends on and
cannot answer for itself: *does anyone else actually want to contribute to
this?*

## Strand A: the multilingual GUI

The app teaches ten languages through an interface available in one. That is a
real gap for the stated audience, and it is also the strand with the genuine
personal pull behind it: collaborating with people on a multilingual interface
is interesting in its own right, and the barrier to a contributor is a small
amount of their time and no infrastructure of ours.

It also has a property B does not: **a wrong translation is embarrassing, not
harmful.** It is visible, reviewable by anyone who reads the language, and
fixed by editing a file.

**The difficulty is not the strings.** It is that a good deal of this app's
text is *linguistic writing*, not UI chrome, and it carries conventions that a
translator has to be told about or will silently destroy:

- The single leading asterisk marks an unattested form — `zwei would predict
  *zweizig`. A translator who has not been told will read it as a typo, or as
  emphasis, and `make data`'s paired-asterisk assertion will not catch a lone
  one because a lone one is deliberately legal.
- **Never a combining mark on its own.** Devanagari, Thai tone marks and Arabic
  harakat all render a dotted circle with no base. `make data` asserts this
  across hints, notes and descriptions today; the assertion must extend to
  every translated string or it stops meaning anything the moment a second
  language exists.
- `SCRIPT_RULES` precedes `SOUND_RULES` because decoding a writing system
  precedes pronouncing it. A translator reordering them for flow breaks a
  pedagogical claim.

So the deliverable is not a `.json` of strings. It is a strings file **plus a
translator's brief**, and the brief is the part that takes the thought. The
existing `make data` assertions are the model: the way this repo keeps text
honest is to assert against it, and translated text should be no exception.

**What it does not need:** Nostr, accounts, relays, or a signing key. If B is
never built, A still stands.

## Strand B: crowdsourced audio

### Why it is worth wanting

Today's investigation measured the ceiling, and it is lower than it looked.
`docs/linux-audio-design-2026-09-07.md` records that espeak-ng has no kanji
dictionary and says "Chinese letter" once per character; Japanese is excluded
from the Linux backend as a result. macOS is better but the app is always at
the mercy of whichever voices a machine happens to have.

A human recording is not a better synthesiser. It is the thing itself, and for
a *pronunciation* drill that is the entire point.

**Japanese is the proof case.** It is the one language no amount of engine work
fixes on Linux, and one recording of 七十三 fixes it completely. If any part of
this is built first, build it there — the value is unambiguous and the
comparison is already documented.

### What Nostr carries, and what it does not

Less new machinery than it appears. **Audio bytes do not go in events**; a URL
and a hash do.

- **`1063`** (NIP-94 file metadata) for a clip, pointing at what it is a
  recording of. `clip.v1` in `ndisc/schema/` is the precedent and is
  structurally the same problem — a `1063` pointing back at a release and
  track. Swap that for a language and a number.
- **`1985`** (NIP-32 labels) for accents, regions and dialects. This is exactly
  what the kind is for, and it lets a third party label someone else's
  recording without touching it — which is the right shape, since the speaker
  is often not the best judge of how their own accent should be described.
- **`7`** for reactions, if voting happens at all. See below; it should not be
  the first thing built.

**No new kind for "a word".** `(language, n)` is already a coordinate the app
computes; clips reference it. Inventing a kind to name something that is
already addressable adds a contract to maintain and buys nothing.

### The trust problem is the design

Everything hard about B is here, and none of it is Nostr plumbing — the
plumbing is the part this author already knows how to build, which is exactly
why it is the tempting place to start and the wrong one.

**1. There is no oracle, and this repo is built on having one.** `golden.ts` is
a specification, `crosscheck` is an independent implementation, and 1143
assertions hold the line. The quality model throughout is *verify against
something external*. There is no ICU for "is this a correct Parisian
/swasɑ̃t.tʁɛz/". Whatever replaces that is the actual design work.

**2. Votes are a weak substitute for it.** Kind `7` reactions are unweighted
and keys are free, so a public score is a bot target with a leaderboard. And
the failure mode is the one already written into `CLAUDE.md` about `queue.ts`:
a wrongly-upvoted mispronunciation means the drill still runs, still plays
audio, still grades the answer, and teaches badly with nothing on screen
looking wrong. **Curation before voting.** An allowlist of contributors is
unglamorous, works on day one, and is honest about what it is.

Worth noting: `relay.fizx.uk`'s `restricted_writes` is *usable* here. These are
ordinary signed events, so unlike `nchat`'s gift wrap — which cannot pass a
pubkey allowlist because every wrap is signed by a throwaway key — a
whitelisted relay is a working curation mechanism rather than a contradiction.

**3. Hosting and moderation are a standing commitment.** Storage, bandwidth,
and the certainty of spam and worse. `docs`-adjacent operational reality: the
fizx box OOM'd on a 1.9GB VPS three weeks ago. User-submitted media should not
land there.

**4. Coverage will be sparse for a long time.** 101 numbers × 10 languages is
~1,010 clips for a single speaker each, and multiplied by accents it is several
thousand. So this **layers on TTS, it does not replace it** — the fallback path
stays forever, and the UI has to make "human clip" versus "synthesised" legible
without making the synthesised case feel broken.

## What this changes in the repo

`CLAUDE.md` currently opens by declaring this **not** an n-suite app: "no
Nostr, no keys, no shared suite directory, no `published.json`… do not reach
for the suite's conventions by default." Strand B contradicts the first clause
and must edit it deliberately rather than quietly.

The edit is narrower than it looks, and the original intent should survive:
using Nostr for one feature does not make this a suite app, does not adopt the
suite's top-bar grammar or wordmark, and does not put it under `SUITE.md`'s
governance. The sentence to write is *"this app uses Nostr for one thing"*, not
*"this is now an n-suite app"*.

**Shape:** `counting` should stay the consumer. The suite already has this
pattern — `ndisc` publishes and `nview` reads — and a separate small recorder
producing the corpus keeps `counting` the small, verifiable, offline-capable
thing it currently is. A collaborative platform growing inside a personal tool
is how the personal tool stops being good.

## Suggested order

Each step is useful alone, per the rule at the top.

1. **Local clip playback, no Nostr.** The app prefers a human clip when one
   exists and falls back to TTS. Record Japanese first, by hand. This answers
   the only question that decides the rest — *does a human clip actually make
   the drill better?* — at zero infrastructure cost, and it fixes the one
   language currently broken on Linux even if nothing else is ever built.
2. **Strand A: the GUI in a second language**, with the translator's brief and
   the assertions extended over translated text. Useful immediately, and it is
   the real test of whether contributors exist.
3. **Curated clips over Nostr.** `1063` from an allowlist, read-only in
   `counting`, published by a separate recorder. No voting.
4. **Labels for accent and dialect** (`1985`), once there is more than one
   recording of the same word to distinguish.
5. **Open submission and reputation** — only if 3 and 4 attracted anyone, and
   with trust derived from a follow graph rather than raw counts.

## Open questions

- **What is the unit of a recording?** A number word alone is easy to collect
  and pedagogically thin; a number in a carrier phrase is far more useful and
  much harder to crowdsource consistently.
- **Who is the corpus for?** If it is only ever this app, `1063` on relays is
  heavier than a directory of files. Nostr earns its place when the corpus is
  meant to outlive and exceed the app — that is a real claim, and it should be
  made deliberately rather than assumed because the rest of the author's work
  is on Nostr.
- **What is the fallback story in the UI?** Sparse coverage is the normal case
  for years. A missing clip must not read as a fault.
- **Does A need Nostr identity at all?** Probably not — a pull request already
  carries an identity, and requiring a key would *reduce* the contributor pool
  for the strand whose whole appeal is a low barrier.
- **Licensing.** Submitted audio is someone's voice. The terms need stating
  before the first clip is accepted, not after.

## What could go wrong

The likely failure is not technical. It is building Phase 3 first, because the
Nostr parts are the familiar and enjoyable ones, and then discovering that the
trust model does not work and that there were never any contributors — having
meanwhile turned a small, sharp, verifiable personal tool into a platform with
an empty database and a moderation queue.

A related trap sits in the phrase "build up from". A model is something you
build *from*, not necessarily *in*. The patterns here — a specification, an
independent check, assertions on prose, honest panels — are what a larger tool
should carry forward; that does not mean the larger tool has to be this
codebase with more bolted on. Keeping `counting` small enough to stay provable
is what keeps it valuable as a model, and the moment it is no longer provable
it has stopped being one.

The second likely failure is subtler: **collaboration quietly lowers the
standard.** This repo's virtue is that it is checkable — golden forms, an
independent cross-check, assertions on the prose. Crowdsourced content has no
such property, and the temptation will be to relax the standard for the
contributed parts so that contributions keep flowing. The moment the app's
audio is less trustworthy than its tables, it is teaching badly in exactly the
way every other note in `CLAUDE.md` is written to prevent.
