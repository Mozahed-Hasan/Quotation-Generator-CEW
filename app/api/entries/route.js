import { NextResponse } from "next/server";
import { getEntries, createEntry, deleteClientEntries } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await getEntries();
    return NextResponse.json(rows);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const b = await req.json();
    const amount = Number(b.amount);
    if (!b.client_name?.trim() || !(amount > 0) || !["bill", "payment"].includes(b.type)) {
      return NextResponse.json({ error: "Invalid entry data" }, { status: 400 });
    }
    const weight = b.weight === "" || b.weight == null ? null : Number(b.weight);
    const date = b.entry_date || new Date().toISOString().slice(0, 10);
    const labour_cost = b.labour_cost === "" || b.labour_cost == null ? null : Number(b.labour_cost);
    const transport_cost = b.transport_cost === "" || b.transport_cost == null ? null : Number(b.transport_cost);

    await createEntry({
      entry_date: date,
      client_name: b.client_name.trim(),
      type: b.type,
      bill_no: b.bill_no || null,
      weight,
      amount,
      from_bank: b.from_bank || null,
      to_bank: b.to_bank || null,
      note: b.note || null,
      items: Array.isArray(b.items) ? b.items : null,
      labour_cost,
      transport_cost,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const clientName = searchParams.get("client_name");
    if (!clientName) {
      return NextResponse.json({ error: "Client name is required" }, { status: 400 });
    }
    await deleteClientEntries(clientName);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

