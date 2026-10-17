import { NextResponse } from "next/server";
import { SESSION_COOKIE, makeSession, sessionCookieOptions } from "@/lib/auth";
import { ownerCredentials, safeEqual, verifyPassword } from "@/lib/serverAuth";
import { getUserByUsername } from "@/lib/db";

export async function POST(req) {
  try {
    const { username, password } = await req.json();
    const name = String(username || "").trim();
    const pass = String(password || "");
    if (!name || !pass) {
      return NextResponse.json({ error: "Enter username and password" }, { status: 400 });
    }

    let session = null;
    const owner = ownerCredentials();
    if (name.toLowerCase() === owner.username.toLowerCase() && safeEqual(pass, owner.password)) {
      session = { uid: 0, username: owner.username, role: "admin", perms: {} };
    } else {
      const u = await getUserByUsername(name);
      if (u && u.is_active && verifyPassword(pass, u.password_hash)) {
        session = { uid: u.id, username: u.username, role: u.role, perms: u.permissions };
      }
    }

    if (!session) {
      return NextResponse.json({ error: "Incorrect username or password" }, { status: 401 });
    }

    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE, await makeSession(session), sessionCookieOptions());
    return res;
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
