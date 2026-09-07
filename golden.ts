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
  th: {
    0: "ศูนย์",
    1: "หนึ่ง",
    10: "สิบ",
    11: "สิบเอ็ด",      // one becomes เอ็ด in the ones position
    12: "สิบสอง",
    20: "ยี่สิบ",       // ยี่, not สอง — only here in the whole range
    21: "ยี่สิบเอ็ด",
    30: "สามสิบ",       // and back to the ordinary digit from thirty
    31: "สามสิบเอ็ด",
    71: "เจ็ดสิบเอ็ด",
    99: "เก้าสิบเก้า",
    100: "หนึ่งร้อย",
  },
  vi: {
    0: "không",
    4: "bốn",
    5: "năm",
    10: "mười",
    11: "mười một",     // một, NOT mốt, in the teens
    14: "mười bốn",     // bốn, NOT tư, in the teens
    15: "mười lăm",     // but five does change, even here
    20: "hai mươi",     // mười -> mươi, a tone change
    21: "hai mươi mốt", // and from here one does change
    24: "hai mươi tư",  // as does four
    25: "hai mươi lăm",
    71: "bảy mươi mốt",
    74: "bảy mươi tư",
    99: "chín mươi chín",
    100: "một trăm",
  },
  ja: {
    0: "零",
    4: "四",
    7: "七",
    9: "九",
    10: "十",
    11: "十一",   // ten-one, not one-ten-one
    19: "十九",
    20: "二十",
    23: "二十三",
    40: "四十",
    47: "四十七",
    70: "七十",
    90: "九十",
    99: "九十九",
    100: "百",    // never 一百, unlike Chinese
  },
  es: {
    0: "cero",
    15: "quince",
    16: "dieciséis",  // fused, and the fusion forces the accent
    17: "diecisiete",
    19: "diecinueve",
    20: "veinte",
    21: "veintiuno",
    22: "veintidós",  // accent
    23: "veintitrés", // accent
    26: "veintiséis", // accent
    29: "veintinueve",
    30: "treinta",
    31: "treinta y uno",   // separate again from here
    36: "treinta y seis",  // and NO accent, unlike 26
    40: "cuarenta",
    50: "cincuenta",
    60: "sesenta",
    70: "setenta",
    80: "ochenta",
    99: "noventa y nueve",
    100: "cien",
  },
  pt: {
    0: "zero",
    14: "catorze",
    16: "dezesseis",   // Brazilian; European dezasseis
    17: "dezessete",
    18: "dezoito",
    19: "dezenove",
    20: "vinte",
    21: "vinte e um",  // the "e" never drops
    23: "vinte e três",
    30: "trinta",
    50: "cinquenta",
    60: "sessenta",
    71: "setenta e um",
    99: "noventa e nove",
    100: "cem",
  },
  it: {
    0: "zero",
    16: "sedici",
    17: "diciassette",
    19: "diciannove",
    20: "venti",
    21: "ventuno",     // venti loses its vowel
    22: "ventidue",
    23: "ventitré",    // and tre gains an accent
    26: "ventisei",
    28: "ventotto",    // vowel lost again
    30: "trenta",
    31: "trentuno",
    33: "trentatré",
    38: "trentotto",
    71: "settantuno",
    73: "settantatré",
    78: "settantotto",
    88: "ottantotto",
    99: "novantanove",
    100: "cento",
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
