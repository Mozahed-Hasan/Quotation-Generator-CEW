import { scryptSync, randomBytes, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { SESSION_COOKIE, readSession, sanitizePermissions, fullPermissions } from "@/lib/auth";
import { getUserById } from "@/lib/db";

export function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  try {
    const [salt, hash] = String(stored).split(":");
    const test = scryptSync(password, salt, 64);
    const real = Buffer.from(hash, "hex");
    return real.length === test.length && timingSafeEqual(real, test);
  } catch {
    return false;
  }
}

/** The owner account comes from env. ADMIN_PASSWORD falls back to the old APP_PASSWORD. */
export function ownerCredentials() {
  return {
    username: process.env.ADMIN_USERNAME || "admin",
    password: process.env.ADMIN_PASSWORD || process.env.APP_PASSWORD || "admin123",
  };
}

export function safeEqual(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
}

function parseCookieHeader(header, key) {
  if (!header) return null;
  const match = header.match(new RegExp(`(?:^|;\\s*)${key}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Authoritative current user for a request: validates the cookie, then re-reads
 * the account from the database so disabled / downgraded users are caught.
 */
export async function getAuthUser(req) {
  let token = null;

  // 1. Try NextRequest.cookies
  if (req?.cookies?.get) {
    token = req.cookies.get(SESSION_COOKIE)?.value;
  }

  // 2. Try next/headers cookies()
  if (!token) {
    try {
      token = cookies().get(SESSION_COOKIE)?.value;
    } catch {
      // next/headers might throw outside request context
    }
  }

  // 3. Fallback: Parse Cookie header directly
  if (!token && req?.headers) {
    const raw = req.headers.get ? req.headers.get("cookie") : req.headers["cookie"];
    token = parseCookieHeader(raw, SESSION_COOKIE);
  }

  const s = await readSession(token);
  if (!s) return null;
  if (s.uid === 0) {
    return { id: 0, username: s.username, role: "admin", owner: true, permissions: fullPermissions() };
  }
  const u = await getUserById(s.uid);
  if (!u || !u.is_active) return null;
  return {
    id: u.id,
    username: u.username,
    role: u.role,
    owner: false,
    permissions: u.role === "admin" ? fullPermissions() : sanitizePermissions(u.permissions),
  };
}
