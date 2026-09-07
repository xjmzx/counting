import type { Language } from "../../types.ts";
import { zh } from "../../lang/zh.ts";
import { fr } from "../../lang/fr.ts";
import { de } from "../../lang/de.ts";
import { pt } from "../../lang/pt.ts";
import { es } from "../../lang/es.ts";
import { it } from "../../lang/it.ts";
import { ja } from "../../lang/ja.ts";
import { th } from "../../lang/th.ts";
import { vi } from "../../lang/vi.ts";
import { hi } from "../../lang/hi.ts";

// The frontend imports the language modules directly rather than compose.ts,
// which is a node CLI. There is no second copy of the rules.
export const LANGS: Language[] = [zh, fr, it, pt, es, de, hi, ja, th, vi];

export type SkillId = "read" | "write" | "listen" | "speak";

export const SKILLS: { id: SkillId; label: string; ready: boolean; blocked?: string }[] = [
  { id: "read", label: "Read", ready: true },
  { id: "write", label: "Write", ready: true },
  { id: "listen", label: "Listen", ready: true },
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
