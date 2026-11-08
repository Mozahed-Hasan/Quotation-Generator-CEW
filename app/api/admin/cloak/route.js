import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/serverAuth";
import { getSystemSetting, setSystemSetting, isDatabaseStealthLocked, invalidateLockCache } from "@/lib/db";

export const dynamic = "force-dynamic";

async function requireAdmin(req) {
  const me = await getAuthUser(req);
  if (!me || me.role !== "admin") return null;
  return me;
}

export async function GET(req) {
  try {
    const me = await requireAdmin(req);
    if (!me) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const setting = await getSystemSetting("database_stealth_lock", {
      locked: false,
      updated_at: null,
      updated_by: null,
    });

    return NextResponse.json({
      ok: true,
      locked: Boolean(setting?.locked),
      updated_at: setting?.updated_at || null,
      updated_by: setting?.updated_by || null,
    });
  } catch (err) {
    console.error("Cloak GET error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const me = await requireAdmin(req);
    if (!me) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await req.json();
    const shouldLock = Boolean(body.locked);

    const newSetting = {
      locked: shouldLock,
      updated_at: new Date().toISOString(),
      updated_by: me.username || "admin",
      reason: body.reason || "Manual stealth toggle by admin",
    };

    await setSystemSetting("database_stealth_lock", newSetting, me.username);
    invalidateLockCache();

    return NextResponse.json({
      ok: true,
      locked: shouldLock,
      updated_at: newSetting.updated_at,
      updated_by: newSetting.updated_by,
      message: shouldLock
        ? "Emergency Database Cloak is now ACTIVE. All data is cloaked from non-admin screens."
        : "Database is now LIVE & CONNECTED. All normal operations restored.",
    });
  } catch (err) {
    console.error("Cloak POST error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

