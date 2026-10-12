import { NextResponse } from "next/server";
import { getEntries, getClients } from "@/lib/db";
import { Resend } from "resend";
import * as XLSX from "xlsx";

export const dynamic = "force-dynamic";

// Format helper
const fmtNum = (n) => Number(n || 0).toFixed(2);
const today = () => new Date().toISOString().slice(0, 10);

function generateAllDealersWorkbookBuffer(clientsList, rowsList) {
  const wb = XLSX.utils.book_new();
  const usedSheetNames = new Set();

  clientsList.forEach((c) => {
    const cName = c.name;
    const type = c.type || "dealer";
    const label = type === "client" ? "Client" : "Dealer";
    const upperLabel = type === "client" ? "CLIENT" : "DEALER";

    let runningBal = 0;
    const clientRows = rowsList
      .filter((r) => r.client_name === cName)
      .map((r) => {
        runningBal += r.type === "bill" ? r.amount : -r.amount;
        return { ...r, balance: runningBal };
      })
      .reverse();

    const cTotalBill = clientRows.reduce((s, r) => s + (r.type === "bill" ? r.amount : 0), 0);
    const cTotalPaid = clientRows.reduce((s, r) => s + (r.type === "payment" ? r.amount : 0), 0);
    const cBalance = cTotalBill - cTotalPaid;

    const wsData = [
      ["CHOWDHURY ENGINEERING WORKS"],
      [`${upperLabel} ACCOUNT STATEMENT`],
      [],
      [`${label}:`, cName, "", "Statement Date:", today()],
      [
        "Total Bill (BDT):",
        fmtNum(cTotalBill),
        "",
        "Total Paid (BDT):",
        fmtNum(cTotalPaid),
        "",
        "Net Due Balance (BDT):",
        fmtNum(cBalance),
      ],
      [],
      [
        "SL",
        "Date",
        "Type",
        "Bill No",
        "Item / Description",
        "Weight (KG)",
        "Rate (BDT)",
        "Sub-Total (BDT)",
        "Bill Total (BDT)",
        "From Bank / Account",
        "To Bank / Account",
        "Paid Amount (BDT)",
        "Running Balance (BDT)",
        "Note",
      ],
    ];

    let sl = 1;
    clientRows.forEach((r) => {
      const hasItems = r.type === "bill" && Array.isArray(r.items) && r.items.length > 0;
      if (hasItems) {
        r.items.forEach((it) => {
          wsData.push([
            sl++,
            r.entry_date || "",
            "Bill (Item)",
            r.bill_no || "-",
            it.name || "Item",
            it.weight != null && it.weight !== "" ? Number(it.weight).toFixed(2) : "-",
            it.rate != null && it.rate !== "" ? Number(it.rate).toFixed(2) : "-",
            it.subtotal != null && it.subtotal !== "" ? fmtNum(it.subtotal) : "-",
            "-",
            r.from_bank || "-",
            r.to_bank || "-",
            "-",
            "-",
            r.note || "",
          ]);
        });

        if (r.labour_cost > 0) {
          wsData.push([
            sl++,
            r.entry_date || "",
            "Labour Charge",
            r.bill_no || "-",
            "Labour / Handling Charge",
            "-",
            "-",
            fmtNum(r.labour_cost),
            "-",
            r.from_bank || "-",
            r.to_bank || "-",
            "-",
            "-",
            r.note || "",
          ]);
        }

        if (r.transport_cost > 0) {
          wsData.push([
            sl++,
            r.entry_date || "",
            "Transport Cost",
            r.bill_no || "-",
            "Transport / Freight Cost",
            "-",
            "-",
            fmtNum(r.transport_cost),
            "-",
            r.from_bank || "-",
            r.to_bank || "-",
            "-",
            "-",
            r.note || "",
          ]);
        }

        wsData.push([
          sl++,
          r.entry_date || "",
          "Bill Total",
          r.bill_no || "-",
          "TOTAL (All Items & Charges)",
          r.weight != null ? Number(r.weight).toFixed(2) : "-",
          "-",
          "-",
          fmtNum(r.amount),
          r.from_bank || "-",
          r.to_bank || "-",
          "-",
          fmtNum(r.balance),
          r.note || "",
        ]);
      } else {
        wsData.push([
          sl++,
          r.entry_date || "",
          r.type === "bill" ? "Bill" : "Payment",
          r.bill_no || "-",
          "-",
          r.weight != null ? Number(r.weight).toFixed(2) : "-",
          "-",
          "-",
          r.type === "bill" ? fmtNum(r.amount) : "-",
          r.from_bank || "-",
          r.to_bank || "-",
          r.type === "payment" ? fmtNum(r.amount) : "-",
          fmtNum(r.balance),
          r.note || "",
        ]);
      }
    });

    wsData.push([]);
    wsData.push([
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "TOTAL SUMMARY:",
      fmtNum(cTotalBill),
      "",
      "",
      fmtNum(cTotalPaid),
      fmtNum(cBalance),
      "",
    ]);

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    let cleanSheetName = (cName || "Dealer")
      .replace(/[:\\/?*\[\]]/g, "_")
      .trim()
      .slice(0, 30);
    if (!cleanSheetName) cleanSheetName = "Sheet";
    let uniqueName = cleanSheetName;
    let counter = 1;
    while (usedSheetNames.has(uniqueName)) {
      uniqueName = `${cleanSheetName.slice(0, 26)}_${counter++}`;
    }
    usedSheetNames.add(uniqueName);

    XLSX.utils.book_append_sheet(wb, ws, uniqueName);
  });

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}

export async function GET(req) {
  try {
    const url = new URL(req.url);
    const apiKey = process.env.RESEND_API_KEY;
    const recipient = url.searchParams.get("to") || process.env.REPORT_RECIPIENT_EMAIL || "acc.cew1@gmail.com";

    if (!apiKey) {
      return NextResponse.json({ error: "RESEND_API_KEY is not configured" }, { status: 500 });
    }

    const [rows, clients] = await Promise.all([getEntries(), getClients()]);

    // Ensure all unique client names from entries are included
    const clientMap = new Map();
    clients.forEach((c) => clientMap.set(c.name, c));
    rows.forEach((r) => {
      if (r.client_name && !clientMap.has(r.client_name)) {
        clientMap.set(r.client_name, { name: r.client_name, type: "dealer" });
      }
    });

    const fullClients = Array.from(clientMap.values()).sort((a, b) => a.name.localeCompare(b.name));

    // Generate Excel Buffer
    const buffer = generateAllDealersWorkbookBuffer(fullClients, rows);
    const currentDate = today();
    const fileName = `CEW_All_Dealers_Clients_Ledger_${currentDate}.xlsx`;

    // Calculate totals across all entries for email body
    const grandBill = rows.reduce((s, r) => s + (r.type === "bill" ? r.amount : 0), 0);
    const grandPaid = rows.reduce((s, r) => s + (r.type === "payment" ? r.amount : 0), 0);
    const grandDue = grandBill - grandPaid;

    const resend = new Resend(apiKey);

    const emailResponse = await resend.emails.send({
      from: "CEW Reports <onboarding@resend.dev>",
      to: [recipient],
      subject: `Weekly Report: Chowdhury Engineering Works - All Ledger (${currentDate})`,
      html: `
        <div style="font-family: Arial, sans-serif; color: #1e293b; max-width: 600px; line-height: 1.6;">
          <h2 style="color: #991b1b; border-bottom: 2px solid #b91c1c; padding-bottom: 8px;">
            Chowdhury Engineering Works
          </h2>
          <p>Assalamu Alaikum,</p>
          <p>Please find attached the <strong>Weekly Dealers & Clients Ledger Report</strong> generated on <strong>${currentDate}</strong>.</p>
          
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin: 18px 0;">
            <h4 style="margin: 0 0 10px 0; color: #0f172a;">Summary Overview:</h4>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr>
                <td style="padding: 4px 0; color: #64748b;">Total Registered Entities:</td>
                <td style="padding: 4px 0; font-weight: bold; text-align: right;">${fullClients.length} Dealers / Clients</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; color: #64748b;">Total Bill Amount:</td>
                <td style="padding: 4px 0; font-weight: bold; text-align: right; color: #dc2626;">৳ ${fmtNum(grandBill)}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; color: #64748b;">Total Paid Amount:</td>
                <td style="padding: 4px 0; font-weight: bold; text-align: right; color: #16a34a;">৳ ${fmtNum(grandPaid)}</td>
              </tr>
              <tr style="border-top: 1px solid #cbd5e1;">
                <td style="padding: 8px 0 4px 0; font-weight: bold; color: #0f172a;">Net Outstanding Due:</td>
                <td style="padding: 8px 0 4px 0; font-weight: bold; font-size: 16px; text-align: right; color: #b91c1c;">৳ ${fmtNum(grandDue)}</td>
              </tr>
            </table>
          </div>

          <p style="font-size: 13px; color: #64748b;">
            📎 The complete multi-sheet Excel file <strong>(${fileName})</strong> is attached with this email containing individual sheets for all registered dealers and clients.
          </p>
          
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin-top: 24px;" />
          <p style="font-size: 12px; color: #94a3b8;">
            Automated report sent by Chowdhury Engineering Works System • Every Monday at 4:00 PM
          </p>
        </div>
      `,
      attachments: [
        {
          filename: fileName,
          content: buffer,
        },
      ],
    });

    if (emailResponse.error) {
      console.error("Resend API error:", emailResponse.error);
      return NextResponse.json({
        success: false,
        error: emailResponse.error.message,
        details: emailResponse.error,
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `Weekly report email sent successfully to ${recipient}`,
      date: currentDate,
      id: emailResponse.data?.id,
    });
  } catch (err) {
    console.error("Weekly report cron error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
