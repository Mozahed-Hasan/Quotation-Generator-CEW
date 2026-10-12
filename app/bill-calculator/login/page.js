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
      setErr("Incorrect password");
    }
  }

  return (
    <main className="login">
      <form className="card" onSubmit={submit}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, gap: 10, flexWrap: "wrap" }}>
          <div className="header-brand">
            <div className="header-logo-box" style={{ width: 42, height: 42, padding: 5, borderRadius: 10 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/cew-icon.png" alt="CEW Logo" />
            </div>
            <h1 className="header-title" style={{ fontSize: "1.3rem" }}>Bill Calculator</h1>
          </div>
          <Link href="/" className="header-btn" title="Back to Quotation Generator">
            <span style={{ fontSize: "0.85rem", lineHeight: 1 }}>←</span> Quotation Generator
          </Link>
        </div>
        <p className="sub" style={{ marginBottom: 18 }}>Enter password to continue</p>
        <label htmlFor="pw">Password</label>
        <input id="pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
        {err && <p className="err">{err}</p>}
        <button id="login-btn" className="btn" style={{ width: "100%", marginTop: 14 }}>Log In</button>
      </form>
    </main>
  );
}
