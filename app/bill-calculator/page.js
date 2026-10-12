"use client";
import { useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { generateBillPdf } from "@/lib/billPdf";
import * as XLSX from "xlsx";

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

function PackageIcon({ size = 15 }) {
  return (
    <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="16.5" y1="9.4" x2="7.5" y2="4.21" />
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
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

const ITEM_PRESETS = [
  "Matte Sheet",
  "GP Sheet",
  "MS Sheet",
  "Iron Item",
  "Color Coil",
  "Profile Sheet",
  "Insulation",
  "Screw",
  "Gum Tape",
  "Cork Sheet",
];

const emptyItem = () => ({
  name: "",
  weight: "",
  rate: "",
  subtotal: "",
});

const emptyForm = () => ({
  type: "bill",
  entry_date: today(),
  bill_no: "",
  weight: "",
  amount: "",
  from_bank: "",
  to_bank: "",
  note: "",
  labour_cost: "",
  transport_cost: "",
  items: [emptyItem()],
});

const fmt = (n) => Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 2 });

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
  const entityLabel = isSelectedClient ? "Client" : "Dealer";
  const entityLabelEn = entityLabel;
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
        setErr(d.error || "Failed to load data");
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

  // Transactions filtered ONLY by selected client, sorted latest-first (newest on top)
  const view = useMemo(() => {
    if (!selectedClient) return [];
    let bal = 0;
    // 1. Calculate running balance in chronological order (oldest to newest)
    const computed = rows
      .filter((r) => r.client_name === selectedClient)
      .map((r) => {
        bal += r.type === "bill" ? r.amount : -r.amount;
        return { ...r, balance: bal };
      });
    // 2. Display newest entry on top, oldest at the bottom
    return computed.reverse();
  }, [rows, selectedClient]);

  const totalBill = view.reduce((s, r) => s + (r.type === "bill" ? r.amount : 0), 0);
  const totalPaid = view.reduce((s, r) => s + (r.type === "payment" ? r.amount : 0), 0);
  const balance = totalBill - totalPaid;

  const setField = (k) => (e) => {
    const val = e.target.value;
    if (k === "labour_cost" || k === "transport_cost") {
      const nextLabor = k === "labour_cost" ? val : form.labour_cost;
      const nextTransport = k === "transport_cost" ? val : form.transport_cost;
      
      let itemsTotal = 0;
      let hasItemsTotal = false;
      (form.items || []).forEach((it) => {
        const st = parseFloat(it.subtotal);
        if (!isNaN(st)) {
          itemsTotal += st;
          hasItemsTotal = true;
        }
      });

      const l = parseFloat(nextLabor);
      const t = parseFloat(nextTransport);
      const extraTotal = (isNaN(l) ? 0 : l) + (isNaN(t) ? 0 : t);

      setForm((prev) => ({
        ...prev,
        [k]: val,
        amount: hasItemsTotal || extraTotal > 0 ? String(Math.round((itemsTotal + extraTotal) * 100) / 100) : prev.amount,
      }));
    } else {
      setForm({ ...form, [k]: val });
    }
  };

  // Helper to recompute amount from items + labour + transport
  const recalcAmount = (itemsList, laborVal, transportVal) => {
    let totalAmt = 0;
    let hasAmt = false;
    let totalWt = 0;
    let hasWt = false;

    itemsList.forEach((it) => {
      const st = parseFloat(it.subtotal);
      if (!isNaN(st)) {
        totalAmt += st;
        hasAmt = true;
      }
      const wt = parseFloat(it.weight);
      if (!isNaN(wt)) {
        totalWt += wt;
        hasWt = true;
      }
    });

    const l = parseFloat(laborVal);
    const t = parseFloat(transportVal);
    const extraTotal = (isNaN(l) ? 0 : l) + (isNaN(t) ? 0 : t);

    return {
      amount: hasAmt || extraTotal > 0 ? String(Math.round((totalAmt + extraTotal) * 100) / 100) : "",
      weight: hasWt ? String(Math.round(totalWt * 1000) / 1000) : "",
    };
  };

  // Handle item change with auto sub-total and total amount calculation
  const handleItemChange = (idx, field, val) => {
    const nextItems = (form.items || []).map((it, i) => {
      if (i !== idx) return it;
      const updated = { ...it, [field]: val };
      if (field === "weight" || field === "rate") {
        const w = parseFloat(field === "weight" ? val : it.weight);
        const r = parseFloat(field === "rate" ? val : it.rate);
        if (!isNaN(w) && !isNaN(r)) {
          const calc = Math.round(w * r * 100) / 100;
          updated.subtotal = String(calc);
        }
      }
      return updated;
    });

    const calc = recalcAmount(nextItems, form.labour_cost, form.transport_cost);

    setForm((prev) => ({
      ...prev,
      items: nextItems,
      amount: calc.amount || prev.amount,
      weight: calc.weight || prev.weight,
    }));
  };

  const handleAddItem = () => {
    setForm((prev) => ({
      ...prev,
      items: [...(prev.items || []), emptyItem()],
    }));
  };

  const handleRemoveItem = (idx) => {
    const nextItems = (form.items || []).filter((_, i) => i !== idx);
    const finalItems = nextItems.length === 0 ? [emptyItem()] : nextItems;
    const calc = recalcAmount(finalItems, form.labour_cost, form.transport_cost);

    setForm((prev) => ({
      ...prev,
      items: finalItems,
      amount: calc.amount,
      weight: calc.weight,
    }));
  };

  async function submit(e) {
    e.preventDefault();
    if (!selectedClient.trim()) {
      setErr("Please select a client or dealer first");
      return;
    }
    setBusy(true);
    setErr("");

    // Filter valid items if bill
    const cleanItems =
      form.type === "bill" && Array.isArray(form.items)
        ? form.items
            .map((it) => ({
              name: (it.name || "").trim(),
              weight: it.weight !== "" ? parseFloat(it.weight) || 0 : null,
              rate: it.rate !== "" ? parseFloat(it.rate) || 0 : null,
              subtotal: it.subtotal !== "" ? parseFloat(it.subtotal) || 0 : null,
            }))
            .filter((it) => it.name || it.weight || it.rate || it.subtotal)
        : null;

    const payload = {
      ...form,
      client_name: selectedClient.trim(),
      client_type: getEntityType(selectedClient),
      items: cleanItems && cleanItems.length > 0 ? cleanItems : null,
      labour_cost: form.type === "bill" && form.labour_cost !== "" ? parseFloat(form.labour_cost) || 0 : null,
      transport_cost: form.type === "bill" && form.transport_cost !== "" ? parseFloat(form.transport_cost) || 0 : null,
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
    if (!r.ok) return setErr(d.error || "Failed to save");
    setForm({ ...emptyForm(), type: form.type });
    load();
  }

  async function remove(id) {
    if (!confirm("Are you sure you want to delete this entry?")) return;
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
    const label = type === "client" ? "Client" : "Dealer";
    const clientRows = rows.filter((r) => r.client_name === clientToDelete);
    const count = clientRows.length;
    const msg = count > 0
      ? `Delete "${clientToDelete}" (${label}) and all ${count} transactions?\nThis action cannot be undone.`
      : `Remove "${clientToDelete}" (${label}) from the list?`;

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
      alert(`Failed to delete ${label}: ` + e.message);
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
        '"Item / Description"',
        '"Weight (KG)"',
        '"Rate (BDT)"',
        '"Sub-Total (BDT)"',
        '"Bill Total (BDT)"',
        '"From Bank / Account"',
        '"To Bank / Account"',
        '"Paid Amount (BDT)"',
        '"Running Balance (BDT)"',
        '"Note"'
      ]
    ];

    let slCounter = 1;

    view.forEach((r) => {
      const hasItems = r.type === "bill" && Array.isArray(r.items) && r.items.length > 0;

      if (hasItems) {
        // Output each item as its own separate row
        r.items.forEach((it) => {
          csvRows.push([
            slCounter++,
            `"${r.entry_date || ""}"`,
            `"${r.type === "bill" ? "Bill (Item)" : "Payment"}"`,
            `"${r.bill_no || "-"}"`,
            `"${(it.name || "Item").replace(/"/g, '""')}"`,
            it.weight != null && it.weight !== "" ? Number(it.weight).toFixed(2) : `"-"`,
            it.rate != null && it.rate !== "" ? Number(it.rate).toFixed(2) : `"-"`,
            it.subtotal != null && it.subtotal !== "" ? fmtNum(it.subtotal) : `"-"`,
            `"-"`,
            `"${r.from_bank || "-"}"`,
            `"${r.to_bank || "-"}"`,
            `"-"`,
            `"-"`,
            `"${(r.note || "").replace(/"/g, '""')}"`
          ]);
        });

        // Optional Labour Charge row
        if (r.labour_cost > 0) {
          csvRows.push([
            slCounter++,
            `"${r.entry_date || ""}"`,
            `"Labour Charge"`,
            `"${r.bill_no || "-"}"`,
            `"Labour / Handling Charge"`,
            `"-"`,
            `"-"`,
            fmtNum(r.labour_cost),
            `"-"`,
            `"${r.from_bank || "-"}"`,
            `"${r.to_bank || "-"}"`,
            `"-"`,
            `"-"`,
            `"${(r.note || "").replace(/"/g, '""')}"`
          ]);
        }

        // Optional Transport Cost row
        if (r.transport_cost > 0) {
          csvRows.push([
            slCounter++,
            `"${r.entry_date || ""}"`,
            `"Transport Cost"`,
            `"${r.bill_no || "-"}"`,
            `"Transport / Freight Cost"`,
            `"-"`,
            `"-"`,
            fmtNum(r.transport_cost),
            `"-"`,
            `"${r.from_bank || "-"}"`,
            `"${r.to_bank || "-"}"`,
            `"-"`,
            `"-"`,
            `"${(r.note || "").replace(/"/g, '""')}"`
          ]);
        }

        // Summary row for the completed bill
        csvRows.push([
          slCounter++,
          `"${r.entry_date || ""}"`,
          `"Bill Total"`,
          `"${r.bill_no || "-"}"`,
          `"TOTAL (All Items & Charges)"`,
          r.weight != null ? Number(r.weight).toFixed(2) : `"-"`,
          `"-"`,
          `"-"`,
          fmtNum(r.amount),
          `"${r.from_bank || "-"}"`,
          `"${r.to_bank || "-"}"`,
          `"-"`,
          fmtNum(r.balance),
          `"${(r.note || "").replace(/"/g, '""')}"`
        ]);
      } else {
        // Single row for bills without item breakdown or payment transactions
        csvRows.push([
          slCounter++,
          `"${r.entry_date || ""}"`,
          `"${r.type === "bill" ? "Bill" : "Payment"}"`,
          `"${r.bill_no || "-"}"`,
          `"-"`,
          r.weight != null ? Number(r.weight).toFixed(2) : `"-"`,
          `"-"`,
          `"-"`,
          r.type === "bill" ? fmtNum(r.amount) : `"-"`,
          `"${r.from_bank || "-"}"`,
          `"${r.to_bank || "-"}"`,
          r.type === "payment" ? fmtNum(r.amount) : `"-"`,
          fmtNum(r.balance),
          `"${(r.note || "").replace(/"/g, '""')}"`
        ]);
      }
    });

    csvRows.push([]);
    csvRows.push([
      '""',
      '""',
      '""',
      '""',
      '""',
      '""',
      '""',
      '"TOTAL SUMMARY:"',
      fmtNum(totalBill),
      '""',
      '""',
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

  // Download all dealers & clients with separate worksheets per dealer in a single Excel file
  function downloadAllDealersData() {
    if (clients.length === 0) {
      alert("No dealers or clients available to export.");
      return;
    }

    const fmtNum = (n) => Number(n || 0).toFixed(2);
    const wb = XLSX.utils.book_new();
    const usedSheetNames = new Set();

    clients.forEach((cName) => {
      const type = getEntityType(cName);
      const label = type === "client" ? "Client" : "Dealer";
      const upperLabel = type === "client" ? "CLIENT" : "DEALER";

      // Calculate running balance and totals for this specific client/dealer
      let runningBal = 0;
      const clientRows = rows
        .filter((r) => r.client_name === cName)
        .map((r) => {
          runningBal += r.type === "bill" ? r.amount : -r.amount;
          return { ...r, balance: runningBal };
        })
        .reverse();

      const cTotalBill = clientRows.reduce((s, r) => s + (r.type === "bill" ? r.amount : 0), 0);
      const cTotalPaid = clientRows.reduce((s, r) => s + (r.type === "payment" ? r.amount : 0), 0);
      const cBalance = cTotalBill - cTotalPaid;

      const wsData = [
        ["CHOWDHURY ENGINEERING WORKS"],
        [`${upperLabel} ACCOUNT STATEMENT`],
        [],
        [`${label}:`, cName, "", "Statement Date:", today()],
        [
          "Total Bill (BDT):",
          fmtNum(cTotalBill),
          "",
          "Total Paid (BDT):",
          fmtNum(cTotalPaid),
          "",
          "Net Due Balance (BDT):",
          fmtNum(cBalance),
        ],
        [],
        [
          "SL",
          "Date",
          "Type",
          "Bill No",
          "Item / Description",
          "Weight (KG)",
          "Rate (BDT)",
          "Sub-Total (BDT)",
          "Bill Total (BDT)",
          "From Bank / Account",
          "To Bank / Account",
          "Paid Amount (BDT)",
          "Running Balance (BDT)",
          "Note",
        ],
      ];

      let sl = 1;
      clientRows.forEach((r) => {
        const hasItems = r.type === "bill" && Array.isArray(r.items) && r.items.length > 0;
        if (hasItems) {
          r.items.forEach((it) => {
            wsData.push([
              sl++,
              r.entry_date || "",
              "Bill (Item)",
              r.bill_no || "-",
              it.name || "Item",
              it.weight != null && it.weight !== "" ? Number(it.weight).toFixed(2) : "-",
              it.rate != null && it.rate !== "" ? Number(it.rate).toFixed(2) : "-",
              it.subtotal != null && it.subtotal !== "" ? fmtNum(it.subtotal) : "-",
              "-",
              r.from_bank || "-",
              r.to_bank || "-",
              "-",
              "-",
              r.note || "",
            ]);
          });

          if (r.labour_cost > 0) {
            wsData.push([
              sl++,
              r.entry_date || "",
              "Labour Charge",
              r.bill_no || "-",
              "Labour / Handling Charge",
              "-",
              "-",
              fmtNum(r.labour_cost),
              "-",
              r.from_bank || "-",
              r.to_bank || "-",
              "-",
              "-",
              r.note || "",
            ]);
          }

          if (r.transport_cost > 0) {
            wsData.push([
              sl++,
              r.entry_date || "",
              "Transport Cost",
              r.bill_no || "-",
              "Transport / Freight Cost",
              "-",
              "-",
              fmtNum(r.transport_cost),
              "-",
              r.from_bank || "-",
              r.to_bank || "-",
              "-",
              "-",
              r.note || "",
            ]);
          }

          wsData.push([
            sl++,
            r.entry_date || "",
            "Bill Total",
            r.bill_no || "-",
            "TOTAL (All Items & Charges)",
            r.weight != null ? Number(r.weight).toFixed(2) : "-",
            "-",
            "-",
            fmtNum(r.amount),
            r.from_bank || "-",
            r.to_bank || "-",
            "-",
            fmtNum(r.balance),
            r.note || "",
          ]);
        } else {
          wsData.push([
            sl++,
            r.entry_date || "",
            r.type === "bill" ? "Bill" : "Payment",
            r.bill_no || "-",
            "-",
            r.weight != null ? Number(r.weight).toFixed(2) : "-",
            "-",
            "-",
            r.type === "bill" ? fmtNum(r.amount) : "-",
            r.from_bank || "-",
            r.to_bank || "-",
            r.type === "payment" ? fmtNum(r.amount) : "-",
            fmtNum(r.balance),
            r.note || "",
          ]);
        }
      });

      wsData.push([]);
      wsData.push([
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "TOTAL SUMMARY:",
        fmtNum(cTotalBill),
        "",
        "",
        fmtNum(cTotalPaid),
        fmtNum(cBalance),
        "",
      ]);

      const ws = XLSX.utils.aoa_to_sheet(wsData);

      // Sanitize sheet name: Excel sheet names cannot exceed 31 chars or contain : \ / ? * [ ]
      let cleanSheetName = (cName || "Dealer")
        .replace(/[:\\/?*\[\]]/g, "_")
        .trim()
        .slice(0, 30);
      if (!cleanSheetName) cleanSheetName = "Sheet";
      let uniqueName = cleanSheetName;
      let counter = 1;
      while (usedSheetNames.has(uniqueName)) {
        uniqueName = `${cleanSheetName.slice(0, 26)}_${counter++}`;
      }
      usedSheetNames.add(uniqueName);

      XLSX.utils.book_append_sheet(wb, ws, uniqueName);
    });

    XLSX.writeFile(wb, `All_Dealers_Clients_Ledger_${today()}.xlsx`);
  }

  const [pdfBusy, setPdfBusy] = useState(false);

  async function downloadPdf() {
    if (!selectedClient) return;
    if (view.length === 0) {
      alert(`No transaction data available for this ${entityLabel}.`);
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
      alert("Failed to generate PDF: " + e.message);
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
              <p style={{ margin: "2px 0", color: "#475569" }}>{entityLabel} Account & Billing Statement</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ margin: "2px 0" }}><strong>Date:</strong> {today()}</p>
              <p style={{ margin: "2px 0", color: "#475569" }}>
                <strong>Ref:</strong> CEW-{(selectedClient || "NAME").toUpperCase().replace(/[^A-Z0-9]/g, "-").replace(/-+/g, "-")}-{today()}
              </p>
            </div>
          </div>
        )}
        <div style={{ textAlign: "center", marginBottom: "14px" }}>
          <span style={{ fontSize: "13pt", fontWeight: "bold", borderBottom: "1.5px solid #000", paddingBottom: "2px", letterSpacing: "0.5px" }}>
            {entityLabelUpper} ACCOUNT STATEMENT
          </span>
        </div>
      </div>

      {/* Header */}
      <header className="top">
        <div className="header-brand">
          <div className="header-logo-box">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/cew-icon.png" alt="CEW Logo" />
          </div>
          <div>
            <h1 className="header-title">Bill Calculator</h1>
            <p className="sub">Chowdhury Engineering Works • Dealer & Client Ledger</p>
          </div>
        </div>
        <div className="header-actions">
          <a href="/" className="header-btn" title="Back to Quotation Generator">
            <span style={{ fontSize: "0.85rem", lineHeight: 1 }}>←</span> Quotation Generator
          </a>
          <button id="logout-btn" className="header-btn" onClick={logout} title="Log Out">
            <LogoutIcon size={13} /> Log Out
          </button>
        </div>
      </header>

      {/* TOP SECTION: Client / Dealer Selection Dropdown with Autocomplete & Add Option */}
      <section className="client-hero" ref={dropdownRef}>
        <div className="client-hero-header">
          <div className="client-hero-title">
            <UserIcon size={16} /> Select Client / Dealer
            {clients.length > 0 && (
              <span className="client-count-pill" title={`Total Registered: ${clients.length}`}>
                {clients.length}
              </span>
            )}
          </div>
          <button
            type="button"
            className="btn-new-client"
            onClick={() => {
              setNewClientType("dealer");
              setShowNewClientModal(true);
            }}
            title="Add New Client / Dealer"
          >
            <PlusIcon size={12} /> Add
          </button>
        </div>

        <div className="client-search-wrap">
          <div className="client-input-box">
            <input
              id="client-search-input"
              className="client-input"
              type="text"
              placeholder="Search or type client/dealer name..."
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
                title="Clear"
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
                        {cType === "client" ? (
                          <span style={{ color: "#4f46e5", display: "inline-flex" }} title="Client">
                            <UserIcon size={15} />
                          </span>
                        ) : (
                          <span style={{ color: "#d97706", display: "inline-flex" }} title="Dealer">
                            <BuildingIcon size={15} />
                          </span>
                        )}
                        <span className="dropdown-item-name">{client}</span>
                      </span>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        {isCur ? (
                          <span className="badge" style={{ color: "var(--accent)", display: "inline-flex", alignItems: "center", gap: 4 }}>
                            <CheckIcon size={11} /> Selected
                          </span>
                        ) : (
                          <span className="badge">Select</span>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{ padding: "10px 14px", color: "var(--muted)", fontSize: "0.9rem" }}>
                  No dealer or client found with this name
                </div>
              )}

              {/* Quick option to create brand new dealer or client directly from typing */}
              {clientSearch.trim() && !clients.includes(clientSearch.trim()) && (
                <div style={{ display: "flex", gap: 6, padding: "8px 10px", borderTop: "1px solid var(--border)", background: "var(--card-sub)", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="btn ghost"
                    style={{ flex: 1, fontSize: "0.82rem", padding: "7px 10px", borderColor: "var(--amber)", color: "var(--amber)", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                    onClick={() => handleAddNewClient(clientSearch.trim(), "dealer")}
                  >
                    <BuildingIcon size={14} /> Add as Dealer: &quot;<b>{clientSearch.trim()}</b>&quot;
                  </button>
                  <button
                    type="button"
                    className="btn ghost"
                    style={{ flex: 1, fontSize: "0.82rem", padding: "7px 10px", borderColor: "var(--accent)", color: "var(--accent)", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                    onClick={() => handleAddNewClient(clientSearch.trim(), "client")}
                  >
                    <UserIcon size={14} /> Add as Client: &quot;<b>{clientSearch.trim()}</b>&quot;
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Selected client active banner */}
        {selectedClient ? (
          <div className="active-client-banner">
            <div style={{ display: "inline-flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
              {isSelectedClient ? <UserIcon size={16} /> : <BuildingIcon size={16} />}
              <span style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
                Active {entityLabel}:
              </span>{" "}
              <b style={{ color: "#1e293b", fontSize: "0.85rem", fontWeight: 700 }}>
                {selectedClient}
              </b>
            </div>
            <div className="active-client-banner-actions">
              <button
                type="button"
                className="btn-del-client"
                onClick={() => handleDeleteClient(selectedClient)}
                title={`Delete this ${entityLabel} and all transactions`}
              >
                <TrashIcon size={13} /> Delete {entityLabel}
              </button>
              <button
                type="button"
                className="btn-clear-filter"
                onClick={handleClearClient}
                title="Clear selected filter"
              >
                Clear Filter
              </button>
            </div>
          </div>
        ) : null}
      </section>

      {/* Modal for adding new client/dealer explicitly with type selector */}
      {showNewClientModal && (
        <div className="modal-overlay" onClick={() => setShowNewClientModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ display: "flex", alignItems: "center", gap: 7, fontSize: "1.1rem" }}>
              <PlusIcon size={16} /> Add New {newClientType === "client" ? "Client" : "Dealer"}
            </h3>
            <p style={{ color: "var(--muted)", fontSize: "0.8rem", marginBottom: 14 }}>
              Select entity type and enter name.
            </p>

            {/* Entity Type Selection Toggle */}
            <div className="entity-type-group">
              <div
                className={`entity-type-option ${newClientType === "dealer" ? "active-dealer" : ""}`}
                onClick={() => setNewClientType("dealer")}
              >
                <BuildingIcon size={15} /> Dealer
              </div>
              <div
                className={`entity-type-option ${newClientType === "client" ? "active-client" : ""}`}
                onClick={() => setNewClientType("client")}
              >
                <UserIcon size={15} /> Client
              </div>
            </div>

            <label htmlFor="new-client-name" style={{ fontSize: "0.75rem" }}>
              {newClientType === "client" ? "Client Name" : "Dealer Name"}
            </label>
            <input
              id="new-client-name"
              type="text"
              placeholder={newClientType === "client" ? "e.g. Alam Brothers / Mr. Karim" : "e.g. Rahim Enterprise"}
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
                Cancel
              </button>
              <button
                type="button"
                className="btn"
                style={{ marginTop: 0 }}
                onClick={() => handleAddNewClient()}
                disabled={!newClientInput.trim()}
              >
                <CheckIcon size={13} /> Save
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
            <div className="stat bal">
              <small>{selectedClient} - Net Balance ({entityLabel} Due)</small>
              <b className={balance >= 0 ? "pos" : "neg"}>৳ {fmt(balance)}</b>
            </div>
            <div className="stat">
              <small>Total Bill (+)</small>
              <b>৳ {fmt(totalBill)}</b>
            </div>
            <div className="stat">
              <small>Total Payment (−)</small>
              <b className="neg">৳ {fmt(totalPaid)}</b>
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
                  <PlusIcon size={14} /> Add Bill
                </button>
                <button
                  type="button"
                  id="tab-payment"
                  className={!isBill ? "on" : ""}
                  onClick={() => setForm({ ...form, type: "payment" })}
                >
                  <MinusIcon size={14} /> Record Payment
                </button>
              </div>
              <div style={{ fontSize: "0.9rem", color: "var(--muted)", display: "inline-flex", alignItems: "center", gap: 6 }}>
                {isSelectedClient ? <UserIcon size={15} /> : <BuildingIcon size={15} />}
                {entityLabel}: <b style={{ color: "var(--fg)" }}>{selectedClient}</b>
              </div>
            </div>

            {/* If Bill: Dynamic Multi-Item Section */}
            {isBill && (
              <div className="bill-items-card">
                <div className="bill-items-header">
                  <div className="bill-items-title">
                    <PackageIcon size={16} /> Bill Items Breakdown
                  </div>
                  <button
                    type="button"
                    className="btn-add-item"
                    onClick={handleAddItem}
                    title="Add another item"
                  >
                    <PlusIcon size={13} /> Add Item
                  </button>
                </div>

                <div className="bill-items-list">
                  {(form.items || []).map((item, idx) => (
                    <div key={idx} className="bill-item-row">
                      <div className="item-field item-name-field">
                        <label className="item-label">Item / Description</label>
                        <input
                          type="text"
                          className="item-input"
                          placeholder="Select or type item name..."
                          list="item-presets-list"
                          value={item.name}
                          onChange={(e) => handleItemChange(idx, "name", e.target.value)}
                        />
                      </div>

                      <div className="item-field item-weight-field">
                        <label className="item-label">Weight (kg)</label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          className="item-input"
                          placeholder="e.g. 25"
                          value={item.weight}
                          onChange={(e) => handleItemChange(idx, "weight", e.target.value)}
                        />
                      </div>

                      <div className="item-field item-rate-field">
                        <label className="item-label">Rate (BDT)</label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          className="item-input"
                          placeholder="e.g. 120"
                          value={item.rate}
                          onChange={(e) => handleItemChange(idx, "rate", e.target.value)}
                        />
                      </div>

                      <div className="item-field item-subtotal-field">
                        <label className="item-label" style={{ whiteSpace: "nowrap" }}>
                          Sub-Total (BDT)
                        </label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          className="item-input subtotal-input"
                          placeholder="0.00"
                          value={item.subtotal}
                          onChange={(e) => handleItemChange(idx, "subtotal", e.target.value)}
                        />
                      </div>

                      {(form.items || []).length > 1 && (
                        <button
                          type="button"
                          className="btn-del-item"
                          onClick={() => handleRemoveItem(idx)}
                          title="Remove item"
                        >
                          <TrashIcon size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Additional Charges: Labour & Transport */}
                <div className="bill-extra-charges-row">
                  <div className="extra-charge-field">
                    <label className="item-label">Labour Charge (BDT)</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      className="item-input"
                      placeholder="e.g. 500"
                      value={form.labour_cost}
                      onChange={setField("labour_cost")}
                    />
                  </div>

                  <div className="extra-charge-field">
                    <label className="item-label">Transport Cost (BDT)</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      className="item-input"
                      placeholder="e.g. 1200"
                      value={form.transport_cost}
                      onChange={setField("transport_cost")}
                    />
                  </div>
                </div>

                {/* Datalist for preset item descriptions with custom typing support */}
                <datalist id="item-presets-list">
                  {ITEM_PRESETS.map((p) => (
                    <option key={p} value={p} />
                  ))}
                </datalist>
              </div>
            )}

            <div className="grid">
              <div>
                <label htmlFor="date">Date</label>
                <input
                  id="date"
                  type="date"
                  value={form.entry_date}
                  onChange={setField("entry_date")}
                  required
                />
              </div>
              <div>
                <label htmlFor="billno">Bill No.</label>
                <input
                  id="billno"
                  placeholder="e.g. B-101"
                  value={form.bill_no}
                  onChange={setField("bill_no")}
                />
              </div>
              {isBill && (
                <div>
                  <label htmlFor="weight">Total Weight (kg)</label>
                  <input
                    id="weight"
                    type="number"
                    step="any"
                    placeholder="e.g. 50.5"
                    value={form.weight}
                    onChange={setField("weight")}
                  />
                </div>
              )}
              <div>
                <label htmlFor="amount">
                  {isBill ? "Bill Amount (BDT +)" : "Payment Amount (BDT −)"}
                </label>
                <input
                  id="amount"
                  type="number"
                  step="any"
                  min="0"
                  placeholder="Enter amount"
                  value={form.amount}
                  onChange={setField("amount")}
                  required
                />
              </div>
              {!isBill && (
                <>
                  <div>
                    <label htmlFor="from">From Bank / Method</label>
                    <input
                      id="from"
                      placeholder="e.g. Islami Bank"
                      value={form.from_bank}
                      onChange={setField("from_bank")}
                    />
                  </div>
                  <div>
                    <label htmlFor="to">To Bank / Account</label>
                    <input
                      id="to"
                      placeholder="e.g. City Bank"
                      value={form.to_bank}
                      onChange={setField("to_bank")}
                    />
                  </div>
                </>
              )}
              <div>
                <label htmlFor="note">Note (Optional)</label>
                <input
                  id="note"
                  placeholder="Enter note or details"
                  value={form.note}
                  onChange={setField("note")}
                />
              </div>
            </div>

            {err && <p className="err">{err}</p>}

            <button id="save-btn" className="btn" disabled={busy}>
              {busy ? (
                "Saving..."
              ) : isBill ? (
                <>
                  <PlusIcon /> Add Bill ({selectedClient} - {entityLabel})
                </>
              ) : (
                <>
                  <MinusIcon /> Record Payment ({selectedClient} - {entityLabel})
                </>
              )}
            </button>
          </form>

          {/* Transaction History Ledger Table ONLY for Selected Client */}
          <section className="card">
            <div className="bar">
              <h2 className="table-heading-title">
                <FileTextIcon size={18} /> {selectedClient} ({entityLabel}) - Transaction & Balance Ledger
              </h2>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="btn-download-pdf"
                  onClick={downloadPdf}
                  disabled={pdfBusy}
                  title="Download official PDF statement"
                >
                  <FileTextIcon /> Download PDF
                </button>
                <button
                  type="button"
                  className="btn-download-csv"
                  onClick={downloadClientData}
                  title={`Export all transaction data for ${selectedClient} to Excel / CSV`}
                >
                  <DownloadIcon /> Excel
                </button>
              </div>
            </div>

            <div className="tablewrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Bill No. & Items</th>
                    <th className="num">Weight (kg)</th>
                    <th>Payment Method / Bank</th>
                    <th className="num">Amount (BDT)</th>
                    <th className="num">Running Balance</th>
                    <th className="action-col"></th>
                  </tr>
                </thead>
                <tbody>
                  {view.map((r) => (
                    <tr key={r.id}>
                      <td style={{ whiteSpace: "nowrap" }}>{r.entry_date}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{r.bill_no ? `Bill #${r.bill_no}` : "-"}</div>
                        {((Array.isArray(r.items) && r.items.length > 0) || r.labour_cost > 0 || r.transport_cost > 0) && (
                          <div className="table-item-pills">
                            {Array.isArray(r.items) &&
                              r.items.map((it, i) => (
                                <span key={i} className="item-pill" title={`${it.name || "Item"}: ${it.weight ? it.weight + "kg" : ""} ${it.rate ? "@ " + it.rate : ""} = ৳${it.subtotal || ""}`}>
                                  {it.name || "Item"}{it.subtotal ? `: ৳${fmt(it.subtotal)}` : ""}
                                </span>
                              ))}
                            {r.labour_cost > 0 && (
                              <span className="item-pill charge-pill" title="Labour Charge">
                                Labour: ৳{fmt(r.labour_cost)}
                              </span>
                            )}
                            {r.transport_cost > 0 && (
                              <span className="item-pill charge-pill" title="Transport Cost">
                                Transport: ৳{fmt(r.transport_cost)}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="num">{r.weight != null ? fmt(r.weight) : "-"}</td>
                      <td>
                        {r.type === "payment" ? (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                            {r.from_bank || "Bank"} <ArrowRightIcon /> {r.to_bank || "Bank"}
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className={`num ${r.type === "bill" ? "pos" : "neg"}`}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, justifyContent: "flex-end" }}>
                          <span style={{ fontSize: "0.74rem", opacity: 0.85, fontWeight: 500 }}>
                            {r.type === "bill" ? "(Bill)" : "(Paid)"}
                          </span>
                          <b>{r.type === "bill" ? "+" : "−"} {fmt(r.amount)}</b>
                        </span>
                      </td>
                      <td className="num">
                        <b style={{ color: r.balance >= 0 ? "var(--red)" : "var(--green)" }}>
                          ৳ {fmt(r.balance)}
                        </b>
                      </td>
                      <td className="action-col">
                        <button className="del" title="Delete" onClick={() => remove(r.id)}>
                          <TrashIcon />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {loaded && view.length === 0 && (
                <p className="empty">
                  No transactions recorded yet for {selectedClient} ({entityLabel})
                </p>
              )}
            </div>
          </section>
        </>
      ) : (
        /* When NO client is selected: Show only guidance prompt with clean icon */
        <div className="card no-client-prompt">
          <div style={{ marginBottom: 12, color: "var(--accent)" }}>
            <UserIcon size={38} />
          </div>
          <h3>Please Select a Client or Dealer Above</h3>
          <p style={{ marginBottom: 16 }}>
            Select a dealer or client from the search box above to view details, add bills/payments, and see full transaction history, or click &quot;Add New Client / Dealer&quot;.
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", alignItems: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn"
              style={{ margin: 0, display: "inline-flex", alignItems: "center", gap: 6 }}
              onClick={() => {
                setNewClientType("dealer");
                setShowNewClientModal(true);
              }}
            >
              <PlusIcon /> Add New Client / Dealer
            </button>
            <button
              type="button"
              className="btn-download-all-excel"
              onClick={downloadAllDealersData}
              title="Download full multi-sheet Excel file with all dealers and clients"
            >
              <DownloadIcon size={15} /> Download All Excel
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

