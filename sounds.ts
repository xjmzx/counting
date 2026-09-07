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
  /**
   * [word, near-spelling that must sound DIFFERENT] — for rules that claim a
   * distinction rather than an equivalence. Italian gemination is the case:
   * if `sette` and `sete` produced the same audio, the rule saying the double
   * consonant matters would be false.
   */
  contrast?: [string, string];
  /**
   * [word, spelling whose *duration* should match]. Weaker than `evidence` but
   * it works where byte comparison does not: the Japanese voice renders kanji
   * and kana with different timing even for identical phonemes, so 百 and
   * ひゃく produce different files while plainly being the same word. Length
   * still discriminates — 九 is 0.366s, matching きゅう exactly, where く is
   * 0.239s. That is how the counting readings were established.
   */
  durationEvidence?: [string, string];
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
      id: "de-eu",
      test: /eu/,
      hint: "⟨eu⟩ is “oy” — neun is “noyn”, and neunzig starts the same way.",
      evidence: ["neun", "näun"],
    },
    {
      id: "de-ch",
      test: /acht/,
      hint: "⟨ch⟩ after ⟨a⟩ is the rasping sound in Scottish “loch” — acht is not “akt”.",
    },
    {
      id: "de-u-umlaut",
      test: /ü/,
      hint: "⟨ü⟩ has no English equivalent — say “ee” with the lips rounded. fünf.",
      evidence: ["fünf", "fuenf"],
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
      id: "fr-r",
      test: /r/,
      hint: "French ⟨r⟩ comes from the back of the throat, not the tip of the tongue — trois, trente, quarante.",
    },
    {
      id: "fr-ei",
      test: /ei/,
      hint: "⟨ei⟩ is a plain “e” as in “bed” — seize is “sez”, treize is “trez”.",
      evidence: ["seize", "sèze"],
    },
    {
      id: "fr-un-nasal",
      test: /\bun\b/,
      hint: "⟨un⟩ is a nasal vowel with no “n” sound in it — the tongue never touches the roof of the mouth.",
    },
    {
      id: "fr-final-e",
      test: /e$/,
      hint: "A final -e is not sounded — onze, douze and quatre all end on the consonant before it.",
    },
    {
      id: "fr-huit",
      test: /huit/,
      hint: "The ⟨h⟩ is silent — huit is roughly “weet”.",
    },
  ],

  es: [
    {
      id: "es-v-b",
      test: /v/,
      hint: "⟨v⟩ and ⟨b⟩ are the same sound in Spanish — veinte begins like “b”, and nueve is “NWEH-beh”.",
      evidence: ["veinte", "beinte"],
    },
    {
      id: "es-c-soft",
      test: /c[ei]/,
      hint: "⟨c⟩ before e or i is “th” in Spain and “s” across Latin America — cinco, cero, cien.",
      evidence: ["cinco", "zinco"],
    },
    {
      id: "es-z",
      test: /z/,
      hint: "⟨z⟩ takes the same two values as soft ⟨c⟩ — diez is “dyeth” in Spain, “dyes” elsewhere.",
    },
    {
      id: "es-qu-k",
      test: /qu/,
      hint: "⟨qu⟩ is a plain /k/ with no “w” — quince is “KEEN-seh”.",
      evidence: ["quince", "kince"],
    },
    {
      id: "es-accent",
      test: /[áéíóú]/,
      hint: "The written accent marks which syllable is stressed — veintidós lands on the last one.",
    },
    {
      id: "es-s",
      test: /s/,
      hint: "⟨s⟩ always hisses and never buzzes — dos ends like “dose”, not “doze”. Spanish has no /z/ at all.",
    },
    {
      id: "es-r",
      test: /r/,
      hint: "⟨r⟩ is a single flick of the tongue tip against the ridge behind the teeth — tres, cuatro.",
    },
    // Last on purpose: true of every number, so it is the safety net rather
    // than the headline, and the two-hint limit keeps it out of the way.
    {
      id: "es-vowels",
      test: /[aeiou]/,
      hint: "The five vowels are pure and never glide — uno is “OO-noh”, not “YOO-noh”, and ocho keeps both o’s short and clean.",
    },
  ],

  pt: [
    {
      id: "pt-final-e",
      test: /e$/,
      hint: "In Brazil a final -e is said as “i”, and a ⟨t⟩ before it turns to “ch” — vinte is “VEEN-chi”, sete “SEH-chi”.",
    },
    {
      id: "pt-nasal",
      test: /\bum\b|cem|cin|vin|on|en/,
      hint: "Vowels before ⟨m⟩ or ⟨n⟩ are nasal and the consonant is not sounded — um is “oong”, cem is “seng”.",
    },
    {
      id: "pt-ss",
      test: /ss/,
      hint: "⟨ss⟩ holds a hard /s/ where a single ⟨s⟩ between vowels would buzz — sessenta, dezesseis.",
    },
    {
      id: "pt-z",
      test: /z/,
      hint: "⟨z⟩ between vowels buzzes — doze, treze and catorze all end on that sound.",
    },
    {
      id: "pt-ei",
      test: /ei/,
      hint: "⟨ei⟩ is “ay” — seis is “says”, dezesseis ends the same way.",
    },
    {
      id: "pt-oi",
      test: /oi/,
      hint: "⟨oi⟩ is “oy” — oito is “OY-too”, and dois ends “doysh” in Portugal, “doys” in Brazil.",
    },
    {
      id: "pt-r",
      test: /r/,
      hint: "⟨r⟩ between vowels is a quick tap, not the English retroflex — quatro, quarenta, três.",
    },
  ],

  it: [
    {
      id: "it-double",
      test: /(tt|ss|nn|cc|ll|zz|pp|bb|dd|gg|mm|rr|ff)/,
      hint: "A double consonant is genuinely held longer, and the length carries meaning — sette, otto, sessanta.",
      contrast: ["sette", "sete"],
    },
    {
      id: "it-c-soft",
      test: /c[ei]/,
      hint: "⟨c⟩ before e or i is “ch” — cinque is “CHEEN-kweh”, cento “CHEN-toh”, dieci “dee-EH-chee”.",
    },
    {
      id: "it-qu",
      test: /qu/,
      hint: "⟨qu⟩ keeps its “w” — quattro is “KWAT-troh”. Spanish and French both drop it.",
      evidence: ["quattro", "cuattro"],
    },
    {
      id: "it-z",
      test: /z/,
      hint: "⟨z⟩ is “dz” or “ts”, never a plain English z — zero starts like the end of “kids”.",
    },
    {
      id: "it-final-vowel",
      test: /[aeiou]$/,
      hint: "Every final vowel is sounded — venti is two clear syllables, where a French ending would fall silent.",
    },
    {
      id: "it-accent",
      test: /é/,
      hint: "The accent marks stress on the final syllable — ventitré ends hard, on the “tray”.",
    },
  ],

  hi: [
    {
      id: "hi-no-composition",
      test: /./,
      hint: "Hindi numbers do not build from parts — तेईस holds nothing of तीन or बीस. Every one from 1 to 100 is its own word, so this is memory rather than pattern.",
    },
    {
      id: "hi-retroflex",
      test: /[टठडढणड़]/,
      hint: "The retroflex consonants are made with the tongue curled back to the roof of the mouth — a sound English does not have. आठ, सड़सठ.",
    },
    {
      id: "hi-aspiration",
      test: /[खघछझठढथधफभ]/,
      hint: "The aspirated consonants carry an audible puff of air, and it changes the word — छह and छब्बीस begin with one.",
    },
    {
      id: "hi-nasal-vowel",
      test: /[ंँ]/,
      hint: "The dot or crescent above nasalises the vowel — पाँच is “paanch” through the nose, not with a separate n.",
    },
    {
      id: "hi-long-vowel",
      // No stray space in the class — that made it match any spaced form too.
      test: /[ािीुूेैोौ]/,
      // Never write a combining mark on its own: with no base to attach to,
      // the shaper draws a dotted circle placeholder and it reads as a broken
      // glyph. Name the sound and show it inside a word instead.
      hint: "Vowel length is meaningful, not decorative — the long ā of चार is held about twice as long as a short a.",
    },
  ],

  th: [
    {
      id: "th-yi",
      test: /ยี่/,
      hint: "ยี่ is an old word for two that survives only in twenty — everywhere else two is สอง.",
    },
    {
      id: "th-et",
      test: /เอ็ด/,
      hint: "เอ็ด is one in the ones position of a compound. หนึ่ง never appears there.",
    },
    {
      id: "th-silent-h",
      test: /ห[นมลงยว]/,
      hint: "A ห in front of another consonant is silent — it sets the tone. หนึ่ง begins with an n, not an h.",
    },
    {
      id: "th-final-stop",
      test: /สิบ|เจ็ด|แปด|หก|เอ็ด/,
      hint: "Final stops are not released — สิบ ends with the lips simply closing, no puff of air after it.",
    },
    // Last, and true of everything.
    {
      id: "th-tones",
      test: /./,
      hint: "Thai has five tones and they distinguish words. The marks above the letters are tones, not stress or emphasis.",
      contrast: ["ห้า", "หา"],
    },
  ],

  vi: [
    {
      id: "vi-muoi",
      test: /mươi|mười/,
      hint: "mười and mươi differ only in tone, and that is the whole difference between “ten” and the tens — mười is ten, hai mươi is twenty.",
      contrast: ["mười", "mươi"],
    },
    {
      id: "vi-compound-forms",
      test: /mốt|tư|lăm/,
      hint: "mốt, tư and lăm exist only inside a compound. Alone, one four and five are một, bốn and năm.",
    },
    {
      id: "vi-horned-vowels",
      test: /[ươ]/,
      hint: "⟨ư⟩ and ⟨ơ⟩ have no English equivalent — the lips stay unrounded where English would round them. mươi, tư.",
    },
    {
      id: "vi-ch",
      test: /ch/,
      hint: "⟨ch⟩ is close to an English “ch” but flatter, made with the tongue against the palate — chín.",
    },
    {
      id: "vi-ng",
      test: /ng/,
      hint: "⟨ng⟩ can begin a syllable, not only end one — không starts with the sound English only puts at the end of “sing”.",
    },
    // Last, and true of everything.
    {
      id: "vi-tones",
      test: /./,
      hint: "Vietnamese has six tones. The marks are tone, not stress and not vowel quality — the same letters at a different pitch are a different word.",
      contrast: ["năm", "nam"],
    },
  ],

  ja: [
    {
      id: "ja-counting-readings",
      test: /四|七|九/,
      hint: "Counting uses yon, nana and kyū — 四 is not shi here, 七 not shichi, 九 not ku. All six are real readings of those characters; only the first of each is what you count with.",
      durationEvidence: ["九", "きゅう"],
    },
    {
      id: "ja-long-vowel",
      test: /十|九|百/,
      hint: "The ū of jū and kyū is held for two beats, not one. Length is not decoration in Japanese — it distinguishes words.",
    },
    {
      id: "ja-r",
      test: /六|零/,
      hint: "Japanese ⟨r⟩ is a single tap of the tongue, somewhere between an English r and an l — roku, rei.",
    },
    {
      id: "ja-hyaku",
      test: /百/,
      hint: "百 is hyaku: a light breath of h, then “yaku” as one smooth syllable.",
    },
    {
      id: "ja-ichi",
      test: /一/,
      hint: "一 is ichi, and the final i is often devoiced almost to a whisper — closer to “eech” than “ee-chee”.",
    },
    // Last, and true of every number: the safety net.
    {
      id: "ja-pitch",
      test: /./,
      hint: "Japanese has pitch accent, not stress. Every syllable takes the same time; it is the pitch pattern that differs, not the loudness.",
    },
  ],

  // No probe works here: the alternative-spelling trick needs two spellings in
  // one script, and these are facts about pinyin, which the voice is not
  // reading. Unverified by anything but description.
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
