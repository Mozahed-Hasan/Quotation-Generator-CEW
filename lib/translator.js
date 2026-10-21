/**
 * Smart translator & transliterator for CEW accounting exports.
 * Translates English to Bengali and transliterates Banglish / Phonetic English to Bengali script.
 */

// Comprehensive business terminology map for instant, flawless translation
export const BN_TERMS = {
  // Expense Categories
  "General": "সাধারণ খরচ",
  "Bank Deposit": "ব্যাংক জমা (ফান্ড ট্রান্সফার)",
  "Supplier Payment (Raw Materials)": "সাপ্লায়ার পেমেন্ট (কাঁচামাল)",
  "Carrying Charge (In)": "পরিবহন খরচ (মালামাল আনা)",
  "Carrying Charge (Out)": "পরিবহন খরচ (ডেলিভারি)",
  "Company Own Withdrawal": "কোম্পানির নিজস্ব উত্তোলন",
  "Debt Payment": "ঋণ / দেনা পরিশোধ",
  "Company Bank Deposit": "কোম্পানি ব্যাংক জমা",
  "Farm": "খামার খরচ",
  "Salary": "স্টাফ বেতন",
  "Overtime": "ওভারটাইম",
  "Fuel": "জ্বালানী / তেল",
  "Hardware": "হার্ডওয়্যার সামগ্রী",
  "Repairing Materials": "মেরামত সামগ্রী",
  "Mechanic Fee": "মেকানিক বিল",
  "Bazar": "বাজার খরচ",
  "Others": "অন্যান্য খরচ",
  "Other": "অন্যান্য খরচ",

  // Payment Methods
  "Cash": "নগদ",
  "Bank": "ব্যাংক ট্রান্সফার",
  "bKash": "বিকাশ",
  "Nagad": "নগদ (মোবাইল ব্যাংকিং)",
  "Rocket": "রকেট",
  "Cheque": "চেক",

  // Status & Financial Terms
  "DUE": "বাকি",
  "Due": "বাকি",
  "due": "বাকি",
  "ADVANCE": "অগ্রিম",
  "Advance": "অগ্রিম",
  "advance": "অগ্রিম",
  "SETTLED": "পরিশোধিত",
  "Settled": "পরিশোধিত",
  "settled": "পরিশোধিত",
  "PAID": "পরিশোধ",
  "Paid": "পরিশোধ",
  "paid": "পরিশোধ",
  "NET DUE": "মোট বাকি",
  "NET ADVANCE": "মোট অগ্রিম",

  // English Months in Bengali
  "January": "জানুয়ারি",
  "February": "ফেব্রুয়ারি",
  "March": "মার্চ",
  "April": "এপ্রিল",
  "May": "মে",
  "June": "জুন",
  "July": "জুলাই",
  "August": "আগস্ট",
  "September": "সেপ্টেম্বর",
  "October": "অক্টোবর",
  "November": "নভেম্বর",
  "December": "ডিসেম্বর",
  "Jan": "জানুয়ারি",
  "Feb": "ফেব্রুয়ারি",
  "Mar": "মার্চ",
  "Apr": "এপ্রিল",
  "Jun": "জুন",
  "Jul": "জুলাই",
  "Aug": "আগস্ট",
  "Sep": "সেপ্টেম্বর",
  "Oct": "অক্টোবর",
  "Nov": "নভেম্বর",
  "Dec": "ডিসেম্বর",

  // Days of week
  "Sunday": "রবিবার",
  "Monday": "সোমবার",
  "Tuesday": "মঙ্গলবার",
  "Wednesday": "বুধবার",
  "Thursday": "বৃহস্পতিবার",
  "Friday": "শুক্রবার",
  "Saturday": "শনিবার",
  "Sun": "রবিবার",
  "Mon": "সোমবার",
  "Tue": "মঙ্গলবার",
  "Wed": "বুধবার",
  "Thu": "বৃহস্পতিবার",
  "Fri": "শুক্রবার",
  "Sat": "শনিবার",

  // Known CEW Staff Names (preserves names correctly)
  "Ikram": "ইকরাম",
  "Jony": "জনি",
  "Sohel": "সোহেল",
  "Akter": "আক্তার",
  "Shahim": "শাহিম",
  "Juwel Office": "জুয়েল অফিস",
  "Juwel": "জুয়েল",
  "Ganesh": "গণেশ",
  "Shamim Accounts": "শামীম অ্যাকাউন্টস",
  "Shamim": "শামীম",
  "Sujon": "সুজন",
  "Khala": "খালা",
  "Babu": "বাবু",
  "Rakibul Guard": "রাকিবুল গার্ড",
  "Rakibul": "রাকিবুল",
  "Fajlur Rahman": "ফজলুর রহমান",
  "Ibrahim": "ইব্রাহিম",
  "Aslam": "আসলাম",
  "Kamrul": "কামরুল",
  "Sumon Grill": "সুমন গ্রিল",
  "Sumon": "সুমন",
  "Grill": "গ্রিল",
  "Atik Khamar": "আতিক খামার",
  "Atik": "আতিক",
  "Foyej Mollah": "ফয়েজ মোল্লা",
  "Foyej": "ফয়েজ",
  "Alamgir": "আলমগীর",
  "Liyon Laser": "লিওন লেজার",
  "Liyon": "লিওন",
  "Sohag Khamar": "সোহাগ খামার",
  "Sohag": "সোহাগ",
  "Sourab": "সৌরভ",
  "Employee": "কর্মচারী",
  "Staff": "স্টাফ",
  "Labour": "মজুরি",
  "Labor": "মজুরি",
  "Bonus": "বোনাস",
  "Advance Salary": "অগ্রিম বেতন",

  // Table Headers & Labels
  "SL": "ক্রমিক",
  "Date": "তারিখ",
  "Payment Date": "পরিশোধের তারিখ",
  "Bill Date": "বিলের তারিখ",
  "Bill No": "বিল নং",
  "Customer Name": "গ্রাহকের নাম",
  "Customer ID": "গ্রাহক আইডি",
  "Customer ID & Mobile": "গ্রাহক আইডি ও মোবাইল",
  "Mobile No": "মোবাইল নং",
  "Address": "ঠিকানা",
  "Items Count": "পণ্যের সংখ্যা",
  "Items Breakdown Summary": "পণ্যের বিবরণী",
  "Total Bill (BDT)": "মোট বিল (টাকা)",
  "Payment (BDT)": "জমা / পরিশোধ (টাকা)",
  "Due (BDT)": "বাকি (টাকা)",
  "Advance (BDT)": "অগ্রিম (টাকা)",
  "Due Recieved (BDT)": "বাকি আদায় (টাকা)",
  "Remaining Balance (BDT)": "চলতি ব্যালেন্স (টাকা)",
  "Remarks / Note": "মন্তব্য / নোট",
  "Note / Remarks": "মন্তব্য / নোট",
  "Title": "শিরোনাম / বিবরণ",
  "Category": "ক্যাটাগরি",
  "Method": "পেমেন্ট মাধ্যম",
  "Paid To": "গ্রহীতা / পেয়ী",
  "Amount (BDT)": "টাকার পরিমাণ (টাকা)",
  "Invoices Count": "চালানের সংখ্যা",
  "Total Billed (BDT)": "মোট বিল (টাকা)",
  "Total Paid (BDT)": "মোট পরিশোধ (টাকা)",
  "Net Balance (BDT)": "নীট ব্যালেন্স (টাকা)",
  "Balance Status": "ব্যালেন্স স্ট্যাটাস",
  "Labour (BDT)": "লেবার চার্জ (টাকা)",
  "Transport (BDT)": "পরিবহন খরচ (টাকা)",
  "Discount (BDT)": "ছাড় (টাকা)",
  "Bill Due / Adv (BDT)": "বিলের বাকি/অগ্রিম (টাকা)",
  "Running Balance (BDT)": "চলতি ব্যালেন্স (টাকা)",
  "Status": "স্ট্যাটাস",
  "Month-Year": "মাস-বছর",
  "Employee Name": "কর্মচারীর নাম",
  "Title / Designation": "পদবী / কাজের বিবরণ",
  "Payment Method": "পেমেন্ট মাধ্যম",
  "From Bank / Channel": "প্রেরক ব্যাংক / মাধ্যম",
  "To Bank / Account": "প্রাপক ব্যাংক / অ্যাকাউন্ট",
  "Salary Amount (BDT)": "বেতনের পরিমাণ (টাকা)",
  "TOTAL": "সর্বমোট",
  "Total": "সর্বমোট",
  "Grand Total": "সর্বমোট",
  "GRAND TOTAL": "সর্বমোট",
  "TOTAL ACTUAL EXPENSE": "মোট প্রকৃত খরচ",
  "TOTAL FUND TRANSFER": "মোট ফান্ড ট্রান্সফার",
  "SUMMARY": "সারসংক্ষেপ",
  "Total Actual Business Expense (BDT)": "মোট প্রকৃত ব্যবসায়িক খরচ (টাকা)",
  "Total Fund Transfer / Bank Deposits (BDT)": "মোট ফান্ড ট্রান্সফার / ব্যাংক জমা (টাকা)",
  "Grand Total Outflow (BDT)": "সর্বমোট আউটফ্লো / ব্যয় (টাকা)",
  "Expense From Cash Drawer": "ক্যাশ ড্রয়ার থেকে খরচ",
  "Expense From Bank Account": "ব্যাংক অ্যাকাউন্ট থেকে খরচ",
  "Actual Business Expense Total (BDT)": "প্রকৃত ব্যবসায়িক মোট খরচ (টাকা)",
  "SECTION 1: ACTUAL BUSINESS EXPENSES": "বিভাগ ১: প্রকৃত ব্যবসায়িক খরচসমূহ",
  "SECTION 2: FUND TRANSFER (BANK DEPOSITS)": "বিভাগ ২: ফান্ড ট্রান্সফার (ব্যাংক জমা)",
  "SALARY PAYMENT DISBURSEMENT LEDGER": "স্টাফ বেতন ও মজুরি পরিশোধ খতিয়ান",
  "CUSTOMER INVOICES & PAYMENT ACCOUNT LEDGER": "গ্রাহকের ইনভয়েস ও লেনদেন খতিয়ান",
  "CUSTOMER BALANCES SUMMARY": "গ্রাহকদের ব্যালেন্স সারসংক্ষেপ",
  "OUTSTANDING DUE INVOICES": "বকেয়া / বাকি ইনভয়েস তালিকা",
  "ADVANCE PAYMENT INVOICES": "অগ্রিম পেমেন্ট ইনভয়েস তালিকা",
  "DUE CUSTOMERS SUMMARY": "বকেয়া গ্রাহকদের সারসংক্ষেপ",
  "ADVANCE CUSTOMERS SUMMARY": "অগ্রিম গ্রাহকদের সারসংক্ষেপ",
  "ALL INVOICES MASTER REPORT": "সকল ইনভয়েসের মাস্টার রিপোর্ট",
  "FILTERED INVOICES": "ফিল্টারকৃত ইনভয়েস তালিকা",
  "PAID INVOICES": "পরিশোধিত ইনভয়েসসমূহ"
};

// Common banglish word patterns
const BANGLISH_WORDS = {
  "vara": "ভাড়া",
  "bhaada": "ভাড়া",
  "bhada": "ভাড়া",
  "dokan": "দোকান",
  "khoroch": "খরচ",
  "khala": "খালা",
  "babu": "বাবু",
  "karigor": "কারিগর",
  "mojuri": "মজুরি",
  "babod": "বাবদ",
  "bazar": "বাজার",
  "taka": "টাকা",
  "deya": "দেয়া",
  "holo": "হলো",
  "nawya": "নেয়া",
  "beton": "বেতন",
  "gari": "গাড়ি",
  "tel": "তেল",
  "mal": "মাল",
  "kena": "কেনা",
  "becha": "বেচা",
  "advance": "অগ্রিম",
  "baki": "বাকি",
  "boshot": "বসত",
  "bill": "বিল",
  "office": "অফিস",
  "mistri": "মিস্ত্রি",
  "khabar": "খাবার",
  "nasta": "নাস্তা"
};

const translationCache = new Map();

/**
 * Detects if a string is a Customer ID, System Code, or Account Code that must stay in English
 */
export function isCodeOrId(str) {
  if (!str || typeof str !== "string") return false;
  const s = str.trim();
  // Standard customer ID formats: CID-..., CUST-..., CD-..., CEW-..., ID-..., M-..., GUEST-...
  if (/^(CID|CUST|CD|ID|CEW|GUEST|M)[-_0-9A-Za-z]+$/i.test(s)) return true;
  // Multiple hyphenated alphanumeric segments (e.g. CID-10-T15-03717, CD-10-T15-03717)
  if (/^[A-Za-z]{1,5}-([A-Za-z0-9]+-)+[A-Za-z0-9]+$/.test(s)) return true;
  return false;
}

/**
 * Replace known English keywords and digits in text
 */
export function replaceWordsSmart(str) {
  if (!str) return str;
  const trimmed = str.trim();
  // Preserve Customer IDs like CID-10-T15-03717, CUST-2026-001
  if (isCodeOrId(trimmed)) return str;

  // If contains delimiter " | " (e.g. "CID-10-T15-03717 | ০১৭১২৩৪৫৬৭৮")
  if (trimmed.includes(" | ")) {
    return trimmed
      .split(" | ")
      .map((part) => (isCodeOrId(part.trim()) ? part.trim() : replaceWordsSmart(part.trim())))
      .join(" | ");
  }

  // Split keeping delimiters intact
  const tokens = str.split(/(\s+|[-_,./()+])/);
  const replaced = tokens.map((token) => {
    if (!token || /^\s+$/.test(token)) return token;
    const clean = token.trim();
    if (isCodeOrId(clean)) return token;

    // Check clean word against BN_TERMS
    const cleanLower = clean.toLowerCase();
    const cleanCap = clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();

    const dict =
      BN_TERMS[clean] ||
      BN_TERMS[clean.toUpperCase()] ||
      BN_TERMS[cleanLower] ||
      BN_TERMS[cleanCap] ||
      BANGLISH_WORDS[cleanLower];
    if (dict) return dict;

    // Convert digits in token
    if (/^\d+$/.test(clean)) return toBengaliDigits(clean);
    return token;
  });

  return toBengaliDigits(replaced.join(""));
}

/**
 * Translates a single text string into Bengali.
 * Uses exact dictionary matching -> Word-level dictionary replacement -> Google Translate (for English) -> Google Input Tools (for Banglish/Phonetic).
 */
export async function smartTranslateToBengali(text) {
  if (text === null || text === undefined) return "";
  const str = String(text).trim();
  if (!str) return str;

  // Preserve Customer IDs in English
  if (isCodeOrId(str)) return str;

  // Numbers or dates: convert to Bengali digits
  if (/^-?\d+(\.\d+)?$/.test(str)) return toBengaliDigits(str);
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return toBengaliDigits(str);

  // Exact dictionary match (case insensitive)
  const exactMatch =
    BN_TERMS[str] ||
    BN_TERMS[str.toUpperCase()] ||
    BN_TERMS[str.toLowerCase()] ||
    BN_TERMS[str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()];
  if (exactMatch) {
    translationCache.set(str, exactMatch);
    return exactMatch;
  }

  // Cache check
  if (translationCache.has(str)) return translationCache.get(str);

  // If pure Bengali script without any English letters, convert digits if any and return
  if (/[\u0980-\u09FF]/.test(str) && !/[a-zA-Z]/.test(str)) {
    const res = toBengaliDigits(str);
    translationCache.set(str, res);
    return res;
  }

  // Token-level word replacement (e.g. "500 Advance", "October 2026", "Advance Salary", "Kamrul")
  const smartReplaced = replaceWordsSmart(str);
  // If all English letters have been resolved to Bengali
  if (!/[a-zA-Z]/.test(smartReplaced)) {
    translationCache.set(str, smartReplaced);
    return smartReplaced;
  }

  try {
    // 1. Google Translate (GTX) for natural English phrases / sentences
    const gtxUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=bn&dt=t&q=${encodeURIComponent(str)}`;
    const res = await fetch(gtxUrl);
    if (res.ok) {
      const data = await res.json();
      const gtxResult = (data[0] || []).map((x) => x[0]).join("").trim();
      // If it returned Bengali script, it successfully translated English
      if (/[\u0980-\u09FF]/.test(gtxResult)) {
        const finalBn = toBengaliDigits(gtxResult);
        translationCache.set(str, finalBn);
        return finalBn;
      }
    }
  } catch {}

  try {
    // 2. Google Input Tools for Banglish / Romanized Bengali
    const itUrl = `https://inputtools.google.com/request?text=${encodeURIComponent(str)}&itc=bn-t-i0-und&num=1`;
    const res = await fetch(itUrl);
    if (res.ok) {
      const data = await res.json();
      if (data[0] === "SUCCESS" && data[1]?.[0]?.[1]?.[0]) {
        const transliterated = toBengaliDigits(data[1][0][1][0].trim());
        translationCache.set(str, transliterated);
        return transliterated;
      }
    }
  } catch {}

  // Fallback: return token-replaced with Bengali digits
  const fallback = replaceWordsSmart(str);
  translationCache.set(str, fallback);
  return fallback;
}

/**
 * Batch translates a 2D table array into Bengali concurrently with smart caching.
 * Numbers and special values are untouched; text is translated.
 * onProgress(percent) callback provides live progress updates for UI.
 */
export async function batchTranslateTable(rows, onProgress = null) {
  // Extract all unique texts that need translation
  const uniqueTexts = new Set();

  rows.forEach((row) => {
    if (!Array.isArray(row)) return;
    row.forEach((cell) => {
      if (typeof cell === "string") {
        const trimmed = cell.trim();
        // Skip pure numbers or dates or Customer IDs / System Codes
        if (
          trimmed &&
          !/^-?\d+(\.\d+)?$/.test(trimmed) &&
          !/^\d{4}-\d{2}-\d{2}$/.test(trimmed) &&
          !isCodeOrId(trimmed)
        ) {
          uniqueTexts.add(trimmed);
        }
      }
    });
  });

  const textArray = Array.from(uniqueTexts);
  const total = textArray.length;
  let completed = 0;

  // Process in small concurrent batches
  const batchSize = 6;
  for (let i = 0; i < textArray.length; i += batchSize) {
    const slice = textArray.slice(i, i + batchSize);
    await Promise.all(
      slice.map(async (text) => {
        const trans = await smartTranslateToBengali(text);
        if (trans) translationCache.set(text, trans);
        completed++;
        if (onProgress && total > 0) {
          onProgress(Math.min(99, Math.round((completed / total) * 100)));
        }
      })
    );
  }

  // Map original rows to translated rows
  const translatedRows = rows.map((row) => {
    if (!Array.isArray(row)) return row;
    return row.map((cell) => {
      if (typeof cell === "string") {
        const trimmed = cell.trim();
        // Preserve Customer IDs / System Codes in English
        if (isCodeOrId(trimmed)) return cell;

        if (translationCache.has(trimmed)) {
          return translationCache.get(trimmed);
        }
        const dict =
          BN_TERMS[trimmed] ||
          BN_TERMS[trimmed.toUpperCase()] ||
          BN_TERMS[trimmed.toLowerCase()] ||
          BN_TERMS[trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase()];
        if (dict) return dict;

        return replaceWordsSmart(cell);
      }
      return cell;
    });
  });

  if (onProgress) onProgress(100);
  return translatedRows;
}

export const BN_MONTHS = [
  "জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন",
  "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"
];

export const BN_DAYS = [
  "রবিবার", "সোমবার", "মঙ্গলবার", "বুধবার", "বৃহস্পতিবার", "শুক্রবার", "শনিবার"
];

/**
 * Converts ASCII digits (0-9) to Bengali digits (০-৯)
 */
export function toBengaliDigits(val) {
  if (val === null || val === undefined) return "";
  return String(val).replace(/[0-9]/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)]);
}

/**
 * Converts a numeric amount to formatted Bengali currency string (e.g. 5200 -> ৫,২০০)
 */
export function toBengaliCurrency(amount) {
  if (amount === null || amount === undefined || amount === "") return "০";
  const num = Number(amount);
  if (isNaN(num)) return toBengaliDigits(amount);
  const formatted = Math.round(num) === num
    ? num.toLocaleString("en-IN")
    : num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return toBengaliDigits(formatted);
}

/**
 * Translates period labels like "All Time", "This Month", etc. into Bengali
 */
export function translatePeriodLabel(label) {
  if (!label) return "";
  const map = {
    "All Time": "সর্বকালীন (সব সময়ের)",
    "all": "সর্বকালীন (সব সময়ের)",
    "Today": "আজকের দিন",
    "Yesterday": "গতকাল",
    "This Week": "এই সপ্তাহ",
    "This Month": "এই মাস",
    "Last Month": "গত মাস",
    "This Year": "এই বছর",
    "Custom": "নির্দিষ্ট সময়কাল"
  };
  return map[label] || BN_TERMS[label] || toBengaliDigits(label);
}

/**
 * Applies professional formatting and the requested Google Font "Noto Serif Bengali"
 * across all cells of an Excel worksheet.
 */
export function applyExcelStyles(ws, isBn = false) {
  if (!ws) return;
  const fontName = isBn ? "Noto Serif Bengali" : "Calibri";

  for (const cellAddr in ws) {
    if (cellAddr.startsWith("!")) continue;
    const cell = ws[cellAddr];
    if (!cell) continue;

    const rowMatch = cellAddr.match(/\d+/);
    const rowNum = rowMatch ? parseInt(rowMatch[0], 10) : 1;
    const val = String(cell.v !== undefined ? cell.v : "").trim();

    const isCompanyHeader = rowNum === 1;
    const isReportTitle = rowNum === 2;
    const isSectionHeader =
      val.startsWith("SECTION") ||
      val.startsWith("বিভাগ") ||
      val.startsWith("SUMMARY") ||
      val.startsWith("সারসংক্ষেপ");
    const isTotalRow =
      val.includes("TOTAL") ||
      val.includes("মোট") ||
      val.includes("সর্বমোট") ||
      val.includes("GRAND TOTAL");
    const isColHeader =
      val === "Date" ||
      val === "তারিখ" ||
      val === "SL" ||
      val === "ক্রমিক" ||
      val === "Bill No" ||
      val === "চালান নং" ||
      val === "Payment Date" ||
      val === "পরিশোধের তারিখ" ||
      val === "Employee Name" ||
      val === "কর্মচারীর নাম" ||
      val === "Customer Name" ||
      val === "গ্রাহকের নাম" ||
      val === "Title" ||
      val === "বিবরণ / শিরোনাম";

    let s = {
      font: {
        name: fontName,
        sz: 10.5,
        color: { rgb: "1E293B" }
      },
      alignment: {
        vertical: "center"
      }
    };

    if (isCompanyHeader) {
      s.font = { name: fontName, sz: 14, bold: true, color: { rgb: "0F172A" } };
    } else if (isReportTitle) {
      s.font = { name: fontName, sz: 11.5, bold: true, color: { rgb: "1E3A8A" } };
    } else if (isSectionHeader) {
      s.font = { name: fontName, sz: 11, bold: true, color: { rgb: "15803D" } };
    } else if (isTotalRow) {
      s.font = { name: fontName, sz: 11, bold: true, color: { rgb: "0F172A" } };
      s.fill = { fgColor: { rgb: "F1F5F9" } };
    } else if (isColHeader) {
      s.font = { name: fontName, sz: 10.5, bold: true, color: { rgb: "0F172A" } };
      s.fill = { fgColor: { rgb: "F8FAFC" } };
    }

    // Align numbers to right, dates to center
    if (typeof cell.v === "number" || /^[০-৯,.]+$/.test(val)) {
      s.alignment = { ...s.alignment, horizontal: "right" };
    } else if (
      /^\d{4}-\d{2}-\d{2}$/.test(val) ||
      /^[০-৯]{4}-[০-৯]{2}-[০-৯]{2}$/.test(val) ||
      val === "-" ||
      val === "১" ||
      val === "1"
    ) {
      s.alignment = { ...s.alignment, horizontal: "center" };
    }

    cell.s = s;
  }
}
