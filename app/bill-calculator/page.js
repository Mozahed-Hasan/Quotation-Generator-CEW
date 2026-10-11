"use client";
import { useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { generateBillPdf } from "@/lib/billPdf";

// SVG Icons
function UserIcon({ size = 18 }) {
  return (
    <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function PlusIcon({ size = 15 }) {
  return (
    <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function MinusIcon({ size = 15 }) {
  return (
    <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function DownloadIcon({ size = 15 }) {
  return (
    <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function PrinterIcon({ size = 15 }) {
  return (
    <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </svg>
  );
}

function CheckIcon({ size = 14 }) {
  return (
    <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function CrossIcon({ size = 14 }) {
  return (
    <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function TrashIcon({ size = 14 }) {
  return (
    <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function FileTextIcon({ size = 18 }) {
  return (
    <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
}

function ArrowRightIcon({ size = 13 }) {
  return (
    <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

function LogoutIcon({ size = 14 }) {
  return (
    <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

const today = () => new Date().toISOString().slice(0, 10);
const emptyForm = () => ({
  type: "bill",
  entry_date: today(),
  bill_no: "",
  weight: "",
  amount: "",
  from_bank: "",
  to_bank: "",
  note: "",
});

const fmt = (n) => Number(n || 0).toLocaleString("bn-BD", { maximumFractionDigits: 2 });

export default function Home() {
  const router = useRouter();
  const [rows, setRows] = useState([]);
  const [selectedClient, setSelectedClient] = useState("");
  const [clientSearch, setClientSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [extraClients, setExtraClients] = useState([]);
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [newClientInput, setNewClientInput] = useState("");
  const dropdownRef = useRef(null);

  // Load entries from server and extra clients from localStorage
  async function load() {
    try {
      const r = await fetch("/api/entries");
      if (r.status === 401) {
        router.replace("/bill-calculator/login");
        return;
      }
      const d = await r.json();
      if (!r.ok) {
        setErr(d.error || "ডেটা লোড হয়নি");
      } else {
        setRows(d);
        setErr("");
      }
    } catch (e) {
      setErr(e.message);
    }
    setLoaded(true);
  }

  useEffect(() => {
    load();
    try {
      const saved = localStorage.getItem("bc_extra_clients");
      if (saved) setExtraClients(JSON.parse(saved));
    } catch {}
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // List of all unique clients (from rows + extra added clients)
  const clients = useMemo(() => {
    const set = new Set();
    extraClients.forEach((c) => {
      if (c?.trim()) set.add(c.trim());
    });
    rows.forEach((r) => {
      if (r.client_name?.trim()) set.add(r.client_name.trim());
    });
    return Array.from(set).sort();
  }, [rows, extraClients]);

  // Dropdown suggestions filtered by typed letters
  const filteredSuggestions = useMemo(() => {
    if (!clientSearch.trim()) return clients;
    const q = clientSearch.toLowerCase().trim();
    return clients.filter((c) => c.toLowerCase().includes(q));
  }, [clients, clientSearch]);

  function handleSelectClient(name) {
    setSelectedClient(name);
    setClientSearch(name);
    setShowDropdown(false);
  }

  function handleClearClient() {
    setSelectedClient("");
    setClientSearch("");
    setShowDropdown(false);
  }

  // Add new client via Modal or search option
  function handleAddNewClient(name) {
    const trimmed = (name || newClientInput).trim();
    if (!trimmed) return;
    if (!clients.includes(trimmed)) {
      const next = [...extraClients, trimmed];
      setExtraClients(next);
      try {
        localStorage.setItem("bc_extra_clients", JSON.stringify(next));
      } catch {}
    }
    setSelectedClient(trimmed);
    setClientSearch(trimmed);
    setShowDropdown(false);
    setShowNewClientModal(false);
    setNewClientInput("");
  }

  // Transactions filtered ONLY by selected client
  const view = useMemo(() => {
    if (!selectedClient) return [];
    let bal = 0;
    return rows
      .filter((r) => r.client_name === selectedClient)
      .map((r) => {
        bal += r.type === "bill" ? r.amount : -r.amount;
        return { ...r, balance: bal };
      });
  }, [rows, selectedClient]);

  const totalBill = view.reduce((s, r) => s + (r.type === "bill" ? r.amount : 0), 0);
  const totalPaid = view.reduce((s, r) => s + (r.type === "payment" ? r.amount : 0), 0);
  const balance = totalBill - totalPaid;

  const setField = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    if (!selectedClient.trim()) {
      setErr("অনুগ্রহ করে প্রথমে একজন ক্লায়েন্ট / ডিলার নির্বাচন করুন");
      return;
    }
    setBusy(true);
    setErr("");
    const payload = {
      ...form,
      client_name: selectedClient.trim(),
    };
    const r = await fetch("/api/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (r.status === 401) {
      router.replace("/bill-calculator/login");
      return;
    }
    const d = await r.json();
    setBusy(false);
    if (!r.ok) return setErr(d.error || "সেভ হয়নি");
    setForm({ ...emptyForm(), type: form.type });
    load();
  }

  async function remove(id) {
    if (!confirm("এই এন্ট্রি মুছে ফেলবেন?")) return;
    const r = await fetch(`/api/entries/${id}`, { method: "DELETE" });
    if (r.status === 401) {
      router.replace("/bill-calculator/login");
      return;
    }
    load();
  }

  async function handleDeleteClient(clientToDelete) {
    if (!clientToDelete) return;
    const clientRows = rows.filter((r) => r.client_name === clientToDelete);
    const count = clientRows.length;
    const msg = count > 0
      ? `"${clientToDelete}" ডিলার এবং তার ${count}টি লেনদেনের সমস্ত হিসাব মুছে ফেলতে চান?\nএই প্রক্রিয়াটি পরে আর ফেরত আনা যাবে না।`
      : `"${clientToDelete}" ডিলারকে তালিকা থেকে মুছে ফেলতে চান?`;

    if (!window.confirm(msg)) return;

    try {
      setBusy(true);
      const res = await fetch(`/api/entries?client_name=${encodeURIComponent(clientToDelete)}`, {
        method: "DELETE",
      });
      if (res.status === 401) {
        router.replace("/bill-calculator/login");
        return;
      }

      const nextExtra = extraClients.filter((c) => c !== clientToDelete);
      setExtraClients(nextExtra);
      try {
        localStorage.setItem("bc_extra_clients", JSON.stringify(nextExtra));
      } catch {}

      if (selectedClient === clientToDelete) {
        setSelectedClient("");
        setClientSearch("");
      }

      await load();
    } catch (e) {
      alert("ডিলার মুছতে সমস্যা হয়েছে: " + e.message);
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    try {
      await fetch("/api/login", { method: "DELETE" });
    } catch {}
    router.replace("/bill-calculator/login");
    router.refresh();
  }

  // Download selected client data as CSV
  function downloadClientData() {
    if (!selectedClient) return;
    if (view.length === 0) {
      alert("এই ক্লায়েন্টের কোনো লেনদেন ডেটা নেই");
      return;
    }

    const headers = [
      "তারিখ",
      "ক্লায়েন্ট",
      "ধরন",
      "বিল নং",
      "ওজন",
      "ব্যাংক (থেকে)",
      "ব্যাংক (যাচ্ছে)",
      "বিলের পরিমাণ (+)",
      "পেমেন্টের পরিমাণ (-)",
      "রানিং ব্যালেন্স",
      "নোট",
    ];

    const csvRows = [
      [`ডিলার / ক্লায়েন্ট হিসাব বিবরণী: ${selectedClient}`],
      [`ডাউনলোডের তারিখ: ${today()}`],
      [`মোট বিল: ৳ ${totalBill}`, `মোট পরিশোধ: ৳ ${totalPaid}`, `অবশিষ্ট ব্যালেন্স: ৳ ${balance}`],
      [],
      headers,
    ];

    view.forEach((r) => {
      csvRows.push([
        `"${r.entry_date}"`,
        `"${r.client_name}"`,
        `"${r.type === "bill" ? "বিল" : "পেমেন্ট"}"`,
        `"${r.bill_no || ""}"`,
        `"${r.weight != null ? r.weight : ""}"`,
        `"${r.from_bank || ""}"`,
        `"${r.to_bank || ""}"`,
        `"${r.type === "bill" ? r.amount : ""}"`,
        `"${r.type === "payment" ? r.amount : ""}"`,
        `"${r.balance}"`,
        `"${r.note || ""}"`,
      ]);
    });

    csvRows.push([]);
    csvRows.push(["", "", "", "", "", "সর্বমোট:", `"${totalBill}"`, `"${totalPaid}"`, `"${balance}"`, ""]);

    const csvContent = "\uFEFF" + csvRows.map((e) => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${selectedClient}_হিসাব_স্টেটমেন্ট_${today()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const [pdfBusy, setPdfBusy] = useState(false);

  async function downloadPdf() {
    if (!selectedClient) return;
    if (view.length === 0) {
      alert("এই ক্লায়েন্টের কোনো লেনদেন ডেটা নেই");
      return;
    }
    setPdfBusy(true);
    try {
      await generateBillPdf({
        clientName: selectedClient,
        view,
        totalBill,
        totalPaid,
        balance,
      });
    } catch (e) {
      alert("PDF তৈরি করতে সমস্যা হয়েছে: " + e.message);
    } finally {
      setPdfBusy(false);
    }
  }

  function printStatement() {
    window.print();
  }

  const isBill = form.type === "bill";

  return (
    <main className="wrap">
      {/* Printable CEW Header Pad (Displays ONLY during browser printing) */}
      <div className="print-letterhead-header">
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/cew-icon.png" alt="CEW" style={{ width: "65px", height: "65px", objectFit: "contain" }} />
          <div>
            <h2 style={{ fontSize: "17pt", fontWeight: "bold", margin: 0, color: "#991b1b" }}>Chowdhury Engineering Works</h2>
            <p style={{ fontSize: "9pt", margin: "2px 0", color: "#334155" }}>39 No Ward, Haidarabad, Tongi, Gazipur. | Contact: 01959404040, 01932-505050</p>
          </div>
        </div>
        <hr style={{ margin: "10px 0 14px 0", borderTop: "2px solid #b91c1c", borderBottom: "none" }} />
        {selectedClient && (
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px", fontSize: "10pt" }}>
            <div>
              <p style={{ margin: "2px 0" }}><strong>ডিলার / ক্লায়েন্ট:</strong> {selectedClient}</p>
              <p style={{ margin: "2px 0", color: "#475569" }}>ডিলার লেনদেন ও বিল হিসাব স্টেটমেন্ট</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ margin: "2px 0" }}><strong>তারিখ:</strong> {today()}</p>
              <p style={{ margin: "2px 0", color: "#475569" }}><strong>রেফারেন্স:</strong> CEW-STMT-{today().replace(/-/g, "")}</p>
            </div>
          </div>
        )}
        <div style={{ textAlign: "center", marginBottom: "14px" }}>
          <span style={{ fontSize: "13pt", fontWeight: "bold", borderBottom: "1.5px solid #000", paddingBottom: "2px", letterSpacing: "0.5px" }}>
            DEALER ACCOUNT STATEMENT / ডিলার হিসাব বিবরণী
          </span>
        </div>
      </div>

      {/* Header */}
      <header className="top">
        <div>
          <h1>বিল ক্যালকুলেটর</h1>
          <p className="sub">CEW ডিলারদের বিল, পেমেন্ট ও ব্যালেন্স হিসাব</p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <a
            href="/"
            className="btn ghost"
            style={{
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "0.85rem",
            }}
          >
            ← কোটেশন জেনারেটর
          </a>
          <button id="logout-btn" className="btn ghost" onClick={logout}>
            <LogoutIcon /> লগআউট
          </button>
        </div>
      </header>

      {/* TOP SECTION: Client Selection Dropdown with Autocomplete & Add Client */}
      <section className="client-hero" ref={dropdownRef}>
        <div className="client-hero-header">
          <div className="client-hero-title">
            <UserIcon size={20} /> ক্লায়েন্ট / ডিলার নির্বাচন করুন
            <span>প্রথমে নির্বাচন আবশ্যক</span>
          </div>
          <div className="client-top-actions">
            {clients.length > 0 && (
              <small style={{ color: "var(--muted)", marginRight: 8 }}>
                মোট ডিলার: <b>{clients.length}</b> জন
              </small>
            )}
            <button
              type="button"
              className="btn-new-client"
              onClick={() => setShowNewClientModal(true)}
            >
              <PlusIcon /> নতুন ডিলার যোগ করুন
            </button>
          </div>
        </div>

        <div className="client-search-wrap">
          <div className="client-input-box">
            <input
              id="client-search-input"
              className="client-input"
              type="text"
              placeholder="ডিলারের নাম লিখুন (১-২ টি অক্ষর লিখলেই সাজেশন আসবে)..."
              value={clientSearch}
              onChange={(e) => {
                setClientSearch(e.target.value);
                setShowDropdown(true);
                if (clients.includes(e.target.value.trim())) {
                  setSelectedClient(e.target.value.trim());
                }
              }}
              onFocus={() => setShowDropdown(true)}
              autoComplete="off"
            />
            {clientSearch && (
              <button
                type="button"
                className="client-clear-btn"
                onClick={handleClearClient}
                title="মুছুন"
              >
                <CrossIcon size={16} />
              </button>
            )}
          </div>

          {/* Autocomplete Dropdown Menu */}
          {showDropdown && (
            <div className="dropdown-menu">
              {filteredSuggestions.length > 0 ? (
                filteredSuggestions.map((client) => {
                  const isCur = selectedClient === client;
                  return (
                    <div
                      key={client}
                      className={`dropdown-item ${isCur ? "active" : ""}`}
                      onClick={() => handleSelectClient(client)}
                    >
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                        <UserIcon size={16} /> <b>{client}</b>
                      </span>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        {isCur ? (
                          <span className="badge" style={{ color: "var(--accent2)", display: "inline-flex", alignItems: "center", gap: 4 }}>
                            <CheckIcon size={12} /> নির্বাচিত
                          </span>
                        ) : (
                          <span className="badge">নির্বাচন করুন</span>
                        )}
                        <span
                          className="dropdown-del-btn"
                          title={`"${client}" ডিলার মুছে ফেলুন`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClient(client);
                          }}
                        >
                          <TrashIcon size={13} />
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{ padding: "10px 14px", color: "var(--muted)", fontSize: "0.9rem" }}>
                  এই নামের কোনো ডিলার তালিকায় নেই
                </div>
              )}

              {/* Option to create brand new client directly from typing */}
              {clientSearch.trim() && !clients.includes(clientSearch.trim()) && (
                <div
                  className="dropdown-create-new"
                  onClick={() => handleAddNewClient(clientSearch.trim())}
                >
                  <PlusIcon size={16} /> নতুন ক্লায়েন্ট হিসেবে যুক্ত ও নির্বাচন করুন: &quot;<b>{clientSearch.trim()}</b>&quot;
                </div>
              )}
            </div>
          )}
        </div>

        {/* Selected client active banner with Download & Print buttons */}
        {selectedClient ? (
          <div className="active-client-banner">
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <UserIcon size={18} />
              <span style={{ color: "var(--muted)", fontSize: "0.85rem" }}>বর্তমান নির্বাচিত ডিলার:</span>{" "}
              <b>{selectedClient}</b>
            </div>
            <div className="active-client-banner-actions">
              <button
                type="button"
                className="btn-download-pdf"
                onClick={downloadPdf}
                disabled={pdfBusy}
                title="CEW অফিসিয়াল প্যাড লেটারহেডে সুন্দর PDF ডাউনলোড করুন"
              >
                <FileTextIcon /> {pdfBusy ? "তৈরি হচ্ছে..." : "PDF ডাউনলোড"}
              </button>
              <button
                type="button"
                className="btn-print"
                onClick={printStatement}
                title="প্রিন্ট করুন"
              >
                <PrinterIcon /> প্রিন্ট
              </button>
              <button
                type="button"
                className="btn-download-csv"
                onClick={downloadClientData}
                title="এই ডিলারের সম্পূর্ণ হিসাব এক্সেলে ডাউনলোড করুন"
              >
                <DownloadIcon /> Excel
              </button>
              <button
                type="button"
                className="btn-del-client"
                onClick={() => handleDeleteClient(selectedClient)}
                title="এই ডিলার ও তার সমস্ত হিসাব মুছে ফেলুন"
              >
                <TrashIcon size={14} /> ডিলার মুছুন
              </button>
              <button
                type="button"
                className="btn ghost"
                style={{ fontSize: "0.82rem", padding: "5px 10px" }}
                onClick={handleClearClient}
              >
                অন্য ডিলার নির্বাচন করুন
              </button>
            </div>
          </div>
        ) : (
          /* Quick Click Chips for Existing Clients */
          clients.length > 0 && (
            <div className="client-chips">
              <span className="client-chips-label">দ্রুত নির্বাচন:</span>
              {clients.slice(0, 10).map((c) => (
                <button
                  key={c}
                  type="button"
                  className="client-chip"
                  onClick={() => handleSelectClient(c)}
                >
                  <UserIcon size={12} /> {c}
                </button>
              ))}
            </div>
          )
        )}
      </section>

      {/* Modal for adding new client explicitly */}
      {showNewClientModal && (
        <div className="modal-overlay" onClick={() => setShowNewClientModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <PlusIcon size={18} /> নতুন ডিলার / ক্লায়েন্ট যোগ করুন
            </h3>
            <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: 16 }}>
              নতুন ডিলারের নাম লিখুন। নাম যুক্ত হওয়ার সাথে সাথেই আপনি তার জন্য বিল ও পেমেন্ট এন্ট্রি করতে পারবেন।
            </p>
            <label htmlFor="new-client-name">ডিলারের নাম</label>
            <input
              id="new-client-name"
              type="text"
              placeholder="যেমন: মেসার্স রহিম এন্টারপ্রাইজ"
              value={newClientInput}
              onChange={(e) => setNewClientInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddNewClient();
              }}
              autoFocus
            />
            <div className="modal-actions">
              <button
                type="button"
                className="btn ghost"
                onClick={() => setShowNewClientModal(false)}
              >
                বাতিল
              </button>
              <button
                type="button"
                className="btn"
                style={{ marginTop: 0 }}
                onClick={() => handleAddNewClient()}
                disabled={!newClientInput.trim()}
              >
                <CheckIcon /> সংরক্ষণ ও নির্বাচন করুন
              </button>
            </div>
          </div>
        </div>
      )}

      {/* When a client IS selected: Show Stats, Form, and Ledger */}
      {selectedClient ? (
        <>
          {/* KPI Stats Cards for Selected Client */}
          <section className="stats">
            <div className="stat">
              <small>মোট বিল (+)</small>
              <b>৳ {fmt(totalBill)}</b>
            </div>
            <div className="stat">
              <small>মোট পেমেন্ট (−)</small>
              <b className="neg">৳ {fmt(totalPaid)}</b>
            </div>
            <div className="stat bal">
              <small>{selectedClient} - নিট ব্যালেন্স (বাকি)</small>
              <b className={balance >= 0 ? "pos" : "neg"}>৳ {fmt(balance)}</b>
            </div>
          </section>

          {/* Entry Form for Selected Client */}
          <form className="card" onSubmit={submit}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 14,
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              <div className="toggle" style={{ margin: 0 }}>
                <button
                  type="button"
                  id="tab-bill"
                  className={isBill ? "on" : ""}
                  onClick={() => setForm({ ...form, type: "bill" })}
                >
                  <PlusIcon size={14} /> নতুন বিল
                </button>
                <button
                  type="button"
                  id="tab-payment"
                  className={!isBill ? "on" : ""}
                  onClick={() => setForm({ ...form, type: "payment" })}
                >
                  <MinusIcon size={14} /> পেমেন্ট প্রদান
                </button>
              </div>
              <div style={{ fontSize: "0.9rem", color: "var(--muted)", display: "inline-flex", alignItems: "center", gap: 6 }}>
                <UserIcon size={15} /> ডিলার: <b style={{ color: "#fff" }}>{selectedClient}</b>
              </div>
            </div>

            <div className="grid">
              <div>
                <label htmlFor="date">তারিখ</label>
                <input
                  id="date"
                  type="date"
                  value={form.entry_date}
                  onChange={setField("entry_date")}
                  required
                />
              </div>
              <div>
                <label htmlFor="billno">বিল নং</label>
                <input
                  id="billno"
                  placeholder="যেমন: B-101"
                  value={form.bill_no}
                  onChange={setField("bill_no")}
                />
              </div>
              {isBill && (
                <div>
                  <label htmlFor="weight">ওজন (Weight)</label>
                  <input
                    id="weight"
                    type="number"
                    step="any"
                    placeholder="যেমন: ৫০.৫"
                    value={form.weight}
                    onChange={setField("weight")}
                  />
                </div>
              )}
              <div>
                <label htmlFor="amount">
                  {isBill ? "বিলের পরিমাণ (টাকা +)" : "পেমেন্টের পরিমাণ (টাকা −)"}
                </label>
                <input
                  id="amount"
                  type="number"
                  step="any"
                  min="0"
                  placeholder="টাকার পরিমাণ লিখুন"
                  value={form.amount}
                  onChange={setField("amount")}
                  required
                />
              </div>
              {!isBill && (
                <>
                  <div>
                    <label htmlFor="from">কোন ব্যাংক থেকে পাঠানো</label>
                    <input
                      id="from"
                      placeholder="যেমন: Islami Bank"
                      value={form.from_bank}
                      onChange={setField("from_bank")}
                    />
                  </div>
                  <div>
                    <label htmlFor="to">কোন ব্যাংকে যাচ্ছে</label>
                    <input
                      id="to"
                      placeholder="যেমন: City Bank"
                      value={form.to_bank}
                      onChange={setField("to_bank")}
                    />
                  </div>
                </>
              )}
              <div>
                <label htmlFor="note">নোট (ঐচ্ছিক)</label>
                <input
                  id="note"
                  placeholder="নোট বা বিবরণ লিখুন"
                  value={form.note}
                  onChange={setField("note")}
                />
              </div>
            </div>

            {err && <p className="err">{err}</p>}

            <button id="save-btn" className="btn" disabled={busy}>
              {busy ? (
                "সেভ হচ্ছে..."
              ) : isBill ? (
                <>
                  <PlusIcon /> বিল যোগ করুন ({selectedClient})
                </>
              ) : (
                <>
                  <MinusIcon /> পেমেন্ট জমা দিন ({selectedClient})
                </>
              )}
            </button>
          </form>

          {/* Transaction History Ledger Table ONLY for Selected Client */}
          <section className="card">
            <div className="bar">
              <h2 style={{ fontSize: "1.2rem", color: "#fff", display: "inline-flex", alignItems: "center", gap: 8 }}>
                <FileTextIcon size={20} /> {selectedClient} - এর লেনদেন ও ব্যালেন্স হিস্ট্রি
              </h2>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="btn-download-csv"
                  onClick={downloadClientData}
                  title="এই ডিলারের সম্পূর্ণ হিসাব এক্সেলে ডাউনলোড করুন"
                >
                  <DownloadIcon /> Excel / CSV
                </button>
                <button
                  type="button"
                  className="btn-print"
                  onClick={printStatement}
                  title="প্রিন্ট বা PDF হিসেবে সংরক্ষণ করুন"
                >
                  <PrinterIcon /> প্রিন্ট / PDF
                </button>
              </div>
            </div>

            <div className="tablewrap">
              <table>
                <thead>
                  <tr>
                    <th>তারিখ</th>
                    <th>ক্লায়েন্ট</th>
                    <th>ধরন</th>
                    <th>বিল নং</th>
                    <th className="num">ওজন</th>
                    <th>ব্যাংক (থেকে → যাচ্ছে)</th>
                    <th className="num">পরিমাণ</th>
                    <th className="num">রানিং ব্যালেন্স</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {view.map((r) => (
                    <tr key={r.id}>
                      <td>{r.entry_date}</td>
                      <td>
                        <b>{r.client_name}</b>
                      </td>
                      <td>
                        <span className={`tag ${r.type}`}>
                          {r.type === "bill" ? (
                            <>
                              <PlusIcon size={11} /> বিল
                            </>
                          ) : (
                            <>
                              <MinusIcon size={11} /> পেমেন্ট
                            </>
                          )}
                        </span>
                      </td>
                      <td>{r.bill_no || "-"}</td>
                      <td className="num">{r.weight != null ? fmt(r.weight) : "-"}</td>
                      <td>
                        {r.type === "payment" ? (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                            {r.from_bank || "ব্যাংক"} <ArrowRightIcon /> {r.to_bank || "ব্যাংক"}
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className={`num ${r.type === "bill" ? "pos" : "neg"}`}>
                        {r.type === "bill" ? "+" : "−"} {fmt(r.amount)}
                      </td>
                      <td className="num">
                        <b style={{ color: r.balance >= 0 ? "var(--red)" : "var(--green)" }}>
                          ৳ {fmt(r.balance)}
                        </b>
                      </td>
                      <td>
                        <button className="del" title="মুছুন" onClick={() => remove(r.id)}>
                          <TrashIcon />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {loaded && view.length === 0 && (
                <p className="empty">
                  {selectedClient} - এর জন্য এখনো কোনো লেনদেন এন্ট্রি করা হয়নি
                </p>
              )}
            </div>
            {/* Signature Row for Printed Output */}
            <div className="print-signature-row">
              <div className="print-sig-col">
                <div className="print-sig-line" />
                <p>প্রস্তুতকারক (Prepared By)</p>
              </div>
              <div className="print-sig-col" style={{ textAlign: "right" }}>
                <div className="print-sig-line" style={{ marginLeft: "auto" }} />
                <p>অনুমোদিত স্বাক্ষর (Authorized Signature)</p>
                <p style={{ fontWeight: "bold", marginTop: "2px" }}>Chowdhury Engineering Works</p>
              </div>
            </div>
          </section>
        </>
      ) : (
        /* When NO client is selected: Show only guidance prompt with clean icon */
        <div className="card no-client-prompt">
          <div style={{ marginBottom: 12, color: "var(--accent2)" }}>
            <UserIcon size={38} />
          </div>
          <h3>অনুগ্রহ করে প্রথমে উপরে ক্লায়েন্ট / ডিলার নির্বাচন করুন</h3>
          <p style={{ marginBottom: 16 }}>
            ডিলারের বিবরণ, বিল এন্ট্রি এবং লেনদেন হিস্ট্রি দেখার জন্য উপরের সার্চ বক্স থেকে ডিলার সিলেক্ট করুন অথবা &quot;নতুন ডিলার যোগ করুন&quot; বাটনে ক্লিক করুন।
          </p>
          <button
            type="button"
            className="btn"
            style={{ margin: "0 auto", display: "inline-flex", alignItems: "center", gap: 6 }}
            onClick={() => setShowNewClientModal(true)}
          >
            <PlusIcon /> নতুন ক্লায়েন্ট যোগ করুন
          </button>
        </div>
      )}
    </main>
  );
}

