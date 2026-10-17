"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import "./bill-entry/entry.css";
import "./dashboard.css";

const PAGES = [
  {
    key: "quotation",
    href: "/quotation-generator",
    title: "Quotation Generator",
    desc: "Create and download professional PDF quotations.",
    icon: (
      <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </>
    ),
  },
  {
    key: "calculator",
    href: "/purchase",
    title: "Purchase",
    desc: "Dealer & supplier ledger with payments and dues.",
    icon: (
      <>
        <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
        <line x1="8" y1="6" x2="16" y2="6" />
        <line x1="8" y1="11" x2="8" y2="11" />
        <line x1="12" y1="11" x2="12" y2="11" />
        <line x1="16" y1="11" x2="16" y2="11" />
        <line x1="8" y1="16" x2="16" y2="16" />
      </>
    ),
  },
  {
    key: "bill_entry",
    href: "/sales",
    title: "Sales",
    desc: "Record customer invoices, track payments and balances.",
    icon: (
      <>
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
      </>
    ),
  },
  {
    key: "expenses",
    href: "/expense",
    title: "Expense",
    desc: "Daily, weekly, monthly and yearly expense records.",
    icon: (
      <>
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </>
    ),
  },
  {
    key: "all_entries",
    href: "/all-entries",
    title: "All Entries & Approvals",
    desc: "Master ledger of all system entries. Filter, approve, edit, and audit records.",
    icon: (
      <>
        <polyline points="9 11 12 14 22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </>
    ),
  },
];

const ADMIN_CARD = {
  key: "admin",
  href: "/admin",
  title: "Admin Panel",
  desc: "Add admins & moderators and choose what each person can do.",
  icon: (
    <>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </>
  ),
};

function Icon({ children, size = 26 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

export default function RootDashboardPage() {
  const [user, setUser] = useState(undefined); // undefined = loading, null = logged out
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [denied, setDenied] = useState(false);

  async function loadMe() {
    try {
      const r = await fetch("/api/auth/me", { cache: "no-store" });
      const d = await r.json();
      setUser(d.user || null);
    } catch {
      setUser(null);
    }
  }

  useEffect(() => {
    setDenied(new URLSearchParams(window.location.search).get("denied") === "1");
    loadMe();
  }, []);

  async function handleLogin(e) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setErr(d.error || "Login failed");
      } else {
        setPassword("");
        await loadMe();
      }
    } catch {
      setErr("Failed to connect to server");
    } finally {
      setBusy(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setDenied(false);
  }

  if (user === undefined) {
    return (
      <main className="entry-login-wrap">
        <p style={{ color: "var(--be-text-muted)" }}>Loading...</p>
      </main>
    );
  }

  /* ---------- Login screen ---------- */
  if (!user) {
    return (
      <main className="entry-login-wrap">
        <form className="entry-login-card" onSubmit={handleLogin}>
          <div className="login-header-nav">
            <div className="login-brand">
              <div className="login-logo-box">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/cew-icon.png" alt="CEW Logo" />
              </div>
              <div>
                <h1 className="login-title">Chowdhury Engineering Works</h1>
                <p className="login-company">Management Portal</p>
              </div>
            </div>
          </div>

          <div className="login-body">
            <div className="lock-icon-circle">
              <Icon size={22}>
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </Icon>
            </div>
            <h2 className="login-prompt">Sign In</h2>
            <p className="login-sub">Log in with your username and password to open your dashboard.</p>

            <label htmlFor="dash-user" className="login-label">Username</label>
            <input
              id="dash-user"
              className="login-input"
              placeholder="Enter username..."
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              required
              autoComplete="username"
            />

            <label htmlFor="dash-pass" className="login-label" style={{ marginTop: 12 }}>Password</label>
            <input
              id="dash-pass"
              type="password"
              className="login-input"
              placeholder="Enter password..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />

            {err && <div className="login-error-badge">{err}</div>}

            <button id="dash-login-btn" className="login-submit-btn" disabled={busy}>
              {busy ? "Signing in..." : "Sign In"}
            </button>
          </div>
        </form>
      </main>
    );
  }

  /* ---------- Dashboard ---------- */
  const isAdmin = user.role === "admin";
  const allowed = PAGES.filter((p) => isAdmin || (user.permissions?.[p.key] || []).includes("view"));
  const cards = isAdmin ? [...allowed, ADMIN_CARD] : allowed;

  return (
    <main className="be-wrapper">
      <header className="be-header">
        <div className="be-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/cew-icon.png" alt="CEW" className="be-logo" />
          <div className="be-title-box">
            <h1>Home Dashboard</h1>
            <p>
              Signed in as <strong>{user.username}</strong> •{" "}
              {isAdmin ? (user.owner ? "Owner (Admin)" : "Admin") : "Moderator"}
            </p>
          </div>
        </div>
        <nav className="be-nav-actions">
          <button
            type="button"
            onClick={handleLogout}
            className="be-nav-btn logout"
            title="Sign out from CEW Portal"
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Log Out
          </button>
        </nav>
      </header>

      {denied && (
        <div style={{ background: "#fee2e2", color: "#b91c1c", padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: "0.88rem", fontWeight: 600 }}>
          You do not have permission to open that page.
        </div>
      )}

      {cards.length === 0 ? (
        <div className="be-card" style={{ textAlign: "center", color: "var(--be-text-muted)" }}>
          No pages have been assigned to your account yet. Please contact an admin.
        </div>
      ) : (
        <section className="dash-grid">
          {cards.map((p) => {
            const acts = isAdmin || p.key === "admin" ? null : user.permissions?.[p.key] || [];
            return (
              <Link key={p.key} href={p.href} className="dash-card" id={`dash-${p.key}`}>
                <div className="dash-icon"><Icon>{p.icon}</Icon></div>
                <h2>{p.title}</h2>
                <p>{p.desc}</p>
                {acts && (
                  <span className="dash-lock">
                    {acts.map((a) => (a === "add" ? "Add/Edit" : a[0].toUpperCase() + a.slice(1))).join(" • ")}
                  </span>
                )}
                <span className="dash-open">Open →</span>
              </Link>
            );
          })}
        </section>
      )}
    </main>
  );
}
