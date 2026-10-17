import { NextResponse } from "next/server";
import { createExpensesBulk } from "@/lib/db";

export async function POST(req) {
  try {
    const { items } = await req.json();
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "No valid expense items provided" }, { status: 400 });
    }
    const result = await createExpensesBulk(items);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
