# Changelog

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
