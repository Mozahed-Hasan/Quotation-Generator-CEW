"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function BillEntryLogin() {
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const r = await fetch("/api/bill-entry/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (r.ok) {
        router.replace("/bill-entry");
        router.refresh();
      } else {
        const data = await r.json().catch(() => ({}));
        setErr(data.error || "Incorrect password");
      }
    } catch {
      setErr("Failed to connect to server");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="entry-login-wrap">
      <form className="entry-login-card" onSubmit={submit}>
        <div className="login-header-nav">
          <div className="login-brand">
            <div className="login-logo-box">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/cew-icon.png" alt="CEW Logo" />
            </div>
            <div>
              <h1 className="login-title">Bill Entry System</h1>
              <p className="login-company">Chowdhury Engineering Works</p>
            </div>
          </div>
        </div>

        <div className="login-links-bar">
          <Link href="/" className="login-nav-link" title="Quotation Generator">
            <span>←</span> Quotation
          </Link>
          <span className="dot-sep">•</span>
          <Link href="/bill-calculator" className="login-nav-link" title="Bill Calculator">
            Bill Calculator <span>→</span>
          </Link>
        </div>

        <div className="login-body">
          <div className="lock-icon-circle">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
          </div>
          <h2 className="login-prompt">Restricted Access</h2>
          <p className="login-sub">Enter administrative password to access the Customer Bill Entry & Billing Portal.</p>

          <label htmlFor="entry-pw" className="login-label">Admin Password</label>
          <input
            id="entry-pw"
            type="password"
            className="login-input"
            placeholder="Enter password..."
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            required
          />

          {err && <div className="login-error-badge">{err}</div>}

          <button id="entry-login-btn" className="login-submit-btn" disabled={busy}>
            {busy ? "Authenticating..." : "Unlock Bill Entry Portal"}
          </button>
        </div>
      </form>
    </main>
  );
}
