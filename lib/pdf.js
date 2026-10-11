import { takaInWords } from "./words";

// Full-page A4 letterhead (header + watermark + footer) placed in /public/pad.png
async function loadImage(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    const dataUrl = await new Promise((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.readAsDataURL(blob);
    });
    const fmt = /image\/jpe?g/.test(dataUrl.slice(0, 30)) ? "JPEG" : "PNG";
    return { dataUrl, fmt };
  } catch {
    return null;
  }
}

const fmtMoney = (n) =>
  Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export async function generatePdf({ quote, client, columns, rows, total, nbs, regards }) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ unit: "pt", format: "a4", compress: true });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 50;
  const FONT = "times";
  // Usable area between the pad's header and its footer
  const TOP = 180;
  const BOTTOM = 160;

  const pad = await loadImage("/pad.png");

  // Draw the letterhead background once per page (before content on that page)
  const bgDone = new Set();
  const drawBg = () => {
    const p = doc.getCurrentPageInfo().pageNumber;
    if (bgDone.has(p)) return;
    bgDone.add(p);
    if (pad) doc.addImage(pad.dataUrl, pad.fmt, 0, 0, W, H, undefined, "FAST");
  };
  drawBg();

  // ---------- Client block ----------
  let y = TOP + 12;
  doc.setFont(FONT, "normal").setFontSize(11).setTextColor(0);
  const standardLines = [client.name, client.company, client.phone, client.email, client.address].filter(Boolean);
  const customLines = client.customText
    ? String(client.customText)
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
    : [];
  const lines = [...standardLines, ...customLines];
  lines.forEach((l, i) => doc.text(String(l), M, y + i * 14));
  doc.text(`Ref: ${quote.no || "-"}`, W - M, y, { align: "right" });
  doc.text(`Date: ${quote.date || "-"}`, W - M, y + 14, { align: "right" });
  y += Math.max(lines.length, 2) * 14 + 16;

  // ---------- Title ----------
  doc.setFont(FONT, "bold").setFontSize(14);
  doc.text("Quotation", W / 2, y, { align: "center" });
  const tw = doc.getTextWidth("Quotation");
  doc.setLineWidth(1).line(W / 2 - tw / 2, y + 2, W / 2 + tw / 2, y + 2);
  y += 10;

  // ---------- Table ----------
  const colStyles = {};
  columns.forEach((c, i) => {
    const name = c.toLowerCase();
    if (i === 0 || name.includes("sl")) {
      colStyles[i] = { halign: "center", cellWidth: 36 };
    } else if (name.includes("unit")) {
      colStyles[i] = { halign: "center", cellWidth: 36 };
    } else if (name.includes("qty") || name.includes("quantity")) {
      colStyles[i] = { halign: "right", cellWidth: 54, cellPadding: { top: 4, bottom: 4, left: 3, right: 4 } };
    } else if (name.includes("rate") || name.includes("price")) {
      colStyles[i] = { halign: "right", cellWidth: 46, cellPadding: { top: 4, bottom: 4, left: 3, right: 4 } };
    } else if (i === columns.length - 1 || name.includes("total")) {
      colStyles[i] = { halign: "right", cellWidth: 68, cellPadding: { top: 4, bottom: 4, left: 3, right: 4 } };
    } else {
      colStyles[i] = { halign: "left" };
    }
  });

  // Qty, Rate and Sub-Total (last) columns show as 1,234.00; other columns stay as typed
  const isMoneyCol = (i) => {
    const n = columns[i].trim().toLowerCase();
    return i === columns.length - 1 || n === "qty" || n === "quantity" || n === "rate" || n === "sub-total";
  };
  const fmtCell = (v, i) => {
    const s = String(v ?? "").trim();
    if (!isMoneyCol(i) || s === "") return s;
    const num = Number(s.replace(/,/g, ""));
    return isNaN(num) ? s : fmtMoney(num);
  };
  const body = rows.map((r) => columns.map((_, i) => fmtCell(r[i], i)));
  const foot = Number(total)
    ? [
        [
          { content: "Total", colSpan: Math.max(columns.length - 1, 1), styles: { halign: "center" } },
          ...(columns.length > 1 ? [{ content: fmtMoney(total), styles: { halign: "right", cellPadding: { top: 4, bottom: 4, left: 3, right: 4 } } }] : []),
        ],
      ]
    : undefined;

  autoTable(doc, {
    startY: y,
    head: [columns],
    body,
    foot,
    showFoot: "lastPage",
    theme: "grid",
    margin: { left: M, right: M, top: TOP, bottom: BOTTOM },
    willDrawPage: drawBg,
    styles: {
      font: FONT,
      fontSize: 10,
      cellPadding: { top: 4, bottom: 4, left: 3, right: 3 },
      textColor: 0,
      lineColor: 0,
      lineWidth: 0.8,
      valign: "middle",
    },
    headStyles: { fillColor: 255, textColor: 0, fontStyle: "bold", halign: "center", valign: "middle" },
    footStyles: { fillColor: 255, textColor: 0, fontStyle: "bold", valign: "middle" },
    bodyStyles: { fillColor: false, valign: "middle" },
    columnStyles: colStyles,
  });

  y = doc.lastAutoTable.finalY + 22;
  const ensure = (need) => {
    if (y + need > H - BOTTOM) {
      doc.addPage();
      drawBg();
      y = TOP + 12;
    }
  };

  // ---------- In words ----------
  if (Number(total)) {
    ensure(30);
    doc.setFont(FONT, "normal").setFontSize(11).setTextColor(0);
    const l = doc.splitTextToSize("In Word: " + takaInWords(total), W - 2 * M - 20);
    doc.text(l, M + 20, y);
    y += l.length * 14 + 14;
  }

  // ---------- NB ----------
  const nbList = (nbs || []).filter((n) => n.trim());
  if (nbList.length) {
    ensure(40);
    doc.setFont(FONT, "normal").setFontSize(11).setTextColor(0);
    doc.text("NB:", M, y);
    const nw = doc.getTextWidth("NB:");
    doc.setLineWidth(0.6).line(M, y + 1.5, M + nw, y + 1.5);
    y += 16;
    nbList.forEach((n, i) => {
      const l = doc.splitTextToSize(n, W - 2 * M - 40);
      ensure(l.length * 14);
      doc.text(`${i + 1}.`, M + 18, y);
      doc.text(l, M + 38, y);
      y += l.length * 14 + 2;
    });
    y += 14;
  }

  // ---------- Regards ----------
  if (regards && regards.trim()) {
    const l = regards.split("\n");
    ensure(l.length * 14 + 10);
    doc.setFont(FONT, "normal").setFontSize(11).setTextColor(0);
    l.forEach((line, i) => doc.text(line, M, y + i * 14));
  }

  doc.save(`Quotation-${quote.no || "draft"}.pdf`);
}
