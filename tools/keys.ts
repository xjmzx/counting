/**
 * What a keypress at a recorder prompt means.
 *
 * Its own module so it can be asserted: the recorder is interactive and a test
 * cannot press a key, but it can ask what a key means. That distinction cost a
 * take — `q` at the "Enter keeps" prompt fell through to the keep branch and
 * wrote the file, because only `r` and `s` were tested for and everything else
 * was treated as Enter. The header offered `q stop` two lines above.
 *
 * So the rule here is that unrecognised input is its own answer rather than a
 * silent default. Keeping is destructive — it overwrites whatever was there
 * and moves on — and it is the wrong thing to do when the person at the
 * keyboard has just typed something the tool does not understand.
 */
export type Key = "go" | "play" | "redo" | "skip" | "quit" | "unknown";

export function keyOf(input: string): Key {
  switch (input.trim().toLowerCase()) {
    case "": return "go";
    case "p": case "play": return "play";
    case "r": case "redo": return "redo";
    case "s": case "skip": return "skip";
    case "q": case "quit": return "quit";
    default: return "unknown";
  }
}
