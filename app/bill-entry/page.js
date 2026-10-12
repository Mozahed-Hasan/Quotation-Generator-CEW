"use client";
import { useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { takaInWords } from "@/lib/words";
import * as XLSX from "xlsx";

const ITEM_PRESETS = [
  "Matte Sheet",
  "GP Sheet",
  "MS Sheet",
  "Color Coil",
  "Profile Sheet",
  "Iron Item",
  "Insulation",
  "Screw",
  "Gum Tape",
  "Cork Sheet",
];

const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const today = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

const ymd = (d) => (d || "").replace(/-/g, "");

// Generate Unique Customer ID: CID-MONTH-YEAR-First 5 Digit of phone number (e.g. CID-10-2026-01712)
export function generateCustomerId(mobile, dateStr) {
  if (!mobile) return "";
  const cleaned = String(mobile).replace(/[^0-9]/g, "");
  if (!cleaned) return "";
  const first5 = cleaned.slice(0, 5);

  const parts = (dateStr || today()).split("-");
  const year = parts[0] || new Date().getFullYear();
  const month = parts[1] || String(new Date().getMonth() + 1).padStart(2, "0");

  return `CID-${month}-${year}-${first5}`;
}

const emptyItem = () => ({
  name: "",
  weight: "",
  quantity: "",
  rate: "",
  subtotal: "",
});

const defaultForm = () => ({
  bill_date: today(),
  bill_no: "",
  customer_name: "",
  customer_address: "",
  customer_mobile: "",
  customer_id: "",
  items: [emptyItem()],
  labour_charge: "",
  transport_cost: "",
  discount: "",
  client_payment: "",
  note: "",
});

const fmt = (n) =>
  Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function BillEntryPage() {
  const router = useRouter();
  const [form, setForm] = useState(defaultForm());
  const [bills, setBills] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [showCustomersModal, setShowCustomersModal] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [modalSearch, setModalSearch] = useState("");
  const [modalBalanceFilter, setModalBalanceFilter] = useState("all");

  // Recycle Bin States
  const [showRecycleModal, setShowRecycleModal] = useState(false);
  const [recycleBinItems, setRecycleBinItems] = useState([]);
  const [recycleSearch, setRecycleSearch] = useState("");

  // Balance Filtering and Excel Export States
  const [balanceFilter, setBalanceFilter] = useState("all"); // 'all' | 'due' | 'advance' | 'paid'
  const [showExcelMenu, setShowExcelMenu] = useState(false);
  const excelMenuRef = useRef(null);

  // Duration Filter States: 'all' | 'day' | 'week' | 'month' | 'year'
  const [durationMode, setDurationMode] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const monthDropdownRef = useRef(null);
  const yearDropdownRef = useRef(null);

  // Close menus on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (excelMenuRef.current && !excelMenuRef.current.contains(e.target)) {
        setShowExcelMenu(false);
      }
      if (monthDropdownRef.current && !monthDropdownRef.current.contains(e.target)) {
        setShowMonthDropdown(false);
      }
      if (yearDropdownRef.current && !yearDropdownRef.current.contains(e.target)) {
        setShowYearDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Load Bills and Customers from Server
  async function loadData() {
    try {
      const res = await fetch("/api/bill-entry");
      if (res.status === 401) {
        router.replace("/bill-entry/login");
        return;
      }
      const data = await res.json();
      if (res.ok) {
        setBills(data.bills || []);
        setCustomers(data.customers || []);
        setRecycleBinItems(data.recycleBinItems || []);
      }
    } catch (e) {
      console.error("Failed to load bills:", e);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Collect all known unique customer profiles for auto-suggestions
  const allKnownCustomerProfiles = useMemo(() => {
    const map = new Map();
    (customers || []).forEach((c) => {
      if (c.customer_id) {
        map.set(c.customer_id.toLowerCase(), {
          customer_id: c.customer_id,
          name: c.name || "",
          mobile: c.mobile || "",
          address: c.address || "",
        });
      }
    });
    (bills || []).forEach((b) => {
      if (b.customer_id && !map.has(b.customer_id.toLowerCase())) {
        map.set(b.customer_id.toLowerCase(), {
          customer_id: b.customer_id,
          name: b.customer_name || "",
          mobile: b.customer_mobile || "",
          address: b.customer_address || "",
        });
      }
    });
    return Array.from(map.values());
  }, [customers, bills]);

  // Helper to generate unique Customer ID preventing collision with different phone numbers
  const generateUniqueCustomerId = (mobile, dateStr) => {
    const baseId = generateCustomerId(mobile, dateStr);
    if (!baseId) return "";
    const rawMobile = String(mobile || "").replace(/[^0-9]/g, "");

    const conflict =
      customers.find(
        (c) =>
          c.customer_id &&
          c.customer_id.toLowerCase() === baseId.toLowerCase() &&
          String(c.mobile || "").replace(/[^0-9]/g, "") &&
          String(c.mobile || "").replace(/[^0-9]/g, "") !== rawMobile
      ) ||
      bills.find(
        (b) =>
          b.customer_id &&
          b.customer_id.toLowerCase() === baseId.toLowerCase() &&
          String(b.customer_mobile || "").replace(/[^0-9]/g, "") &&
          String(b.customer_mobile || "").replace(/[^0-9]/g, "") !== rawMobile
      );

    if (conflict && rawMobile.length >= 8) {
      return `${baseId}-${rawMobile.slice(-4)}`;
    }
    return baseId;
  };

  // Handle typing or selecting Customer ID (Optional - auto-fills basic info)
  const handleCustomerIdChange = (val) => {
    const trimmed = val.trim();
    if (!trimmed) {
      setForm((prev) => ({
        ...prev,
        customer_id: "",
        customer_mobile: "",
        customer_name: "",
        customer_address: "",
      }));
      return;
    }

    const matched =
      customers.find((c) => c.customer_id && c.customer_id.toLowerCase() === trimmed.toLowerCase()) ||
      bills.find((b) => b.customer_id && b.customer_id.toLowerCase() === trimmed.toLowerCase());

    if (matched) {
      setForm((prev) => ({
        ...prev,
        customer_id: val,
        customer_mobile: matched.mobile || matched.customer_mobile || prev.customer_mobile || "",
        customer_address: matched.address || matched.customer_address || prev.customer_address || "",
        customer_name: matched.name || matched.customer_name || prev.customer_name || "",
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        customer_id: val,
      }));
    }
  };

  // Update Customer ID & info dynamically whenever mobile changes
  const handleMobileChange = (val) => {
    const rawMobile = String(val || "").replace(/[^0-9]/g, "");

    // 1) If mobile is cleared or has fewer than 5 digits:
    if (rawMobile.length < 5) {
      setForm((prev) => ({
        ...prev,
        customer_mobile: val,
        customer_id: "", // clear customer ID so previous customer past stats banner is cleared!
        customer_name: "",
        customer_address: "",
      }));
      return;
    }

    // 2) Look for existing customer matching the EXACT same phone number digits
    const existing =
      customers.find((c) => String(c.mobile || "").replace(/[^0-9]/g, "") === rawMobile) ||
      bills.find((b) => String(b.customer_mobile || "").replace(/[^0-9]/g, "") === rawMobile);

    if (existing) {
      // Existing customer profile found for this mobile number!
      const cid = existing.customer_id || generateUniqueCustomerId(val, form.bill_date);
      setForm((prev) => ({
        ...prev,
        customer_mobile: val,
        customer_id: cid,
        customer_name: existing.name || existing.customer_name || "",
        customer_address: existing.address || existing.customer_address || "",
      }));
    } else {
      // Brand new phone number! Generate new ID for this new number
      const newCid = generateUniqueCustomerId(val, form.bill_date);
      setForm((prev) => ({
        ...prev,
        customer_mobile: val,
        customer_id: newCid,
        // Reset name & address so previous customer's details don't remain
        customer_name: prev.customer_id && prev.customer_id !== newCid ? "" : prev.customer_name,
        customer_address: prev.customer_id && prev.customer_id !== newCid ? "" : prev.customer_address,
      }));
    }
  };

  // Handle typing Customer Name freely (different names can be entered for the same ID/phone without issue)
  const handleCustomerNameChange = (val) => {
    setForm((prev) => ({ ...prev, customer_name: val }));
  };

  // Past bills & ledger stats for the current Customer ID
  const customerPastBills = useMemo(() => {
    const rawMobile = String(form.customer_mobile || "").replace(/[^0-9]/g, "");
    // If mobile is less than 6 digits, do not show any past stats (clears previous customer history when editing/clearing)
    if (rawMobile.length < 6) return [];

    return bills.filter((b) => {
      const bMobile = String(b.customer_mobile || "").replace(/[^0-9]/g, "");
      // Match by exact phone number
      if (bMobile && bMobile === rawMobile) return true;
      // Match by customer_id if phone numbers are not conflicting
      if (
        form.customer_id &&
        b.customer_id &&
        b.customer_id.toLowerCase() === form.customer_id.toLowerCase() &&
        (!bMobile || bMobile === rawMobile)
      ) {
        return true;
      }
      return false;
    });
  }, [form.customer_id, form.customer_mobile, bills]);

  const customerPastStats = useMemo(() => {
    if (customerPastBills.length === 0) return null;
    const totalBilled = customerPastBills.reduce((s, b) => s + (Number(b.total_bill) || 0), 0);
    const totalPaid = customerPastBills.reduce((s, b) => s + (Number(b.client_payment) || 0), 0);
    const netDue = customerPastBills.reduce((s, b) => s + (Number(b.due_advance) || 0), 0);

    // Latest bill (last recorded entry)
    const sortedDesc = [...customerPastBills].sort((a, b) => {
      if (a.bill_date && b.bill_date && a.bill_date !== b.bill_date) {
        return b.bill_date.localeCompare(a.bill_date);
      }
      const idA = Number(a.id) || 0;
      const idB = Number(b.id) || 0;
      if (idA !== idB) return idB - idA;
      return (b.created_at || "").localeCompare(a.created_at || "");
    });
    const lastBill = sortedDesc[0] || null;
    const lastBillNo = lastBill?.bill_no
      ? (lastBill.bill_no.startsWith("#") ? lastBill.bill_no : `#${lastBill.bill_no}`)
      : lastBill?.id
      ? `ID #${lastBill.id}`
      : "N/A";

    return {
      count: customerPastBills.length,
      totalBilled,
      totalPaid,
      netDue,
      lastBill,
      lastBillNo,
      lastBillDate: lastBill?.bill_date || null,
    };
  }, [customerPastBills]);

  // Multiple Items Management
  const handleAddItem = () => {
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, emptyItem()],
    }));
  };

  const handleRemoveItem = (idx) => {
    if (form.items.length <= 1) return;
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== idx),
    }));
  };

  const handleItemFieldChange = (idx, field, val) => {
    setForm((prev) => {
      const items = [...prev.items];
      const row = { ...items[idx], [field]: val };

      // Auto Subtotal Calculation:
      // If Weight & Rate provided -> Weight * Rate
      // Else if Quantity & Rate provided -> Quantity * Rate
      if (field === "weight" || field === "quantity" || field === "rate") {
        const w = parseFloat(field === "weight" ? val : row.weight);
        const q = parseFloat(field === "quantity" ? val : row.quantity);
        const r = parseFloat(field === "rate" ? val : row.rate);

        if (!isNaN(w) && w > 0 && !isNaN(r) && r > 0) {
          row.subtotal = (w * r).toFixed(2);
        } else if (!isNaN(q) && q > 0 && !isNaN(r) && r > 0) {
          row.subtotal = (q * r).toFixed(2);
        }
      }

      items[idx] = row;
      return { ...prev, items };
    });
  };

  // Dynamic Calculation of Totals
  const itemsSubtotal = useMemo(() => {
    return (form.items || []).reduce((sum, it) => {
      const v = parseFloat(it.subtotal);
      return sum + (isNaN(v) ? 0 : v);
    }, 0);
  }, [form.items]);

  const labour = parseFloat(form.labour_charge) || 0;
  const transport = parseFloat(form.transport_cost) || 0;
  const discount = parseFloat(form.discount) || 0;
  const totalBill = Math.max(0, itemsSubtotal + labour + transport - discount);

  const payment = parseFloat(form.client_payment) || 0;
  const dueAdvance = totalBill - payment; // > 0 => Due, < 0 => Advance

  // In Words Conversions
  const totalBillInWords = useMemo(() => {
    return totalBill > 0 ? takaInWords(totalBill) : "Zero taka only.";
  }, [totalBill]);

  const dueAdvanceInWords = useMemo(() => {
    if (dueAdvance > 0) {
      return takaInWords(dueAdvance);
    } else if (dueAdvance < 0) {
      return takaInWords(Math.abs(dueAdvance));
    }
    return "Nil / Full Paid";
  }, [dueAdvance]);

  // Submit and Save Bill
  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    setSuccessMsg("");

    if (!form.customer_name.trim()) {
      setErr("Please enter customer name.");
      setBusy(false);
      return;
    }

    if (!form.customer_mobile.trim()) {
      setErr("Please enter customer mobile number.");
      setBusy(false);
      return;
    }

    try {
      const finalCid = form.customer_id.trim() || generateUniqueCustomerId(form.customer_mobile, form.bill_date);
      const payload = {
        ...form,
        customer_id: finalCid,
        labour_charge: labour,
        transport_cost: transport,
        discount: discount,
        total_bill: totalBill,
        client_payment: payment,
        due_advance: dueAdvance,
      };

      const res = await fetch("/api/bill-entry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.status === 401) {
        router.replace("/bill-entry/login");
        return;
      }

      const result = await res.json();
      if (!res.ok) {
        setErr(result.error || "Failed to save bill");
      } else {
        setSuccessMsg(`Bill #${form.bill_no || "saved"} recorded successfully!`);
        // Reset form for next entry
        setForm(defaultForm());
        await loadData();
      }
    } catch (error) {
      setErr(error.message || "An unexpected error occurred");
    } finally {
      setBusy(false);
    }
  }

  // Delete Bill (Moves to Recycle Bin)
  async function handleDelete(id, bNo) {
    if (!confirm(`Are you sure you want to move Bill #${bNo || id} to Recycle Bin?`)) return;
    try {
      const res = await fetch(`/api/bill-entry/${id}`, { method: "DELETE" });
      if (res.status === 401) {
        router.replace("/bill-entry/login");
        return;
      }
      setSuccessMsg(`Bill #${bNo || id} moved to Recycle Bin.`);
      await loadData();
    } catch (e) {
      alert("Failed to delete bill: " + e.message);
    }
  }

  // Recycle Bin Handlers
  async function handleRestoreBill(id, bNo) {
    try {
      setBusy(true);
      const res = await fetch("/api/bill-entry/recycle-bin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restore", id }),
      });
      if (res.status === 401) {
        router.replace("/bill-entry/login");
        return;
      }
      if (!res.ok) {
        const d = await res.json();
        alert(d.error || "Failed to restore bill");
        return;
      }
      setSuccessMsg(`Bill #${bNo || id} restored successfully!`);
      await loadData();
    } catch (e) {
      alert("Failed to restore bill: " + e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handlePermanentDeleteBill(id, bNo) {
    if (
      !confirm(
        `Are you sure you want to PERMANENTLY delete Bill #${bNo || id}?\n\nThis action CANNOT be undone and will permanently remove this bill from the database!`
      )
    ) {
      return;
    }
    try {
      setBusy(true);
      const res = await fetch("/api/bill-entry/recycle-bin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "permanent_delete", id }),
      });
      if (res.status === 401) {
        router.replace("/bill-entry/login");
        return;
      }
      if (!res.ok) {
        const d = await res.json();
        alert(d.error || "Failed to delete permanently");
        return;
      }
      setSuccessMsg(`Bill #${bNo || id} permanently deleted.`);
      await loadData();
    } catch (e) {
      alert("Failed to permanently delete bill: " + e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleRestoreAll() {
    if (!confirm("Are you sure you want to restore ALL items from the Recycle Bin?")) return;
    try {
      setBusy(true);
      const res = await fetch("/api/bill-entry/recycle-bin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restore_all" }),
      });
      if (res.status === 401) {
        router.replace("/bill-entry/login");
        return;
      }
      if (!res.ok) {
        const d = await res.json();
        alert(d.error || "Failed to restore all items");
        return;
      }
      setSuccessMsg("All bills from Recycle Bin have been restored!");
      await loadData();
    } catch (e) {
      alert("Failed to restore all: " + e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleEmptyRecycleBin() {
    if (
      !confirm(
        "Are you sure you want to EMPTY the Recycle Bin?\n\nAll deleted bills will be PERMANENTLY removed and cannot be recovered!"
      )
    ) {
      return;
    }
    try {
      setBusy(true);
      const res = await fetch("/api/bill-entry/recycle-bin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "empty" }),
      });
      if (res.status === 401) {
        router.replace("/bill-entry/login");
        return;
      }
      if (!res.ok) {
        const d = await res.json();
        alert(d.error || "Failed to empty recycle bin");
        return;
      }
      setSuccessMsg("Recycle Bin has been emptied.");
      await loadData();
    } catch (e) {
      alert("Failed to empty recycle bin: " + e.message);
    } finally {
      setBusy(false);
    }
  }

  const filteredRecycleItems = useMemo(() => {
    if (!recycleSearch || !recycleSearch.trim()) return recycleBinItems;
    const q = recycleSearch.trim().toLowerCase();
    return recycleBinItems.filter(
      (b) =>
        (b.customer_name && b.customer_name.toLowerCase().includes(q)) ||
        (b.customer_mobile && b.customer_mobile.toLowerCase().includes(q)) ||
        (b.customer_id && b.customer_id.toLowerCase().includes(q)) ||
        (b.bill_no && b.bill_no.toLowerCase().includes(q))
    );
  }, [recycleBinItems, recycleSearch]);

  // Safe Items parser
  function parseItems(raw) {
    if (Array.isArray(raw)) return raw;
    if (typeof raw === "string") {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }
    return [];
  }

  // Compute chronological running balance for each customer (calculating with previous due/advance)
  const billsWithBalance = useMemo(() => {
    if (!bills || bills.length === 0) return [];

    const getCustKey = (b) => {
      if (b.customer_id && b.customer_id.trim()) return `ID:${b.customer_id.trim()}`;
      if (b.customer_mobile && b.customer_mobile.trim()) {
        const clean = b.customer_mobile.replace(/[^0-9]/g, "");
        if (clean.length >= 6) return `MOB:${clean}`;
      }
      return `BILL:${b.id}`;
    };

    // Group bills by customer
    const customerBillsMap = new Map();
    bills.forEach((b) => {
      const key = getCustKey(b);
      if (!customerBillsMap.has(key)) {
        customerBillsMap.set(key, []);
      }
      customerBillsMap.get(key).push(b);
    });

    // Map of bill id -> { prevBalance, billNet, runningBalance }
    const balanceInfoMap = new Map();

    customerBillsMap.forEach((cList) => {
      // Sort this customer's bills chronologically (oldest first)
      const sorted = [...cList].sort((a, b) => {
        if (a.bill_date && b.bill_date && a.bill_date !== b.bill_date) {
          return a.bill_date.localeCompare(b.bill_date);
        }
        const idA = Number(a.id) || 0;
        const idB = Number(b.id) || 0;
        if (idA !== idB) return idA - idB;
        return (a.created_at || "").localeCompare(b.created_at || "");
      });

      let running = 0;
      sorted.forEach((b) => {
        const prev = running;
        const net = Number(b.due_advance) || 0;
        running += net;
        balanceInfoMap.set(b.id, {
          prevBalance: prev,
          billNet: net,
          runningBalance: running,
        });
      });

      // The final 'running' value is the customer's CURRENT final balance!
      // The last item in sorted is the customer's LATEST bill:
      if (sorted.length > 0) {
        const latestBill = sorted[sorted.length - 1];
        const latestInfo = balanceInfoMap.get(latestBill.id);
        if (latestInfo) {
          latestInfo.isLatestBillForCustomer = true;
          latestInfo.customerFinalBalance = running;
        }
      }
    });

    return bills.map((b) => {
      const info = balanceInfoMap.get(b.id) || {
        prevBalance: 0,
        billNet: Number(b.due_advance) || 0,
        runningBalance: Number(b.due_advance) || 0,
        isLatestBillForCustomer: false,
        customerFinalBalance: Number(b.due_advance) || 0,
      };
      return {
        ...b,
        prevBalance: info.prevBalance,
        billNet: info.billNet,
        runningBalance: info.runningBalance,
        isLatestBillForCustomer: Boolean(info.isLatestBillForCustomer),
        customerFinalBalance: Number(info.customerFinalBalance ?? info.runningBalance ?? 0),
      };
    });
  }, [bills]);

  // Group all records by Customer ID
  const customerIdGroups = useMemo(() => {
    const map = new Map();

    // 1. From customers table
    (customers || []).forEach((c) => {
      if (!c.customer_id) return;
      const cid = c.customer_id;
      if (!map.has(cid)) {
        map.set(cid, {
          customerId: cid,
          primaryName: c.name || "Customer",
          allNames: new Set(c.name ? [c.name] : []),
          mobile: c.mobile || "",
          address: c.address || "",
          bills: [],
          totalBilled: 0,
          totalPaid: 0,
          netDue: 0,
        });
      }
    });

    // 2. From bills table (with calculated running balances)
    (billsWithBalance || []).forEach((b) => {
      const cid = b.customer_id || (b.customer_mobile ? `M-${b.customer_mobile}` : `GUEST-${b.id}`);
      if (!map.has(cid)) {
        map.set(cid, {
          customerId: cid,
          primaryName: b.customer_name || "Customer",
          allNames: new Set(),
          mobile: b.customer_mobile || "",
          address: b.customer_address || "",
          bills: [],
          totalBilled: 0,
          totalPaid: 0,
          netDue: 0,
        });
      }
      const entry = map.get(cid);
      if (b.customer_name) entry.allNames.add(b.customer_name);
      if (b.customer_mobile) entry.mobile = b.customer_mobile;
      if (!entry.address && b.customer_address) entry.address = b.customer_address;
      entry.bills.push(b);
      entry.totalBilled += Number(b.total_bill) || 0;
      entry.totalPaid += Number(b.client_payment) || 0;
      entry.netDue += Number(b.due_advance) || 0;
    });

    return Array.from(map.values())
      .map((item) => {
        const namesList = Array.from(item.allNames || []);
        return {
          ...item,
          namesList,
          displayName: namesList[0] || item.primaryName || "Customer",
        };
      })
      .sort((a, b) => b.bills.length - a.bills.length || (a.customerId || "").localeCompare(b.customerId || ""));
  }, [customers, billsWithBalance]);

  // Filtered customer groups for modal search & balance filter
  const filteredCustomerGroups = useMemo(() => {
    return customerIdGroups.filter((g) => {
      const net = Number(g.netDue) || 0;
      if (modalBalanceFilter === "due" && net <= 0) return false;
      if (modalBalanceFilter === "advance" && net >= 0) return false;

      if (!modalSearch.trim()) return true;
      const q = modalSearch.toLowerCase();
      return (
        (g.customerId || "").toLowerCase().includes(q) ||
        (g.displayName || "").toLowerCase().includes(q) ||
        (g.mobile || "").toLowerCase().includes(q) ||
        (g.address || "").toLowerCase().includes(q) ||
        (g.namesList || []).some((n) => n.toLowerCase().includes(q))
      );
    });
  }, [customerIdGroups, modalSearch, modalBalanceFilter]);


  const activeCustomerGroup = useMemo(() => {
    if (!selectedCustomerId) return null;
    return customerIdGroups.find((g) => g.customerId === selectedCustomerId) || null;
  }, [customerIdGroups, selectedCustomerId]);

  // Delete Customer by Customer ID (Moves to Recycle Bin)
  async function handleDeleteCustomer(cid, name) {
    if (
      !confirm(
        `Are you sure you want to move Customer [${cid}] (${name}) and all their bills to Recycle Bin?`
      )
    ) {
      return;
    }
    try {
      setBusy(true);
      const res = await fetch(`/api/bill-entry?customer_id=${encodeURIComponent(cid)}`, {
        method: "DELETE",
      });
      if (res.status === 401) {
        router.replace("/bill-entry/login");
        return;
      }
      if (!res.ok) {
        const d = await res.json();
        alert(d.error || "Failed to delete customer");
        return;
      }
      if (selectedCustomerId === cid) {
        setSelectedCustomerId(null);
      }
      setSuccessMsg(`Customer [${cid}] and their bills moved to Recycle Bin.`);
      await loadData();
    } catch (e) {
      alert("Failed to delete customer: " + e.message);
    } finally {
      setBusy(false);
    }
  }

  // Logout
  async function handleLogout() {
    try {
      await fetch("/api/bill-entry/login", { method: "DELETE" });
    } catch {}
    router.replace("/bill-entry/login");
    router.refresh();
  }

  // Stats
  const totalBillsCount = bills.length;
  const sumTotalBills = bills.reduce((s, b) => s + (Number(b.total_bill) || 0), 0);
  const sumTotalPaid = bills.reduce((s, b) => s + (Number(b.client_payment) || 0), 0);
  const sumTotalDue = bills.reduce((s, b) => s + (Number(b.due_advance) || 0), 0);

  // Current Week Range (Auto-selected based on today's date, Saturday to Friday)
  const currentWeekRange = useMemo(() => {
    const now = new Date();
    const day = now.getDay(); // 0 is Sun, 6 is Sat
    // In Bangladesh, work week starts Saturday:
    const daysSinceSat = (day + 1) % 7;
    const start = new Date(now);
    start.setDate(now.getDate() - daysSinceSat);

    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    const p = (n) => String(n).padStart(2, "0");
    const sStr = `${start.getFullYear()}-${p(start.getMonth() + 1)}-${p(start.getDate())}`;
    const eStr = `${end.getFullYear()}-${p(end.getMonth() + 1)}-${p(end.getDate())}`;

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const label = `${start.getDate()} ${monthNames[start.getMonth()]} - ${end.getDate()} ${monthNames[end.getMonth()]}`;

    return { startStr: sStr, endStr: eStr, label };
  }, []);

  // Available Years list from data + current years
  const availableYears = useMemo(() => {
    const yearsSet = new Set([
      new Date().getFullYear() - 2,
      new Date().getFullYear() - 1,
      new Date().getFullYear(),
      new Date().getFullYear() + 1,
    ]);
    bills.forEach((b) => {
      if (b.bill_date) {
        const y = parseInt(b.bill_date.split("-")[0], 10);
        if (!isNaN(y)) yearsSet.add(y);
      }
    });
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [bills]);

  // Bills filtered by duration (All / Day / Week / Month / Year)
  const durationFilteredBills = useMemo(() => {
    return billsWithBalance.filter((b) => {
      if (durationMode === "all") return true;
      if (!b.bill_date) return false;

      if (durationMode === "day") {
        return b.bill_date === today();
      }

      if (durationMode === "week") {
        return b.bill_date >= currentWeekRange.startStr && b.bill_date <= currentWeekRange.endStr;
      }

      if (durationMode === "month") {
        const [bY, bM] = b.bill_date.split("-").map(Number);
        return bY === Number(selectedYear) && bM === Number(selectedMonth);
      }

      if (durationMode === "year") {
        const [bY] = b.bill_date.split("-").map(Number);
        return bY === Number(selectedYear);
      }

      return true;
    });
  }, [billsWithBalance, durationMode, selectedMonth, selectedYear, currentWeekRange]);

  // Target pool of bills according to duration
  const targetBillsPool = useMemo(() => {
    return durationMode === "all" ? billsWithBalance : durationFilteredBills;
  }, [durationMode, billsWithBalance, durationFilteredBills]);

  // Unique latest bills for each customer (represents current status of each customer)
  const latestCustomerBills = useMemo(() => {
    return targetBillsPool.filter((b) => b.isLatestBillForCustomer);
  }, [targetBillsPool]);

  // Due, Advance & Settled Customer Counts based on each customer's LATEST bill status
  const dueBillsCount = useMemo(
    () => latestCustomerBills.filter((b) => Number(b.customerFinalBalance) > 0).length,
    [latestCustomerBills]
  );
  const advanceBillsCount = useMemo(
    () => latestCustomerBills.filter((b) => Number(b.customerFinalBalance) < 0).length,
    [latestCustomerBills]
  );
  const paidBillsCount = useMemo(
    () => latestCustomerBills.filter((b) => Number(b.customerFinalBalance) === 0).length,
    [latestCustomerBills]
  );

  const dueCustomersCount = useMemo(
    () => customerIdGroups.filter((g) => (Number(g.netDue) || 0) > 0).length,
    [customerIdGroups]
  );
  const advanceCustomersCount = useMemo(
    () => customerIdGroups.filter((g) => (Number(g.netDue) || 0) < 0).length,
    [customerIdGroups]
  );

  // Filtered Bills:
  // - If 'due': show ONLY the latest bill for customers who currently owe money (net balance > 0)
  // - If 'advance': show ONLY the latest bill for customers who currently have advance payment (net balance < 0)
  // - If 'paid': show ONLY the latest bill for customers who are fully settled (net balance === 0)
  // - If 'all': show all invoices according to duration and search query
  const filteredBills = useMemo(() => {
    let list = [];

    if (balanceFilter === "due") {
      list = latestCustomerBills.filter((b) => Number(b.customerFinalBalance) > 0);
    } else if (balanceFilter === "advance") {
      list = latestCustomerBills.filter((b) => Number(b.customerFinalBalance) < 0);
    } else if (balanceFilter === "paid") {
      list = latestCustomerBills.filter((b) => Number(b.customerFinalBalance) === 0);
    } else {
      list = durationFilteredBills;
    }

    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(
      (b) =>
        (b.customer_name || "").toLowerCase().includes(q) ||
        (b.customer_mobile || "").toLowerCase().includes(q) ||
        (b.customer_id || "").toLowerCase().includes(q) ||
        (b.bill_no || "").toLowerCase().includes(q)
    );
  }, [balanceFilter, latestCustomerBills, durationFilteredBills, search]);

  // Export to Excel Function (Auto detects active filters, or Full/Due/Advance modes)
  function handleExportExcel(mode = "auto") {
    try {
      const isFilterActive =
        balanceFilter !== "all" || durationMode !== "all" || Boolean(search.trim());
      const effectiveMode = mode === "auto" ? (isFilterActive ? "filtered" : "all") : mode;

      const wb = XLSX.utils.book_new();

      // Period text
      let periodInfo = "All Time";
      if (durationMode === "day") periodInfo = `Today (${today()})`;
      else if (durationMode === "week") periodInfo = `This Week (${currentWeekRange.label})`;
      else if (durationMode === "month") periodInfo = `Month (${MONTH_SHORT[selectedMonth - 1]} ${selectedYear})`;
      else if (durationMode === "year") periodInfo = `Year (${selectedYear})`;

      // Helper to format invoices sheet
      const makeInvoicesSheet = (billList, sheetTitle) => {
        const rows = [
          ["CHOWDHURY ENGINEERING WORKS"],
          [sheetTitle],
          [`Generated Date: ${today()} | Period: ${periodInfo} | Total Records: ${billList.length}`],
          [],
          [
            "SL",
            "Date",
            "Bill No",
            "Customer ID",
            "Customer Name",
            "Mobile",
            "Address",
            "Items Count",
            "Total Bill (BDT)",
            "Payment (BDT)",
            "Due (BDT)",
            "Advance (BDT)",
            "Remarks / Note",
          ],
        ];

        let tBill = 0;
        let tPaid = 0;
        let tDue = 0;
        let tAdv = 0;

        billList.forEach((b, i) => {
          const runBal = b.runningBalance !== undefined ? Number(b.runningBalance) : Number(b.due_advance) || 0;
          const dueVal = runBal > 0 ? runBal : 0;
          const advVal = runBal < 0 ? Math.abs(runBal) : 0;
          const itCount = Array.isArray(b.items) ? b.items.length : 0;

          tBill += Number(b.total_bill) || 0;
          tPaid += Number(b.client_payment) || 0;
          tDue += dueVal;
          tAdv += advVal;

          rows.push([
            i + 1,
            b.bill_date || "-",
            b.bill_no || "-",
            b.customer_id || "-",
            b.customer_name || "-",
            b.customer_mobile || "-",
            b.customer_address || "-",
            itCount,
            Number(b.total_bill || 0),
            Number(b.client_payment || 0),
            dueVal,
            advVal,
            b.note || "",
          ]);
        });

        rows.push([]);
        rows.push([
          "TOTAL",
          "",
          "",
          "",
          "",
          "",
          "",
          "",
          tBill,
          tPaid,
          tDue,
          tAdv,
          "",
        ]);

        const ws = XLSX.utils.aoa_to_sheet(rows);
        ws["!cols"] = [
          { wch: 6 },
          { wch: 12 },
          { wch: 12 },
          { wch: 20 },
          { wch: 24 },
          { wch: 15 },
          { wch: 22 },
          { wch: 12 },
          { wch: 16 },
          { wch: 16 },
          { wch: 16 },
          { wch: 16 },
          { wch: 30 },
        ];
        return ws;
      };

      // Helper to format customer summary sheet
      const makeCustomersSummarySheet = (targetGroups, sheetTitle) => {
        const rows = [
          ["CHOWDHURY ENGINEERING WORKS"],
          [sheetTitle],
          [`Generated Date: ${today()} | Period: ${periodInfo}`],
          [],
          [
            "SL",
            "Customer ID",
            "Customer Name",
            "Mobile No",
            "Address",
            "Invoices Count",
            "Total Billed (BDT)",
            "Total Paid (BDT)",
            "Net Balance (BDT)",
            "Balance Status",
          ],
        ];

        let sl = 1;
        let sumBilled = 0;
        let sumPaid = 0;
        let sumNet = 0;

        targetGroups.forEach((g) => {
          const net = Number(g.netDue) || 0;
          const status = net > 0 ? "DUE" : net < 0 ? "ADVANCE" : "SETTLED";
          rows.push([
            sl++,
            g.customerId || "-",
            g.displayName || "-",
            g.mobile || "-",
            g.address || "-",
            g.bills.length,
            Number(g.totalBilled || 0),
            Number(g.totalPaid || 0),
            Number(Math.abs(net)),
            status,
          ]);
          sumBilled += Number(g.totalBilled || 0);
          sumPaid += Number(g.totalPaid || 0);
          sumNet += net;
        });

        rows.push([]);
        rows.push([
          "TOTAL",
          "",
          "",
          "",
          "",
          "",
          sumBilled,
          sumPaid,
          Math.abs(sumNet),
          sumNet > 0 ? "NET DUE" : sumNet < 0 ? "NET ADVANCE" : "SETTLED",
        ]);

        const ws = XLSX.utils.aoa_to_sheet(rows);
        ws["!cols"] = [
          { wch: 6 },
          { wch: 22 },
          { wch: 25 },
          { wch: 16 },
          { wch: 25 },
          { wch: 14 },
          { wch: 18 },
          { wch: 18 },
          { wch: 18 },
          { wch: 16 },
        ];
        return ws;
      };

      if (effectiveMode === "filtered") {
        const filteredCids = new Set(filteredBills.map((b) => b.customer_id).filter(Boolean));
        const filteredGroups = customerIdGroups.filter((g) => filteredCids.has(g.customerId));

        let titleTag = "FILTERED INVOICES";
        if (balanceFilter === "due") titleTag = "OUTSTANDING DUE INVOICES";
        else if (balanceFilter === "advance") titleTag = "ADVANCE PAYMENT INVOICES";
        else if (balanceFilter === "paid") titleTag = "PAID INVOICES";

        // Sheet 1: Filtered Invoices
        XLSX.utils.book_append_sheet(
          wb,
          makeInvoicesSheet(filteredBills, titleTag),
          "Invoices"
        );

        // Sheet 2: Filtered Customers Summary
        if (filteredGroups.length > 0) {
          XLSX.utils.book_append_sheet(
            wb,
            makeCustomersSummarySheet(filteredGroups, "CUSTOMER BALANCES SUMMARY"),
            "Customer Summary"
          );
        }

        const tag =
          balanceFilter !== "all"
            ? balanceFilter.charAt(0).toUpperCase() + balanceFilter.slice(1)
            : durationMode !== "all"
            ? durationMode.charAt(0).toUpperCase() + durationMode.slice(1)
            : "Filtered";
        XLSX.writeFile(wb, `CEW_${tag}_Invoices_${ymd(today())}.xlsx`);
      } else if (effectiveMode === "due") {
        const dueBills = durationFilteredBills.filter((b) => (Number(b.due_advance) || 0) > 0);
        const dueGroups = customerIdGroups.filter((g) => (Number(g.netDue) || 0) > 0);
        XLSX.utils.book_append_sheet(
          wb,
          makeInvoicesSheet(dueBills, "OUTSTANDING DUE INVOICES"),
          "Due Invoices"
        );
        XLSX.utils.book_append_sheet(
          wb,
          makeCustomersSummarySheet(dueGroups, "DUE CUSTOMERS SUMMARY"),
          "Due Customers"
        );
        XLSX.writeFile(wb, `CEW_Due_Invoices_${ymd(today())}.xlsx`);
      } else if (effectiveMode === "advance") {
        const advBills = durationFilteredBills.filter((b) => (Number(b.due_advance) || 0) < 0);
        const advGroups = customerIdGroups.filter((g) => (Number(g.netDue) || 0) < 0);
        XLSX.utils.book_append_sheet(
          wb,
          makeInvoicesSheet(advBills, "ADVANCE PAYMENT INVOICES"),
          "Adv Invoices"
        );
        XLSX.utils.book_append_sheet(
          wb,
          makeCustomersSummarySheet(advGroups, "ADVANCE CUSTOMERS SUMMARY"),
          "Adv Customers"
        );
        XLSX.writeFile(wb, `CEW_Advance_Invoices_${ymd(today())}.xlsx`);
      } else {
        // Mode "all" (Master Report)
        const dueBills = bills.filter((b) => (Number(b.due_advance) || 0) > 0);
        const advBills = bills.filter((b) => (Number(b.due_advance) || 0) < 0);
        XLSX.utils.book_append_sheet(
          wb,
          makeCustomersSummarySheet(customerIdGroups, "ALL CUSTOMER BALANCES SUMMARY"),
          "Customer Balances"
        );
        XLSX.utils.book_append_sheet(
          wb,
          makeInvoicesSheet(dueBills, "OUTSTANDING DUE INVOICES"),
          "Due Invoices"
        );
        XLSX.utils.book_append_sheet(
          wb,
          makeInvoicesSheet(advBills, "ADVANCE PAYMENT INVOICES"),
          "Advance Invoices"
        );
        XLSX.utils.book_append_sheet(
          wb,
          makeInvoicesSheet(bills, "ALL RECORDED INVOICES"),
          "All Invoices"
        );
        XLSX.writeFile(wb, `CEW_All_Invoices_Master_${ymd(today())}.xlsx`);
      }
    } catch (err) {
      console.error("Excel export failed:", err);
      alert("Failed to export Excel file: " + err.message);
    } finally {
      setShowExcelMenu(false);
    }
  }

  // Export Single Customer Complete Detailed Statement & Items to Excel (.xlsx)
  function handleExportCustomerDetailedExcel(group) {
    if (!group) return;
    try {
      const wb = XLSX.utils.book_new();

      // Sort chronological (oldest bill to latest bill) for progressive ledger
      const chronologicalBills = [...(group.bills || [])].sort((a, b) => {
        if (a.bill_date && b.bill_date && a.bill_date !== b.bill_date) {
          return a.bill_date.localeCompare(b.bill_date);
        }
        const idA = Number(a.id) || 0;
        const idB = Number(b.id) || 0;
        return idA - idB;
      });

      const netStatusText =
        group.netDue > 0
          ? `DUE (BDT ${fmt(group.netDue)})`
          : group.netDue < 0
          ? `ADVANCE (BDT ${fmt(Math.abs(group.netDue))})`
          : "FULLY SETTLED (0)";

      /* =========================================================================
         SHEET 1: DETAILED ITEMS & ORDERS STATEMENT
         ========================================================================= */
      const itemRows = [
        ["CHOWDHURY ENGINEERING WORKS"],
        ["CUSTOMER DETAILED ORDER & ITEM STATEMENT"],
        [`Generated Date: ${today()} | Time: ${new Date().toLocaleTimeString()}`],
        [],
        ["CUSTOMER PROFILE", ""],
        ["Customer ID:", group.customerId || "-", "", "Total Invoices:", chronologicalBills.length],
        ["Customer Name:", group.displayName || "-", "", "Total Billed (BDT):", Number(group.totalBilled || 0)],
        ["Mobile Number:", group.mobile || "-", "", "Total Paid (BDT):", Number(group.totalPaid || 0)],
        ["Address:", group.address || "-", "", "Net Outstanding Status:", netStatusText],
        [],
        [
          "SL",
          "Bill Date",
          "Bill No",
          "Item #",
          "Item Description",
          "Weight (KG)",
          "Quantity",
          "Unit Rate (BDT)",
          "Item Subtotal (BDT)",
          "Labour (BDT)",
          "Transport (BDT)",
          "Discount (BDT)",
          "Bill Total (BDT)",
          "Client Paid (BDT)",
          "Bill Net Due/Adv (BDT)",
          "Running Balance (BDT)",
          "Remarks / Note",
        ],
      ];

      let itemSl = 1;
      let totalItemWeight = 0;
      let totalItemSubtotal = 0;
      let sumLabour = 0;
      let sumTransport = 0;
      let sumDiscount = 0;
      let sumBillTotal = 0;
      let sumPaid = 0;

      chronologicalBills.forEach((b) => {
        const items = parseItems(b.items);
        const billTotalVal = Number(b.total_bill) || 0;
        const paidVal = Number(b.client_payment) || 0;
        const labourVal = Number(b.labour_charge) || 0;
        const transportVal = Number(b.transport_cost) || 0;
        const discountVal = Number(b.discount) || 0;
        const netVal = Number(b.due_advance) || 0;
        const runningVal = b.runningBalance !== undefined ? Number(b.runningBalance) : netVal;

        sumLabour += labourVal;
        sumTransport += transportVal;
        sumDiscount += discountVal;
        sumBillTotal += billTotalVal;
        sumPaid += paidVal;

        if (items.length === 0) {
          // Bill without specific item entries
          itemRows.push([
            itemSl++,
            b.bill_date || "-",
            b.bill_no || b.id || "-",
            "-",
            "(No line-item breakdown)",
            "-",
            "-",
            "-",
            "-",
            labourVal,
            transportVal,
            discountVal,
            billTotalVal,
            paidVal,
            netVal,
            runningVal,
            b.note || "",
          ]);
        } else {
          // Bill has 1 or more items
          items.forEach((it, idx) => {
            const wNum = parseFloat(it.weight);
            if (!isNaN(wNum)) totalItemWeight += wNum;
            const subNum = Number(it.subtotal) || 0;
            totalItemSubtotal += subNum;

            if (idx === 0) {
              // First item row contains bill header figures
              itemRows.push([
                itemSl++,
                b.bill_date || "-",
                b.bill_no || b.id || "-",
                idx + 1,
                it.name || "Item",
                !isNaN(wNum) ? wNum : (it.weight || "-"),
                it.quantity || "-",
                it.rate !== "" && it.rate !== null && !isNaN(Number(it.rate)) ? Number(it.rate) : (it.rate || "-"),
                subNum,
                labourVal,
                transportVal,
                discountVal,
                billTotalVal,
                paidVal,
                netVal,
                runningVal,
                b.note || "",
              ]);
            } else {
              // Subsequent items under the same bill
              itemRows.push([
                "",
                b.bill_date || "-",
                b.bill_no || b.id || "-",
                idx + 1,
                it.name || "Item",
                !isNaN(wNum) ? wNum : (it.weight || "-"),
                it.quantity || "-",
                it.rate !== "" && it.rate !== null && !isNaN(Number(it.rate)) ? Number(it.rate) : (it.rate || "-"),
                subNum,
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                "",
              ]);
            }
          });
        }
      });

      // Bottom Totals Row for Sheet 1
      itemRows.push([]);
      const lastBill = chronologicalBills[chronologicalBills.length - 1];
      const finalRunningBalance =
        lastBill && lastBill.runningBalance !== undefined
          ? Number(lastBill.runningBalance)
          : Number(group.netDue || 0);

      itemRows.push([
        "TOTAL",
        "",
        "",
        "",
        "SUMMARY",
        totalItemWeight > 0 ? totalItemWeight : "",
        "",
        "",
        totalItemSubtotal,
        sumLabour,
        sumTransport,
        sumDiscount,
        sumBillTotal,
        sumPaid,
        Number(group.netDue || 0),
        finalRunningBalance,
        netStatusText,
      ]);

      const wsItems = XLSX.utils.aoa_to_sheet(itemRows);
      wsItems["!cols"] = [
        { wch: 6 },   // SL
        { wch: 13 },  // Date
        { wch: 12 },  // Bill No
        { wch: 8 },   // Item #
        { wch: 28 },  // Item Description
        { wch: 14 },  // Weight (kg)
        { wch: 12 },  // Quantity
        { wch: 15 },  // Unit Rate
        { wch: 18 },  // Subtotal
        { wch: 14 },  // Labour
        { wch: 14 },  // Transport
        { wch: 14 },  // Discount
        { wch: 16 },  // Bill Total
        { wch: 16 },  // Client Paid
        { wch: 18 },  // Bill Net Due/Adv
        { wch: 18 },  // Running Balance
        { wch: 28 },  // Remarks
      ];
      XLSX.utils.book_append_sheet(wb, wsItems, "Detailed Items Breakdown");

      /* =========================================================================
         SHEET 2: INVOICES & PAYMENT LEDGER (ONE ROW PER BILL)
         ========================================================================= */
      const ledgerRows = [
        ["CHOWDHURY ENGINEERING WORKS"],
        ["CUSTOMER INVOICES & PAYMENT ACCOUNT LEDGER"],
        [`Customer: ${group.displayName} (${group.customerId}) | Mobile: ${group.mobile || "-"} | Date: ${today()}`],
        [],
        [
          "SL",
          "Bill Date",
          "Bill No",
          "Items Breakdown Summary",
          "Labour (BDT)",
          "Transport (BDT)",
          "Discount (BDT)",
          "Total Bill (BDT)",
          "Payment (BDT)",
          "Bill Due / Adv (BDT)",
          "Running Balance (BDT)",
          "Status",
          "Remarks / Note",
        ],
      ];

      chronologicalBills.forEach((b, i) => {
        const items = parseItems(b.items);
        const itemSummaryText =
          items.length > 0
            ? items
                .map(
                  (it) =>
                    `${it.name || "Item"}${it.weight ? ` [${it.weight}kg]` : ""}${
                      it.quantity ? ` [${it.quantity}pcs]` : ""
                    }${it.rate ? ` @${it.rate}` : ""}`
                )
                .join("; ")
            : "(No line items)";

        const runBal =
          b.runningBalance !== undefined ? Number(b.runningBalance) : Number(b.due_advance) || 0;
        const bStatus = runBal > 0 ? "DUE" : runBal < 0 ? "ADVANCE" : "SETTLED";

        ledgerRows.push([
          i + 1,
          b.bill_date || "-",
          b.bill_no || b.id || "-",
          itemSummaryText,
          Number(b.labour_charge || 0),
          Number(b.transport_cost || 0),
          Number(b.discount || 0),
          Number(b.total_bill || 0),
          Number(b.client_payment || 0),
          Number(b.due_advance || 0),
          runBal,
          bStatus,
          b.note || "",
        ]);
      });

      ledgerRows.push([]);
      ledgerRows.push([
        "TOTAL",
        "",
        "",
        `${chronologicalBills.length} Invoices Recorded`,
        sumLabour,
        sumTransport,
        sumDiscount,
        sumBillTotal,
        sumPaid,
        Number(group.netDue || 0),
        finalRunningBalance,
        netStatusText,
        "",
      ]);

      const wsLedger = XLSX.utils.aoa_to_sheet(ledgerRows);
      wsLedger["!cols"] = [
        { wch: 6 },
        { wch: 13 },
        { wch: 12 },
        { wch: 38 },
        { wch: 14 },
        { wch: 14 },
        { wch: 14 },
        { wch: 16 },
        { wch: 16 },
        { wch: 18 },
        { wch: 18 },
        { wch: 14 },
        { wch: 28 },
      ];
      XLSX.utils.book_append_sheet(wb, wsLedger, "Invoices Ledger");

      // Save workbook to file
      const safeName = (group.displayName || "Customer").replace(/[^a-zA-Z0-9_-]/g, "_");
      const safeCid = (group.customerId || "CID").replace(/[^a-zA-Z0-9_-]/g, "_");
      XLSX.writeFile(wb, `CEW_${safeCid}_${safeName}_Detailed_Statement_${ymd(today())}.xlsx`);
    } catch (err) {
      console.error("Export customer detailed excel failed:", err);
      alert("Failed to export detailed customer Excel statement: " + err.message);
    }
  }

  return (
    <main className="be-wrapper">
      {/* Top Navbar Header */}
      <header className="be-header">
        <div className="be-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/cew-icon.png" alt="CEW" className="be-logo" />
          <div className="be-title-box">
            <h1>Customer Bill Entry & Invoicing</h1>
            <p>Chowdhury Engineering Works • Automated Invoicing & Ledger</p>
          </div>
        </div>

        <nav className="be-nav-actions">
          {/* Customers Directory Button */}
          <button
            type="button"
            onClick={() => {
              setShowCustomersModal(true);
              setSelectedCustomerId(null);
              setModalSearch("");
            }}
            className="be-nav-btn"
            style={{
              background: "#1e3a8a",
              color: "#ffffff",
              borderColor: "#1d4ed8",
              fontWeight: 700,
            }}
            title="View All Customers ID-wise"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            Customers Directory ({customerIdGroups.length})
          </button>

          {/* Recycle Bin Button */}
          <button
            type="button"
            onClick={() => {
              setShowRecycleModal(true);
              setRecycleSearch("");
            }}
            className={`be-nav-btn recycle ${recycleBinItems.length > 0 ? "has-items" : ""}`}
            title="Recycle Bin (Deleted Items)"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <line x1="10" y1="11" x2="10" y2="17" />
              <line x1="14" y1="11" x2="14" y2="17" />
            </svg>
            Recycle Bin
            {recycleBinItems.length > 0 && (
              <span className="be-recycle-pill">{recycleBinItems.length}</span>
            )}
          </button>

          <Link href="/" className="be-nav-btn" title="Go to Quotation Generator">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
            Quotation Generator
          </Link>

          <Link href="/bill-calculator" className="be-nav-btn" title="Go to Bill Calculator">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
              <path d="M9 22v-4h6v4" />
              <line x1="8" y1="6" x2="8" y2="6" />
              <line x1="16" y1="6" x2="16" y2="6" />
            </svg>
            Bill Calculator
          </Link>

          <button type="button" onClick={handleLogout} className="be-nav-btn logout" title="Sign out from Bill Entry">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Log Out
          </button>
        </nav>
      </header>


      {/* KPI Stats Bar */}
      <section className="be-stats-grid">
        <div className="be-stat-card">
          <span className="label">Total Invoices</span>
          <span className="val">{totalBillsCount}</span>
        </div>
        <div className="be-stat-card">
          <span className="label">Total Billed</span>
          <span className="val">৳ {fmt(sumTotalBills)}</span>
        </div>
        <div className="be-stat-card paid">
          <span className="label">Total Collected</span>
          <span className="val">৳ {fmt(sumTotalPaid)}</span>
        </div>
        <div className="be-stat-card due">
          <span className="label">Outstanding Due</span>
          <span className="val">৳ {fmt(sumTotalDue)}</span>
        </div>
      </section>

      {/* Main Entry Form Card */}
      <section className="be-card">
        <div className="be-card-header">
          <h2 className="be-card-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--be-primary)" }}>
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            New Customer Bill Entry
          </h2>
          <span style={{ fontSize: "0.82rem", color: "var(--be-text-muted)" }}>
            Fill customer & item information to generate bill & track payment
          </span>
        </div>

        {err && (
          <div style={{ background: "#fee2e2", color: "#b91c1c", padding: "10px 14px", borderRadius: "8px", marginBottom: "16px", fontSize: "0.88rem", fontWeight: 600 }}>
            {err}
          </div>
        )}

        {successMsg && (
          <div style={{ background: "#ecfdf5", color: "#065f46", padding: "10px 14px", borderRadius: "8px", marginBottom: "16px", fontSize: "0.88rem", fontWeight: 600 }}>
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Section 1: Bill Meta & Customer Info */}
          <div className="be-form-section">
            <div className="be-section-heading">
              <span>1. Invoice & Customer Information</span>
            </div>

            <div className="be-grid-2" style={{ marginBottom: "14px" }}>
              {/* 1) Date */}
              <div className="be-field-group">
                <label htmlFor="f-date">
                  1) Date <span className="req">*</span>
                </label>
                <input
                  id="f-date"
                  type="date"
                  className="be-input"
                  value={form.bill_date}
                  onChange={(e) => setForm({ ...form, bill_date: e.target.value })}
                  required
                />
              </div>

              {/* 2) Bill No */}
              <div className="be-field-group">
                <label htmlFor="f-billno">
                  2) Bill No.
                </label>
                <input
                  id="f-billno"
                  type="text"
                  className="be-input"
                  placeholder="Enter bill no. (e.g. 101, B-205)"
                  value={form.bill_no}
                  onChange={(e) => setForm({ ...form, bill_no: e.target.value })}
                />
              </div>
            </div>

            <div className="be-grid-4">
              {/* Customer ID (Optional) */}
              <div className="be-field-group">
                <label htmlFor="f-cid">
                  Customer ID <span style={{ fontSize: "0.74rem", color: "var(--be-text-muted)" }}>(Optional)</span>
                </label>
                <input
                  id="f-cid"
                  type="text"
                  className="be-input"
                  placeholder="e.g. CID-10-2026-01712 (Optional)"
                  list="cid-suggestions"
                  value={form.customer_id}
                  onChange={(e) => handleCustomerIdChange(e.target.value)}
                />
                <datalist id="cid-suggestions">
                  {allKnownCustomerProfiles.map((c) => (
                    <option key={c.customer_id} value={c.customer_id}>
                      {c.name ? `${c.name} • ` : ""}{c.mobile || ""}
                    </option>
                  ))}
                </datalist>
              </div>

              {/* 3) Customer Name */}
              <div className="be-field-group">
                <label htmlFor="f-name">
                  3) Customer Name <span className="req">*</span>
                </label>
                <input
                  id="f-name"
                  type="text"
                  className="be-input"
                  placeholder="Enter name for this bill"
                  value={form.customer_name}
                  onChange={(e) => handleCustomerNameChange(e.target.value)}
                  required
                />
              </div>

              {/* 4) Address */}
              <div className="be-field-group">
                <label htmlFor="f-address">4) Customer Address</label>
                <input
                  id="f-address"
                  type="text"
                  className="be-input"
                  placeholder="e.g. Gazipur, Dhaka"
                  value={form.customer_address}
                  onChange={(e) => setForm({ ...form, customer_address: e.target.value })}
                />
              </div>

              {/* 5) Mobile No */}
              <div className="be-field-group">
                <label htmlFor="f-mobile">
                  5) Mobile No. <span className="req">*</span>
                </label>
                <input
                  id="f-mobile"
                  type="text"
                  className="be-input"
                  placeholder="e.g. 01712345678"
                  list="mobile-suggestions"
                  value={form.customer_mobile}
                  onChange={(e) => handleMobileChange(e.target.value)}
                  required
                />
                <datalist id="mobile-suggestions">
                  {allKnownCustomerProfiles.map((c) => (
                    <option key={c.customer_id} value={c.mobile}>
                      {c.name ? `${c.name} (${c.customer_id})` : c.customer_id}
                    </option>
                  ))}
                </datalist>
              </div>
            </div>

            {/* Existing Customer Profile / History Banner */}
            {customerPastStats && (
              <div
                style={{
                  marginTop: "12px",
                  background: "#ecfdf5",
                  border: "1px solid #a7f3d0",
                  borderRadius: "8px",
                  padding: "10px 14px",
                  fontSize: "0.83rem",
                  color: "#065f46",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "8px",
                }}
              >
                <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#059669" }}>
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <span>
                    <b>Linked Profile:</b> {form.customer_id || "Customer"} {form.customer_name ? `• ${form.customer_name}` : ""}
                  </span>
                </div>
                <div style={{ display: "inline-flex", gap: "14px", alignItems: "center", flexWrap: "wrap" }}>
                  <span>
                    Last Bill No:{" "}
                    <b style={{ color: "#064e3b", background: "#d1fae5", padding: "1px 7px", borderRadius: "4px", border: "1px solid #a7f3d0" }}>
                      {customerPastStats.lastBillNo}
                    </b>
                    {customerPastStats.lastBillDate && (
                      <span style={{ color: "#047857", fontSize: "0.78rem", marginLeft: "4px" }}>
                        ({customerPastStats.lastBillDate})
                      </span>
                    )}
                  </span>
                  <span>
                    Previous Bills: <b>{customerPastStats.count}</b>
                  </span>
                  <span>
                    Previous Balance:{" "}
                    <b style={{ color: customerPastStats.netDue > 0 ? "#dc2626" : "#059669" }}>
                      {customerPastStats.netDue > 0
                        ? `Due: ৳ ${fmt(customerPastStats.netDue)}`
                        : customerPastStats.netDue < 0
                        ? `Adv: ৳ ${fmt(Math.abs(customerPastStats.netDue))}`
                        : "Fully Paid"}
                    </b>
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Items Table (Multiple Items) */}
          <div className="be-form-section">
            <div className="be-section-heading">
              <span>6. Item Breakdown (Item Name, Weight, Quantity, Rate, Sub-Total)</span>
            </div>

            <div className="be-items-container">
              <table className="be-items-table">
                <thead>
                  <tr>
                    <th style={{ width: "40px", textAlign: "center" }}>#</th>
                    <th>Item Description</th>
                    <th style={{ width: "130px" }}>Weight (kg)</th>
                    <th style={{ width: "110px" }}>Quantity (pcs)</th>
                    <th style={{ width: "130px" }}>Rate (৳)</th>
                    <th style={{ width: "140px", textAlign: "right" }}>Sub-Total (৳)</th>
                    <th style={{ width: "50px", textAlign: "center" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {form.items.map((item, idx) => (
                    <tr key={idx}>
                      <td style={{ textAlign: "center", color: "var(--be-text-muted)", fontWeight: 600 }}>
                        {idx + 1}
                      </td>
                      <td>
                        <input
                          type="text"
                          placeholder="Select or type item name..."
                          list="item-presets"
                          value={item.name}
                          onChange={(e) => handleItemFieldChange(idx, "name", e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          placeholder="e.g. 50"
                          value={item.weight}
                          onChange={(e) => handleItemFieldChange(idx, "weight", e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          placeholder="e.g. 10"
                          value={item.quantity}
                          onChange={(e) => handleItemFieldChange(idx, "quantity", e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          placeholder="e.g. 120"
                          value={item.rate}
                          onChange={(e) => handleItemFieldChange(idx, "rate", e.target.value)}
                        />
                      </td>
                      <td className="subtotal-cell">
                        <input
                          type="number"
                          step="any"
                          min="0"
                          placeholder="0.00"
                          value={item.subtotal}
                          style={{ textAlign: "right", fontWeight: 700 }}
                          onChange={(e) => handleItemFieldChange(idx, "subtotal", e.target.value)}
                        />
                      </td>
                      <td style={{ textAlign: "center" }}>
                        {form.items.length > 1 && (
                          <button
                            type="button"
                            className="be-del-row-btn"
                            onClick={() => handleRemoveItem(idx)}
                            title="Delete this item row"
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="be-add-item-bar">
                <button type="button" className="be-btn-add" onClick={handleAddItem}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Add Another Item Row
                </button>
              </div>

              {/* Datalist for item presets */}
              <datalist id="item-presets">
                {ITEM_PRESETS.map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
            </div>
          </div>

          {/* Section 3: Additional Charges (Labour, Transport & Discount) */}
          <div className="be-form-section">
            <div className="be-section-heading">
              <span>7 & 8. Additional Charges & Discount (In Taka / ৳)</span>
            </div>

            <div className="be-charges-bar">
              <div className="be-field-group">
                <label htmlFor="f-labour">7) Labour Charge (BDT)</label>
                <input
                  id="f-labour"
                  type="number"
                  step="any"
                  min="0"
                  className="be-input"
                  placeholder="e.g. 500"
                  value={form.labour_charge}
                  onChange={(e) => setForm({ ...form, labour_charge: e.target.value })}
                />
              </div>

              <div className="be-field-group">
                <label htmlFor="f-transport">8) Transportation Cost (BDT)</label>
                <input
                  id="f-transport"
                  type="number"
                  step="any"
                  min="0"
                  className="be-input"
                  placeholder="e.g. 1500"
                  value={form.transport_cost}
                  onChange={(e) => setForm({ ...form, transport_cost: e.target.value })}
                />
              </div>

              <div className="be-field-group">
                <label htmlFor="f-discount" style={{ color: "#b91c1c", fontWeight: 700 }}>
                  Discount (Less Taka / ৳)
                </label>
                <input
                  id="f-discount"
                  type="number"
                  step="any"
                  min="0"
                  className="be-input"
                  placeholder="e.g. 1000 (Flat amount in Tk)"
                  value={form.discount}
                  onChange={(e) => setForm({ ...form, discount: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Section 4: Total Bill, Client Payment, Due/Advance & In Words */}
          <div className="be-form-section">
            <div className="be-section-heading">
              <span>9, 10 & 11. Bill Calculation, Payment & Balance</span>
            </div>

            <div className="be-calc-summary-grid">
              {/* 9) Total Bill Box */}
              <div className="be-calc-box total-bill-box">
                <div className="be-calc-top-row">
                  <div>
                    <span className="be-calc-title">9) Total Bill (Auto Calculated)</span>
                    {discount > 0 && (
                      <div style={{ fontSize: "0.75rem", color: "#b91c1c", fontWeight: 600, marginTop: "2px" }}>
                        (Discount deducted: -৳ {fmt(discount)})
                      </div>
                    )}
                  </div>
                  <span className="be-calc-amount">৳ {fmt(totalBill)}</span>
                </div>
                <div className="be-words-box">
                  <b>Total Bill in Words:</b>
                  <span>{totalBillInWords}</span>
                </div>
              </div>

              {/* 10) Client Payment Input */}
              <div className="be-calc-box" style={{ justifyContent: "center" }}>
                <div className="be-field-group">
                  <label htmlFor="f-payment" style={{ fontSize: "0.88rem", fontWeight: 700, color: "#1e3a8a" }}>
                    10) Client Payment (BDT)
                  </label>
                  <input
                    id="f-payment"
                    type="number"
                    step="any"
                    min="0"
                    className="be-input"
                    placeholder="Enter received payment (e.g. 20000)"
                    style={{ fontSize: "1.1rem", fontWeight: 700, padding: "10px 14px", borderColor: "#93c5fd" }}
                    value={form.client_payment}
                    onChange={(e) => setForm({ ...form, client_payment: e.target.value })}
                  />
                </div>
              </div>

              {/* 11) Due / Advance Box */}
              <div className={`be-calc-box due-adv-box ${dueAdvance > 0 ? "is-due" : dueAdvance < 0 ? "is-adv" : ""}`}>
                <div className="be-calc-top-row">
                  <div>
                    <span className="be-calc-title">
                      11) {dueAdvance > 0 ? "This Bill Due" : dueAdvance < 0 ? "This Bill Advance" : "This Bill Balance"}
                    </span>
                    {customerPastStats && customerPastStats.netDue !== 0 && (
                      <div
                        style={{
                          fontSize: "0.78rem",
                          fontWeight: 700,
                          marginTop: "4px",
                          color: (customerPastStats.netDue + dueAdvance) > 0 ? "#dc2626" : (customerPastStats.netDue + dueAdvance) < 0 ? "#16a34a" : "#0284c7",
                        }}
                      >
                        Net Total: {(customerPastStats.netDue + dueAdvance) > 0
                          ? `Due ৳ ${fmt(customerPastStats.netDue + dueAdvance)}`
                          : (customerPastStats.netDue + dueAdvance) < 0
                          ? `Adv ৳ ${fmt(Math.abs(customerPastStats.netDue + dueAdvance))}`
                          : "Fully Settled"}
                        <span style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 500, marginLeft: "5px" }}>
                          (Prev: {customerPastStats.netDue > 0 ? `Due ৳ ${fmt(customerPastStats.netDue)}` : `Adv ৳ ${fmt(Math.abs(customerPastStats.netDue))}`})
                        </span>
                      </div>
                    )}
                  </div>
                  <span className="be-calc-amount">
                    ৳ {fmt(Math.abs(dueAdvance))}
                  </span>
                </div>
                <div className="be-words-box">
                  <b>
                    {dueAdvance > 0 ? "Due Amount in Words:" : dueAdvance < 0 ? "Advance Amount in Words:" : "Status in Words:"}
                  </b>
                  <span>{dueAdvanceInWords}</span>
                </div>
              </div>
            </div>

            {/* Note */}
            <div className="be-field-group" style={{ marginBottom: "16px" }}>
              <label htmlFor="f-note">Remarks / Note (Optional)</label>
              <input
                id="f-note"
                type="text"
                className="be-input"
                placeholder="e.g. Delivery via truck #910, full payment promised within 7 days"
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="be-actions-row">
            <button type="submit" className="be-btn be-btn-primary" disabled={busy}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              {busy ? "Saving Entry..." : "Save & Record Bill"}
            </button>

            <button
              type="button"
              className="be-btn be-btn-ghost"
              onClick={() => {
                setForm(defaultForm());
                setErr("");
                setSuccessMsg("");
              }}
            >
              Reset / New Form
            </button>
          </div>
        </form>
      </section>

      {/* Customer Invoices & Ledger Table Section */}
      <section className="be-card be-ledger-section">
        <div className="be-card-header">
          <div>
            <h2 className="be-card-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#2563eb" }}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
              Recorded Customer Invoices & Statements ({filteredBills.length})
            </h2>
            <div style={{ fontSize: "0.8rem", color: "var(--be-text-muted)", marginTop: "2px" }}>
              Showing {filteredBills.length} of {bills.length} invoices
              {durationMode === "day" && " • (Period: Today)"}
              {durationMode === "week" && ` • (Period: This Week - ${currentWeekRange.label})`}
              {durationMode === "month" && ` • (Period: Month ${selectedMonth}/${selectedYear})`}
              {durationMode === "year" && ` • (Period: Year ${selectedYear})`}
              {balanceFilter === "due" && " • (Filtered: Outstanding Due)"}
              {balanceFilter === "advance" && " • (Filtered: Advance Payment)"}
              {balanceFilter === "paid" && " • (Filtered: Fully Paid)"}
            </div>
          </div>

          <div className="be-toolbar-actions">
            {/* Excel Export Split Button */}
            <div className="be-excel-dropdown-wrap" ref={excelMenuRef}>
              <div style={{ display: "inline-flex", borderRadius: "8px", overflow: "hidden", boxShadow: "0 1px 2px rgba(0,0,0,0.06)" }}>
                {/* Main Download Button: Automatically exports currently filtered data */}
                <button
                  type="button"
                  onClick={() => handleExportExcel("auto")}
                  className="be-btn-excel"
                  style={{
                    borderTopRightRadius: 0,
                    borderBottomRightRadius: 0,
                    borderRight: "1px solid rgba(255,255,255,0.25)",
                    padding: "8px 13px",
                  }}
                  title={
                    balanceFilter !== "all" || durationMode !== "all" || Boolean(search.trim())
                      ? `Download currently filtered ${filteredBills.length} invoices to Excel (.xlsx)`
                      : `Download all ${bills.length} invoices to Excel (.xlsx)`
                  }
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  <span>
                    Download Excel
                    <span style={{ opacity: 0.9, fontWeight: 700, fontSize: "0.82rem", marginLeft: "5px" }}>
                      ({filteredBills.length})
                    </span>
                  </span>
                </button>

                {/* Dropdown Options Toggle Arrow */}
                <button
                  type="button"
                  onClick={() => setShowExcelMenu((prev) => !prev)}
                  className="be-btn-excel"
                  style={{
                    borderTopLeftRadius: 0,
                    borderBottomLeftRadius: 0,
                    padding: "8px 9px",
                  }}
                  title="More download options"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
              </div>

              {/* Excel Dropdown Menu */}
              {showExcelMenu && (
                <div className="be-excel-menu">
                  {/* Option 1: Current Filtered View (if any filter is active) */}
                  {(balanceFilter !== "all" || durationMode !== "all" || Boolean(search.trim())) && (
                    <button
                      type="button"
                      onClick={() => handleExportExcel("filtered")}
                      className="be-excel-item highlight"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#15803d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                      </svg>
                      <div>
                        <span>Download Filtered Invoices ({filteredBills.length})</span>
                        <span className="be-excel-item-desc">Exports the currently selected filtered list</span>
                      </div>
                    </button>
                  )}

                  {/* Option 2: Complete Master Report */}
                  <button
                    type="button"
                    onClick={() => handleExportExcel("all")}
                    className={`be-excel-item ${!(balanceFilter !== "all" || durationMode !== "all" || Boolean(search.trim())) ? "highlight" : ""}`}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#15803d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="8" y1="13" x2="16" y2="13" />
                      <line x1="8" y1="17" x2="16" y2="17" />
                    </svg>
                    <div>
                      <span>All Invoices Master Report ({bills.length})</span>
                      <span className="be-excel-item-desc">Complete multi-sheet workbook (.xlsx)</span>
                    </div>
                  </button>

                  <div className="be-excel-divider" />

                  {/* Option 3: Due Accounts Only */}
                  <button
                    type="button"
                    onClick={() => handleExportExcel("due")}
                    className="be-excel-item"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <div>
                      <span>Due Accounts Only ({dueBillsCount})</span>
                      <span className="be-excel-item-desc">All outstanding due accounts</span>
                    </div>
                  </button>

                  {/* Option 4: Advance Accounts Only */}
                  <button
                    type="button"
                    onClick={() => handleExportExcel("advance")}
                    className="be-excel-item"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="16 12 12 8 8 12" />
                      <line x1="12" y1="16" x2="12" y2="8" />
                    </svg>
                    <div>
                      <span>Advance Accounts Only ({advanceBillsCount})</span>
                      <span className="be-excel-item-desc">All advance balance accounts</span>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* Search Input */}
            <div style={{ width: "260px", maxWidth: "100%" }}>
              <input
                type="text"
                className="be-input"
                placeholder="Search customer, mobile, ID, bill..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Filter Toolbar Row: Left = Balance Filter, Right = Duration Filter (Same Line) */}
        <div className="be-toolbar-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
          {/* Left: Balance filter pills */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <div className="be-filter-group">
              <button
                type="button"
                onClick={() => setBalanceFilter("all")}
                className={`be-filter-btn ${balanceFilter === "all" ? "active" : ""}`}
              >
                <span>All Invoices</span>
                <span className="be-pill-badge">{durationFilteredBills.length}</span>
              </button>

              <button
                type="button"
                onClick={() => setBalanceFilter("due")}
                className={`be-filter-btn ${balanceFilter === "due" ? "active filter-due" : ""}`}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                  <svg width="7" height="7" viewBox="0 0 10 10" fill="#dc2626">
                    <circle cx="5" cy="5" r="4.5" />
                  </svg>
                  Due Only (বকেয়া)
                </span>
                <span className="be-pill-badge due">{dueBillsCount}</span>
              </button>

              <button
                type="button"
                onClick={() => setBalanceFilter("advance")}
                className={`be-filter-btn ${balanceFilter === "advance" ? "active filter-adv" : ""}`}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                  <svg width="7" height="7" viewBox="0 0 10 10" fill="#16a34a">
                    <circle cx="5" cy="5" r="4.5" />
                  </svg>
                  Advance Only (অগ্রিম)
                </span>
                <span className="be-pill-badge adv">{advanceBillsCount}</span>
              </button>

              <button
                type="button"
                onClick={() => setBalanceFilter("paid")}
                className={`be-filter-btn ${balanceFilter === "paid" ? "active" : ""}`}
              >
                <span>Fully Paid</span>
                <span className="be-pill-badge paid">{paidBillsCount}</span>
              </button>
            </div>

            {(balanceFilter !== "all" || durationMode !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setBalanceFilter("all");
                  setDurationMode("all");
                  setShowMonthDropdown(false);
                  setShowYearDropdown(false);
                }}
                className="be-btn-ghost"
                style={{ fontSize: "0.8rem", padding: "4px 8px", cursor: "pointer" }}
                title="Reset all filters"
              >
                ✕ Clear Filter
              </button>
            )}
          </div>

          {/* Right Side: Duration Filter (All, Day, Week, Month, Year) */}
          <div className="be-duration-wrap">
            <div className="be-duration-group">
              <button
                type="button"
                onClick={() => {
                  setDurationMode("all");
                  setShowMonthDropdown(false);
                  setShowYearDropdown(false);
                }}
                className={`be-duration-btn ${durationMode === "all" ? "active" : ""}`}
                title="All Time (সব সময়)"
              >
                All
              </button>

              <button
                type="button"
                onClick={() => {
                  setDurationMode("day");
                  setShowMonthDropdown(false);
                  setShowYearDropdown(false);
                }}
                className={`be-duration-btn ${durationMode === "day" ? "active" : ""}`}
                title="Today (আজকের দিন অনুযায়ী অটো)"
              >
                Day
              </button>

              <button
                type="button"
                onClick={() => {
                  setDurationMode("week");
                  setShowMonthDropdown(false);
                  setShowYearDropdown(false);
                }}
                className={`be-duration-btn ${durationMode === "week" ? "active" : ""}`}
                title="This Week (চলতি সপ্তাহ অনুযায়ী অটো)"
              >
                Week
              </button>

              {/* Month Dropdown Button */}
              <div className="be-duration-item-wrap" ref={monthDropdownRef}>
                <button
                  type="button"
                  onClick={() => {
                    setDurationMode("month");
                    setShowMonthDropdown((prev) => !prev);
                    setShowYearDropdown(false);
                  }}
                  className={`be-duration-btn ${durationMode === "month" ? "active" : ""}`}
                  title="Click to select Month & Year"
                >
                  <span>{durationMode === "month" ? `Month (${MONTH_SHORT[selectedMonth - 1]})` : "Month"}</span>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {showMonthDropdown && (
                  <div className="be-popover-dropdown">
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                        Select Month & Year
                      </div>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <select
                          value={selectedMonth}
                          onChange={(e) => {
                            setSelectedMonth(Number(e.target.value));
                            setDurationMode("month");
                          }}
                          className="be-duration-select"
                          title="Select Month"
                        >
                          {MONTH_SHORT.map((name, idx) => (
                            <option key={idx + 1} value={idx + 1}>
                              {name}
                            </option>
                          ))}
                        </select>

                        <select
                          value={selectedYear}
                          onChange={(e) => {
                            setSelectedYear(Number(e.target.value));
                            setDurationMode("month");
                          }}
                          className="be-duration-select"
                          title="Select Year"
                        >
                          {availableYears.map((y) => (
                            <option key={y} value={y}>
                              {y}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Year Dropdown Button */}
              <div className="be-duration-item-wrap" ref={yearDropdownRef}>
                <button
                  type="button"
                  onClick={() => {
                    setDurationMode("year");
                    setShowYearDropdown((prev) => !prev);
                    setShowMonthDropdown(false);
                  }}
                  className={`be-duration-btn ${durationMode === "year" ? "active" : ""}`}
                  title="Click to select Year"
                >
                  <span>{durationMode === "year" ? `Year (${selectedYear})` : "Year"}</span>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {showYearDropdown && (
                  <div className="be-popover-dropdown">
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                        Select Year
                      </div>
                      <select
                        value={selectedYear}
                        onChange={(e) => {
                          setSelectedYear(Number(e.target.value));
                          setDurationMode("year");
                        }}
                        className="be-duration-select"
                        style={{ width: "100%" }}
                        title="Select Year"
                      >
                        {availableYears.map((y) => (
                          <option key={y} value={y}>
                            {y}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="be-ledger-table-wrap">
          <table className="be-ledger-table">
            <thead>
              <tr>
                <th style={{ width: "30px", textAlign: "center" }}>SL</th>
                <th>Date</th>
                <th>Bill No</th>
                <th>Customer Name</th>
                <th>Customer ID & Mobile</th>
                <th>Items Count</th>
                <th style={{ textAlign: "right" }}>Total Bill (৳)</th>
                <th style={{ textAlign: "right" }}>Payment (৳)</th>
                <th style={{ textAlign: "right" }}>Due / Advance (৳)</th>
                <th style={{ textAlign: "center", width: "120px" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBills.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: "center", padding: "26px", color: "var(--be-text-muted)" }}>
                    No recorded bills found. Fill the form above and click &quot;Save & Record Bill&quot;.
                  </td>
                </tr>
              ) : (
                filteredBills.map((b, idx) => {
                  const bDue = Number(b.due_advance || 0);
                  const itemCount = Array.isArray(b.items) ? b.items.length : 0;
                  return (
                    <tr key={b.id}>
                      <td style={{ textAlign: "center", color: "var(--be-text-muted)" }}>{idx + 1}</td>
                      <td>{b.bill_date}</td>
                      <td style={{ fontWeight: 700, color: "#1e293b" }}>{b.bill_no || "-"}</td>
                      <td>
                        <div style={{ fontWeight: 700, color: "#0f172a" }}>{b.customer_name}</div>
                        {b.customer_address && (
                          <div style={{ fontSize: "0.76rem", color: "var(--be-text-muted)" }}>
                            {b.customer_address}
                          </div>
                        )}
                      </td>
                      <td>
                        <div style={{ fontFamily: "monospace", fontSize: "0.82rem", fontWeight: 700, color: "#2563eb" }}>
                          {b.customer_id || "-"}
                        </div>
                        {b.customer_mobile && (
                          <div style={{ fontSize: "0.78rem", color: "var(--be-text-muted)" }}>
                            {b.customer_mobile}
                          </div>
                        )}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span style={{ background: "#f1f5f9", padding: "2px 8px", borderRadius: "10px", fontSize: "0.78rem", fontWeight: 600 }}>
                          {itemCount} {itemCount === 1 ? "item" : "items"}
                        </span>
                      </td>
                      <td style={{ textAlign: "right", fontWeight: 700 }}>৳ {fmt(b.total_bill)}</td>
                      <td style={{ textAlign: "right", color: "#059669", fontWeight: 600 }}>
                        ৳ {fmt(b.client_payment)}
                      </td>
                      <td style={{ textAlign: "right", verticalAlign: "middle" }}>
                        {(() => {
                          const rBal = b.runningBalance !== undefined ? b.runningBalance : Number(b.due_advance || 0);
                          const prev = b.prevBalance || 0;
                          const billNet = b.billNet !== undefined ? b.billNet : Number(b.due_advance || 0);

                          return (
                            <div>
                              {/* Cumulative Running Balance calculated with previous due/advance */}
                              <div
                                style={{
                                  fontWeight: 800,
                                  fontSize: "0.92rem",
                                  color: rBal > 0 ? "#dc2626" : rBal < 0 ? "#059669" : "var(--be-text-muted)",
                                }}
                              >
                                {rBal > 0
                                  ? `Due: ৳ ${fmt(rBal)}`
                                  : rBal < 0
                                  ? `Adv: ৳ ${fmt(Math.abs(rBal))}`
                                  : "Fully Settled"}
                              </div>

                              {/* Breakdown with previous due/advance if customer had a prior balance */}
                              {prev !== 0 && (
                                <div
                                  style={{
                                    fontSize: "0.72rem",
                                    color: "#64748b",
                                    marginTop: "2px",
                                    lineHeight: 1.25,
                                  }}
                                  title={`Previous Balance: ${prev > 0 ? `Due ৳ ${fmt(prev)}` : `Adv ৳ ${fmt(Math.abs(prev))}`} | This Bill: ${billNet > 0 ? `Due ৳ ${fmt(billNet)}` : billNet < 0 ? `Adv ৳ ${fmt(Math.abs(billNet))}` : "Paid"}`}
                                >
                                  <span>
                                    Prev:{" "}
                                    <strong style={{ color: prev > 0 ? "#b91c1c" : "#047857" }}>
                                      {prev > 0 ? `Due ${fmt(prev)}` : `Adv ${fmt(Math.abs(prev))}`}
                                    </strong>
                                  </span>
                                  {" • "}
                                  <span>
                                    Bill:{" "}
                                    <span style={{ fontWeight: 600, color: billNet > 0 ? "#b91c1c" : billNet < 0 ? "#047857" : "#475569" }}>
                                      {billNet > 0 ? `+Due ${fmt(billNet)}` : billNet < 0 ? `-Adv ${fmt(Math.abs(billNet))}` : "Paid"}
                                    </span>
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <button
                          type="button"
                          onClick={() => handleDelete(b.id, b.bill_no)}
                          className="be-del-row-btn"
                          title="Delete Bill"
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* CUSTOMERS DIRECTORY MODAL */}
      {showCustomersModal && (
        <div
          className="be-modal-overlay"
          onClick={() => {
            setShowCustomersModal(false);
            setSelectedCustomerId(null);
          }}
        >
          <div
            className="be-modal-box"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: activeCustomerGroup ? "1050px" : "960px" }}
          >
            {/* Modal Header */}
            <div className="be-modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                {activeCustomerGroup && (
                  <button
                    type="button"
                    onClick={() => setSelectedCustomerId(null)}
                    className="be-back-btn"
                    title="Back to All Customers"
                  >
                    ← Back to All Customers
                  </button>
                )}
                <h2 className="be-modal-title">
                  {activeCustomerGroup ? (
                    <>
                      <span>Customer Details:</span>
                      <span className="be-cust-id-pill">{activeCustomerGroup.customerId}</span>
                    </>
                  ) : (
                    <>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "7px" }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                          <circle cx="9" cy="7" r="4" />
                          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                        All Customers Directory
                      </span>
                      <span style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: 500 }}>
                        ({customerIdGroups.length} unique Customer IDs)
                      </span>
                    </>
                  )}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowCustomersModal(false);
                  setSelectedCustomerId(null);
                }}
                className="be-modal-close-btn"
                title="Close Modal"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="be-modal-body">
              {activeCustomerGroup ? (
                /* DETAIL VIEW: Single Customer Profile + All Orders Breakdown */
                <div>
                  {/* Customer Information Banner */}
                  <div className="be-cust-detail-header">
                    <div className="be-cust-detail-info">
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                        <span className="be-cust-id-pill" style={{ fontSize: "0.95rem" }}>
                          {activeCustomerGroup.customerId}
                        </span>
                        <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800, color: "#0f172a" }}>
                          {activeCustomerGroup.displayName}
                        </h3>
                      </div>

                      {/* Display alternative names if any were recorded */}
                      {activeCustomerGroup.namesList.length > 1 && (
                        <div style={{ fontSize: "0.78rem", color: "#64748b", display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap", marginTop: "3px" }}>
                          <span>Other names on bills:</span>
                          {activeCustomerGroup.namesList
                            .filter((n) => n !== activeCustomerGroup.displayName)
                            .map((altName, i) => (
                              <span
                                key={i}
                                style={{
                                  background: "#f1f5f9",
                                  padding: "2px 7px",
                                  borderRadius: "4px",
                                  border: "1px solid #e2e8f0",
                                  fontWeight: 600,
                                  color: "#334155",
                                }}
                              >
                                {altName}
                              </span>
                            ))}
                        </div>
                      )}

                      <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", fontSize: "0.85rem", color: "#475569", marginTop: "5px" }}>
                        {activeCustomerGroup.mobile && (
                          <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                            </svg>
                            <strong>{activeCustomerGroup.mobile}</strong>
                          </span>
                        )}
                        {activeCustomerGroup.address && (
                          <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                              <circle cx="12" cy="10" r="3" />
                            </svg>
                            {activeCustomerGroup.address}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions: Export Detailed Excel & Delete Customer */}
                    <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                      <button
                        type="button"
                        onClick={() => handleExportCustomerDetailedExcel(activeCustomerGroup)}
                        className="be-btn-excel"
                        style={{ padding: "9px 15px", fontSize: "0.85rem", fontWeight: 700 }}
                        title="Download complete item-by-item breakdown and order history in Excel (.xlsx)"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        Export Orders to Excel
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleDeleteCustomer(
                            activeCustomerGroup.customerId,
                            activeCustomerGroup.displayName
                          )
                        }
                        className="be-btn-del-cust"
                        style={{ padding: "9px 15px", fontSize: "0.85rem", fontWeight: 700 }}
                        title="Permanently Delete this Customer ID and all recorded Bills"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                        Delete Customer & History
                      </button>
                    </div>
                  </div>

                  {/* Summary KPI Cards for this Customer */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                      gap: "10px",
                      marginBottom: "20px",
                    }}
                  >
                    <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "10px", border: "1px solid #e2e8f0", textAlign: "center" }}>
                      <small style={{ color: "#64748b", textTransform: "uppercase", fontSize: "0.72rem", fontWeight: 700 }}>Total Invoices</small>
                      <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "#0f172a" }}>{activeCustomerGroup.bills.length}</div>
                    </div>
                    <div style={{ background: "#f8fafc", padding: "12px", borderRadius: "10px", border: "1px solid #e2e8f0", textAlign: "center" }}>
                      <small style={{ color: "#64748b", textTransform: "uppercase", fontSize: "0.72rem", fontWeight: 700 }}>Total Billed</small>
                      <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "#0f172a" }}>৳ {fmt(activeCustomerGroup.totalBilled)}</div>
                    </div>
                    <div style={{ background: "#f0fdf4", padding: "12px", borderRadius: "10px", border: "1px solid #bbf7d0", textAlign: "center" }}>
                      <small style={{ color: "#166534", textTransform: "uppercase", fontSize: "0.72rem", fontWeight: 700 }}>Total Paid</small>
                      <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "#16a34a" }}>৳ {fmt(activeCustomerGroup.totalPaid)}</div>
                    </div>
                    <div
                      style={{
                        background: activeCustomerGroup.netDue > 0 ? "#fef2f2" : activeCustomerGroup.netDue < 0 ? "#eff6ff" : "#f8fafc",
                        padding: "12px",
                        borderRadius: "10px",
                        border: `1px solid ${activeCustomerGroup.netDue > 0 ? "#fecaca" : activeCustomerGroup.netDue < 0 ? "#bfdbfe" : "#e2e8f0"}`,
                        textAlign: "center",
                      }}
                    >
                      <small
                        style={{
                          color: activeCustomerGroup.netDue > 0 ? "#991b1b" : activeCustomerGroup.netDue < 0 ? "#1e40af" : "#64748b",
                          textTransform: "uppercase",
                          fontSize: "0.72rem",
                          fontWeight: 700,
                        }}
                      >
                        Net Status
                      </small>
                      <div
                        style={{
                          fontSize: "1.2rem",
                          fontWeight: 800,
                          color: activeCustomerGroup.netDue > 0 ? "#dc2626" : activeCustomerGroup.netDue < 0 ? "#2563eb" : "#059669",
                        }}
                      >
                        {activeCustomerGroup.netDue > 0
                          ? `Due: ৳ ${fmt(activeCustomerGroup.netDue)}`
                          : activeCustomerGroup.netDue < 0
                          ? `Adv: ৳ ${fmt(Math.abs(activeCustomerGroup.netDue))}`
                          : "Fully Settled"}
                      </div>
                    </div>
                  </div>

                  {/* Orders List & Export Action */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      margin: "0 0 12px",
                      flexWrap: "wrap",
                      gap: "10px",
                    }}
                  >
                    <h4 style={{ margin: 0, fontSize: "1rem", fontWeight: 800, color: "#1e293b" }}>
                      Order History ({activeCustomerGroup.bills.length} Bills)
                    </h4>
                    <button
                      type="button"
                      onClick={() => handleExportCustomerDetailedExcel(activeCustomerGroup)}
                      className="be-btn-excel"
                      style={{ padding: "7px 13px", fontSize: "0.82rem" }}
                      title="Download full itemized order statement to Excel (.xlsx)"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      Export Detailed Excel
                    </button>
                  </div>

                  {activeCustomerGroup.bills.length === 0 ? (
                    <div style={{ padding: "30px", textAlign: "center", color: "#64748b", background: "#f8fafc", borderRadius: "10px" }}>
                      No bills recorded yet for this customer ID.
                    </div>
                  ) : (
                    <div className="be-orders-container">
                      {activeCustomerGroup.bills.map((b) => {
                        const items = parseItems(b.items);
                        const bDue = Number(b.due_advance) || 0;
                        return (
                          <div key={b.id} className="be-order-card">
                            <div className="be-order-header">
                              <div className="be-order-meta">
                                <span style={{ fontWeight: 800, fontSize: "0.95rem", color: "#0f172a" }}>
                                  Bill #{b.bill_no || b.id}
                                </span>
                                <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "0.82rem", color: "#64748b" }}>
                                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                    <line x1="16" y1="2" x2="16" y2="6" />
                                    <line x1="8" y1="2" x2="8" y2="6" />
                                    <line x1="3" y1="10" x2="21" y2="10" />
                                  </svg>
                                  {b.bill_date || "N/A"}
                                </span>
                                {b.customer_name && b.customer_name !== activeCustomerGroup.displayName && (
                                  <span style={{ fontSize: "0.78rem", background: "#f1f5f9", padding: "2px 8px", borderRadius: "6px", color: "#475569" }}>
                                    Name on Bill: <strong>{b.customer_name}</strong>
                                  </span>
                                )}
                              </div>

                              <button
                                type="button"
                                onClick={() => handleDelete(b.id, b.bill_no)}
                                className="be-del-row-btn"
                                title="Delete this Bill"
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="3 6 5 6 21 6" />
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                </svg>
                                Delete Bill
                              </button>
                            </div>

                            {/* Items Breakdown Table */}
                            {items.length > 0 ? (
                              <table className="be-order-items-table">
                                <thead>
                                  <tr>
                                    <th style={{ width: "30px" }}>#</th>
                                    <th>Item Description</th>
                                    <th style={{ textAlign: "right" }}>Weight (kg)</th>
                                    <th style={{ textAlign: "right" }}>Quantity</th>
                                    <th style={{ textAlign: "right" }}>Rate (৳)</th>
                                    <th style={{ textAlign: "right" }}>Subtotal (৳)</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {items.map((it, idx) => (
                                    <tr key={idx}>
                                      <td style={{ color: "#94a3b8" }}>{idx + 1}</td>
                                      <td style={{ fontWeight: 600, color: "#1e293b" }}>{it.name || "Item"}</td>
                                      <td style={{ textAlign: "right" }}>{it.weight || "-"}</td>
                                      <td style={{ textAlign: "right" }}>{it.quantity || "-"}</td>
                                      <td style={{ textAlign: "right" }}>{it.rate ? `৳ ${fmt(it.rate)}` : "-"}</td>
                                      <td style={{ textAlign: "right", fontWeight: 700 }}>৳ {fmt(it.subtotal)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            ) : (
                              <div style={{ fontSize: "0.82rem", color: "#94a3b8", fontStyle: "italic" }}>
                                No item breakdown recorded.
                              </div>
                            )}

                            {/* Additional charges & Totals bar */}
                            <div className="be-order-totals-bar">
                              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", fontSize: "0.8rem", color: "#64748b" }}>
                                {Number(b.labour_charge) > 0 && (
                                  <span>Labour: <strong>৳ {fmt(b.labour_charge)}</strong></span>
                                )}
                                {Number(b.transport_cost) > 0 && (
                                  <span>Transport: <strong>৳ {fmt(b.transport_cost)}</strong></span>
                                )}
                                {Number(b.discount) > 0 && (
                                  <span style={{ color: "#059669" }}>Discount: <strong>-৳ {fmt(b.discount)}</strong></span>
                                )}
                                {b.note && (
                                  <span>Note: <em>{b.note}</em></span>
                                )}
                              </div>

                              <div style={{ display: "flex", gap: "14px", alignItems: "center", flexWrap: "wrap" }}>
                                <span>Total: <strong>৳ {fmt(b.total_bill)}</strong></span>
                                <span style={{ color: "#059669" }}>Paid: <strong>৳ {fmt(b.client_payment)}</strong></span>
                                <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                                  <span
                                    style={{
                                      fontWeight: 700,
                                      color: (b.runningBalance !== undefined ? b.runningBalance : bDue) > 0 ? "#dc2626" : (b.runningBalance !== undefined ? b.runningBalance : bDue) < 0 ? "#2563eb" : "#059669",
                                    }}
                                  >
                                    {(b.runningBalance !== undefined ? b.runningBalance : bDue) > 0
                                      ? `Net Due: ৳ ${fmt(b.runningBalance !== undefined ? b.runningBalance : bDue)}`
                                      : (b.runningBalance !== undefined ? b.runningBalance : bDue) < 0
                                      ? `Net Adv: ৳ ${fmt(Math.abs(b.runningBalance !== undefined ? b.runningBalance : bDue))}`
                                      : "Paid"}
                                  </span>
                                  {b.prevBalance !== undefined && b.prevBalance !== 0 && (
                                    <span style={{ fontSize: "0.74rem", color: "#64748b" }}>
                                      (Bill: {bDue > 0 ? `+৳ ${fmt(bDue)}` : bDue < 0 ? `-৳ ${fmt(Math.abs(bDue))}` : "৳ 0"})
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                /* DIRECTORY LIST VIEW (Customer ID Wise Cards) */
                <div>
                  {/* Search and Filters within Modal */}
                  <div style={{ marginBottom: "16px", display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", gap: "8px", flex: 1, minWidth: "260px" }}>
                      <input
                        type="text"
                        className="be-search-input"
                        placeholder="Search by Customer ID, Name, Phone, or Address..."
                        value={modalSearch}
                        onChange={(e) => setModalSearch(e.target.value)}
                        style={{ flex: 1, padding: "9px 13px", fontSize: "0.88rem" }}
                        autoFocus
                      />
                      {modalSearch && (
                        <button
                          type="button"
                          onClick={() => setModalSearch("")}
                          className="be-back-btn"
                          style={{ margin: 0, padding: "8px 12px" }}
                        >
                          Clear
                        </button>
                      )}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                      {/* Modal Balance Filters */}
                      <div className="be-filter-group">
                        <button
                          type="button"
                          onClick={() => setModalBalanceFilter("all")}
                          className={`be-filter-btn ${modalBalanceFilter === "all" ? "active" : ""}`}
                        >
                          <span>All</span>
                          <span className="be-pill-badge">{customerIdGroups.length}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setModalBalanceFilter("due")}
                          className={`be-filter-btn ${modalBalanceFilter === "due" ? "active filter-due" : ""}`}
                        >
                          <svg width="9" height="9" viewBox="0 0 10 10" style={{ verticalAlign: "middle" }}>
                            <circle cx="5" cy="5" r="4.5" fill="#dc2626" />
                          </svg>
                          <span>Due</span>
                          <span className="be-pill-badge due">{dueCustomersCount}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setModalBalanceFilter("advance")}
                          className={`be-filter-btn ${modalBalanceFilter === "advance" ? "active filter-adv" : ""}`}
                        >
                          <svg width="9" height="9" viewBox="0 0 10 10" style={{ verticalAlign: "middle" }}>
                            <circle cx="5" cy="5" r="4.5" fill="#16a34a" />
                          </svg>
                          <span>Advance</span>
                          <span className="be-pill-badge adv">{advanceCustomersCount}</span>
                        </button>
                      </div>

                      {/* Modal Quick Export Excel */}
                      <button
                        type="button"
                        onClick={() => handleExportExcel(modalBalanceFilter === "all" ? "all" : modalBalanceFilter)}
                        className="be-btn-excel"
                        style={{ padding: "7px 12px", fontSize: "0.8rem" }}
                        title="Download Customers Directory to Excel"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        Export Excel
                      </button>
                    </div>
                  </div>

                  {/* Customer Cards Grid */}
                  {filteredCustomerGroups.length === 0 ? (
                    <div style={{ padding: "40px 20px", textAlign: "center", color: "#64748b" }}>
                      No customers match your search query.
                    </div>
                  ) : (
                    <div className="be-cust-grid">
                      {filteredCustomerGroups.map((group) => {
                        const totalBilled = group.totalBilled;
                        const netDue = group.netDue;
                        return (
                          <div key={group.customerId} className="be-cust-card">
                            <div className="be-cust-card-header">
                              <div>
                                <span className="be-cust-id-pill">{group.customerId}</span>
                                <h3 className="be-cust-name">{group.displayName}</h3>
                              </div>
                              <span
                                style={{
                                  fontSize: "0.75rem",
                                  background: "#f1f5f9",
                                  padding: "3px 8px",
                                  borderRadius: "12px",
                                  fontWeight: 700,
                                  color: "#475569",
                                }}
                              >
                                {group.bills.length} {group.bills.length === 1 ? "Bill" : "Bills"}
                              </span>
                            </div>

                            {/* If multiple names were used under this ID */}
                            {group.namesList.length > 1 && (
                              <div style={{ fontSize: "0.74rem", color: "#64748b" }}>
                                Other names: {group.namesList.filter((n) => n !== group.displayName).join(", ")}
                              </div>
                            )}

                            <div className="be-cust-meta">
                              {group.mobile && (
                                <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                                  </svg>
                                  <strong>{group.mobile}</strong>
                                </div>
                              )}
                              {group.address && (
                                <div style={{ display: "flex", alignItems: "center", gap: "5px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                    <circle cx="12" cy="10" r="3" />
                                  </svg>
                                  <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{group.address}</span>
                                </div>
                              )}
                            </div>

                            <div className="be-cust-stats-row">
                              <div className="stat-item">
                                <small>Invoices</small>
                                <b>{group.bills.length}</b>
                              </div>
                              <div className="stat-item">
                                <small>Total Billed</small>
                                <b>৳ {fmt(totalBilled)}</b>
                              </div>
                              <div className={`stat-item ${netDue > 0 ? "due" : ""}`}>
                                <small>{netDue >= 0 ? "Net Due" : "Advance"}</small>
                                <b>৳ {fmt(Math.abs(netDue))}</b>
                              </div>
                            </div>

                            <div className="be-cust-card-actions">
                              <button
                                type="button"
                                onClick={() => setSelectedCustomerId(group.customerId)}
                                className="be-btn-view-details"
                              >
                                <span>View Order Details</span>
                                <span>→</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleExportCustomerDetailedExcel(group)}
                                className="be-btn-excel"
                                style={{ padding: "7px 11px", fontSize: "0.8rem" }}
                                title="Download Excel statement with full item details"
                              >
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                  <polyline points="7 10 12 15 17 10" />
                                  <line x1="12" y1="15" x2="12" y2="3" />
                                </svg>
                                Excel
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteCustomer(group.customerId, group.displayName)}
                                className="be-btn-del-cust"
                                title="Delete this Customer ID and all Bills"
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="3 6 5 6 21 6" />
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                </svg>
                                Delete
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* RECYCLE BIN MODAL */}
      {showRecycleModal && (
        <div
          className="be-modal-overlay"
          onClick={() => setShowRecycleModal(false)}
        >
          <div
            className="be-modal-box"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "1020px" }}
          >
            {/* Modal Header */}
            <div className="be-modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <h2 className="be-modal-title" style={{ color: "#be123c" }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    <line x1="10" y1="11" x2="10" y2="17" />
                    <line x1="14" y1="11" x2="14" y2="17" />
                  </svg>
                  Recycle Bin (রিসাইকেল বিন)
                  <span className="be-pill-badge due" style={{ marginLeft: "6px" }}>
                    {recycleBinItems.length} Deleted {recycleBinItems.length === 1 ? "Item" : "Items"}
                  </span>
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setShowRecycleModal(false)}
                className="be-modal-close-btn"
                title="Close Modal"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="be-modal-body">
              {/* Toolbar: Search & Bulk Actions */}
              <div className="be-recycle-toolbar">
                <div style={{ display: "flex", gap: "8px", flex: 1, minWidth: "260px" }}>
                  <input
                    type="text"
                    className="be-search-input"
                    placeholder="Search by Bill No, Customer Name, Mobile, or ID..."
                    value={recycleSearch}
                    onChange={(e) => setRecycleSearch(e.target.value)}
                    style={{ flex: 1, padding: "8px 12px", fontSize: "0.85rem" }}
                  />
                  {recycleSearch && (
                    <button
                      type="button"
                      onClick={() => setRecycleSearch("")}
                      className="be-back-btn"
                      style={{ margin: 0, padding: "6px 10px" }}
                    >
                      Clear
                    </button>
                  )}
                </div>

                {recycleBinItems.length > 0 && (
                  <div className="be-recycle-actions">
                    <button
                      type="button"
                      onClick={handleRestoreAll}
                      className="be-btn-restore-all"
                      title="Restore all deleted bills"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="1 4 1 10 7 10" />
                        <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                      </svg>
                      Restore All (সব ফেরত আনুন)
                    </button>

                    <button
                      type="button"
                      onClick={handleEmptyRecycleBin}
                      className="be-btn-empty-bin"
                      title="Permanently remove all deleted bills"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                      Empty Recycle Bin (খালি করুন)
                    </button>
                  </div>
                )}
              </div>

              {/* Items List */}
              {filteredRecycleItems.length === 0 ? (
                <div className="be-recycle-empty">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                  <h3>
                    {recycleBinItems.length === 0
                      ? "Recycle Bin is Empty"
                      : "No Matching Deleted Bills Found"}
                  </h3>
                  <p>
                    {recycleBinItems.length === 0
                      ? "কোনো মুছে ফেলা বিল নেই। আপনি কোনো বিল ডিলিট করলে তা প্রথমে এখানে এসে জমা হবে এবং প্রয়োজন অনুযায়ী পুনরুদ্ধার বা স্থায়ীভাবে মুছতে পারবেন।"
                      : "আপনার অনুসন্ধানের সাথে কোনো ডিলিট করা বিলের মিল নেই।"}
                  </p>
                </div>
              ) : (
                <div className="be-recycle-table-wrap">
                  <table className="be-recycle-table">
                    <thead>
                      <tr>
                        <th style={{ width: "35px" }}>#</th>
                        <th>Bill Date</th>
                        <th>Bill No.</th>
                        <th>Customer</th>
                        <th>Items</th>
                        <th style={{ textAlign: "right" }}>Total Bill</th>
                        <th style={{ textAlign: "right" }}>Paid</th>
                        <th style={{ textAlign: "right" }}>Due / Adv</th>
                        <th>Deleted Date & Time</th>
                        <th style={{ textAlign: "center", width: "190px" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRecycleItems.map((b, idx) => {
                        const items = parseItems(b.items);
                        const dueAdv = Number(b.due_advance) || 0;
                        return (
                          <tr key={b.id}>
                            <td style={{ color: "#94a3b8", fontWeight: 600 }}>{idx + 1}</td>
                            <td style={{ whiteSpace: "nowrap" }}>{b.bill_date || "-"}</td>
                            <td>
                              <span style={{ fontWeight: 700, color: "#0f172a" }}>
                                #{b.bill_no || b.id}
                              </span>
                            </td>
                            <td>
                              <div style={{ display: "flex", flexDirection: "column" }}>
                                <span style={{ fontWeight: 700, color: "#1e293b" }}>
                                  {b.customer_name}
                                </span>
                                <div style={{ fontSize: "0.75rem", color: "#64748b", display: "flex", gap: "6px" }}>
                                  {b.customer_id && (
                                    <span className="be-cust-id-pill" style={{ fontSize: "0.7rem", padding: "1px 5px" }}>
                                      {b.customer_id}
                                    </span>
                                  )}
                                  {b.customer_mobile && <span>{b.customer_mobile}</span>}
                                </div>
                              </div>
                            </td>
                            <td>
                              <span style={{ fontSize: "0.8rem", color: "#475569" }}>
                                {items.length} {items.length === 1 ? "Item" : "Items"}
                              </span>
                            </td>
                            <td style={{ textAlign: "right", fontWeight: 700 }}>
                              ৳ {fmt(b.total_bill)}
                            </td>
                            <td style={{ textAlign: "right", color: "#059669" }}>
                              ৳ {fmt(b.client_payment)}
                            </td>
                            <td style={{ textAlign: "right" }}>
                              <span
                                style={{
                                  fontWeight: 700,
                                  color: dueAdv > 0 ? "#dc2626" : dueAdv < 0 ? "#2563eb" : "#059669",
                                }}
                              >
                                {dueAdv > 0
                                  ? `Due ৳ ${fmt(dueAdv)}`
                                  : dueAdv < 0
                                  ? `Adv ৳ ${fmt(Math.abs(dueAdv))}`
                                  : "Paid"}
                              </span>
                            </td>
                            <td style={{ fontSize: "0.78rem", color: "#64748b", whiteSpace: "nowrap" }}>
                              {b.deleted_at || "Recent"}
                            </td>
                            <td style={{ textAlign: "center" }}>
                              <div style={{ display: "inline-flex", gap: "6px" }}>
                                <button
                                  type="button"
                                  onClick={() => handleRestoreBill(b.id, b.bill_no)}
                                  className="be-btn-restore"
                                  title="Restore bill to active invoices"
                                >
                                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="1 4 1 10 7 10" />
                                    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                                  </svg>
                                  Restore
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handlePermanentDeleteBill(b.id, b.bill_no)}
                                  className="be-btn-perm-del"
                                  title="Delete permanently from database"
                                >
                                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="3 6 5 6 21 6" />
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                  </svg>
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

