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

export const COOKIE = "bc_session";
export const ENTRY_COOKIE = "be_session";

export async function makeToken() {
  const exp = Date.now() + 1000 * 60 * 60 * 24 * 30;
  return `${exp}.${await hmac(String(exp))}`;
}

export async function verifyToken(token) {
  if (!token) return false;
  const [exp, sig] = token.split(".");
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  return (await hmac(exp)) === sig;
}
