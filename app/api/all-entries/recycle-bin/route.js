import { NextResponse } from "next/server";
import { readSession, SESSION_COOKIE, can } from "@/lib/auth";
import {
  getUnifiedRecycleBin,
  restoreUnifiedItem,
  permanentDeleteUnifiedItem,
  emptyAllRecycleBin,
} from "@/lib/db";

export const dynamic = "force-dynamic";

async function getAuth(req) {
  const cookie = req.cookies.get(SESSION_COOKIE)?.value;
  const session = await readSession(cookie);
  return session;
}

export async function GET(req) {
  try {
    const session = await getAuth(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const items = await getUnifiedRecycleBin();
    return NextResponse.json({ items });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const session = await getAuth(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action, source, id } = body;

    if (action === "restore") {
      if (!source || !id) {
        return NextResponse.json({ error: "Missing source or id" }, { status: 400 });
      }
      await restoreUnifiedItem(source, id);
      return NextResponse.json({ ok: true, message: "Item restored successfully" });
    }

    if (action === "permanent_delete") {
      if (!can(session, "all_entries", "delete") && session.role !== "admin") {
        return NextResponse.json({ error: "Forbidden: You do not have permission to delete entries" }, { status: 403 });
      }
      if (!source || !id) {
        return NextResponse.json({ error: "Missing source or id" }, { status: 400 });
      }
      await permanentDeleteUnifiedItem(source, id);
      return NextResponse.json({ ok: true, message: "Item permanently deleted" });
    }

    if (action === "empty") {
      if (!can(session, "all_entries", "delete") && session.role !== "admin") {
        return NextResponse.json({ error: "Forbidden: You do not have permission to empty recycle bin" }, { status: 403 });
      }
      await emptyAllRecycleBin();
      return NextResponse.json({ ok: true, message: "Recycle bin emptied successfully" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
