import { NextResponse } from "next/server";
import { getExpenses, createExpense, updateExpense, deleteExpense } from "@/lib/db";

export async function GET() {
  try {
    const expenses = await getExpenses();
    return NextResponse.json({ expenses });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const b = await req.json();
    const title = (b.title || "").trim();
    const amount = Number(b.amount);
    if (!title) return NextResponse.json({ error: "Expense title is required" }, { status: 400 });
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Enter a valid amount" }, { status: 400 });
    }
    const saved = await createExpense({
      expense_date: b.expense_date,
      title,
      category: (b.category || "Other").trim(),
      amount,
      payment_method: (b.payment_method || "").trim(),
      paid_to: (b.paid_to || "").trim(),
      phone: (b.phone || "").trim(),
      from_bank: (b.from_bank || "").trim(),
      to_bank: (b.to_bank || "").trim(),
      sync_to_ledger: Boolean(b.sync_to_ledger),
      client_type: (b.client_type || "").trim(),
      note: (b.note || "").trim(),
    });
    return NextResponse.json({ ok: true, id: saved.id, linked_entry_id: saved.linked_entry_id });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const b = await req.json();
    const id = b.id;
    if (!id) return NextResponse.json({ error: "Expense ID is required" }, { status: 400 });
    const title = (b.title || "").trim();
    const amount = Number(b.amount);
    if (!title) return NextResponse.json({ error: "Expense title is required" }, { status: 400 });
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Enter a valid amount" }, { status: 400 });
    }
    const updated = await updateExpense(id, {
      expense_date: b.expense_date,
      title,
      category: (b.category || "Other").trim(),
      amount,
      payment_method: (b.payment_method || "").trim(),
      paid_to: (b.paid_to || "").trim(),
      phone: (b.phone || "").trim(),
      from_bank: (b.from_bank || "").trim(),
      to_bank: (b.to_bank || "").trim(),
      note: (b.note || "").trim(),
    });
    return NextResponse.json({ ok: true, expense: updated });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID is required" }, { status: 400 });
    await deleteExpense(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

