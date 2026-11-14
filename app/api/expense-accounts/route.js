import { NextResponse } from "next/server";
import { getExpenseAccounts, getOrCreateExpenseAccount, deleteExpenseAccount } from "@/lib/db";
import { isStealthCloaked } from "@/lib/serverAuth";

export async function GET(req) {
  try {
    if (await isStealthCloaked(req)) {
      return NextResponse.json({ accounts: [] });
    }
    const accounts = await getExpenseAccounts();
    return NextResponse.json({ accounts });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    if (await isStealthCloaked(req)) {
      return NextResponse.json({ error: "System currently offline for maintenance" }, { status: 503 });
    }
    const b = await req.json();
    const name = (b.name || "").trim();
    if (!name) {
      return NextResponse.json({ error: "Account / Person name is required" }, { status: 400 });
    }
    const account = await getOrCreateExpenseAccount({
      name,
      phone: (b.phone || "").trim(),
      category: (b.category || "").trim(),
    });
    return NextResponse.json({ ok: true, account });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    if (await isStealthCloaked(req)) {
      return NextResponse.json({ error: "System currently offline for maintenance" }, { status: 503 });
    }
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id") || searchParams.get("account_id");
    if (!id) {
      return NextResponse.json({ error: "Account ID is required" }, { status: 400 });
    }
    await deleteExpenseAccount(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
