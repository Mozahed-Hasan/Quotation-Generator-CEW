import { unicodeToBijoy, hasBangla, splitBanglaRuns } from "./bijoyConverter";

let sutonnyRegularPromise = null;
let sutonnyBoldPromise = null;

async function fetchFontBase64(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load font: ${url}`);
  const buf = await res.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function getSutonnyFonts() {
  if (!sutonnyRegularPromise) {
    sutonnyRegularPromise = fetchFontBase64("/fonts/SutonnyMJ-Regular.ttf").catch((err) => {
      sutonnyRegularPromise = null;
      throw err;
    });
  }
  if (!sutonnyBoldPromise) {
    sutonnyBoldPromise = fetchFontBase64("/fonts/SutonnyMJ-Bold.ttf").catch((err) => {
      sutonnyBoldPromise = null;
      throw err;
    });
  }
  return Promise.all([sutonnyRegularPromise, sutonnyBoldPromise]);
}

function sanitizeCell(val, isBn) {
  if (val === null || val === undefined) return "";
  const s = String(val);
  // Helvetica cannot render U+09F3 (৳); replace with Tk when not Bangla
  return isBn ? s : s.replace(/৳\s*/g, "Tk ");
}

/**
 * Draws text that may mix Bangla (rendered via SutonnyMJ Bijoy ANSI) and English/IDs (Helvetica).
 */
function drawMixedText(doc, text, x, y, { fontSize = 10, fontStyle = "normal", hasSutonny = true } = {}) {
  const runs = splitBanglaRuns(text);
  let cursorX = x;
  doc.setFontSize(fontSize);
  for (const run of runs) {
    if (run.isBangla && hasSutonny) {
      doc.setFont("SutonnyMJ", fontStyle);
      const ansi = unicodeToBijoy(run.text);
      doc.text(ansi, cursorX, y);
      cursorX += doc.getTextWidth(ansi);
    } else {
      doc.setFont("helvetica", fontStyle);
      const safe = run.text.replace(/৳\s*/g, "Tk ");
      doc.text(safe, cursorX, y);
      cursorX += doc.getTextWidth(safe);
    }
  }
}

export function aoaToPdfSheet(aoa = [], sheetTitle = "", rightAlignCols = [], omitCols = []) {
  const clean = (aoa || []).filter((r) => Array.isArray(r) && r.some((c) => c !== "" && c !== null && c !== undefined));
  let headerIdx = clean.findIndex((r) => r.filter((c) => c !== "" && c !== null && c !== undefined).length >= 3);
  if (headerIdx < 0) headerIdx = 0;
  const rawHeaders = (clean[headerIdx] || []).map((c) => (c === null || c === undefined ? "" : String(c)));
  const body = clean.slice(headerIdx + 1);
  const rawSummaryRows = [];
  const rawRows = [];
  for (const r of body) {
    const firstNonEmpty = String(r.find((c) => c !== "" && c !== null && c !== undefined) || "").toUpperCase();
    if (
      firstNonEmpty.includes("OVERALL TOTAL") ||
      firstNonEmpty.includes("GRAND TOTAL") ||
      firstNonEmpty.includes("মোট হিসাব") ||
      firstNonEmpty.includes("সর্বমোট") ||
      firstNonEmpty.startsWith("TOTAL")
    ) {
      rawSummaryRows.push(r);
    } else {
      rawRows.push(r);
    }
  }

  const omitSet = new Set(omitCols || []);
  if (omitSet.size === 0) {
    return { sheetTitle, headers: rawHeaders, rows: rawRows, summaryRows: rawSummaryRows, rightAlignCols };
  }

  const keepIndices = rawHeaders.map((_, idx) => idx).filter((idx) => !omitSet.has(idx));
  const pick = (row) => keepIndices.map((idx) => (row && row[idx] !== undefined ? row[idx] : ""));
  const rightSet = new Set(rightAlignCols || []);
  const mappedRightCols = [];
  keepIndices.forEach((origIdx, newIdx) => {
    if (rightSet.has(origIdx)) mappedRightCols.push(newIdx);
  });

  return {
    sheetTitle,
    headers: pick(rawHeaders),
    rows: rawRows.map(pick),
    summaryRows: rawSummaryRows.map(pick),
    rightAlignCols: mappedRightCols,
  };
}

/**
 * Generates and downloads a formatted A4 PDF report using jsPDF + jspdf-autotable.
 * Supports English (Helvetica) and Bangla (SutonnyMJ Bijoy ANSI) with multi-sheet sections.
 */
export async function exportReportToPdf({
  title = "Report",
  subtitle = "",
  filename = "CEW_Report.pdf",
  sheets = [],
  lang = "en",
  orientation = "landscape",
}) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const isBn = lang === "bn";

  const doc = new jsPDF({
    orientation,
    unit: "pt",
    format: "a4",
    compress: true,
  });

  let hasSutonny = false;
  if (isBn) {
    try {
      const [regB64, boldB64] = await getSutonnyFonts();
      doc.addFileToVFS("SutonnyMJ-Regular.ttf", regB64);
      doc.addFont("SutonnyMJ-Regular.ttf", "SutonnyMJ", "normal");
      doc.addFileToVFS("SutonnyMJ-Bold.ttf", boldB64);
      doc.addFont("SutonnyMJ-Bold.ttf", "SutonnyMJ", "bold");
      hasSutonny = true;
    } catch (err) {
      console.warn("SutonnyMJ ANSI font load failed, falling back to helvetica:", err);
    }
  }

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 18;

  // Report Header
  doc.setFillColor(30, 58, 138);
  doc.rect(0, 0, pageWidth, 62, "F");

  doc.setTextColor(255, 255, 255);
  drawMixedText(doc, sanitizeCell(title, isBn), marginX, 27, {
    fontSize: 19,
    fontStyle: "bold",
    hasSutonny,
  });

  doc.setTextColor(226, 232, 240);
  const generatedStr = `${isBn ? "তৈরির তারিখ" : "Generated"}: ${new Date().toLocaleString()}`;
  const subText = subtitle ? `${sanitizeCell(subtitle, isBn)}   |   ${generatedStr}` : generatedStr;
  drawMixedText(doc, subText, marginX, 47, {
    fontSize: 11,
    fontStyle: "normal",
    hasSutonny,
  });

  let cursorY = 80;

  const prepareCell = (rawVal) => {
    const str = sanitizeCell(rawVal, isBn);
    if (!isBn || !hasSutonny || !hasBangla(str)) {
      return { text: str, font: "helvetica", mixedRaw: null };
    }
    // Pure Bangla (no ASCII A-Z letters) -> convert directly to Bijoy ANSI for SutonnyMJ
    if (!/[A-Za-z]/.test(str)) {
      return { text: unicodeToBijoy(str), font: "SutonnyMJ", mixedRaw: null };
    }
    // Mixed Bangla + English letters in same cell -> keep space placeholder & draw runs in didDrawCell
    return { text: str, font: "SutonnyMJ", mixedRaw: str };
  };

  for (let sIdx = 0; sIdx < sheets.length; sIdx += 1) {
    const sheet = sheets[sIdx];
    if (!sheet) continue;

    if (sIdx > 0 && cursorY > pageHeight - 120) {
      doc.addPage();
      cursorY = 40;
    }

    if (sheet.sheetTitle) {
      doc.setTextColor(15, 23, 42);
      drawMixedText(doc, sanitizeCell(sheet.sheetTitle, isBn), marginX, cursorY, {
        fontSize: 13.5,
        fontStyle: "bold",
        hasSutonny,
      });
      cursorY += 12;
    }

    const headMeta = (sheet.headers || []).map(prepareCell);
    const bodyMeta = (sheet.rows || []).map((row) => (row || []).map(prepareCell));
    const footMeta = (sheet.summaryRows || []).map((row) => (row || []).map(prepareCell));
    const allBodyMeta = [...bodyMeta, ...footMeta];
    const isWideGrid = (sheet.headers || []).length > 15;
    const bodyFontSize = isWideGrid ? 7.5 : (isBn && hasSutonny ? 12.5 : 12);
    const headFontSize = isWideGrid ? 8 : (isBn && hasSutonny ? 13.5 : 13);

    const head = [headMeta.map((c) => (c.mixedRaw ? " " : c.text))];
    const body = allBodyMeta.map((row) => row.map((c) => (c.mixedRaw ? " " : c.text)));

    const colStyles = {};
    (sheet.rightAlignCols || []).forEach((colIdx) => {
      colStyles[colIdx] = { halign: "right" };
    });

    autoTable(doc, {
      startY: cursorY,
      head,
      body,
      margin: { left: marginX, right: marginX, bottom: 26 },
      styles: {
        font: isBn && hasSutonny ? "SutonnyMJ" : "helvetica",
        fontSize: bodyFontSize,
        cellPadding: isWideGrid ? { top: 2.5, right: 2.5, bottom: 2.5, left: 2.5 } : { top: 5, right: 5, bottom: 5, left: 5 },
        textColor: [0, 0, 0],
        lineColor: [148, 163, 184],
        lineWidth: 0.6,
        overflow: "linebreak",
      },
      headStyles: {
        font: isBn && hasSutonny ? "SutonnyMJ" : "helvetica",
        fontStyle: "bold",
        fillColor: [30, 58, 138],
        textColor: [255, 255, 255],
        fontSize: headFontSize,
        cellPadding: isWideGrid ? { top: 3, right: 2.5, bottom: 3, left: 2.5 } : { top: 6, right: 5, bottom: 6, left: 5 },
      },
      alternateRowStyles: {
        fillColor: [241, 245, 249],
      },
      columnStyles: colStyles,
      didParseCell: (data) => {
        const metaRow =
          data.section === "head"
            ? headMeta
            : data.section === "body"
              ? allBodyMeta[data.row.index]
              : null;
        const meta = metaRow?.[data.column.index];
        if (meta) {
          data.cell.styles.font = meta.font;
          if (meta.font === "helvetica" && isBn && !isWideGrid) {
            data.cell.styles.fontSize = data.section === "head" ? 11.5 : 10.5;
          }
          if (meta.mixedRaw) {
            data.cell.__mixedRaw = meta.mixedRaw;
          }
        }
        if (data.section === "body" && data.row.index >= bodyMeta.length) {
          data.cell.styles.fillColor = [219, 234, 254];
          data.cell.styles.textColor = [15, 23, 42];
          data.cell.styles.fontStyle = "bold";
        }
      },
      didDrawCell: (data) => {
        if (data.cell.__mixedRaw) {
          const padLeft = data.cell.padding("left") || 5;
          const x = data.cell.x + padLeft;
          const y = data.cell.y + data.cell.height / 2 + (data.cell.styles.fontSize || 8.5) * 0.32;
          const tc = data.cell.styles.textColor || [15, 23, 42];
          doc.setTextColor(tc[0], tc[1], tc[2]);
          drawMixedText(doc, data.cell.__mixedRaw, x, y, {
            fontSize: data.cell.styles.fontSize || 8.5,
            fontStyle: data.cell.styles.fontStyle || "normal",
            hasSutonny,
          });
        }
      },
    });

    cursorY = (doc.lastAutoTable?.finalY || cursorY) + 22;
  }

  // Page numbers
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p += 1) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `Page ${p} of ${totalPages}`,
      pageWidth - marginX,
      pageHeight - 14,
      { align: "right" }
    );
  }

  doc.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
}
