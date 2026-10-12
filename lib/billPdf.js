import { takaInWords } from "./words";

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
  Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const today = () => new Date().toISOString().slice(0, 10);
const ymd = (d) => (d || "").replace(/-/g, "");

export async function generateBillPdf({ clientName, clientType = "dealer", view, totalBill, totalPaid, balance }) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ unit: "pt", format: "a4", compress: true });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 40;
  const FONT = "times";
  const TOP = 175;
  const BOTTOM = 140;

  const pad = await loadImage("/pad.png");

  const bgDone = new Set();
  const drawBg = () => {
    const p = doc.getCurrentPageInfo().pageNumber;
    if (bgDone.has(p)) return;
    bgDone.add(p);
    if (pad) doc.addImage(pad.dataUrl, pad.fmt, 0, 0, W, H, undefined, "FAST");
  };
  drawBg();

  const isClient = clientType === "client";
  const typeLabel = isClient ? "Client" : "Dealer";
  const typeLabelUpper = isClient ? "CLIENT" : "DEALER";

  // ---------- Client & Date Info Block ----------
  let y = TOP + 10;
  doc.setFont(FONT, "bold").setFontSize(12).setTextColor(20, 20, 20);
  doc.text(`${typeLabel}: ${clientName}`, M, y);
  
  doc.setFont(FONT, "normal").setFontSize(10).setTextColor(70, 70, 70);
  doc.text(`Account Statement`, M, y + 14);

  const tDate = today();
  const safeRefName = (clientName || "NAME").toUpperCase().replace(/[^A-Z0-9]/g, "-").replace(/-+/g, "-");
  doc.text(`Date: ${tDate}`, W - M, y, { align: "right" });
  doc.text(`Ref: CEW-${safeRefName}-${tDate}`, W - M, y + 14, { align: "right" });
  y += 34;

  // ---------- Title ----------
  doc.setFont(FONT, "bold").setFontSize(14).setTextColor(0);
  const titleText = `${typeLabelUpper} ACCOUNT STATEMENT`;
  doc.text(titleText, W / 2, y, { align: "center" });
  const tw = doc.getTextWidth(titleText);
  doc.setLineWidth(1).line(W / 2 - tw / 2, y + 2, W / 2 + tw / 2, y + 2);
  y += 14;

  // ---------- Table Setup (Organized & Professional) ----------
  const columns = [
    "SL",
    "Date",
    "Bill No",
    "Particulars / Description",
    "Weight (kg)",
    "Bill (Tk.)",
    "Paid (Tk.)",
    "Balance (Tk.)",
  ];

  const colStyles = {
    0: { halign: "center", cellWidth: 26 },
    1: { halign: "center", cellWidth: 58 },
    2: { halign: "center", cellWidth: 56 },
    3: { halign: "left", cellWidth: 165 },
    4: { halign: "right", cellWidth: 54 },
    5: { halign: "right", cellWidth: 62 },
    6: { halign: "right", cellWidth: 62 },
    7: { halign: "right", cellWidth: 69 },
  };

  const body = [];
  let sl = 1;

  (view || []).forEach((r) => {
    const isBillEntry = r.type === "bill";

    let descText = "";
    if (isBillEntry) {
      const parts = [];
      if (Array.isArray(r.items) && r.items.length > 0) {
        r.items.forEach((it) => {
          const itName = it.name || "Item";
          const itDetails = [];
          if (it.weight) itDetails.push(`${it.weight} kg`);
          if (it.rate) itDetails.push(`@ ${it.rate} Tk.`);
          const detailStr = itDetails.length > 0 ? ` (${itDetails.join(", ")})` : "";
          const subStr = it.subtotal ? ` = ${fmtMoney(it.subtotal)}` : "";
          parts.push(`• ${itName}${detailStr}${subStr}`);
        });
      }
      if (r.labour_cost > 0) {
        parts.push(`• Labour Charge: ${fmtMoney(r.labour_cost)} Tk.`);
      }
      if (r.transport_cost > 0) {
        parts.push(`• Transport Cost: ${fmtMoney(r.transport_cost)} Tk.`);
      }
      if (r.note?.trim()) {
        parts.push(`Note: ${r.note.trim()}`);
      }
      descText = parts.length > 0 ? parts.join("\n") : "Goods / Materials Supply";
    } else {
      const bankParts = [r.from_bank, r.to_bank].filter(Boolean);
      const method = bankParts.length > 0 ? ` (${bankParts.join(" -> ")})` : "";
      const noteStr = r.note?.trim() ? ` [${r.note.trim()}]` : "";
      descText = `Payment Received${method}${noteStr}`;
    }

    body.push([
      sl++,
      r.entry_date || "",
      r.bill_no ? `#${r.bill_no}` : "-",
      descText,
      r.weight != null && r.weight !== "" ? Number(r.weight).toFixed(2) : "-",
      isBillEntry ? fmtMoney(r.amount) : "-",
      !isBillEntry ? fmtMoney(r.amount) : "-",
      fmtMoney(r.balance),
    ]);
  });

  const foot = [
    [
      { content: "Grand Total Summary", colSpan: 4, styles: { halign: "center", fontStyle: "bold" } },
      { content: "-", styles: { halign: "center", fontStyle: "bold" } },
      { content: fmtMoney(totalBill), styles: { halign: "right", fontStyle: "bold" } },
      { content: fmtMoney(totalPaid), styles: { halign: "right", fontStyle: "bold" } },
      { content: fmtMoney(balance), styles: { halign: "right", fontStyle: "bold" } },
    ],
  ];

  // Calculate margins so the table is centered on page
  const totalTableWidth = 26 + 58 + 56 + 165 + 54 + 62 + 62 + 69; // 552 pt
  const tableMarginX = Math.max(20, (W - totalTableWidth) / 2);

  autoTable(doc, {
    startY: y,
    head: [columns],
    body,
    foot,
    showFoot: "lastPage",
    theme: "grid",
    margin: { left: tableMarginX, right: tableMarginX, top: TOP, bottom: BOTTOM },
    tableWidth: totalTableWidth,
    willDrawPage: drawBg,
    styles: {
      font: FONT,
      fontSize: 8.5,
      cellPadding: { top: 4, bottom: 4, left: 3, right: 3 },
      textColor: 20,
      lineColor: [180, 180, 180],
      lineWidth: 0.5,
      valign: "middle",
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: "bold",
      halign: "center",
      valign: "middle",
      lineWidth: 0.7,
      lineColor: [160, 160, 160],
    },
    footStyles: {
      fillColor: [238, 242, 255],
      textColor: [30, 27, 75],
      fontStyle: "bold",
      valign: "middle",
      lineWidth: 0.7,
    },
    bodyStyles: {
      fillColor: false,
      valign: "top",
    },
    columnStyles: colStyles,
  });

  y = doc.lastAutoTable.finalY + 18;

  const ensure = (need) => {
    if (y + need > H - BOTTOM) {
      doc.addPage();
      drawBg();
      y = TOP + 12;
    }
  };

  // ---------- Summary Highlight Box (Aligned with centered table) ----------
  ensure(70);
  doc.setDrawColor(180, 180, 180).setFillColor(250, 250, 252);
  doc.roundedRect(tableMarginX, y, totalTableWidth, 34, 4, 4, "FD");

  doc.setFont(FONT, "bold").setFontSize(10).setTextColor(40, 40, 40);
  doc.text(`Total Bill: BDT ${fmtMoney(totalBill)}`, tableMarginX + 14, y + 21);
  doc.text(`Total Paid: BDT ${fmtMoney(totalPaid)}`, tableMarginX + 175, y + 21);

  doc.setTextColor(balance > 0 ? 180 : 20, balance > 0 ? 30 : 130, 40);
  doc.text(`Net Balance (Due): BDT ${fmtMoney(balance)}`, tableMarginX + totalTableWidth - 14, y + 21, { align: "right" });
  y += 46;

  // ---------- In Words ----------
  if (balance !== 0) {
    ensure(30);
    doc.setFont(FONT, "normal").setFontSize(10).setTextColor(30, 30, 30);
    const wordsText = "Net Due In Words: " + takaInWords(Math.abs(balance));
    const lines = doc.splitTextToSize(wordsText, totalTableWidth);
    doc.text(lines, tableMarginX, y);
    y += lines.length * 14 + 16;
  }

  doc.save(`${typeLabel}-Statement-${clientName}-${tDate}.pdf`);
}
