import { NextResponse } from "next/server";
import { getSql, initPg, getSystemSetting, setSystemSetting } from "@/lib/db";
import { isStealthCloaked, getAuthUser } from "@/lib/serverAuth";

export async function GET(req) {
  try {
    if (await isStealthCloaked(req)) {
      return NextResponse.json({ inflow: [], outflow: [], totals: {} });
    }

    const auth = await getAuthUser(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sql = getSql();
    await initPg(sql);

    // 1. Fetch all Cash Inflows: Customer Bills where client_payment > 0
    // (covers cash sales, advance received, due payments received)
    const billsRows = await sql`
      SELECT id,
             to_char(bill_date, 'YYYY-MM-DD') AS date,
             bill_no,
             customer_name,
             customer_mobile,
             customer_address,
             customer_id,
             items,
             labour_charge::float AS labour_charge,
             transport_cost::float AS transport_cost,
             discount::float AS discount,
             total_bill::float AS total_bill,
             client_payment::float AS payment,
             due_advance::float AS due_advance,
             note,
             COALESCE(created_by, 'Admin') AS entry_by,
             to_char(created_at, 'YYYY-MM-DD HH24:MI') AS created_at,
             COALESCE(is_opening_balance, false) AS is_opening_balance
      FROM customer_bills
      WHERE COALESCE(is_deleted, false) = false
        AND client_payment > 0
      ORDER BY bill_date DESC, id DESC
    `;

    // 2. Fetch all Cash Outflows: Expenses with Cash payment method (or blank/non-bank)
    const expenseRows = await sql`
      SELECT id,
             to_char(expense_date, 'YYYY-MM-DD') AS date,
             title,
             category,
             amount::float AS amount,
             COALESCE(payment_method, 'Cash') AS payment_method,
             paid_to,
             phone,
             from_bank,
             to_bank,
             linked_client,
             linked_entry_id,
             account_id,
             note,
             COALESCE(created_by, 'Admin') AS entry_by,
             to_char(created_at, 'YYYY-MM-DD HH24:MI') AS created_at
      FROM expenses
      WHERE COALESCE(is_deleted, false) = false
        AND (
          payment_method IS NULL
          OR payment_method = ''
          OR LOWER(payment_method) = 'cash'
          OR (LOWER(payment_method) NOT LIKE '%bank%' AND LOWER(COALESCE(from_bank, '')) NOT LIKE '%bank%')
        )
      ORDER BY expense_date DESC, id DESC
    `;

    // 3. Fetch any direct Cash payments to Dealers/Suppliers from entries table
    // (excluding any that are already linked to an expense to prevent double counting)
    const supplierPaymentRows = await sql`
      SELECT id,
             to_char(entry_date, 'YYYY-MM-DD') AS date,
             client_name,
             type,
             bill_no,
             amount::float AS amount,
             from_bank,
             to_bank,
             note,
             COALESCE(created_by, 'Admin') AS entry_by,
             to_char(created_at, 'YYYY-MM-DD HH24:MI') AS created_at
      FROM entries
      WHERE COALESCE(is_deleted, false) = false
        AND type = 'payment'
        AND (from_bank IS NULL OR from_bank = '' OR LOWER(from_bank) = 'cash')
        AND linked_expense_id IS NULL
      ORDER BY entry_date DESC, id DESC
    `;

    // Process & classify cash inflows
    const inflow = billsRows.map((b) => {
      const totalBill = Number(b.total_bill || 0);
      const payment = Number(b.payment || 0);
      const dueAdv = Number(b.due_advance || 0);

      let transType = "Sales Cash";
      if (b.is_opening_balance) {
        transType = "Opening Balance";
      } else if (totalBill === 0 && payment > 0) {
        transType = "Due Collection / Payment";
      } else if (dueAdv < 0) {
        transType = "Advance Received";
      } else if (payment < totalBill) {
        transType = "Sales Partial / Advance";
      } else if (payment >= totalBill) {
        transType = "Full Sales Payment";
      }

      // Summarize items for clean display
      let itemDesc = "";
      if (Array.isArray(b.items) && b.items.length > 0) {
        itemDesc = b.items
          .map((it) => it.description || it.item_name || it.name || "")
          .filter(Boolean)
          .join(", ");
      }
      if (!itemDesc && b.note) {
        itemDesc = b.note;
      }

      return {
        id: b.id,
        source: "customer_bill",
        date: b.date,
        billNo: b.bill_no || "—",
        party: b.customer_name || "Unknown Customer",
        phone: b.customer_mobile || "",
        transType,
        totalBill,
        amount: payment,
        dueAdvance: dueAdv,
        description: itemDesc || transType,
        note: b.note || "",
        entryBy: b.entry_by,
        createdAt: b.created_at,
      };
    });

    // Process & classify cash outflows
    const outflow = [
      ...expenseRows.map((x) => ({
        id: x.id,
        source: "expense",
        date: x.date,
        category: x.category || "General Expense",
        party: x.paid_to || x.title || "Cash Expense",
        phone: x.phone || "",
        amount: Number(x.amount || 0),
        method: x.payment_method || "Cash",
        title: x.title,
        note: x.note || x.title || "",
        entryBy: x.entry_by,
        createdAt: x.created_at,
      })),
      ...supplierPaymentRows.map((s) => ({
        id: s.id,
        source: "supplier_payment",
        date: s.date,
        category: "Supplier Cash Payment",
        party: s.client_name || "Dealer / Supplier",
        phone: "",
        amount: Number(s.amount || 0),
        method: "Cash",
        title: `Payment to ${s.client_name}`,
        note: s.note || (s.bill_no ? `Bill #${s.bill_no}` : ""),
        entryBy: s.entry_by,
        createdAt: s.created_at,
      })),
    ];

    // Sort outflows by date descending
    outflow.sort((a, b) => {
      const dt = (b.date || "").localeCompare(a.date || "");
      if (dt !== 0) return dt;
      return b.id - a.id;
    });

    // 4. Fetch persistent Opening Cash Balance setting (defaulting to 2026-11-01: 8626)
    const openingSetting = await getSystemSetting("cash_book_opening", {
      date: "2026-11-01",
      amount: 8626,
      note: "Reconciled initial cash drawer baseline on 1st November 2026",
    });

    return NextResponse.json({
      ok: true,
      inflow,
      outflow,
      openingSetting,
    });
  } catch (err) {
    console.error("Failed to load Cash Book data:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    if (await isStealthCloaked(req)) {
      return NextResponse.json({ error: "System offline for maintenance" }, { status: 503 });
    }

    const auth = await getAuthUser(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const date = (body.date || "2026-11-01").trim();
    const amount = Number(body.amount != null ? body.amount : 8626);
    const note = (body.note || "").trim();

    await setSystemSetting(
      "cash_book_opening",
      { date, amount, note },
      auth.username || "Admin"
    );

    return NextResponse.json({
      ok: true,
      openingSetting: { date, amount, note },
    });
  } catch (err) {
    console.error("Failed to update Cash Book opening setting:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
