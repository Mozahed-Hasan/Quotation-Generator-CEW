import { NextResponse } from "next/server";
import { COOKIE, verifyToken } from "@/lib/auth";

export async function middleware(req) {
  const { pathname } = req.nextUrl;
  
  // Protect /bill-calculator route (except /bill-calculator/login)
  if (pathname.startsWith("/bill-calculator")) {
    if (pathname === "/bill-calculator/login") return NextResponse.next();
    const token = req.cookies.get(COOKIE)?.value;
    const ok = await verifyToken(token);
    if (!ok) {
      return NextResponse.redirect(new URL("/bill-calculator/login", req.url));
    }
    return NextResponse.next();
  }

  // Protect /api/entries route
  if (pathname.startsWith("/api/entries")) {
    const token = req.cookies.get(COOKIE)?.value;
    const ok = await verifyToken(token);
    if (!ok) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/bill-calculator",
    "/bill-calculator/:path*",
    "/api/entries",
    "/api/entries/:path*",
  ],
};

