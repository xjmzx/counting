/**
 * Choosing a system voice for a language.
 *
 * This is not "any voice whose locale starts with the language code", and
 * getting it wrong is silent. macOS ships `Sinji zh_HK`, which is **Cantonese**
 * — it will happily read 七十三 aloud, in a language this app is not teaching,
 * and nothing in the UI would look wrong. So each language names the locales
 * that are actually acceptable, best first, and anything unlisted is excluded.
 */

export type Voice = { name: string; locale: string };

export const LOCALE_PREFERENCE: Record<string, string[]> = {
  // Mandarin. zh_TW is Mandarin too — a different accent, and it reads
  // simplified digits fine. zh_HK is Cantonese and must never be picked.
  zh: ["zh_CN", "zh_TW"],
  // Metropolitan French first. fr_CA shares the soixante-dix system, so it is
  // usable, just not the accent these tables were written against.
  fr: ["fr_FR", "fr_CA"],
  de: ["de_DE", "de_AT", "de_CH"],
};

const norm = (locale: string) => locale.replace("-", "_").trim();

/** Every acceptable voice for a language, best locale first, then by name. */
export function voicesFor(lang: string, all: Voice[]): Voice[] {
  const prefs = LOCALE_PREFERENCE[lang] ?? [];
  return all
    .filter((v) => prefs.includes(norm(v.locale)))
    .sort((a, b) => {
      const d = prefs.indexOf(norm(a.locale)) - prefs.indexOf(norm(b.locale));
      return d !== 0 ? d : a.name.localeCompare(b.name);
    });
}

/** The default voice for a language, or null if the machine has none. */
export function pickVoice(lang: string, all: Voice[]): Voice | null {
  return voicesFor(lang, all)[0] ?? null;
}
