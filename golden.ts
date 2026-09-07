/**
 * Hand-checked forms for every number where the language does something
 * you would not have guessed. If the composer disagrees with this file,
 * the composer is wrong. Add a row whenever you find a new irregularity.
 */
export const golden: Record<string, Record<number, string>> = {
  zh: {
    0: "零",
    10: "十",
    11: "十一", // not 一十一
    12: "十二",
    19: "十九",
    20: "二十", // 二, not 两
    21: "二十一",
    73: "七十三",
    99: "九十九",
    100: "一百",
  },
  fr: {
    0: "zéro",
    16: "seize",
    17: "dix-sept",
    20: "vingt",
    21: "vingt et un",
    22: "vingt-deux",
    31: "trente et un",
    40: "quarante",
    50: "cinquante",
    60: "soixante",
    61: "soixante et un",
    69: "soixante-neuf",
    70: "soixante-dix",
    71: "soixante et onze", // the last "et"
    72: "soixante-douze",
    77: "soixante-dix-sept",
    79: "soixante-dix-neuf",
    80: "quatre-vingts", // plural -s, alone only
    81: "quatre-vingt-un", // no "et", no -s
    82: "quatre-vingt-deux",
    90: "quatre-vingt-dix",
    91: "quatre-vingt-onze", // no "et"
    97: "quatre-vingt-dix-sept",
    99: "quatre-vingt-dix-neuf",
    100: "cent",
  },
  de: {
    0: "null",
    1: "eins",
    6: "sechs",
    7: "sieben",
    13: "dreizehn",
    16: "sechzehn", // s dropped
    17: "siebzehn", // en dropped
    20: "zwanzig",
    21: "einundzwanzig", // ein, not eins
    30: "dreißig", // ß
    31: "einunddreißig",
    36: "sechsunddreißig", // s KEPT here
    37: "siebenunddreißig", // en KEPT here
    40: "vierzig",
    60: "sechzig",
    66: "sechsundsechzig",
    67: "siebenundsechzig",
    70: "siebzig",
    76: "sechsundsiebzig",
    99: "neunundneunzig",
    100: "hundert",
  },
};
