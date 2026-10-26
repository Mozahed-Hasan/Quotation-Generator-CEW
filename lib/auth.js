// Edge-safe session + permission helpers (used by middleware and API routes).
const enc = new TextEncoder();

async function hmac(value) {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(process.env.SESSION_SECRET || "dev-secret"),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(value));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const SESSION_COOKIE = "cew_session";
export const SESSION_MAX_AGE = 60 * 60 * 24; // 24 hours (seconds)

/** Pages that can be granted to moderators, and the actions available on each. */
export const PERMISSION_PAGES = [
  { key: "all_entries", label: "All Entries & Audit", href: "/all-entries", actions: ["view", "approve", "add", "delete"] },
  { key: "quotation", label: "Quotation Generator", href: "/quotation-generator", actions: ["view"] },
  { key: "calculator", label: "Purchase", href: "/purchase", actions: ["view", "add", "delete"] },
  { key: "bill_entry", label: "Sales", href: "/sales", actions: ["view", "add", "delete"] },
  { key: "expenses", label: "Expense", href: "/expense", actions: ["view", "add", "delete"] },
];

export const ACTION_LABELS = { view: "View", approve: "Approve", add: "Add / Edit", delete: "Delete" };

export function fullPermissions() {
  const out = {};
  PERMISSION_PAGES.forEach((p) => (out[p.key] = [...p.actions]));
  return out;
}

/** Strip anything that is not a known page/action. */
export function sanitizePermissions(raw) {
  let parsed = raw;
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      parsed = {};
    }
  }
  const out = {};
  PERMISSION_PAGES.forEach((p) => {
    const given = parsed && Array.isArray(parsed[p.key]) ? parsed[p.key] : [];
    const acts = p.actions.filter((a) => given.includes(a));
    // Any other action is useless without being able to view the page
    if (acts.length && !acts.includes("view")) acts.unshift("view");
    if (acts.length) out[p.key] = acts;
  });
  return out;
}

export function can(session, page, action = "view") {
  if (!session) return false;
  if (session.role === "admin") return true;
  let perms = session.perms;
  if (typeof perms === "string") {
    try {
      perms = JSON.parse(perms);
    } catch {
      perms = {};
    }
  }
  const list = perms && perms[page];
  return Array.isArray(list) && list.includes(action);
}

const b64 = {
  enc: (s) => btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""),
  dec: (s) => atob(s.replace(/-/g, "+").replace(/_/g, "/")),
};

export async function makeSession({ uid, username, role, perms }) {
  const payload = {
    uid,
    username,
    role,
    perms: role === "admin" ? fullPermissions() : sanitizePermissions(perms),
    exp: Date.now() + SESSION_MAX_AGE * 1000,
  };
  const body = b64.enc(JSON.stringify(payload));
  return `${body}.${await hmac(body)}`;
}

export async function readSession(token) {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  try {
    if ((await hmac(body)) !== sig) return null;
    const payload = JSON.parse(b64.dec(body));
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function sessionCookieOptions(maxAge = SESSION_MAX_AGE) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  };
}
