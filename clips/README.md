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

## Why the audio is not committed

`make clips` renders Japanese with macOS `say`, because espeak-ng has no kanji
dictionary and the choice on Linux is a clip or silence. Those clips are the
output of Apple's system voices, and **whether that output may be redistributed
is an open question nobody here has answered.** Committing them to a public
repository, or shipping them inside a `.deb`, is a different act from playing
them on the machine that made them.

So `clips/*/*.wav` is gitignored, and the audio is generated locally:

    make clips

That is a hold, not a verdict. If the licensing turns out to be fine, deleting
one line of `.gitignore` ships them. If it does not, the same pipeline works
with any redistributable engine — open-jtalk's voices are the obvious
candidate — and then the Linux fix and the clips are the same work.

**Human recordings are a separate question with the same shape.** A submitted
clip is someone's voice, and the terms need stating before the first one is
accepted rather than after.
