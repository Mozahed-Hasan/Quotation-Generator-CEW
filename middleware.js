import { NextResponse } from "next/server";
import { COOKIE, verifyToken } from "@/lib/auth";

export async function middleware(req) {
  const { pathname } = req.nextUrl;
  
  // Protect /bill-calculator route (except /bill-calculator/login and /api/login)
  if (pathname.startsWith("/bill-calculator")) {
    if (pathname === "/bill-calculator/login") return NextResponse.next();
    const ok = await verifyToken(req.cookies.get(COOKIE)?.value);
    if (ok) return NextResponse.next();
    return NextResponse.redirect(new URL("/bill-calculator/login", req.url));
  }

  // Protect /api/entries route
  if (pathname.startsWith("/api/entries")) {
    const ok = await verifyToken(req.cookies.get(COOKIE)?.value);
    if (ok) return NextResponse.next();
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/bill-calculator/:path*", "/api/entries/:path*"],
};
