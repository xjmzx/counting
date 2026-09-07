/**
 * Choosing a system voice for a language.
 *
 * This is not "any voice whose locale starts with the language code", and
 * getting it wrong is silent. macOS ships `Sinji zh_HK`, which is **Cantonese**
 * — it will happily read 七十三 aloud, in a language this app is not teaching,
 * and nothing in the UI would look wrong. So each language names the locales
 * that are actually acceptable, best first, and anything unlisted is excluded.
 */

export type Voice = {
  name: string;
  locale: string;
  /**
   * What the backend needs back to select this voice, when that differs from
   * the name. macOS `say` selects by name; speech-dispatcher selects by
   * language tag, and rejects the `xx_YY` form this file is written in.
   * Optional so the normalised case stays the simple one.
   */
  id?: string;
};

/** What to hand back to the backend to choose this voice. */
export const voiceId = (v: Voice): string => v.id ?? v.name;

export const LOCALE_PREFERENCE: Record<string, string[]> = {
  // Mandarin. zh_TW is Mandarin too — a different accent, and it reads
  // simplified digits fine. zh_HK is Cantonese and must never be picked.
  zh: ["zh_CN", "zh_TW"],
  // Metropolitan French first. fr_CA shares the soixante-dix system, so it is
  // usable, just not the accent these tables were written against.
  fr: ["fr_FR", "fr_CA"],
  de: ["de_DE", "de_AT", "de_CH"],
  // Latin American Spanish is as valid as peninsular for counting; the words
  // are identical and only the accent differs.
  es: ["es_ES", "es_MX", "es_AR", "es_US"],
  // Brazilian leads, matching the spellings the tables use.
  pt: ["pt_BR", "pt_PT"],
  it: ["it_IT", "it_CH"],
  ja: ["ja_JP"],
  th: ["th_TH"],
  vi: ["vi_VN"],
  hi: ["hi_IN"],
};

const norm = (locale: string) => locale.replace("-", "_").trim();

/**
 * macOS ships two kinds of voice per language. The standard one carries a
 * plain name — Thomas, Anna, Tingting. The character voices are named
 * `Eddy (French (France))`, `Grandma (German (Germany))`, `Rocko (...)` and so
 * on: deliberately theatrical, and the wrong thing to learn pronunciation
 * from. The bracket is the tell, and it is what distinguishes them.
 */
const isCharacterVoice = (name: string) => name.includes("(");

/** Every acceptable voice for a language, best locale first, then by name. */
export function voicesFor(lang: string, all: Voice[]): Voice[] {
  const prefs = LOCALE_PREFERENCE[lang] ?? [];
  return all
    .filter((v) => prefs.includes(norm(v.locale)))
    .sort((a, b) => {
      const byLocale = prefs.indexOf(norm(a.locale)) - prefs.indexOf(norm(b.locale));
      if (byLocale !== 0) return byLocale;
      const byKind = Number(isCharacterVoice(a.name)) - Number(isCharacterVoice(b.name));
      if (byKind !== 0) return byKind;
      return a.name.localeCompare(b.name);
    });
}

/** The default voice for a language, or null if the machine has none. */
export function pickVoice(lang: string, all: Voice[]): Voice | null {
  return voicesFor(lang, all)[0] ?? null;
}
