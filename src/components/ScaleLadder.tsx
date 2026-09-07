import type { Language } from "../../types.ts";
import { HintDisclosure } from "./HintDisclosure";

/**
 * The scaffolding a price is built on.
 *
 * Presented as a ladder because the *shape* is the lesson: Thai names every
 * power to a million and has five rungs, Vietnamese has three and nothing at
 * ten thousand. A learner coming from Chinese will expect a word at 10⁴ — right
 * for Thai, wrong for Vietnamese — and the gap in the ladder is what says so.
 */
export function ScaleLadder({ lang }: { lang: Language }) {
  const label = (p: number) =>
    p === 2 ? "hundred" : p === 3 ? "thousand" : `10^${p}`;

  return (
    <HintDisclosure
      label={`Counting bigger — ${lang.scale.length} scale words`}
      kind="script"
      storageKey={`counting.scale.${lang.code}`}
      hints={lang.scale.map((w) => ({
        id: `${lang.code}-scale-${w.power}`,
        test: /./,
        hint: [
          `${(10 ** w.power).toLocaleString("en-GB")} (${label(w.power)}) — ${w.form}`,
          w.reading ? ` ${w.reading}` : "",
          w.note ? `. ${w.note}` : "",
        ].join(""),
      }))}
    />
  );
}
