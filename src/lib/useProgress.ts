import { useCallback, useEffect, useState } from "react";
import { record as recordAnswer, type Stats } from "../../queue.ts";

/**
 * Per-language, per-skill progress, kept in localStorage.
 *
 * Deliberately NOT keyed by range: what you know about 73 is the same fact
 * whether you met it drilling 0–100 or 0–50.
 *
 * There is no reload effect here on purpose. The Drill is mounted with a key
 * that includes language and skill, so switching either remounts and this
 * initialises fresh. An effect that reloaded on a prop change would race the
 * save effect and write the previous language's progress under the new key.
 */

type Saved = { stats: Stats; best: number };

const keyFor = (lang: string, skill: string) => `counting.progress.${lang}.${skill}`;

function load(lang: string, skill: string): Saved {
  try {
    const raw = localStorage.getItem(keyFor(lang, skill));
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Saved>;
      if (parsed && typeof parsed === "object") {
        return { stats: parsed.stats ?? {}, best: parsed.best ?? 0 };
      }
    }
  } catch {
    // Private windows, cleared site data, or a storage-blocking setting. An
    // unremembered session is still a usable one.
  }
  return { stats: {}, best: 0 };
}

export function useProgress(lang: string, skill: string) {
  const [saved, setSaved] = useState<Saved>(() => load(lang, skill));

  useEffect(() => {
    try {
      localStorage.setItem(keyFor(lang, skill), JSON.stringify(saved));
    } catch {
      // Nothing to do — the drill works, it just will not be remembered.
    }
  }, [lang, skill, saved]);

  const answer = useCallback((n: number, ok: boolean, streak: number) => {
    setSaved((s) => ({
      stats: recordAnswer(s.stats, n, ok),
      best: Math.max(s.best, streak),
    }));
  }, []);

  const reset = useCallback(() => setSaved({ stats: {}, best: 0 }), []);

  return { stats: saved.stats, best: saved.best, answer, reset };
}
