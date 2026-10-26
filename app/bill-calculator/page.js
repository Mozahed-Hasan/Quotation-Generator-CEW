"use client";
import { useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { generateBillPdf } from "@/lib/billPdf";
import * as XLSX from "xlsx";
import { HomeIcon } from "@/lib/icons";
import TopPageNav from "@/lib/TopPageNav";

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

function EditIcon({ size = 14 }) {
  return (
    <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
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
  quantity: "",
  unit: "pcs",
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
  const [newClientType, setNewClientType] = useState("supplier"); // "supplier" | "dealer"
  const [selectedEntryForModal, setSelectedEntryForModal] = useState(null);
  const [isEditingModal, setIsEditingModal] = useState(false);
  const [editModalData, setEditModalData] = useState(null);
  const [modalBusy, setModalBusy] = useState(false);
  const [modalErr, setModalErr] = useState("");
  const dropdownRef = useRef(null);

  // Helper for determining entity type (all entities are treated as supplier)
  const getEntityType = (name) => {
    const t = clientTypes[name];
    if (t === "dealer") return "dealer";
    return "supplier";
  };
  const isSelectedSupplier = getEntityType(selectedClient) !== "dealer";
  const entityLabel = isSelectedSupplier ? "Supplier" : "Dealer";
  const entityLabelEn = entityLabel;
  const entityLabelUpper = isSelectedSupplier ? "SUPPLIER" : "DEALER";

  // Load entries from server and sync clients/types
  async function load() {
    try {
      const [rEntries, rClients] = await Promise.all([
        fetch("/api/entries"),
        fetch("/api/clients").catch(() => null),
      ]);

      if (rEntries.status === 401) {
        router.replace("/");
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
    setNewClientType("supplier");
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
      const wtVal = it.quantity !== undefined && it.quantity !== "" ? it.quantity : it.weight;
      const wt = parseFloat(wtVal);
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
      if (field === "quantity" || field === "weight" || field === "rate") {
        const qVal = field === "quantity" ? val : (updated.quantity !== undefined && updated.quantity !== "" ? updated.quantity : updated.weight);
        const q = parseFloat(qVal);
        const r = parseFloat(field === "rate" ? val : updated.rate);
        if (!isNaN(q) && !isNaN(r)) {
          const calc = Math.round(q * r * 100) / 100;
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
      setErr("Please select a supplier first");
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
      router.replace("/");
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
      router.replace("/");
      return;
    }
    load();
  }

  function openEntryModal(entry) {
    setSelectedEntryForModal(entry);
    setIsEditingModal(false);
    setEditModalData(null);
    setModalErr("");
  }

  function startEditing() {
    if (!selectedEntryForModal) return;
    const b = selectedEntryForModal;
    const hasItems = b.type === "bill" && Array.isArray(b.items) && b.items.length > 0;
    const items = hasItems
      ? b.items.map((it) => ({
          name: it.name || "",
          quantity: it.quantity !== undefined && it.quantity !== "" ? String(it.quantity) : (it.weight != null ? String(it.weight) : ""),
          unit: it.unit || (it.weight ? "kg" : "pcs"),
          weight: it.weight != null ? String(it.weight) : "",
          rate: it.rate != null ? String(it.rate) : "",
          subtotal: it.subtotal != null ? String(it.subtotal) : "",
        }))
      : (b.type === "bill" ? [emptyItem()] : []);

    setEditModalData({
      id: b.id,
      type: b.type,
      client_name: b.client_name,
      entry_date: b.entry_date || today(),
      bill_no: b.bill_no || "",
      weight: b.weight != null ? String(b.weight) : "",
      amount: b.amount != null ? String(b.amount) : "",
      from_bank: b.from_bank || "",
      to_bank: b.to_bank || "",
      note: b.note || "",
      labour_cost: b.labour_cost != null ? String(b.labour_cost) : "",
      transport_cost: b.transport_cost != null ? String(b.transport_cost) : "",
      items,
    });
    setIsEditingModal(true);
    setModalErr("");
  }

  function updateEditItem(index, field, value) {
    setEditModalData((prev) => {
      const nextItems = [...prev.items];
      const current = { ...nextItems[index], [field]: value };
      if (field === "quantity" || field === "weight" || field === "rate") {
        const qVal = field === "quantity" ? value : (current.quantity !== undefined && current.quantity !== "" ? current.quantity : current.weight);
        const q = parseFloat(qVal);
        const r = parseFloat(field === "rate" ? value : current.rate);
        if (!isNaN(q) && !isNaN(r)) {
          current.subtotal = String(Math.round(q * r * 100) / 100);
        }
      }
      nextItems[index] = current;
      const itemsTotal = nextItems.reduce((acc, it) => acc + (parseFloat(it.subtotal) || 0), 0);
      const lab = parseFloat(prev.labour_cost) || 0;
      const tr = parseFloat(prev.transport_cost) || 0;
      return {
        ...prev,
        items: nextItems,
        amount: String(itemsTotal + lab + tr),
      };
    });
  }

  function addEditItem() {
    setEditModalData((prev) => ({
      ...prev,
      items: [...(prev.items || []), emptyItem()],
    }));
  }

  function removeEditItem(index) {
    setEditModalData((prev) => {
      if (prev.items.length <= 1) return prev;
      const nextItems = prev.items.filter((_, i) => i !== index);
      const itemsTotal = nextItems.reduce((acc, it) => acc + (parseFloat(it.subtotal) || 0), 0);
      const lab = parseFloat(prev.labour_cost) || 0;
      const tr = parseFloat(prev.transport_cost) || 0;
      return {
        ...prev,
        items: nextItems,
        amount: String(itemsTotal + lab + tr),
      };
    });
  }

  function updateEditCost(field, value) {
    setEditModalData((prev) => {
      const next = { ...prev, [field]: value };
      const itemsTotal = (next.items || []).reduce((acc, it) => acc + (parseFloat(it.subtotal) || 0), 0);
      const lab = parseFloat(field === "labour_cost" ? value : next.labour_cost) || 0;
      const tr = parseFloat(field === "transport_cost" ? value : next.transport_cost) || 0;
      next.amount = String(itemsTotal + lab + tr);
      return next;
    });
  }

  async function handleSaveEdit() {
    if (!editModalData) return;
    setModalBusy(true);
    setModalErr("");
    const amount = parseFloat(editModalData.amount);
    if (isNaN(amount) || amount <= 0) {
      setModalBusy(false);
      setModalErr("Amount must be greater than 0");
      return;
    }

    const cleanItems =
      editModalData.type === "bill" && Array.isArray(editModalData.items)
        ? editModalData.items
            .map((it) => ({
              name: (it.name || "").trim(),
              weight: it.weight !== "" ? parseFloat(it.weight) || 0 : null,
              rate: it.rate !== "" ? parseFloat(it.rate) || 0 : null,
              subtotal: it.subtotal !== "" ? parseFloat(it.subtotal) || 0 : null,
            }))
            .filter((it) => it.name || it.weight || it.rate || it.subtotal)
        : null;

    const payload = {
      ...editModalData,
      amount,
      weight: editModalData.weight !== "" ? parseFloat(editModalData.weight) || null : null,
      items: cleanItems && cleanItems.length > 0 ? cleanItems : null,
      labour_cost: editModalData.labour_cost !== "" ? parseFloat(editModalData.labour_cost) || null : null,
      transport_cost: editModalData.transport_cost !== "" ? parseFloat(editModalData.transport_cost) || null : null,
    };

    try {
      const res = await fetch(`/api/entries/${editModalData.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.status === 401) {
        router.replace("/");
        return;
      }
      const d = await res.json();
      if (!res.ok) {
        setModalErr(d.error || "Failed to update entry");
        setModalBusy(false);
        return;
      }
      await load();
      setIsEditingModal(false);
      setSelectedEntryForModal(null);
      setEditModalData(null);
    } catch (err) {
      setModalErr(err.message || "Failed to save");
    } finally {
      setModalBusy(false);
    }
  }

  async function handleDeleteFromModal() {
    if (!selectedEntryForModal) return;
    const label = selectedEntryForModal.type === "bill" ? "Bill" : "Payment";
    if (!confirm(`Are you sure you want to delete this ${label}?`)) return;
    setModalBusy(true);
    try {
      const res = await fetch(`/api/entries/${selectedEntryForModal.id}`, { method: "DELETE" });
      if (res.status === 401) {
        router.replace("/");
        return;
      }
      await load();
      setSelectedEntryForModal(null);
      setIsEditingModal(false);
      setEditModalData(null);
    } catch (err) {
      alert("Failed to delete: " + err.message);
    } finally {
      setModalBusy(false);
    }
  }

  async function handleDeleteClient(clientToDelete) {
    if (!clientToDelete) return;
    const type = getEntityType(clientToDelete);
    const label = type === "supplier" || type === "client" ? "Supplier" : "Dealer";
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
        router.replace("/");
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
      await fetch("/api/auth/logout", { method: "DELETE" });
    } catch {}
    router.replace("/");
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
            it.quantity !== undefined && it.quantity !== "" ? Number(it.quantity).toFixed(2) : (it.weight != null && it.weight !== "" ? Number(it.weight).toFixed(2) : `"-"`),
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

  // Download all suppliers with separate worksheets per supplier in a single Excel file
  function downloadAllDealersData() {
    if (clients.length === 0) {
      alert("No suppliers available to export.");
      return;
    }

    const fmtNum = (n) => Number(n || 0).toFixed(2);
    const wb = XLSX.utils.book_new();
    const usedSheetNames = new Set();

    clients.forEach((cName) => {
      const type = getEntityType(cName);
      const label = type === "supplier" || type === "client" ? "Supplier" : "Dealer";
      const upperLabel = type === "supplier" || type === "client" ? "SUPPLIER" : "DEALER";

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
              it.quantity !== undefined && it.quantity !== "" ? Number(it.quantity).toFixed(2) : (it.weight != null && it.weight !== "" ? Number(it.weight).toFixed(2) : "-"),
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
      let cleanSheetName = (cName || "Supplier")
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

    XLSX.writeFile(wb, `All_Suppliers_Ledger_${today()}.xlsx`);
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
            <h1 className="header-title">Purchase</h1>
            <p className="sub">Chowdhury Engineering Works • Supplier Ledger</p>
          </div>
        </div>
        <div className="header-actions">
          <TopPageNav active="purchase" />
          <a href="/" className="header-btn" title="Open Home Dashboard">
            <HomeIcon size={14} /> Home
          </a>
        </div>
      </header>

      {/* TOP SECTION: Supplier Selection Dropdown with Autocomplete & Add Option */}
      <section className="client-hero" ref={dropdownRef}>
        <div className="client-hero-header">
          <div className="client-hero-title">
            <UserIcon size={16} /> Select Supplier
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
              setNewClientType("supplier");
              setShowNewClientModal(true);
            }}
            title="Add New Supplier"
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
              placeholder="Search or type supplier name..."
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
                        {cType === "supplier" ? (
                          <span style={{ color: "#2563eb", display: "inline-flex" }} title="Supplier">
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
                  No supplier found with this name
                </div>
              )}

              {/* Quick option to create brand new supplier directly from typing */}
              {clientSearch.trim() && !clients.includes(clientSearch.trim()) && (
                <div style={{ display: "flex", gap: 6, padding: "8px 10px", borderTop: "1px solid var(--border)", background: "var(--card-sub)", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="btn ghost"
                    style={{ flex: 1, fontSize: "0.82rem", padding: "7px 10px", borderColor: "var(--accent)", color: "var(--accent)", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                    onClick={() => handleAddNewClient(clientSearch.trim(), "supplier")}
                  >
                    <UserIcon size={14} /> Add as Supplier: &quot;<b>{clientSearch.trim()}</b>&quot;
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
              {isSelectedSupplier ? <UserIcon size={16} /> : <BuildingIcon size={16} />}
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

      {/* Modal for adding new supplier explicitly */}
      {showNewClientModal && (
        <div className="modal-overlay" onClick={() => setShowNewClientModal(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ display: "flex", alignItems: "center", gap: 7, fontSize: "1.1rem" }}>
              <PlusIcon size={16} /> Add New Supplier
            </h3>
            <p style={{ color: "var(--muted)", fontSize: "0.8rem", marginBottom: 14 }}>
              Enter supplier name.
            </p>

            <label htmlFor="new-client-name" style={{ fontSize: "0.75rem" }}>
              Supplier Name
            </label>
            <input
              id="new-client-name"
              type="text"
              placeholder="e.g. Alam Brothers / Steel Mills"
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
                {isSelectedSupplier ? <UserIcon size={15} /> : <BuildingIcon size={15} />}
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

                      <div className="item-field item-qty-field">
                        <label className="item-label">Quantity</label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          className="item-input"
                          placeholder="e.g. 10"
                          value={item.quantity !== undefined && item.quantity !== "" ? item.quantity : (item.weight || "")}
                          onChange={(e) => handleItemChange(idx, "quantity", e.target.value)}
                        />
                      </div>

                      <div className="item-field item-unit-field">
                        <label className="item-label">Unit</label>
                        <input
                          type="text"
                          className="item-input"
                          placeholder="e.g. pcs"
                          list="purchase-unit-presets"
                          value={item.unit || ""}
                          onChange={(e) => handleItemChange(idx, "unit", e.target.value)}
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
                <datalist id="purchase-unit-presets">
                  <option value="pcs" />
                  <option value="kg" />
                  <option value="meter" />
                  <option value="box" />
                  <option value="nos" />
                  <option value="sft" />
                  <option value="ton" />
                  <option value="set" />
                  <option value="bundle" />
                  <option value="coil" />
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
                    <th style={{ width: "95px" }}>Date</th>
                    <th style={{ width: "95px" }}>Bill No.</th>
                    <th style={{ minWidth: "150px" }}>Item Description</th>
                    <th className="num" style={{ width: "90px" }}>Weight</th>
                    <th className="num" style={{ width: "85px" }}>Rate</th>
                    <th className="num" style={{ width: "100px" }}>Subtotal</th>
                    <th className="num" style={{ width: "115px" }}>Total Bill</th>
                    <th style={{ minWidth: "135px" }}>Payment Method</th>
                    <th className="num" style={{ width: "110px" }}>Payment</th>
                    <th className="num" style={{ width: "130px" }}>Remaining Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {view.map((r, rIdx) => {
                    const isBill = r.type === "bill";
                    const hasItems = isBill && Array.isArray(r.items) && r.items.length > 0;
                    const items = hasItems ? r.items : null;
                    const itemsCount = items ? items.length : 1;
                    const isLastRow = rIdx === view.length - 1;
                    const rowBorderBottom = isLastRow ? "none" : "2px solid #cbd5e1";
                    const billBg = rIdx % 2 === 0 ? "#ffffff" : "#f8fafc";

                    if (!isBill) {
                      // PAYMENT ENTRY ROW
                      return (
                        <tr
                          key={r.id}
                          className="ledger-clickable-row"
                          onClick={() => openEntryModal(r)}
                          title="Click to view full details, edit, or delete"
                          style={{ background: billBg, borderBottom: rowBorderBottom, cursor: "pointer" }}
                        >
                          <td style={{ verticalAlign: "top", whiteSpace: "nowrap", background: billBg }}>
                            {r.entry_date}
                          </td>
                          <td style={{ verticalAlign: "top", fontWeight: 700, color: "#1e293b", background: billBg }}>
                            {r.bill_no ? `Bill #${r.bill_no}` : "—"}
                          </td>
                          <td style={{ verticalAlign: "top" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                              <span style={{ fontWeight: 700, color: "#065f46" }}>Payment</span>
                              {r.note && <span style={{ fontSize: "0.75rem", fontStyle: "italic", color: "#64748b" }}>{r.note}</span>}
                            </div>
                          </td>
                          <td className="num" style={{ verticalAlign: "top", color: "#94a3b8" }}>—</td>
                          <td className="num" style={{ verticalAlign: "top", color: "#94a3b8" }}>—</td>
                          <td className="num" style={{ verticalAlign: "top", color: "#94a3b8" }}>—</td>
                          <td className="num" style={{ verticalAlign: "top", color: "#94a3b8" }}>—</td>
                          <td style={{ verticalAlign: "top" }}>
                            {r.from_bank || r.to_bank ? (
                              <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "#0f172a", background: "#f1f5f9", padding: "2px 7px", borderRadius: 4, display: "inline-block" }}>
                                {r.from_bank && r.to_bank ? `${r.from_bank} → ${r.to_bank}` : r.from_bank || r.to_bank}
                              </span>
                            ) : (
                              <span style={{ color: "#94a3b8" }}>Cash / Other</span>
                            )}
                          </td>
                          <td className="num" style={{ verticalAlign: "top", fontWeight: 700, color: "var(--green)" }}>
                            − ৳ {fmt(r.amount)}
                          </td>
                          <td className="num" style={{ verticalAlign: "top", background: billBg }}>
                            <b style={{ color: r.balance >= 0 ? "var(--red)" : "var(--green)" }}>
                              ৳ {fmt(r.balance)}
                            </b>
                          </td>
                        </tr>
                      );
                    }

                    // BILL WITH MULTIPLE ITEMS
                    if (items) {
                      return items.map((it, idx) => {
                        const isFirstItem = idx === 0;
                        const isLastItemOfBill = idx === items.length - 1;
                        const itemBorderBottom = isLastItemOfBill ? rowBorderBottom : "1px dashed #e2e8f0";

                        return (
                          <tr
                            key={`${r.id}-${idx}`}
                            className="ledger-clickable-row"
                            onClick={() => openEntryModal(r)}
                            title="Click to view full details, edit, or delete"
                            style={{ background: billBg, cursor: "pointer" }}
                          >
                            {isFirstItem && (
                              <td
                                rowSpan={itemsCount}
                                style={{
                                  verticalAlign: "top",
                                  whiteSpace: "nowrap",
                                  borderBottom: rowBorderBottom,
                                  background: billBg,
                                }}
                              >
                                {r.entry_date}
                              </td>
                            )}
                            {isFirstItem && (
                              <td
                                rowSpan={itemsCount}
                                style={{
                                  verticalAlign: "top",
                                  fontWeight: 700,
                                  color: "#0f172a",
                                  whiteSpace: "nowrap",
                                  borderBottom: rowBorderBottom,
                                  background: billBg,
                                }}
                              >
                                {r.bill_no ? `Bill #${r.bill_no}` : "—"}
                              </td>
                            )}
                            <td style={{ verticalAlign: "top", fontWeight: 600, borderBottom: itemBorderBottom }}>
                              {it.name || "Item"}
                            </td>
                            <td className="num" style={{ verticalAlign: "top", borderBottom: itemBorderBottom }}>
                              {it.quantity !== undefined && it.quantity !== ""
                                ? `${fmt(it.quantity)} ${it.unit || "pcs"}`
                                : (it.weight != null && it.weight !== "" ? `${fmt(it.weight)} kg` : "—")}
                            </td>
                            <td className="num" style={{ verticalAlign: "top", borderBottom: itemBorderBottom }}>
                              {it.rate != null && it.rate !== "" ? `৳ ${fmt(it.rate)}` : "—"}
                            </td>
                            <td className="num" style={{ verticalAlign: "top", fontWeight: 700, borderBottom: itemBorderBottom }}>
                              {it.subtotal != null && it.subtotal !== "" ? `৳ ${fmt(it.subtotal)}` : "—"}
                            </td>
                            {isFirstItem && (
                              <td
                                rowSpan={itemsCount}
                                className="num"
                                style={{
                                  verticalAlign: "top",
                                  fontWeight: 800,
                                  color: "#0f172a",
                                  borderBottom: rowBorderBottom,
                                  background: billBg,
                                }}
                              >
                                <div>+ ৳ {fmt(r.amount)}</div>
                                {(r.labour_cost > 0 || r.transport_cost > 0) && (
                                  <div style={{ fontSize: "0.7rem", color: "#64748b", marginTop: 2, fontWeight: 500, lineHeight: 1.25 }}>
                                    {r.labour_cost > 0 && <div>+ Lab: ৳{fmt(r.labour_cost)}</div>}
                                    {r.transport_cost > 0 && <div>+ Tr: ৳{fmt(r.transport_cost)}</div>}
                                  </div>
                                )}
                              </td>
                            )}
                            {isFirstItem && (
                              <td
                                rowSpan={itemsCount}
                                style={{
                                  verticalAlign: "top",
                                  color: "#94a3b8",
                                  borderBottom: rowBorderBottom,
                                  background: billBg,
                                }}
                              >
                                —
                              </td>
                            )}
                            {isFirstItem && (
                              <td
                                rowSpan={itemsCount}
                                className="num"
                                style={{
                                  verticalAlign: "top",
                                  color: "#94a3b8",
                                  borderBottom: rowBorderBottom,
                                  background: billBg,
                                }}
                              >
                                —
                              </td>
                            )}
                            {isFirstItem && (
                              <td
                                rowSpan={itemsCount}
                                className="num"
                                style={{
                                  verticalAlign: "top",
                                  borderBottom: rowBorderBottom,
                                  background: billBg,
                                }}
                              >
                                <b style={{ color: r.balance >= 0 ? "var(--red)" : "var(--green)" }}>
                                  ৳ {fmt(r.balance)}
                                </b>
                              </td>
                            )}
                          </tr>
                        );
                      });
                    }

                    // BILL WITHOUT ITEMS BREAKDOWN
                    return (
                      <tr
                        key={r.id}
                        className="ledger-clickable-row"
                        onClick={() => openEntryModal(r)}
                        title="Click to view full details, edit, or delete"
                        style={{ background: billBg, borderBottom: rowBorderBottom, cursor: "pointer" }}
                      >
                        <td style={{ verticalAlign: "top", whiteSpace: "nowrap", background: billBg }}>
                          {r.entry_date}
                        </td>
                        <td style={{ verticalAlign: "top", fontWeight: 700, color: "#0f172a", background: billBg }}>
                          {r.bill_no ? `Bill #${r.bill_no}` : "—"}
                        </td>
                        <td style={{ verticalAlign: "top", fontWeight: 600 }}>
                          {r.note || "General Bill"}
                        </td>
                        <td className="num" style={{ verticalAlign: "top" }}>
                          {r.weight != null ? `${fmt(r.weight)} kg` : "—"}
                        </td>
                        <td className="num" style={{ verticalAlign: "top", color: "#94a3b8" }}>—</td>
                        <td className="num" style={{ verticalAlign: "top", fontWeight: 700 }}>৳ {fmt(r.amount)}</td>
                        <td className="num" style={{ verticalAlign: "top", fontWeight: 800 }}>+ ৳ {fmt(r.amount)}</td>
                        <td style={{ verticalAlign: "top", color: "#94a3b8" }}>—</td>
                        <td className="num" style={{ verticalAlign: "top", color: "#94a3b8" }}>—</td>
                        <td className="num" style={{ verticalAlign: "top", background: billBg }}>
                          <b style={{ color: r.balance >= 0 ? "var(--red)" : "var(--green)" }}>
                            ৳ {fmt(r.balance)}
                          </b>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                {view.length > 0 && (
                  <tfoot>
                    <tr>
                      <td colSpan={6} style={{ textAlign: "right", fontWeight: 700, textTransform: "uppercase", fontSize: "0.75rem", letterSpacing: "0.02em" }}>
                        Total ({view.length} Entries):
                      </td>
                      <td className="num" style={{ fontWeight: 800, color: "#0f172a" }}>
                        ৳ {fmt(totalBill)}
                      </td>
                      <td></td>
                      <td className="num" style={{ fontWeight: 800, color: "var(--green)" }}>
                        − ৳ {fmt(totalPaid)}
                      </td>
                      <td className="num" style={{ fontWeight: 800 }}>
                        <span style={{ color: balance >= 0 ? "var(--red)" : "var(--green)" }}>
                          ৳ {fmt(balance)}
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                )}
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
          <h3>Please Select a Supplier Above</h3>
          <p style={{ marginBottom: 16 }}>
            Select a supplier from the search box above to view details, add bills/payments, and see full transaction history, or click &quot;Add New Supplier&quot;.
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", alignItems: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn"
              style={{ margin: 0, display: "inline-flex", alignItems: "center", gap: 6 }}
              onClick={() => {
                setNewClientType("supplier");
                setShowNewClientModal(true);
              }}
            >
              <PlusIcon /> Add New Supplier
            </button>
            <button
              type="button"
              className="btn-download-all-excel"
              onClick={downloadAllDealersData}
              title="Download full multi-sheet Excel file with all suppliers"
            >
              <DownloadIcon size={15} /> Download All Excel
            </button>
          </div>
        </div>
      )}

      {/* Transaction Entry Detail & Edit Modal */}
      {selectedEntryForModal && (
        <div
          className="modal-overlay"
          style={{ zIndex: 1200, padding: "16px" }}
          onClick={() => {
            if (isEditingModal && !confirm("Discard unsaved changes?")) return;
            setSelectedEntryForModal(null);
            setIsEditingModal(false);
            setEditModalData(null);
            setModalErr("");
          }}
        >
          <div
            className="modal-box"
            style={{
              maxWidth: "800px",
              width: "100%",
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
              padding: 0,
              borderRadius: "16px",
              overflow: "hidden",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
                color: "#ffffff",
                padding: "16px 22px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span
                  style={{
                    background: isEditingModal
                      ? "#f59e0b"
                      : selectedEntryForModal.type === "bill"
                      ? "#e11d48"
                      : "#059669",
                    color: isEditingModal ? "#000000" : "#ffffff",
                    padding: "3px 9px",
                    borderRadius: "6px",
                    fontSize: "0.72rem",
                    fontWeight: 800,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                  }}
                >
                  {isEditingModal
                    ? "✏️ Edit Mode"
                    : selectedEntryForModal.type === "bill"
                    ? "Purchase Bill Voucher"
                    : "Payment Voucher"}
                </span>
                <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, color: "#fff" }}>
                  {selectedEntryForModal.type === "bill"
                    ? selectedEntryForModal.bill_no
                      ? `Bill #${selectedEntryForModal.bill_no}`
                      : "Bill Voucher"
                    : `Payment Voucher`}
                </h3>
                <span style={{ fontSize: "0.85rem", opacity: 0.85 }}>
                  ({selectedEntryForModal.client_name})
                </span>
                {!isEditingModal && selectedEntryForModal.created_at && (
                  <span
                    style={{
                      fontSize: "0.74rem",
                      background: "rgba(255,255,255,0.18)",
                      padding: "2px 8px",
                      borderRadius: "6px",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      fontWeight: 500,
                    }}
                    title="Exact Entry Creation Time"
                  >
                    🕒 Entry Time: {new Date(selectedEntryForModal.created_at).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true })}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  if (isEditingModal && !confirm("Discard unsaved changes?")) return;
                  setSelectedEntryForModal(null);
                  setIsEditingModal(false);
                  setEditModalData(null);
                  setModalErr("");
                }}
                style={{
                  background: "rgba(255,255,255,0.12)",
                  border: "none",
                  color: "#ffffff",
                  borderRadius: "8px",
                  width: "32px",
                  height: "32px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
                title="Close"
              >
                <CrossIcon size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: "20px 22px", overflowY: "auto", flex: 1, maxHeight: "calc(90vh - 140px)" }}>
              {!isEditingModal ? (
                /* VIEW DETAILS MODE */
                <div>
                  {/* Top Info Banner */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                      gap: 12,
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: "12px",
                      padding: "14px 16px",
                      marginBottom: "18px",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>Date</div>
                      <div style={{ fontWeight: 700, color: "#0f172a", marginTop: 2 }}>{selectedEntryForModal.entry_date || "—"}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>Bill No.</div>
                      <div style={{ fontWeight: 700, color: "#0f172a", marginTop: 2 }}>
                        {selectedEntryForModal.bill_no ? `#${selectedEntryForModal.bill_no}` : "—"}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>Party / Client</div>
                      <div style={{ fontWeight: 700, color: "#0f172a", marginTop: 2 }}>
                        {selectedEntryForModal.client_name} ({entityLabel})
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>Type</div>
                      <div style={{ fontWeight: 700, marginTop: 2, color: selectedEntryForModal.type === "bill" ? "#e11d48" : "#059669" }}>
                        {selectedEntryForModal.type === "bill" ? "Purchase Bill" : "Payment"}
                      </div>
                    </div>
                    {selectedEntryForModal.created_at && (
                      <div>
                        <div style={{ fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>Entry Date & Time</div>
                        <div style={{ fontWeight: 700, color: "#0f172a", marginTop: 2, fontSize: "0.84rem" }}>
                          🕒 {new Date(selectedEntryForModal.created_at).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* BILL DETAILS */}
                  {selectedEntryForModal.type === "bill" && (
                    <>
                      {Array.isArray(selectedEntryForModal.items) && selectedEntryForModal.items.length > 0 ? (
                        <div style={{ marginBottom: 18 }}>
                          <h4 style={{ margin: "0 0 8px 0", fontSize: "0.95rem", fontWeight: 700, color: "#1e293b" }}>
                            Purchased Items ({selectedEntryForModal.items.length})
                          </h4>
                          <div style={{ border: "1px solid #cbd5e1", borderRadius: "10px", overflow: "hidden" }}>
                            <table style={{ minWidth: "100%", width: "100%" }}>
                              <thead>
                                <tr>
                                  <th style={{ width: "45px" }}>SL</th>
                                  <th>Item Description</th>
                                  <th className="num" style={{ width: "95px" }}>Quantity</th>
                                  <th style={{ width: "75px", textAlign: "center" }}>Unit</th>
                                  <th className="num" style={{ width: "95px" }}>Rate (৳)</th>
                                  <th className="num" style={{ width: "115px" }}>Subtotal (৳)</th>
                                </tr>
                              </thead>
                              <tbody>
                                {selectedEntryForModal.items.map((it, idx) => (
                                  <tr key={idx}>
                                    <td style={{ color: "#64748b" }}>{idx + 1}</td>
                                    <td style={{ fontWeight: 600, color: "#0f172a" }}>{it.name || "Item"}</td>
                                    <td className="num">
                                      {it.quantity !== undefined && it.quantity !== "" ? fmt(it.quantity) : (it.weight != null && it.weight !== "" ? fmt(it.weight) : "—")}
                                    </td>
                                    <td style={{ textAlign: "center", color: "#64748b" }}>
                                      {it.unit || (it.weight ? "kg" : "pcs")}
                                    </td>
                                    <td className="num">{it.rate != null && it.rate !== "" ? `৳ ${fmt(it.rate)}` : "—"}</td>
                                    <td className="num" style={{ fontWeight: 700 }}>{it.subtotal != null && it.subtotal !== "" ? `৳ ${fmt(it.subtotal)}` : "—"}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ) : (
                        <div style={{ padding: "14px 16px", background: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0", marginBottom: 18 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                            <span style={{ color: "#64748b", fontWeight: 600 }}>Description:</span>
                            <span style={{ fontWeight: 700, color: "#0f172a" }}>{selectedEntryForModal.note || "General Bill"}</span>
                          </div>
                          {selectedEntryForModal.weight != null && (
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                              <span style={{ color: "#64748b", fontWeight: 600 }}>Weight:</span>
                              <span style={{ fontWeight: 700, color: "#0f172a" }}>{fmt(selectedEntryForModal.weight)} kg</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Extra Costs & Summary Card */}
                      <div
                        style={{
                          background: "#fff",
                          border: "1.5px solid #e2e8f0",
                          borderRadius: "12px",
                          padding: "16px",
                          display: "flex",
                          flexDirection: "column",
                          gap: 8,
                        }}
                      >
                        {selectedEntryForModal.labour_cost > 0 && (
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.88rem" }}>
                            <span style={{ color: "#64748b" }}>Labour / Handling Charge:</span>
                            <span style={{ fontWeight: 600, color: "#0f172a" }}>+ ৳ {fmt(selectedEntryForModal.labour_cost)}</span>
                          </div>
                        )}
                        {selectedEntryForModal.transport_cost > 0 && (
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.88rem" }}>
                            <span style={{ color: "#64748b" }}>Transport / Delivery Cost:</span>
                            <span style={{ fontWeight: 600, color: "#0f172a" }}>+ ৳ {fmt(selectedEntryForModal.transport_cost)}</span>
                          </div>
                        )}
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            borderTop: "2px dashed #cbd5e1",
                            paddingTop: 10,
                            marginTop: 4,
                          }}
                        >
                          <span style={{ fontSize: "1.05rem", fontWeight: 800, color: "#0f172a" }}>Total Bill Amount:</span>
                          <span style={{ fontSize: "1.35rem", fontWeight: 800, color: "#991b1b" }}>
                            + ৳ {fmt(selectedEntryForModal.amount)}
                          </span>
                        </div>
                      </div>
                    </>
                  )}

                  {/* PAYMENT DETAILS */}
                  {selectedEntryForModal.type === "payment" && (
                    <div
                      style={{
                        background: "#fff",
                        border: "1.5px solid #d1fae5",
                        borderRadius: "12px",
                        padding: "20px",
                        display: "flex",
                        flexDirection: "column",
                        gap: 12,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ color: "#065f46", fontWeight: 700, fontSize: "1rem" }}>Payment Paid:</span>
                        <span style={{ fontSize: "1.5rem", fontWeight: 800, color: "#059669" }}>
                          − ৳ {fmt(selectedEntryForModal.amount)}
                        </span>
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #e2e8f0", paddingTop: 10 }}>
                        <span style={{ color: "#64748b", fontWeight: 600 }}>Payment Method:</span>
                        <span
                          style={{
                            fontWeight: 700,
                            color: "#0f172a",
                            background: "#f1f5f9",
                            padding: "3px 10px",
                            borderRadius: 6,
                            fontSize: "0.85rem",
                          }}
                        >
                          {selectedEntryForModal.from_bank && selectedEntryForModal.to_bank
                            ? `${selectedEntryForModal.from_bank} → ${selectedEntryForModal.to_bank}`
                            : selectedEntryForModal.from_bank || selectedEntryForModal.to_bank || "Cash / Direct"}
                        </span>
                      </div>

                      {selectedEntryForModal.bill_no && (
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #e2e8f0", paddingTop: 10 }}>
                          <span style={{ color: "#64748b", fontWeight: 600 }}>Against Bill No:</span>
                          <span style={{ fontWeight: 700, color: "#0f172a" }}>#{selectedEntryForModal.bill_no}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Note Section if Available */}
                  {selectedEntryForModal.note && (
                    <div style={{ marginTop: 14, background: "#f8fafc", padding: "10px 14px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: "0.85rem", color: "#475569" }}>
                      <span style={{ fontWeight: 700, color: "#1e293b", marginRight: 6 }}>Note:</span>
                      {selectedEntryForModal.note}
                    </div>
                  )}
                </div>
              ) : (
                /* EDIT MODE */
                <div>
                  {modalErr && (
                    <div style={{ background: "#fee2e2", border: "1px solid #fecaca", color: "#dc2626", padding: "8px 12px", borderRadius: 8, marginBottom: 14, fontSize: "0.85rem", fontWeight: 600 }}>
                      {modalErr}
                    </div>
                  )}

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                    <div>
                      <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#475569" }}>Date</label>
                      <input
                        type="date"
                        value={editModalData.entry_date}
                        onChange={(e) => setEditModalData({ ...editModalData, entry_date: e.target.value })}
                        style={{ marginTop: 4 }}
                      />
                    </div>
                    {editModalData.type === "bill" ? (
                      <div>
                        <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#475569" }}>Bill No.</label>
                        <input
                          type="text"
                          placeholder="e.g. B-105"
                          value={editModalData.bill_no}
                          onChange={(e) => setEditModalData({ ...editModalData, bill_no: e.target.value })}
                          style={{ marginTop: 4 }}
                        />
                      </div>
                    ) : (
                      <div>
                        <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#475569" }}>Against Bill No (Optional)</label>
                        <input
                          type="text"
                          placeholder="e.g. B-105"
                          value={editModalData.bill_no}
                          onChange={(e) => setEditModalData({ ...editModalData, bill_no: e.target.value })}
                          style={{ marginTop: 4 }}
                        />
                      </div>
                    )}
                  </div>

                  {editModalData.type === "bill" ? (
                    <>
                      {/* Items Editor */}
                      {Array.isArray(editModalData.items) && editModalData.items.length > 0 ? (
                        <div style={{ marginBottom: 14 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                            <label style={{ fontSize: "0.85rem", fontWeight: 700, color: "#1e293b", margin: 0 }}>
                              Purchased Items
                            </label>
                            <button
                              type="button"
                              onClick={addEditItem}
                              style={{
                                background: "#f1f5f9",
                                border: "1px solid #cbd5e1",
                                color: "#0f172a",
                                padding: "4px 10px",
                                borderRadius: 6,
                                fontSize: "0.76rem",
                                fontWeight: 700,
                                cursor: "pointer",
                              }}
                            >
                              + Add Item
                            </button>
                          </div>

                          {/* Column Headings */}
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "1.8fr 1fr 0.9fr 1fr 1.1fr 24px",
                              gap: 6,
                              padding: "0 8px 4px 8px",
                              fontSize: "0.72rem",
                              fontWeight: 700,
                              color: "#64748b",
                              textTransform: "uppercase",
                              letterSpacing: "0.03em",
                            }}
                          >
                            <span>Item Name</span>
                            <span>Qty / Weight</span>
                            <span style={{ textAlign: "center" }}>Unit</span>
                            <span>Rate (৳)</span>
                            <span>Total (৳)</span>
                            <span></span>
                          </div>

                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {editModalData.items.map((it, idx) => (
                              <div
                                key={idx}
                                style={{
                                  display: "grid",
                                  gridTemplateColumns: "1.8fr 1fr 0.9fr 1fr 1.1fr auto",
                                  gap: 6,
                                  alignItems: "center",
                                  background: "#f8fafc",
                                  padding: "6px 8px",
                                  borderRadius: 8,
                                  border: "1px solid #e2e8f0",
                                }}
                              >
                                <input
                                  type="text"
                                  placeholder="Item name"
                                  value={it.name}
                                  onChange={(e) => updateEditItem(idx, "name", e.target.value)}
                                  list="item-presets-list"
                                  style={{ padding: "6px 8px", fontSize: "0.82rem" }}
                                />
                                <input
                                  type="number"
                                  step="any"
                                  placeholder="Quantity"
                                  value={it.quantity !== undefined && it.quantity !== "" ? it.quantity : (it.weight || "")}
                                  onChange={(e) => updateEditItem(idx, "quantity", e.target.value)}
                                  style={{ padding: "6px 8px", fontSize: "0.82rem" }}
                                />
                                <input
                                  type="text"
                                  placeholder="Unit"
                                  list="purchase-unit-presets"
                                  value={it.unit || ""}
                                  onChange={(e) => updateEditItem(idx, "unit", e.target.value)}
                                  style={{ padding: "6px 8px", fontSize: "0.82rem", textAlign: "center" }}
                                />
                                <input
                                  type="number"
                                  step="any"
                                  placeholder="Rate (৳)"
                                  value={it.rate}
                                  onChange={(e) => updateEditItem(idx, "rate", e.target.value)}
                                  style={{ padding: "6px 8px", fontSize: "0.82rem" }}
                                />
                                <input
                                  type="number"
                                  step="any"
                                  placeholder="Subtotal"
                                  value={it.subtotal}
                                  onChange={(e) => updateEditItem(idx, "subtotal", e.target.value)}
                                  style={{ padding: "6px 8px", fontSize: "0.82rem", fontWeight: 700 }}
                                />
                                <button
                                  type="button"
                                  onClick={() => removeEditItem(idx)}
                                  disabled={editModalData.items.length <= 1}
                                  style={{
                                    background: "none",
                                    border: "none",
                                    color: editModalData.items.length <= 1 ? "#cbd5e1" : "#ef4444",
                                    cursor: editModalData.items.length <= 1 ? "not-allowed" : "pointer",
                                    padding: 4,
                                  }}
                                  title="Remove item"
                                >
                                  <TrashIcon size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                          <div>
                            <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#475569" }}>Weight (kg)</label>
                            <input
                              type="number"
                              step="any"
                              value={editModalData.weight}
                              onChange={(e) => setEditModalData({ ...editModalData, weight: e.target.value })}
                              style={{ marginTop: 4 }}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#475569" }}>Bill Amount (BDT)</label>
                            <input
                              type="number"
                              step="any"
                              value={editModalData.amount}
                              onChange={(e) => setEditModalData({ ...editModalData, amount: e.target.value })}
                              style={{ marginTop: 4 }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Extra Costs */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                        <div>
                          <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#475569" }}>Labour Charge (BDT)</label>
                          <input
                            type="number"
                            step="any"
                            placeholder="0"
                            value={editModalData.labour_cost}
                            onChange={(e) => updateEditCost("labour_cost", e.target.value)}
                            style={{ marginTop: 4 }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#475569" }}>Transport Cost (BDT)</label>
                          <input
                            type="number"
                            step="any"
                            placeholder="0"
                            value={editModalData.transport_cost}
                            onChange={(e) => updateEditCost("transport_cost", e.target.value)}
                            style={{ marginTop: 4 }}
                          />
                        </div>
                      </div>

                      <div style={{ background: "#fef2f2", border: "1px solid #fecaca", padding: "10px 14px", borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                        <span style={{ fontWeight: 700, color: "#7f1d1d" }}>Calculated Total Bill:</span>
                        <span style={{ fontWeight: 800, fontSize: "1.2rem", color: "#991b1b" }}>
                          ৳ {fmt(editModalData.amount)}
                        </span>
                      </div>
                    </>
                  ) : (
                    /* EDIT PAYMENT */
                    <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 14 }}>
                      <div>
                        <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#475569" }}>Payment Amount (BDT)</label>
                        <input
                          type="number"
                          step="any"
                          value={editModalData.amount}
                          onChange={(e) => setEditModalData({ ...editModalData, amount: e.target.value })}
                          style={{ marginTop: 4, fontWeight: 700, fontSize: "1rem" }}
                        />
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        <div>
                          <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#475569" }}>From Bank / Account</label>
                          <input
                            type="text"
                            placeholder="e.g. Dhaka Bank / Cash"
                            value={editModalData.from_bank}
                            onChange={(e) => setEditModalData({ ...editModalData, from_bank: e.target.value })}
                            style={{ marginTop: 4 }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#475569" }}>To Bank / Account</label>
                          <input
                            type="text"
                            placeholder="e.g. UCB Bank / Cash"
                            value={editModalData.to_bank}
                            onChange={(e) => setEditModalData({ ...editModalData, to_bank: e.target.value })}
                            style={{ marginTop: 4 }}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#475569" }}>Note (Optional)</label>
                    <input
                      type="text"
                      placeholder="Add note or reference"
                      value={editModalData.note}
                      onChange={(e) => setEditModalData({ ...editModalData, note: e.target.value })}
                      style={{ marginTop: 4 }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div
              style={{
                background: "#f8fafc",
                borderTop: "1px solid #e2e8f0",
                padding: "14px 22px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 10,
              }}
            >
              {!isEditingModal ? (
                <>
                  <button
                    type="button"
                    onClick={handleDeleteFromModal}
                    disabled={modalBusy}
                    style={{
                      background: "#fee2e2",
                      border: "1px solid #fecaca",
                      color: "#dc2626",
                      padding: "8px 16px",
                      borderRadius: "8px",
                      fontSize: "0.84rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <TrashIcon size={14} /> Delete {selectedEntryForModal.type === "bill" ? "Bill" : "Payment"}
                  </button>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button
                      type="button"
                      className="btn ghost"
                      style={{ margin: 0, padding: "8px 16px" }}
                      onClick={() => setSelectedEntryForModal(null)}
                    >
                      Close
                    </button>
                    <button
                      type="button"
                      className="btn"
                      style={{
                        margin: 0,
                        background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                        padding: "8px 18px",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                      onClick={startEditing}
                    >
                      <EditIcon size={14} /> Edit {selectedEntryForModal.type === "bill" ? "Bill" : "Payment"}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="btn ghost"
                    style={{ margin: 0, padding: "8px 16px" }}
                    onClick={() => {
                      setIsEditingModal(false);
                      setEditModalData(null);
                      setModalErr("");
                    }}
                    disabled={modalBusy}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn"
                    style={{
                      margin: 0,
                      background: "linear-gradient(135deg, #059669, #047857)",
                      padding: "8px 20px",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                    onClick={handleSaveEdit}
                    disabled={modalBusy}
                  >
                    <CheckIcon size={14} /> {modalBusy ? "Saving..." : "Save Changes"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

