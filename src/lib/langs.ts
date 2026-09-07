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
      "Needs speech synthesis, and it has to run in Rust rather than the webview — SUITE.md records nchat shipping Web Audio that worked on macOS and was silent on Linux, and WebKit2GTK cannot play media from app URL schemes. It also needs a pronunciation layer: there is no IPA for French or German yet, so the written form is still standing in for the spoken one.",
  },
  {
    id: "speak",
    label: "Speak",
    ready: false,
    blocked:
      "Needs the same pronunciation layer, plus a way to hear you back. There is no speech recognition in the macOS webview. The saving grace is that this is not general recognition — it is a check against one of 101 known strings — but nothing is wired up yet.",
  },
];

export const RANGES: { label: string; max: number }[] = [
  { label: "0–20", max: 20 },
  { label: "0–50", max: 50 },
  { label: "0–100", max: 100 },
];
