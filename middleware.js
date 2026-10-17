import { NextResponse } from "next/server";
import { SESSION_COOKIE, readSession, can } from "@/lib/auth";

// Maps a URL to the permission page it belongs to.
function resolveTarget(pathname) {
  const is = (base) => pathname === base || pathname.startsWith(base + "/");
  if (is("/all-entries")) return { page: "all_entries", api: false };
  if (is("/quotation-generator")) return { page: "quotation", api: false };
  if (is("/purchase") || is("/bill-calculator")) return { page: "calculator", api: false };
  if (is("/sales") || is("/bill-entry")) return { page: "bill_entry", api: false };
  if (is("/expense") || is("/expenses")) return { page: "expenses", api: false };
  if (is("/admin")) return { page: "admin", api: false };
  if (is("/api/all-entries")) return { page: "all_entries", api: true };
  if (is("/api/entries") || is("/api/clients")) return { page: "calculator", api: true };
  if (is("/api/bill-entry")) return { page: "bill_entry", api: true };
  if (is("/api/expenses")) return { page: "expenses", api: true };
  return null;
}

function actionFor(req, pathname) {
  if (pathname.includes("/recycle-bin")) return "delete"; // restore / purge
  if (req.method === "GET" || req.method === "HEAD") return "view";
  if (req.method === "DELETE") return "delete";
  return "add";
}

export async function middleware(req) {
  const { pathname } = req.nextUrl;

  // Legacy redirects to clean URLs
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
    const url = new URL("/", req.url);
    url.search = req.nextUrl.search;
    return NextResponse.redirect(url);
  }
  if (pathname === "/bill-calculator" || pathname.startsWith("/bill-calculator/")) {
    const url = new URL(pathname.replace(/^\/bill-calculator/, "/purchase"), req.url);
    url.search = req.nextUrl.search;
    return NextResponse.redirect(url);
  }
  if (pathname === "/bill-entry" || pathname.startsWith("/bill-entry/")) {
    const url = new URL(pathname.replace(/^\/bill-entry/, "/sales"), req.url);
    url.search = req.nextUrl.search;
    return NextResponse.redirect(url);
  }
  if (pathname === "/expenses" || pathname.startsWith("/expenses/")) {
    const url = new URL(pathname.replace(/^\/expenses/, "/expense"), req.url);
    url.search = req.nextUrl.search;
    return NextResponse.redirect(url);
  }

  const target = resolveTarget(pathname);
  if (!target) return NextResponse.next();

  const session = await readSession(req.cookies.get(SESSION_COOKIE)?.value);

  if (!session) {
    if (target.api) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Admin panel is admin-only (pages and /api/admin use their own DB check too)
  if (target.page === "admin") {
    if (session.role === "admin") return NextResponse.next();
    return NextResponse.redirect(new URL("/?denied=1", req.url));
  }

  // Allow GET /api/clients if user can view either calculator or expenses
  if (pathname.startsWith("/api/clients") && (req.method === "GET" || req.method === "HEAD")) {
    if (can(session, "calculator", "view") || can(session, "expenses", "view")) {
      return NextResponse.next();
    }
  }

  const action = target.api ? actionFor(req, pathname) : "view";
  if (!can(session, target.page, action)) {
    if (target.api) {
      return NextResponse.json({ error: "You do not have permission to do this." }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/?denied=1", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard",
    "/dashboard/:path*",
    "/quotation-generator",
    "/quotation-generator/:path*",
    "/purchase",
    "/purchase/:path*",
    "/bill-calculator",
    "/bill-calculator/:path*",
    "/sales",
    "/sales/:path*",
    "/bill-entry",
    "/bill-entry/:path*",
    "/expense",
    "/expense/:path*",
    "/expenses",
    "/expenses/:path*",
    "/admin",
    "/admin/:path*",
    "/api/entries",
    "/api/entries/:path*",
    "/api/clients",
    "/api/clients/:path*",
    "/api/bill-entry",
    "/api/bill-entry/:path*",
    "/api/expenses",
    "/api/expenses/:path*",
  ],
};
