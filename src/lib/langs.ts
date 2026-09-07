import type { Language } from "../../types.ts";
import { zh } from "../../lang/zh.ts";
import { fr } from "../../lang/fr.ts";
import { de } from "../../lang/de.ts";

// The frontend imports the language modules directly rather than compose.ts,
// which is a node CLI. There is no second copy of the rules.
export const LANGS: Language[] = [zh, fr, de];

export type SkillId = "read" | "write" | "listen" | "speak";

export const SKILLS: { id: SkillId; label: string; ready: boolean; blocked?: string }[] = [
  { id: "read", label: "Read", ready: true },
  { id: "write", label: "Write", ready: true },
  {
    id: "listen",
    label: "Listen",
    ready: false,
    blocked:
      "Next up. It needs a voice speaking the written form and nothing more — a text-to-speech engine has its own pronunciation model, so no phonetic transcription is required to say soixante-treize correctly. The one constraint is where it runs: in Rust, not the webview. SUITE.md records nchat shipping Web Audio that worked on macOS and was silent on Linux, and WebKit2GTK cannot play media from app URL schemes.",
  },
  {
    id: "speak",
    label: "Speak",
    ready: false,
    blocked:
      "A long-term aim rather than a planned next step. Judging a spoken answer means recognition and scoring, which is a large amount of machinery for one corner of a small app — so it is parked deliberately, not merely unstarted.",
  },
];

export const RANGES: { label: string; max: number }[] = [
  { label: "0–20", max: 20 },
  { label: "0–50", max: 50 },
  { label: "0–100", max: 100 },
];
