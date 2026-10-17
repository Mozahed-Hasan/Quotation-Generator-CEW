import { NextResponse } from "next/server";
import { deleteEntry, updateEntry } from "@/lib/db";

export async function PUT(req, { params }) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Entry ID is required" }, { status: 400 });
    }
    const b = await req.json();
    const amount = Number(b.amount);
    if (!(amount > 0)) {
      return NextResponse.json({ error: "Amount must be greater than 0" }, { status: 400 });
    }
    await updateEntry(id, b);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Entry ID is required" }, { status: 400 });
    }
    await deleteEntry(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
