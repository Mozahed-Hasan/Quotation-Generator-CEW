import { takaInWords } from "./words";
import { getPadImage } from "./padAsset";

const fmtMoney = (n) =>
  Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export async function generateEntryPdf({ bill }) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ unit: "pt", format: "a4", compress: true });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 40;
  const FONT = "helvetica";
  const TOP = 168;
  const BOTTOM = 120;

  const pad = await getPadImage();

  const bgDone = new Set();
  const drawBg = () => {
    const p = doc.getCurrentPageInfo().pageNumber;
    if (bgDone.has(p)) return;
    bgDone.add(p);
    if (pad && pad.dataUrl) {
      doc.addImage(pad.dataUrl, pad.fmt || "PNG", 0, 0, W, H, undefined, "FAST");
    }
  };
  drawBg();

  let y = TOP + 10;

  // Invoice Title
  doc.setFont(FONT, "bold").setFontSize(14).setTextColor(153, 27, 27);
  doc.text("CUSTOMER INVOICE / BILL", W / 2, y, { align: "center" });
  doc.setDrawColor(185, 28, 28).setLineWidth(1).line(W / 2 - 100, y + 3, W / 2 + 100, y + 3);
  y += 18;

  // Bill Header info (2-column layout)
  doc.setFont(FONT, "normal").setFontSize(9.5).setTextColor(30, 41, 59);

  // Left Column: Customer details
  doc.setFont(FONT, "bold").setTextColor(15, 23, 42);
  doc.text(`Customer Name: ${bill.customer_name || "N/A"}`, M, y);
  doc.setFont(FONT, "normal").setTextColor(71, 85, 105);
  if (bill.customer_address) {
    y += 13;
    doc.text(`Address: ${bill.customer_address}`, M, y);
  }
  if (bill.customer_mobile) {
    y += 13;
    doc.text(`Mobile: ${bill.customer_mobile}`, M, y);
  }
  if (bill.customer_id) {
    y += 13;
    doc.setFont(FONT, "bold").setTextColor(30, 64, 175);
    doc.text(`Customer ID: ${bill.customer_id}`, M, y);
  }

  // Right Column: Bill Meta
  const rightYStart = TOP + 28;
  let rY = rightYStart;
  doc.setFont(FONT, "bold").setTextColor(15, 23, 42);
  doc.text(`Bill No: ${bill.bill_no || "N/A"}`, W - M, rY, { align: "right" });
  rY += 13;
  doc.setFont(FONT, "normal").setTextColor(71, 85, 105);
  doc.text(`Date: ${bill.bill_date || ""}`, W - M, rY, { align: "right" });

  y = Math.max(y, rY) + 16;

  // Table columns
  const tableColumns = [
    { header: "SL", dataKey: "sl" },
    { header: "Item Description", dataKey: "name" },
    { header: "Quantity", dataKey: "quantity" },
    { header: "Unit", dataKey: "unit" },
    { header: "Rate (৳)", dataKey: "rate" },
    { header: "Sub-Total (৳)", dataKey: "subtotal" },
  ];

  const tableBody = (bill.items || []).map((it, idx) => ({
    sl: idx + 1,
    name: it.name || "Item",
    quantity: it.quantity != null && it.quantity !== "" ? String(it.quantity) : (it.weight != null && it.weight !== "" ? String(it.weight) : "-"),
    unit: it.unit || "pcs",
    rate: it.rate != null && it.rate !== "" ? fmtMoney(it.rate) : "-",
    subtotal: it.subtotal != null && it.subtotal !== "" ? fmtMoney(it.subtotal) : "0.00",
  }));

  if (tableBody.length === 0) {
    tableBody.push({
      sl: 1,
      name: "General Bill Item",
      quantity: "-",
      unit: "-",
      rate: "-",
      subtotal: fmtMoney(bill.total_bill),
    });
  }

  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M, top: TOP, bottom: BOTTOM },
    columns: tableColumns,
    body: tableBody,
    theme: "grid",
    headStyles: {
      fillColor: [153, 27, 27],
      textColor: [255, 255, 255],
      font: FONT,
      fontStyle: "bold",
      fontSize: 9,
      halign: "center",
      cellPadding: 5,
    },
    bodyStyles: {
      font: FONT,
      fontSize: 8.5,
      textColor: [30, 41, 59],
      cellPadding: 4.5,
    },
    columnStyles: {
      sl: { halign: "center", cellWidth: 28 },
      name: { halign: "left" },
      weight: { halign: "right", cellWidth: 62 },
      quantity: { halign: "center", cellWidth: 46 },
      rate: { halign: "right", cellWidth: 64 },
      subtotal: { halign: "right", cellWidth: 76 },
    },
    didDrawPage: () => {
      drawBg();
    },
  });

  let finalY = doc.lastAutoTable.finalY + 12;

  // Additional Charges & Summary Box
  const labour = Number(bill.labour_charge || 0);
  const transport = Number(bill.transport_cost || 0);
  const discount = Number(bill.discount || 0);
  const total = Number(bill.total_bill || 0);
  const payment = Number(bill.client_payment || 0);
  const dueAdv = Number(bill.due_advance || 0);

  // Check if summary fits on page
  if (finalY + 140 > H - BOTTOM) {
    doc.addPage();
    drawBg();
    finalY = TOP + 20;
  }

  const boxW = 210;
  const boxX = W - M - boxW;
  let sumY = finalY;

  doc.setFontSize(8.5).setTextColor(51, 65, 85);

  if (labour > 0) {
    doc.setFont(FONT, "normal").text("Labour Charge:", boxX, sumY);
    doc.setFont(FONT, "bold").text(`৳ ${fmtMoney(labour)}`, W - M, sumY, { align: "right" });
    sumY += 13;
  }

  if (transport > 0) {
    doc.setFont(FONT, "normal").text("Transportation Cost:", boxX, sumY);
    doc.setFont(FONT, "bold").text(`৳ ${fmtMoney(transport)}`, W - M, sumY, { align: "right" });
    sumY += 13;
  }

  if (discount > 0) {
    doc.setFont(FONT, "normal").text("Discount (Less):", boxX, sumY);
    doc.setFont(FONT, "bold").setTextColor(185, 28, 28).text(`- ৳ ${fmtMoney(discount)}`, W - M, sumY, { align: "right" });
    doc.setTextColor(51, 65, 85);
    sumY += 13;
  }

  // Divider
  doc.setDrawColor(203, 213, 225).setLineWidth(0.5).line(boxX, sumY, W - M, sumY);
  sumY += 11;

  // Total Bill
  doc.setFont(FONT, "bold").setFontSize(10).setTextColor(15, 23, 42);
  doc.text("Total Bill:", boxX, sumY);
  doc.text(`৳ ${fmtMoney(total)}`, W - M, sumY, { align: "right" });
  sumY += 14;

  // Client Payment
  doc.setFont(FONT, "bold").setFontSize(9.5).setTextColor(16, 149, 193);
  doc.text("Client Payment:", boxX, sumY);
  doc.text(`৳ ${fmtMoney(payment)}`, W - M, sumY, { align: "right" });
  sumY += 14;

  // Due or Advance
  doc.setDrawColor(203, 213, 225).setLineWidth(0.5).line(boxX, sumY - 2, W - M, sumY - 2);
  if (dueAdv > 0) {
    doc.setFont(FONT, "bold").setFontSize(10).setTextColor(185, 28, 28);
    doc.text("Net Due Balance:", boxX, sumY + 4);
    doc.text(`৳ ${fmtMoney(dueAdv)}`, W - M, sumY + 4, { align: "right" });
  } else if (dueAdv < 0) {
    doc.setFont(FONT, "bold").setFontSize(10).setTextColor(5, 150, 105);
    doc.text("Advance Balance:", boxX, sumY + 4);
    doc.text(`৳ ${fmtMoney(Math.abs(dueAdv))}`, W - M, sumY + 4, { align: "right" });
  } else {
    doc.setFont(FONT, "bold").setFontSize(10).setTextColor(16, 149, 193);
    doc.text("Balance Status:", boxX, sumY + 4);
    doc.text("Fully Paid (৳ 0.00)", W - M, sumY + 4, { align: "right" });
  }

  // Left side: In Words Boxes
  let wordsY = finalY;
  const wordsW = W - M - boxW - M - 20;

  // Total Bill in words
  doc.setFont(FONT, "bold").setFontSize(8.5).setTextColor(71, 85, 105);
  doc.text("Total Bill in Words:", M, wordsY);
  wordsY += 10;
  doc.setFont(FONT, "normal").setFontSize(8.5).setTextColor(15, 23, 42);
  const totalWords = takaInWords(total) || "Zero taka only.";
  const totalSplit = doc.splitTextToSize(totalWords, wordsW);
  doc.text(totalSplit, M, wordsY);
  wordsY += totalSplit.length * 10 + 8;

  // Due or Advance in words
  if (dueAdv > 0) {
    doc.setFont(FONT, "bold").setFontSize(8.5).setTextColor(185, 28, 28);
    doc.text("Due Amount in Words:", M, wordsY);
    wordsY += 10;
    doc.setFont(FONT, "normal").setFontSize(8.5).setTextColor(15, 23, 42);
    const dueWords = takaInWords(dueAdv);
    const dueSplit = doc.splitTextToSize(dueWords, wordsW);
    doc.text(dueSplit, M, wordsY);
  } else if (dueAdv < 0) {
    doc.setFont(FONT, "bold").setFontSize(8.5).setTextColor(5, 150, 105);
    doc.text("Advance Amount in Words:", M, wordsY);
    wordsY += 10;
    doc.setFont(FONT, "normal").setFontSize(8.5).setTextColor(15, 23, 42);
    const advWords = takaInWords(Math.abs(dueAdv));
    const advSplit = doc.splitTextToSize(advWords, wordsW);
    doc.text(advSplit, M, wordsY);
  }

  // Signature Block at bottom
  const sigY = H - BOTTOM + 10;
  doc.setFont(FONT, "normal").setFontSize(8.5).setTextColor(100, 116, 139);
  doc.text("Customer Signature", M + 20, sigY);
  doc.line(M, sigY - 12, M + 120, sigY - 12);

  doc.text("Authorized Signature", W - M - 120, sigY);
  doc.line(W - M - 140, sigY - 12, W - M, sigY - 12);

  const cleanFilename = `Invoice_${(bill.customer_name || "Client").replace(/[^a-zA-Z0-9]/g, "_")}_${bill.bill_no || bill.bill_date || "Bill"}.pdf`;
  doc.save(cleanFilename);
}
