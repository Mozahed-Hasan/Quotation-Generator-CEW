/**
 * Unicode Bangla to Bijoy ANSI (SutonnyMJ) converter for jsPDF.
 * Uses Windows-1252 Unicode codepoints matching SutonnyMJ-Regular.ttf / SutonnyMJ-Bold.ttf.
 */

const CHAR_MAP = {
  // Vowels (স্বরবর্ণ)
  "\u0985": "A", // অ
  "\u0986": "Av", // আ
  "\u0987": "B", // ই
  "\u0988": "C", // ঈ
  "\u0989": "D", // উ
  "\u098A": "E", // ঊ
  "\u098B": "F", // ঋ
  "\u098F": "G", // এ
  "\u0990": "H", // ঐ
  "\u0993": "I", // ও
  "\u0994": "J", // ঔ

  // Consonants (ব্যঞ্জনবর্ণ)
  "\u0995": "K", // ক
  "\u0996": "L", // খ
  "\u0997": "M", // গ
  "\u0998": "N", // ঘ
  "\u0999": "O", // ঙ
  "\u099A": "P", // চ
  "\u099B": "Q", // ছ
  "\u099C": "R", // জ
  "\u099D": "S", // ঝ
  "\u099E": "T", // ঞ
  "\u099F": "U", // ট
  "\u09A0": "V", // ঠ
  "\u09A1": "W", // ড
  "\u09A2": "X", // ঢ
  "\u09A3": "Y", // ণ
  "\u09A4": "Z", // ত
  "\u09A5": "_", // থ
  "\u09A6": "`", // দ
  "\u09A7": "a", // ধ
  "\u09A8": "b", // ন
  "\u09AA": "c", // প
  "\u09AB": "d", // ফ
  "\u09AC": "e", // ব
  "\u09AD": "f", // ভ
  "\u09AE": "g", // ম
  "\u09AF": "h", // য
  "\u09B0": "i", // র
  "\u09B2": "j", // ল
  "\u09B6": "k", // শ
  "\u09B7": "l", // ষ
  "\u09B8": "m", // স
  "\u09B9": "n", // হ
  "\u09DC": "o", // ড়
  "\u09DD": "p", // ঢ়
  "\u09DF": "q", // য়
  "\u09CE": "r", // ৎ
  "\u0982": "s", // ং
  "\u0983": "t", // ঃ
  "\u0981": "u", // ঁ

  // Digits (সংখ্যা)
  "\u09E6": "0",
  "\u09E7": "1",
  "\u09E8": "2",
  "\u09E9": "3",
  "\u09EA": "4",
  "\u09EB": "5",
  "\u09EC": "6",
  "\u09ED": "7",
  "\u09EE": "8",
  "\u09EF": "9",

  // Punctuation & Currency
  "\u0964": "|", // ।
  "\u0965": "||", // ॥
  "\u09F3": "$", // ৳
  "\u09CD": "", // hasant fallback
};

// Post-base / combining vowel signs (কার)
const POST_KAR = {
  "\u09BE": "v", // া
  "\u09C0": "x", // ী
  "\u09C1": "y", // ু
  "\u09C2": "~", // ূ
  "\u09C3": "\u201E", // ৃ („)
  "\u09D7": "\u0160", // ৌ right part (Š)
};

// Pre-base vowel signs (আগে বসে)
const PRE_KAR = {
  "\u09BF": "w", // ি
  "\u09C7": "\u2021", // ে (‡)
  "\u09C8": "\u02C6", // ৈ (ˆ)
};

// Common Bijoy ANSI Conjuncts (যুক্তাক্ষর) - longest match first
const CONJUNCTS = {
  // 3-consonant conjuncts
  "ক্ষ্ণ": "\u00B6\u00DC",
  "ক্ষ্ম": "\u00B6\u00F1",
  "স্ত্রি": "w\u00AF\u2014",
  "স্ত্র": "\u00AF\u2014",
  "ন্ত্ব": "\u0161\u00AA",
  "ন্ত্র": "\u0161\u00AA",
  "ন্দ্ব": "\u00DC\u00C9",
  "ন্দ্র": "\u00DC\u00AA",
  "ম্প্র": "\u00E3\u00AA",
  "ষ্ক্র": "\u00E9\u00AA",
  "স্ক্র": "\u00AF\u00AA",
  "স্প্র": "\u00E7\u00AA",
  "ষ্ট": "\u00F3",
  "ষ্ঠ": "\u00F4",

  // 2-consonant conjuncts & special ligatures (verified against SutonnyMJ-Regular.ttf)
  "ক্ষ": "\u00B6", // ¶
  "জ্ঞ": "\u00C1", // Á
  "ঞ্চ": "\u00C2", // Â
  "ঞ্ছ": "\u00C3", // Ã
  "ঞ্জ": "\u00C4", // Ä
  "ঞ্ঝ": "\u00C5", // Å
  "ঙ্ক": "\u00BC", // ¼
  "ঙ্গ": "\u00BD", // ½
  "ক্ত": "\u00B3", // ³
  "ক্ল": "\u00B4", // ´
  "ক্র": "\u00B5", // µ
  "ক্স": "\u00B7", // ·
  "ক্ক": "\u00B0", // °
  "ক্ট": "\u00B1", // ±
  "ক্ম": "\u00B2", // ²
  "গ্ধ": "\u00BB", // »
  "গ্ল": "\u00B9", // ¹
  "গ্ন": "M\u00E8",
  "গ্র": "M\u00AA",
  "ঘ্ন": "N\u00E8",
  "চ্ম": "P\u00A7",
  "চ্ছ": "P\u00B0",
  "জ্জ": "\u00BE", // ¾
  "জ্ব": "R\u00A6",
  "জ্র": "R\u00AA",
  "ট্ট": "\u00C6", // Æ
  "ড্ড": "\u00C7", // Ç
  "ণ্ট": "\u00C8", // È
  "ণ্ঠ": "\u00C9", // É
  "ণ্ড": "\u00DB", // Û
  "ণ্ণ": "Y\u00E8",
  "ত্ত": "\u00CB", // Ë
  "ত্র": "\u00CE", // Î
  "ত্থ": "Z_",
  "ত্ম": "Z\u00A7",
  "ত্ন": "Z\u00E8",
  "ত্ত্ব": "\u00CB\u00A6",
  "ত্ব": "Z\u00A6",
  "দ্ম": "\u00D9", // Ù
  "দ্ব": "\u00D9", // Ù
  "দ্ধ": "\u00D8", // Ø
  "দ্দ": "\u00CF", // Ï
  "দ্ভ": "\u00E4", // ä
  "দ্র": "`\u00AA",
  "ধ্ব": "a\u00A6",
  "ধ্র": "a\u00AA",
  "ন্ত": "\u0161Z", // šZ
  "ন্থ": "\u00DA", // Ú
  "ন্দ": "\u203A`", // ›`
  "ন্ধ": "\u00DC", // Ü
  "ন্ন": "\u0161b", // šb
  "ন্ম": "\u0161\u00A7", // š§
  "ন্স": "\u0161m", // šm (ব্যালেন্স, লাইসেন্স, অ্যাডভান্স)
  "ন্ব": "b\u00A6",
  "প্ট": "\u00DE", // Þ
  "প্ত": "\u00DF", // ß
  "প্প": "\u00E1", // á
  "প্ল": "\u00E0", // à
  "প্স": "\u00E1", // á
  "প্র": "c\u00AA", // cª
  "ফ্ল": "d\u00AC",
  "ফ্র": "d\u00AA",
  "ব্জ": "\u00E2", // â
  "ব্দ": "\u00E3", // ã
  "ব্ধ": "\u00E4", // ä
  "ব্ব": "\u00E5", // å
  "ব্ল": "e\u00AC",
  "ব্র": "e\u00AA", // eª
  "ভ্র": "\u00E5", // å
  "ম্ন": "\u00E8", // è
  "ম্প": "\u00E9", // é
  "ম্ফ": "g\u00E9",
  "ম্ব": "g\u00A6",
  "ম্ভ": "g\u00A6",
  "ম্ম": "g\u00A7",
  "ম্ল": "g\u00AC",
  "ম্র": "g\u00AA",
  "ল্ক": "j\u2039",
  "ল্গ": "jM",
  "ল্ট": "\u00EB", // ë
  "ল্ড": "\u00EC", // ì
  "ল্প": "\u00ED", // í
  "ল্ব": "j\u00A6",
  "ল্ম": "j\u00A7",
  "ল্ল": "\u00EA", // ê
  "শ্চ": "\u00F0", // ð
  "শ্ন": "\u00F1", // ñ
  "শ্ব": "k\u00A6",
  "শ্ম": "k\u00A7",
  "শ্ল": "k\u00AC",
  "শ্র": "k\u00AA", // kª
  "ষ্ক": "\u00F5", // õ
  "ষ্ণ": "\u00F2", // ò
  "ষ্প": "\u00F6", // ö
  "ষ্ফ": "\u00F9", // ù
  "ষ্ম": "\u00F6", // ö
  "স্ক": "\u00AF\u2039", // ¯‹
  "স্ট": "\u00F7", // ÷
  "স্ত": "\u00AFZ", // ¯Z
  "স্থ": "\u00AF_", // ¯_
  "স্ন": "\u00AFb",
  "স্প": "\u00AFc",
  "স্ফ": "\u00AFd",
  "স্ব": "\u00AF\u00A6",
  "স্ম": "\u00AF\u00A7",
  "স্ল": "\u00AFj",
  "স্র": "\u00AF\u00AA",
  "হ্ণ": "n\u00E8",
  "হ্ন": "n\u00E8",
  "হ্ম": "n\u00A7",
  "হ্ল": "n\u00AC",
  "হ্র": "n\u00AA",
  "হৃ": "\u00FC", // ü
  "গু": "\u00B8", // ¸
  "রু": "\u00FD", // ý
  "রূ": "i~",
  "শু": "\u00EF", // ï
  "হু": "\u00FB", // û
};

// Phalas (ফলা)
const YA_PHALA = "\u00A8"; // ¨ (্য)
const RA_PHALA = "\u00AA"; // ª (্র)
const REF_CHAR = "\u00A9"; // © (র্)

const CONSONANT_RE = /^[\u0995-\u09B9\u09DC-\u09DF]/;
const VOWEL_OR_CHAR_RE = /^[\u0985-\u0994\u0995-\u09B9\u09DC-\u09DF\u09CE]/;
const CONJUNCT_KEYS = Object.keys(CONJUNCTS).sort((a, b) => b.length - a.length);

export function hasBangla(str) {
  return /[\u0980-\u09FF]/.test(String(str || ""));
}

/**
 * Convert a Unicode Bangla string into Bijoy ANSI string for SutonnyMJ.
 */
export function unicodeToBijoy(input) {
  if (input === null || input === undefined) return "";
  // Normalize য় / ড় / ঢ় decomposed forms just in case
  const text = String(input)
    .replace(/\u09AF\u09BC/g, "\u09DF")
    .replace(/\u09A1\u09BC/g, "\u09DC")
    .replace(/\u09A2\u09BC/g, "\u09DD")
    .replace(/\u200C|\u200D/g, ""); // strip ZWNJ/ZWJ

  let out = "";
  let i = 0;

  while (i < text.length) {
    const ch = text[i];

    // Check if starts with Ref: র + ্ + consonant
    let hasRef = false;
    if (ch === "\u09B0" && text[i + 1] === "\u09CD" && CONSONANT_RE.test(text[i + 2] || "")) {
      hasRef = true;
      i += 2;
    }

    // Check for conjuncts at current position
    let baseAnsi = "";
    let consumed = 0;

    for (const key of CONJUNCT_KEYS) {
      if (text.startsWith(key, i)) {
        baseAnsi = CONJUNCTS[key];
        consumed = key.length;
        break;
      }
    }

    if (!consumed) {
      // Single consonant or vowel or digit or punctuation
      const cur = text[i];
      if (CHAR_MAP[cur] !== undefined) {
        baseAnsi = CHAR_MAP[cur];
        consumed = 1;
      } else {
        // Non-Bangla character (space, punctuation, etc.)
        if (hasRef) out += CHAR_MAP["\u09B0"];
        out += cur;
        i += 1;
        continue;
      }
    }

    i += consumed;

    // Handle trailing phalas: ্য (্ + য), ্র (্ + র), বা-ফলা (্ + ব)
    while (text[i] === "\u09CD") {
      const nextC = text[i + 1];
      if (nextC === "\u09AF") {
        baseAnsi += YA_PHALA;
        i += 2;
      } else if (nextC === "\u09B0") {
        baseAnsi += RA_PHALA;
        i += 2;
      } else if (nextC === "\u09AC") {
        baseAnsi += "e";
        i += 2;
      } else {
        break;
      }
    }

    // Handle vowel signs (কার) after base + phalas
    let pre = "";
    let post = "";

    const kar = text[i];
    if (kar === "\u09CB") {
      // ো = ে + base + া
      pre = PRE_KAR["\u09C7"];
      post = POST_KAR["\u09BE"];
      i += 1;
    } else if (kar === "\u09CC") {
      // ৌ = ে + base + ৗ
      pre = PRE_KAR["\u09C7"];
      post = POST_KAR["\u09D7"];
      i += 1;
    } else if (PRE_KAR[kar]) {
      pre = PRE_KAR[kar];
      i += 1;
    } else if (POST_KAR[kar]) {
      post = POST_KAR[kar];
      i += 1;
    }

    // Check trailing ঁ (chandrabindu) or ং / ঃ
    let tail = "";
    if (text[i] === "\u0981") {
      tail = CHAR_MAP["\u0981"];
      i += 1;
    }

    // Assemble in Bijoy visual order: [pre-kar] + [base] + [ref] + [post-kar] + [tail]
    out += pre + baseAnsi + (hasRef ? REF_CHAR : "") + post + tail;
  }

  return out;
}

/**
 * Splits a string into Bangla and non-Bangla runs so mixed text (e.g. "মোঃ রঞ্জিত (CID-11-2026)")
 * can render Bangla in SutonnyMJ (ANSI) and English/IDs in Helvetica cleanly.
 */
export function splitBanglaRuns(str) {
  const s = String(str ?? "");
  if (!s) return [];
  // Match runs of Bangla characters + spaces/common punctuation between Bangla words
  const runs = [];
  // Tokenize into Bangla words vs non-Bangla tokens, then merge adjacent spaces into Bangla runs
  const tokens = s.match(/[\u0980-\u09FF]+|[^\u0980-\u09FF]+/g) || [];
  for (let idx = 0; idx < tokens.length; idx++) {
    const tok = tokens[idx];
    const isBnTok = /[\u0980-\u09FF]/.test(tok);
    if (isBnTok) {
      if (runs.length && runs[runs.length - 1].isBangla) {
        runs[runs.length - 1].text += tok;
      } else {
        runs.push({ text: tok, isBangla: true });
      }
    } else {
      // If it's only whitespace/punctuation between two Bangla tokens, keep it in the Bangla run
      const nextIsBn = idx + 1 < tokens.length && /[\u0980-\u09FF]/.test(tokens[idx + 1]);
      const prevIsBn = runs.length > 0 && runs[runs.length - 1].isBangla;
      if (prevIsBn && nextIsBn && /^[\s,.\-–—:|/()]+$/.test(tok)) {
        runs[runs.length - 1].text += tok;
      } else {
        if (runs.length && !runs[runs.length - 1].isBangla) {
          runs[runs.length - 1].text += tok;
        } else {
          runs.push({ text: tok, isBangla: false });
        }
      }
    }
  }
  return runs;
}

