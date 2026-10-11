import { NextResponse } from "next/server";
import { getClients, upsertClient, deleteClientEntries } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const clients = await getClients();
    return NextResponse.json(clients);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const name = body.name?.trim();
    const type = body.type === "client" ? "client" : "dealer";
    if (!name) {
      return NextResponse.json({ error: "নাম দেওয়া আবশ্যক" }, { status: 400 });
    }
    await upsertClient(name, type);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const name = searchParams.get("name");
    if (!name) {
      return NextResponse.json({ error: "নাম প্রয়োজন" }, { status: 400 });
    }
    await deleteClientEntries(name);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
