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

function BuildingIcon({ size = 16 }) {
  return (
    <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
      <path d="M9 22v-4h6v4" />
      <path d="M8 6h.01" />
      <path d="M16 6h.01" />
      <path d="M12 6h.01" />
      <path d="M12 10h.01" />
      <path d="M12 14h.01" />
      <path d="M16 10h.01" />
      <path d="M16 14h.01" />
      <path d="M8 10h.01" />
      <path d="M8 14h.01" />
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
  const [clientTypes, setClientTypes] = useState({}); // { [name]: "dealer" | "client" }
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [newClientInput, setNewClientInput] = useState("");
  const [newClientType, setNewClientType] = useState("dealer"); // "dealer" | "client"
  const dropdownRef = useRef(null);

  // Helper for determining whether an entity is client or dealer
  const getEntityType = (name) => clientTypes[name] || "dealer";
  const isSelectedClient = getEntityType(selectedClient) === "client";
  const entityLabel = isSelectedClient ? "ক্লায়েন্ট" : "ডিলার";
  const entityLabelEn = isSelectedClient ? "Client" : "Dealer";
  const entityLabelUpper = isSelectedClient ? "CLIENT" : "DEALER";

  // Load entries from server and sync clients/types
  async function load() {
    try {
      const [rEntries, rClients] = await Promise.all([
        fetch("/api/entries"),
        fetch("/api/clients").catch(() => null),
      ]);

      if (rEntries.status === 401) {
        router.replace("/bill-calculator/login");
        return;
      }
      const d = await rEntries.json();
      if (!rEntries.ok) {
        setErr(d.error || "ডেটা লোড হয়নি");
      } else {
        setRows(d);
        setErr("");
      }

      if (rClients && rClients.ok) {
        const clientList = await rClients.json();
        const typeMap = {};
        const extraNames = [];
        clientList.forEach((c) => {
          if (c.name) {
            typeMap[c.name] = c.type || "dealer";
            extraNames.push(c.name);
          }
        });
        setClientTypes((prev) => ({ ...prev, ...typeMap }));
        setExtraClients((prev) => {
          const combined = Array.from(new Set([...prev, ...extraNames]));
          try {
            localStorage.setItem("bc_extra_clients", JSON.stringify(combined));
          } catch {}
          return combined;
        });
        try {
          localStorage.setItem("bc_client_types", JSON.stringify(typeMap));
        } catch {}
      }
    } catch (e) {
      setErr(e.message);
    }
    setLoaded(true);
  }

  useEffect(() => {
    try {
      const savedTypes = localStorage.getItem("bc_client_types");
      if (savedTypes) setClientTypes(JSON.parse(savedTypes));
    } catch {}
    try {
      const saved = localStorage.getItem("bc_extra_clients");
      if (saved) setExtraClients(JSON.parse(saved));
    } catch {}
    load();
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

  // Add new client via Modal or quick option
  async function handleAddNewClient(name, typeOverride) {
    const trimmed = (name || newClientInput).trim();
    if (!trimmed) return;
    const type = typeOverride || newClientType;

    const nextTypes = { ...clientTypes, [trimmed]: type };
    setClientTypes(nextTypes);
    try {
      localStorage.setItem("bc_client_types", JSON.stringify(nextTypes));
    } catch {}

    if (!clients.includes(trimmed)) {
      const next = [...extraClients, trimmed];
      setExtraClients(next);
      try {
        localStorage.setItem("bc_extra_clients", JSON.stringify(next));
      } catch {}
    }

    try {
      await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed, type }),
      });
    } catch {}

    setSelectedClient(trimmed);
    setClientSearch(trimmed);
    setShowDropdown(false);
    setShowNewClientModal(false);
    setNewClientInput("");
    setNewClientType("dealer");
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
      setErr("অনুগ্রহ করে প্রথমে একজন ক্লায়েন্ট বা ডিলার নির্বাচন করুন");
      return;
    }
    setBusy(true);
    setErr("");
    const payload = {
      ...form,
      client_name: selectedClient.trim(),
      client_type: getEntityType(selectedClient),
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
    const type = getEntityType(clientToDelete);
    const label = type === "client" ? "ক্লায়েন্ট" : "ডিলার";
    const clientRows = rows.filter((r) => r.client_name === clientToDelete);
    const count = clientRows.length;
    const msg = count > 0
      ? `"${clientToDelete}" ${label} এবং তার ${count}টি লেনদেনের সমস্ত হিসাব মুছে ফেলতে চান?\nএই প্রক্রিয়াটি পরে আর ফেরত আনা যাবে না।`
      : `"${clientToDelete}" ${label}কে তালিকা থেকে মুছে ফেলতে চান?`;

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
      const nextTypes = { ...clientTypes };
      delete nextTypes[clientToDelete];
      setClientTypes(nextTypes);
      try {
        localStorage.setItem("bc_extra_clients", JSON.stringify(nextExtra));
        localStorage.setItem("bc_client_types", JSON.stringify(nextTypes));
      } catch {}

      if (selectedClient === clientToDelete) {
        setSelectedClient("");
        setClientSearch("");
      }

      await load();
    } catch (e) {
      alert(`${label} মুছতে সমস্যা হয়েছে: ` + e.message);
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

  // Download selected client data as cleanly structured English Excel / CSV file
  function downloadClientData() {
    if (!selectedClient) return;
    if (view.length === 0) {
      alert(`No transaction data available for this ${entityLabelEn.toLowerCase()}.`);
      return;
    }

    const fmtNum = (n) => Number(n || 0).toFixed(2);

    const csvRows = [
      ['"CHOWDHURY ENGINEERING WORKS"'],
      [`"${entityLabelUpper} ACCOUNT STATEMENT"`],
      [],
      [`"${entityLabelEn}:"`, `"${selectedClient}"`, '""', '"Statement Date:"', `"${today()}"`],
      ['"Total Bill (BDT):"', fmtNum(totalBill), '""', '"Total Paid (BDT):"', fmtNum(totalPaid), '""', '"Net Due Balance (BDT):"', fmtNum(balance)],
      [],
      [
        '"SL"',
        '"Date"',
        '"Type"',
        '"Bill No"',
        '"Weight (KG)"',
        '"From Bank / Account"',
        '"To Bank / Account"',
        '"Bill Amount (BDT)"',
        '"Paid Amount (BDT)"',
        '"Running Balance (BDT)"',
        '"Note"'
      ]
    ];

    view.forEach((r, idx) => {
      csvRows.push([
        idx + 1,
        `"${r.entry_date || ""}"`,
        `"${r.type === "bill" ? "Bill" : "Payment"}"`,
        `"${r.bill_no || "-"}"`,
        r.weight != null ? Number(r.weight).toFixed(2) : `"-"`,
        `"${r.from_bank || "-"}"`,
        `"${r.to_bank || "-"}"`,
        r.type === "bill" ? fmtNum(r.amount) : "0.00",
        r.type === "payment" ? fmtNum(r.amount) : "0.00",
        fmtNum(r.balance),
        `"${(r.note || "").replace(/"/g, '""')}"`
      ]);
    });

    csvRows.push([]);
    csvRows.push([
      '""',
      '""',
      '""',
      '""',
      '""',
      '""',
      '"TOTAL SUMMARY:"',
      fmtNum(totalBill),
      fmtNum(totalPaid),
      fmtNum(balance),
      '""'
    ]);

    const csvContent = "\uFEFF" + csvRows.map((e) => e.join(",")).join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const safeClientName = selectedClient.trim().replace(/[^a-zA-Z0-9_\u0980-\u09FF]/g, "_");
    link.setAttribute("download", `${safeClientName}_${entityLabelEn}_Statement_${today()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const [pdfBusy, setPdfBusy] = useState(false);

  async function downloadPdf() {
    if (!selectedClient) return;
    if (view.length === 0) {
      alert(`এই ${entityLabel}-এর কোনো লেনদেন ডেটা নেই`);
      return;
    }
    setPdfBusy(true);
    try {
      await generateBillPdf({
        clientName: selectedClient,
        clientType: getEntityType(selectedClient),
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
              <p style={{ margin: "2px 0" }}><strong>{entityLabel}:</strong> {selectedClient}</p>
              <p style={{ margin: "2px 0", color: "#475569" }}>{entityLabel} লেনদেন ও বিল হিসাব স্টেটমেন্ট</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ margin: "2px 0" }}><strong>তারিখ:</strong> {today()}</p>
              <p style={{ margin: "2px 0", color: "#475569" }}><strong>রেফারেন্স:</strong> CEW-STMT-{today().replace(/-/g, "")}</p>
            </div>
          </div>
        )}
        <div style={{ textAlign: "center", marginBottom: "14px" }}>
          <span style={{ fontSize: "13pt", fontWeight: "bold", borderBottom: "1.5px solid #000", paddingBottom: "2px", letterSpacing: "0.5px" }}>
            {entityLabelUpper} ACCOUNT STATEMENT / {entityLabel} হিসাব বিবরণী
          </span>
        </div>
      </div>

      {/* Header */}
      <header className="top">
        <div>
          <h1>বিল ক্যালকুলেটর</h1>
          <p className="sub">CEW ডিলার ও ক্লায়েন্টদের বিল, পেমেন্ট ও ব্যালেন্স হিসাব</p>
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

      {/* TOP SECTION: Client / Dealer Selection Dropdown with Autocomplete & Add Option */}
      <section className="client-hero" ref={dropdownRef}>
        <div className="client-hero-header">
          <div className="client-hero-title">
            <UserIcon size={20} /> ক্লায়েন্ট / ডিলার নির্বাচন করুন
            <span>প্রথমে নির্বাচন আবশ্যক</span>
          </div>
          <div className="client-top-actions">
            {clients.length > 0 && (
              <small style={{ color: "var(--muted)", marginRight: 8 }}>
                মোট তালিকাভুক্ত: <b>{clients.length}</b> জন
              </small>
            )}
            <button
              type="button"
              className="btn-new-client"
              onClick={() => {
                setNewClientType("dealer");
                setShowNewClientModal(true);
              }}
            >
              <PlusIcon /> নতুন ডিলার / ক্লায়েন্ট যোগ করুন
            </button>
          </div>
        </div>

        <div className="client-search-wrap">
          <div className="client-input-box">
            <input
              id="client-search-input"
              className="client-input"
              type="text"
              placeholder="ডিলার বা ক্লায়েন্টের নাম লিখুন (১-২ টি অক্ষর লিখলেই সাজেশন আসবে)..."
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
                  const cType = getEntityType(client);
                  return (
                    <div
                      key={client}
                      className={`dropdown-item ${isCur ? "active" : ""}`}
                      onClick={() => handleSelectClient(client)}
                    >
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                        {cType === "client" ? <UserIcon size={16} /> : <BuildingIcon size={16} />}
                        <b>{client}</b>
                        <span className={`entity-tag ${cType}`}>
                          {cType === "client" ? "ক্লায়েন্ট" : "ডিলার"}
                        </span>
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
                          title={`"${client}" ${cType === "client" ? "ক্লায়েন্ট" : "ডিলার"} মুছে ফেলুন`}
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
                  এই নামের কোনো ডিলার বা ক্লায়েন্ট তালিকায় নেই
                </div>
              )}

              {/* Quick option to create brand new dealer or client directly from typing */}
              {clientSearch.trim() && !clients.includes(clientSearch.trim()) && (
                <div style={{ display: "flex", gap: 6, padding: "8px 10px", borderTop: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="btn ghost"
                    style={{ flex: 1, fontSize: "0.82rem", padding: "7px 10px", borderColor: "#f59e0b", color: "#fbbf24", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                    onClick={() => handleAddNewClient(clientSearch.trim(), "dealer")}
                  >
                    <BuildingIcon size={14} /> ডিলার হিসেবে যুক্ত করুন: &quot;<b>{clientSearch.trim()}</b>&quot;
                  </button>
                  <button
                    type="button"
                    className="btn ghost"
                    style={{ flex: 1, fontSize: "0.82rem", padding: "7px 10px", borderColor: "#38bdf8", color: "#38bdf8", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                    onClick={() => handleAddNewClient(clientSearch.trim(), "client")}
                  >
                    <UserIcon size={14} /> ক্লায়েন্ট হিসেবে যুক্ত করুন: &quot;<b>{clientSearch.trim()}</b>&quot;
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Selected client active banner */}
        {selectedClient ? (
          <div className="active-client-banner">
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              {isSelectedClient ? <UserIcon size={18} /> : <BuildingIcon size={18} />}
              <span style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
                বর্তমান নির্বাচিত {entityLabel}:
              </span>{" "}
              <b>{selectedClient}</b>
              <span className={`entity-tag ${getEntityType(selectedClient)}`}>
                {entityLabel}
              </span>
            </div>
            <div className="active-client-banner-actions">
              <button
                type="button"
                className="btn-del-client"
                onClick={() => handleDeleteClient(selectedClient)}
                title={`এই ${entityLabel} ও তার সমস্ত হিসাব মুছে ফেলুন`}
              >
                <TrashIcon size={14} /> {entityLabel} মুছুন
              </button>
              <button
                type="button"
                className="btn ghost"
                style={{ fontSize: "0.82rem", padding: "5px 10px" }}
                onClick={handleClearClient}
              >
                অন্য {entityLabel} নির্বাচন করুন
              </button>
            </div>
          </div>
        ) : (
          /* Quick Click Chips for Existing Clients */
          clients.length > 0 && (
            <div className="client-chips">
              <span className="client-chips-label">দ্রুত নির্বাচন:</span>
              {clients.slice(0, 10).map((c) => {
                const cType = getEntityType(c);
                return (
                  <button
                    key={c}
                    type="button"
                    className="client-chip"
                    onClick={() => handleSelectClient(c)}
                  >
                    {cType === "client" ? <UserIcon size={12} /> : <BuildingIcon size={12} />}
                    <span>{c}</span>
                    <span className={`entity-tag ${cType}`} style={{ fontSize: "0.65rem", padding: "1px 5px" }}>
                      {cType === "client" ? "ক্লায়েন্ট" : "ডিলার"}
                    </span>
                  </button>
                );
              })}
            </div>
          )
        )}
      </section>

      {/* Modal for adding new client/dealer explicitly with type selector */}
      {showNewClientModal && (
        <div className="modal-overlay" onClick={() => setShowNewClientModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <PlusIcon size={18} /> নতুন {newClientType === "client" ? "ক্লায়েন্ট" : "ডিলার"} যোগ করুন
            </h3>
            <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: 16 }}>
              প্রথমে ধরন (ডিলার নাকি ক্লায়েন্ট) নির্বাচন করুন, তারপর নাম লিখুন। নাম যুক্ত হওয়ার সাথে সাথেই আপনি বিল ও পেমেন্ট এন্ট্রি করতে পারবেন।
            </p>

            {/* Entity Type Selection Toggle */}
            <div className="entity-type-group">
              <div
                className={`entity-type-option ${newClientType === "dealer" ? "active-dealer" : ""}`}
                onClick={() => setNewClientType("dealer")}
              >
                <BuildingIcon size={16} /> 🏢 ডিলার (Dealer)
              </div>
              <div
                className={`entity-type-option ${newClientType === "client" ? "active-client" : ""}`}
                onClick={() => setNewClientType("client")}
              >
                <UserIcon size={16} /> 👤 ক্লায়েন্ট (Client)
              </div>
            </div>

            <label htmlFor="new-client-name">
              {newClientType === "client" ? "ক্লায়েন্টের নাম" : "ডিলারের নাম"}
            </label>
            <input
              id="new-client-name"
              type="text"
              placeholder={newClientType === "client" ? "যেমন: মেসার্স আলম ব্রাদার্স / মিস্টার করিম" : "যেমন: মেসার্স রহিম এন্টারপ্রাইজ"}
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
                <CheckIcon /> {newClientType === "client" ? "ক্লায়েন্ট" : "ডিলার"} সংরক্ষণ ও নির্বাচন করুন
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
              <small>{selectedClient} - নিট ব্যালেন্স ({entityLabel}-এর বাকি)</small>
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
                {isSelectedClient ? <UserIcon size={15} /> : <BuildingIcon size={15} />}
                {entityLabel}: <b style={{ color: "#fff" }}>{selectedClient}</b>
                <span className={`entity-tag ${getEntityType(selectedClient)}`}>
                  {entityLabel}
                </span>
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
                  <PlusIcon /> বিল যোগ করুন ({selectedClient} - {entityLabel})
                </>
              ) : (
                <>
                  <MinusIcon /> পেমেন্ট জমা দিন ({selectedClient} - {entityLabel})
                </>
              )}
            </button>
          </form>

          {/* Transaction History Ledger Table ONLY for Selected Client */}
          <section className="card">
            <div className="bar">
              <h2 className="table-heading-title">
                <FileTextIcon size={18} /> {selectedClient} ({entityLabel}) - এর লেনদেন ও ব্যালেন্স হিস্ট্রি
              </h2>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="btn-download-pdf"
                  onClick={downloadPdf}
                  disabled={pdfBusy}
                  title="অফিসিয়াল প্যাড সহ PDF ডাউনলোড করুন"
                >
                  <FileTextIcon /> PDF ডাউনলোড
                </button>
                <button
                  type="button"
                  className="btn-download-csv"
                  onClick={downloadClientData}
                  title={`এই ${entityLabel}-এর সম্পূর্ণ হিসাব এক্সেলে ডাউনলোড করুন`}
                >
                  <DownloadIcon /> Excel
                </button>
              </div>
            </div>

            <div className="tablewrap">
              <table>
                <thead>
                  <tr>
                    <th>তারিখ</th>
                    <th>{entityLabel}</th>
                    <th>ধরন</th>
                    <th>বিল নং</th>
                    <th className="num">ওজন</th>
                    <th>ব্যাংক (থেকে → যাচ্ছে)</th>
                    <th className="num">পরিমাণ</th>
                    <th className="num">রানিং ব্যালেন্স</th>
                    <th className="action-col"></th>
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
                      <td className="action-col">
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
                  {selectedClient} ({entityLabel}) - এর জন্য এখনো কোনো লেনদেন এন্ট্রি করা হয়নি
                </p>
              )}
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
            ডিলার বা ক্লায়েন্টের বিবরণ, বিল এন্ট্রি এবং লেনদেন হিস্ট্রি দেখার জন্য উপরের সার্চ বক্স থেকে নির্বাচন করুন অথবা &quot;নতুন ডিলার / ক্লায়েন্ট যোগ করুন&quot; বাটনে ক্লিক করুন।
          </p>
          <button
            type="button"
            className="btn"
            style={{ margin: "0 auto", display: "inline-flex", alignItems: "center", gap: 6 }}
            onClick={() => {
              setNewClientType("dealer");
              setShowNewClientModal(true);
            }}
          >
            <PlusIcon /> নতুন ডিলার / ক্লায়েন্ট যোগ করুন
          </button>
        </div>
      )}
    </main>
  );
}

