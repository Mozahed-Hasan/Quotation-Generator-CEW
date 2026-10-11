"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Login() {
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const router = useRouter();

  async function submit(e) {
    e.preventDefault();
    const r = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (r.ok) {
      router.replace("/bill-calculator");
      router.refresh();
    } else {
      setErr("পাসওয়ার্ড ভুল");
    }
  }

  return (
    <main className="login">
      <form className="card" onSubmit={submit}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h1 style={{ fontSize: "1.5rem" }}>বিল ক্যালকুলেটর</h1>
          <Link href="/" style={{ color: "var(--accent2)", fontSize: "0.85rem", textDecoration: "none" }}>
            ← কোটেশন জেনারেটর
          </Link>
        </div>
        <p className="sub" style={{ marginBottom: 18 }}>চালিয়ে যেতে পাসওয়ার্ড দিন</p>
        <label htmlFor="pw">পাসওয়ার্ড</label>
        <input id="pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
        {err && <p className="err">{err}</p>}
        <button id="login-btn" className="btn" style={{ width: "100%", marginTop: 14 }}>লগইন</button>
      </form>
    </main>
  );
}
