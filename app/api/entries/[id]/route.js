import { NextResponse } from "next/server";
import { deleteEntry } from "@/lib/db";

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
