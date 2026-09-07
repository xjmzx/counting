/**
 * Pronunciation hints — why the word does not sound like it looks.
 *
 * The listening drill was asking learners to map sound to number while
 * withholding the one thing that makes the spelling predictable. Worse, on a
 * miss it showed the written form, which an English reader will read with
 * English values and so learn the wrong sound.
 *
 * ## On `evidence`
 *
 * Where a rule can be demonstrated, it carries a probe: the word and an
 * alternative spelling that should synthesise to the *same* audio. `make
 * soundcheck` speaks both through a system voice and compares the bytes. If
 * they are identical, the engine maps them to the same phonemes and the rule
 * is not merely an opinion.
 *
 * **The probe is one-way.** A match confirms; a mismatch proves nothing,
 * because the alternative spelling may simply not be valid orthography in that
 * language. German ⟨z⟩ *is* /ts/, so "zieben" would be read "tsieben" — the
 * test fails while the rule it was meant to check is still true. Rules without
 * `evidence` are not weaker claims, only ones no clean probe was found for.
 *
 * Nothing here has been reviewed by a speaker of French or German.
 */

export type SoundRule = {
  id: string;
  /** Matches the written form of a number. */
  test: RegExp;
  hint: string;
  /** [word, alternative spelling that should sound identical] */
  evidence?: [string, string];
};

export const SOUND_RULES: Record<string, SoundRule[]> = {
  // Ordered most-surprising-first: only the first couple are shown.
  de: [
    {
      id: "de-v-f",
      test: /vier/,
      hint: "⟨v⟩ is /f/ — vier sounds like “feer”, not “veer”. German ⟨w⟩ carries the /v/ sound instead.",
      evidence: ["vier", "fier"],
    },
    {
      id: "de-z-ts",
      test: /z/,
      hint: "⟨z⟩ is /ts/ — zehn is “tsayn”, and every -zig ending is “-tsig”.",
    },
    {
      id: "de-s-z",
      test: /^(sechs|sieben)|und(sechs|sieben)/,
      hint: "⟨s⟩ before a vowel is /z/ — sechs is “zeks”, sieben is “zeeben”. Both start like an English z.",
    },
    {
      id: "de-chs-ks",
      test: /sechs/,
      hint: "⟨chs⟩ is /ks/ — sechs is “zeks”, with no “ch” sound in it at all.",
      evidence: ["sechs", "seks"],
    },
    {
      id: "de-w-v",
      test: /w/,
      hint: "⟨w⟩ is /v/ — zwei begins “tsv-”, which is a harder start than it looks.",
    },
    {
      id: "de-ei",
      test: /ei/,
      hint: "⟨ei⟩ is “eye” — drei rhymes with “try”, eins with “vines”.",
      evidence: ["drei", "drai"],
    },
    {
      id: "de-ie",
      test: /ie/,
      hint: "⟨ie⟩ is a long “ee” — the opposite way round from ⟨ei⟩. vier is “feer”, sieben “zeeben”.",
    },
    {
      id: "de-eszett",
      test: /ß/,
      hint: "⟨ß⟩ is a plain /s/ — dreißig is “dry-sig”. It is never a “b” or a “beta”.",
    },
    {
      id: "de-o-umlaut",
      test: /ö/,
      hint: "⟨ö⟩ has no English equivalent — zwölf is roughly the vowel in “her”, with rounded lips.",
      evidence: ["zwölf", "zwoelf"],
    },
  ],

  fr: [
    {
      id: "fr-soixante-x",
      test: /soixante/,
      hint: "The ⟨x⟩ in soixante is /s/, not /ks/ — “swa-sahnt”.",
      evidence: ["soixante", "soissante"],
    },
    {
      id: "fr-oi-wa",
      test: /oi/,
      hint: "⟨oi⟩ is “wa” — trois is “trwa”, soixante starts “swa-”.",
    },
    {
      id: "fr-vingt",
      test: /vingt/,
      hint: "The -gt of vingt is silent: “van”, through the nose. It only reappears before a vowel.",
      evidence: ["vingt", "vin"],
    },
    {
      id: "fr-cent",
      test: /cent/,
      hint: "The final -t of cent is silent — “sahn”, a nasal vowel with no consonant after it.",
      evidence: ["cent", "sen"],
    },
    {
      id: "fr-sept",
      test: /sept/,
      hint: "The ⟨p⟩ of sept is silent — it is simply “set”.",
      // Voice-dependent: Thomas renders sept and set identically, Jacques does
      // not. The rule is standard French either way; the probe is the thing
      // that is fragile, which is why a failure here reports rather than fails.
      evidence: ["sept", "set"],
    },
    {
      id: "fr-deux",
      test: /deux/,
      hint: "The final -x of deux is silent — “duh”, with rounded lips.",
      evidence: ["deux", "deu"],
    },
    {
      id: "fr-six-dix",
      test: /^(six|dix)$/,
      hint: "Standing alone, the -x is /s/ — dix is “deess”. Before a consonant it falls silent instead.",
      evidence: ["dix", "disse"],
    },
    {
      id: "fr-qu-k",
      test: /qu/,
      hint: "⟨qu⟩ is a plain /k/ with no “w” in it — quatre is “katr”, quarante “karant”.",
      evidence: ["quarante", "karante"],
    },
    {
      id: "fr-cinq",
      test: /cinq/,
      hint: "The ⟨q⟩ of cinq is sounded — “sank”, unlike most French final consonants.",
      evidence: ["cinq", "sink"],
    },
    {
      id: "fr-neuf",
      test: /neuf/,
      hint: "The ⟨f⟩ of neuf is sounded — “nuhf”, again against the usual rule.",
      evidence: ["neuf", "neufe"],
    },
    {
      id: "fr-huit",
      test: /huit/,
      hint: "The ⟨h⟩ is silent — huit is roughly “weet”.",
    },
  ],

  // No audio probe works here: the alternative-spelling trick needs two
  // spellings in one script, and these are facts about pinyin, which the voice
  // is not reading. Unverified by anything but description.
  zh: [
    {
      id: "zh-q",
      test: /七/,
      hint: "Pinyin ⟨q⟩ is nothing like English q — qī is roughly “chee”, said far forward in the mouth.",
    },
    {
      id: "zh-si-shi",
      test: /四|十/,
      hint: "四 sì and 十 shí are the classic pair to confuse: shí curls the tongue back and rises, sì is flat and falls.",
    },
    {
      id: "zh-er",
      test: /二/,
      hint: "二 èr is a rhotic vowel with no consonant — close to an American “are”.",
    },
    {
      id: "zh-tone",
      test: /./,
      hint: "Tone is part of the word, not emphasis: the same syllable at a different pitch is a different word.",
    },
  ],
};

/** Hints that apply to one written form, most surprising first. */
export function hintsFor(lang: string, form: string, limit = 2): SoundRule[] {
  return (SOUND_RULES[lang] ?? []).filter((r) => r.test.test(form)).slice(0, limit);
}
