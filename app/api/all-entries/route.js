import { NextResponse } from "next/server";
import { readSession, SESSION_COOKIE, can } from "@/lib/auth";
import {
  getAllSystemEntries,
  updateSystemEntryStatus,
  updateSystemEntry,
  deleteSystemEntry,
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
    if (!can(session, "all_entries", "view")) {
      return NextResponse.json({ error: "Forbidden: Access denied" }, { status: 403 });
    }

    const entries = await getAllSystemEntries();
    return NextResponse.json({ entries, user: { username: session.username, role: session.role } });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req) {
  try {
    const session = await getAuth(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!can(session, "all_entries", "approve") && session.role !== "admin") {
      return NextResponse.json({ error: "Forbidden: You do not have permission to approve entries" }, { status: 403 });
    }

    const body = await req.json();
    const { source, id, status } = body;
    if (!source || !id || !status) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await updateSystemEntryStatus(source, id, status, session.username);
    return NextResponse.json({ ok: true, status });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const session = await getAuth(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!can(session, "all_entries", "add") && session.role !== "admin") {
      return NextResponse.json({ error: "Forbidden: You do not have permission to edit entries" }, { status: 403 });
    }

    const body = await req.json();
    const { source, id, data } = body;
    if (!source || !id || !data) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await updateSystemEntry(source, id, data);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const session = await getAuth(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!can(session, "all_entries", "delete") && session.role !== "admin") {
      return NextResponse.json({ error: "Forbidden: You do not have permission to delete entries" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const source = searchParams.get("source");
    const id = searchParams.get("id");
    if (!source || !id) {
      return NextResponse.json({ error: "Missing source or id" }, { status: 400 });
    }

    await deleteSystemEntry(source, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
