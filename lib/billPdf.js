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

export async function generateBillPdf({ clientName, view, totalBill, totalPaid, balance }) {
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

  // ---------- Client & Date Info Block ----------
  let y = TOP + 10;
  doc.setFont(FONT, "bold").setFontSize(12).setTextColor(20, 20, 20);
  doc.text(`Dealer / Client: ${clientName}`, M, y);
  
  doc.setFont(FONT, "normal").setFontSize(10).setTextColor(70, 70, 70);
  doc.text(`Account Statement`, M, y + 14);

  const tDate = today();
  doc.text(`Date: ${tDate}`, W - M, y, { align: "right" });
  doc.text(`Ref: CEW-STMT-${ymd(tDate)}`, W - M, y + 14, { align: "right" });
  y += 34;

  // ---------- Title ----------
  doc.setFont(FONT, "bold").setFontSize(14).setTextColor(0);
  doc.text("DEALER ACCOUNT STATEMENT", W / 2, y, { align: "center" });
  const tw = doc.getTextWidth("DEALER ACCOUNT STATEMENT");
  doc.setLineWidth(1).line(W / 2 - tw / 2, y + 2, W / 2 + tw / 2, y + 2);
  y += 14;

  // ---------- Table Setup ----------
  const columns = [
    "Date",
    "Type",
    "Bill No",
    "Weight (kg)",
    "Bank / Account",
    "Bill (BDT)",
    "Paid (BDT)",
    "Balance (BDT)",
  ];

  const colStyles = {
    0: { halign: "center", cellWidth: 55 },
    1: { halign: "center", cellWidth: 48 },
    2: { halign: "center", cellWidth: 55 },
    3: { halign: "right", cellWidth: 55 },
    4: { halign: "left", cellWidth: 80 },
    5: { halign: "right", cellWidth: 68 },
    6: { halign: "right", cellWidth: 68 },
    7: { halign: "right", cellWidth: 72 },
  };

  const body = (view || []).map((r) => [
    r.entry_date || "",
    r.type === "bill" ? "Bill" : "Payment",
    r.bill_no || "-",
    r.weight != null ? String(r.weight) : "-",
    [r.from_bank, r.to_bank].filter(Boolean).join(" -> ") || "-",
    r.type === "bill" ? fmtMoney(r.amount) : "-",
    r.type === "payment" ? fmtMoney(r.amount) : "-",
    fmtMoney(r.balance),
  ]);

  const foot = [
    [
      { content: "Total Summary", colSpan: 5, styles: { halign: "center", fontStyle: "bold" } },
      { content: fmtMoney(totalBill), styles: { halign: "right", fontStyle: "bold" } },
      { content: fmtMoney(totalPaid), styles: { halign: "right", fontStyle: "bold" } },
      { content: fmtMoney(balance), styles: { halign: "right", fontStyle: "bold" } },
    ],
  ];

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
      fontSize: 9,
      cellPadding: { top: 4, bottom: 4, left: 3, right: 3 },
      textColor: 0,
      lineColor: 80,
      lineWidth: 0.6,
      valign: "middle",
    },
    headStyles: {
      fillColor: 245,
      textColor: 0,
      fontStyle: "bold",
      halign: "center",
      valign: "middle",
      lineWidth: 0.8,
    },
    footStyles: {
      fillColor: 240,
      textColor: 0,
      fontStyle: "bold",
      valign: "middle",
    },
    bodyStyles: {
      fillColor: false,
      valign: "middle",
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

  // ---------- Summary Highlight Box ----------
  ensure(70);
  doc.setDrawColor(180, 180, 180).setFillColor(250, 250, 252);
  doc.roundedRect(M, y, W - 2 * M, 34, 4, 4, "FD");

  doc.setFont(FONT, "bold").setFontSize(10).setTextColor(40, 40, 40);
  doc.text(`Total Bill: BDT ${fmtMoney(totalBill)}`, M + 14, y + 21);
  doc.text(`Total Paid: BDT ${fmtMoney(totalPaid)}`, M + 170, y + 21);

  doc.setTextColor(balance > 0 ? 180 : 20, balance > 0 ? 30 : 130, 40);
  doc.text(`Net Balance (Due): BDT ${fmtMoney(balance)}`, W - M - 14, y + 21, { align: "right" });
  y += 46;

  // ---------- In Words ----------
  if (balance !== 0) {
    ensure(30);
    doc.setFont(FONT, "normal").setFontSize(10).setTextColor(30, 30, 30);
    const wordsText = "Net Due In Words: " + takaInWords(Math.abs(balance));
    const lines = doc.splitTextToSize(wordsText, W - 2 * M);
    doc.text(lines, M, y);
    y += lines.length * 14 + 16;
  }

  doc.save(`Statement-${clientName}-${tDate}.pdf`);
}
