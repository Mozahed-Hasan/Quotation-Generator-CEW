import { NextResponse } from "next/server";
import { ENTRY_COOKIE, makeToken } from "@/lib/auth";

export async function POST(req) {
  try {
    const { password } = await req.json();
    const validPassword = process.env.APP_PASSWORD || "admin123";

    if (password !== validPassword) {
      return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
    }

    const res = NextResponse.json({ ok: true });
    res.cookies.set(ENTRY_COOKIE, await makeToken(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });
    return res;
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ENTRY_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}
