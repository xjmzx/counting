# clips

A recorded clip for a number, preferred over synthesis when one exists:
`clips/<lang>/<n>.wav`, 22 kHz mono.

WAV rather than anything compressed because `afplay`, `paplay` and `aplay` all
decode it with nothing installed. A clip that needs a codec on the listener's
machine is a clip that silently does not play.

**The mechanism is language-agnostic on purpose.** Nothing in it knows about
Japanese. A recording contributed by someone who speaks a language drops into
`clips/<lang>/<n>.wav` and is preferred from the next launch, with no code
change — which is the bridge from what this app is to what it might become.
Sparse coverage is the permanent normal case: 101 numbers across ten languages
is over a thousand recordings, so the synthesised path never goes away, and the
app says which one you heard.

## What is committed, and what is not

Clips are gitignored by default and un-ignored one language at a time, which
fails safe: a language nobody has decided about stays out of the repository
rather than arriving in it by accident.

**Recorded clips are committed.** They are a contributor's own voice, given
deliberately, and the app is not much use without them. `clips/en` is the first,
recorded by the author — English is the interface language and the one table
whose pronunciation needs no second opinion here. Adding another recorded
language means adding a line to `.gitignore`, which is the moment to have asked
the contributor about terms.

**Synthesised clips are not.** `make clips` renders with Apple's system voices,
because espeak-ng has no kanji dictionary and the choice on Linux was a clip or
silence. Whether that output may be redistributed is a question nobody here has
answered, and committing it to a public repository or shipping it inside a
`.deb` is a different act from playing it on the machine that made it. So
`clips/ja` is generated locally:

    make clips

That is a hold rather than a verdict. If the licensing turns out to be fine,
one line of `.gitignore` ships them; if it does not, the same pipeline works
with a redistributable engine. Since Linux now reads kanji through open-jtalk,
nothing depends on resolving it.

`make clips` refuses to write into a language whose clips are committed, so it
cannot overwrite recorded audio with a synthesiser. git decides which is which,
so the check cannot drift from the rule.
