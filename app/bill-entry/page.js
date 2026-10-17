"use client";
import { useEffect, useState, useMemo, useRef, Fragment } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { takaInWords } from "@/lib/words";
import * as XLSX from "xlsx";
import { XIcon, CheckIcon } from "@/lib/icons";

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
  quantity: "",
  unit: "pcs",
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
  const [customerLedgerSort, setCustomerLedgerSort] = useState("asc"); // 'asc' = oldest first (ledger), 'desc' = newest first

  // Order Details Pop-up Modal & Inline Dropdown States
  const [selectedBillForModal, setSelectedBillForModal] = useState(null);
  const [expandedBillId, setExpandedBillId] = useState(null);
  const [isEditingModal, setIsEditingModal] = useState(false);
  const [editModalData, setEditModalData] = useState(null);
  const [modalEditBusy, setModalEditBusy] = useState(false);
  const [modalEditErr, setModalEditErr] = useState("");

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
        router.replace("/");
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

      // Auto Subtotal Calculation: Quantity * Rate
      if (field === "quantity" || field === "rate" || field === "weight") {
        const qVal = field === "quantity" ? val : (row.quantity !== undefined && row.quantity !== "" ? row.quantity : row.weight);
        const q = parseFloat(qVal);
        const r = parseFloat(field === "rate" ? val : row.rate);

        if (!isNaN(q) && q > 0 && !isNaN(r) && r > 0) {
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
        router.replace("/");
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
        router.replace("/");
        return;
      }
      setSuccessMsg(`Bill #${bNo || id} moved to Recycle Bin.`);
      await loadData();
    } catch (e) {
      alert("Failed to delete bill: " + e.message);
    }
  }

  // Modal Edit Handlers
  const startEditingModal = (b) => {
    setIsEditingModal(true);
    setModalEditErr("");
    setEditModalData({
      id: b.id,
      bill_no: b.bill_no || "",
      bill_date: b.bill_date || today(),
      customer_name: b.customer_name || "",
      customer_mobile: b.customer_mobile || "",
      customer_id: b.customer_id || "",
      customer_address: b.customer_address || "",
      items: Array.isArray(b.items) && b.items.length > 0
        ? b.items.map((it) => ({
            name: it.name || "",
            quantity: it.quantity !== undefined && it.quantity !== null && it.quantity !== "" ? String(it.quantity) : (it.weight !== undefined && it.weight !== null ? String(it.weight) : ""),
            unit: it.unit || "pcs",
            rate: it.rate !== undefined && it.rate !== null ? String(it.rate) : "",
            subtotal: it.subtotal !== undefined && it.subtotal !== null ? String(it.subtotal) : "",
          }))
        : [emptyItem()],
      labour_charge: b.labour_charge !== undefined && b.labour_charge !== null ? String(b.labour_charge) : "",
      transport_cost: b.transport_cost !== undefined && b.transport_cost !== null ? String(b.transport_cost) : "",
      discount: b.discount !== undefined && b.discount !== null ? String(b.discount) : "",
      client_payment: b.client_payment !== undefined && b.client_payment !== null ? String(b.client_payment) : "",
      note: b.note || "",
    });
  };

  const handleModalItemChange = (idx, field, val) => {
    setEditModalData((prev) => {
      const items = [...prev.items];
      const row = { ...items[idx], [field]: val };

      // Auto Subtotal Calculation: Quantity * Rate
      if (field === "quantity" || field === "rate" || field === "weight") {
        const qVal = field === "quantity" ? val : (row.quantity !== undefined && row.quantity !== "" ? row.quantity : row.weight);
        const q = parseFloat(qVal);
        const r = parseFloat(field === "rate" ? val : row.rate);

        if (!isNaN(q) && q > 0 && !isNaN(r) && r > 0) {
          row.subtotal = (q * r).toFixed(2);
        }
      }

      items[idx] = row;
      return { ...prev, items };
    });
  };

  const handleModalAddItem = () => {
    setEditModalData((prev) => ({
      ...prev,
      items: [...prev.items, emptyItem()],
    }));
  };

  const handleModalRemoveItem = (idx) => {
    setEditModalData((prev) => {
      if (prev.items.length <= 1) return prev;
      return {
        ...prev,
        items: prev.items.filter((_, i) => i !== idx),
      };
    });
  };

  const handleModalMobileChange = (val) => {
    const rawMobile = String(val || "").replace(/[^0-9]/g, "");

    setEditModalData((prev) => {
      if (!prev) return prev;

      if (rawMobile.length < 5) {
        return {
          ...prev,
          customer_mobile: val,
          customer_id: "",
        };
      }

      // Check if existing customer has this phone number
      const existing =
        customers.find((c) => String(c.mobile || "").replace(/[^0-9]/g, "") === rawMobile) ||
        bills.find((b) => String(b.customer_mobile || "").replace(/[^0-9]/g, "") === rawMobile);

      if (existing) {
        const cid = existing.customer_id || generateUniqueCustomerId(val, prev.bill_date);
        return {
          ...prev,
          customer_mobile: val,
          customer_id: cid,
          customer_name: existing.name || existing.customer_name || prev.customer_name,
          customer_address: existing.address || existing.customer_address || prev.customer_address,
        };
      } else {
        const newCid = generateUniqueCustomerId(val, prev.bill_date);
        return {
          ...prev,
          customer_mobile: val,
          customer_id: newCid,
        };
      }
    });
  };

  const handleModalCustomerIdChange = (val) => {
    const trimmed = (val || "").trim();

    setEditModalData((prev) => {
      if (!prev) return prev;

      if (!trimmed) {
        return {
          ...prev,
          customer_id: val,
        };
      }

      const matched =
        customers.find((c) => c.customer_id && c.customer_id.toLowerCase() === trimmed.toLowerCase()) ||
        bills.find((b) => b.customer_id && b.customer_id.toLowerCase() === trimmed.toLowerCase());

      if (matched) {
        return {
          ...prev,
          customer_id: val,
          customer_mobile: matched.mobile || matched.customer_mobile || prev.customer_mobile,
          customer_name: matched.name || matched.customer_name || prev.customer_name,
          customer_address: matched.address || matched.customer_address || prev.customer_address,
        };
      }

      return {
        ...prev,
        customer_id: val,
      };
    });
  };

  const handleModalDateChange = (val) => {
    setEditModalData((prev) => {
      if (!prev) return prev;

      let cid = prev.customer_id;
      const rawMobile = String(prev.customer_mobile || "").replace(/[^0-9]/g, "");
      if (rawMobile.length >= 5) {
        if (!cid || cid.startsWith("CID-")) {
          cid = generateUniqueCustomerId(prev.customer_mobile, val);
        }
      }

      return {
        ...prev,
        bill_date: val,
        customer_id: cid,
      };
    });
  };

  async function handleSaveModalEdit() {
    if (!editModalData.customer_name.trim()) {
      setModalEditErr("Customer Name is required.");
      return;
    }
    if (!editModalData.customer_mobile.trim()) {
      setModalEditErr("Customer Mobile is required.");
      return;
    }

    setModalEditBusy(true);
    setModalEditErr("");

    try {
      const editSubtotal = (editModalData.items || []).reduce((sum, it) => {
        const v = parseFloat(it.subtotal);
        return sum + (isNaN(v) ? 0 : v);
      }, 0);
      const l = parseFloat(editModalData.labour_charge) || 0;
      const t = parseFloat(editModalData.transport_cost) || 0;
      const d = parseFloat(editModalData.discount) || 0;
      const computedTotalBill = Math.max(0, editSubtotal + l + t - d);
      const p = parseFloat(editModalData.client_payment) || 0;
      const computedDueAdvance = computedTotalBill - p;

      const payload = {
        id: editModalData.id,
        bill_date: editModalData.bill_date,
        bill_no: editModalData.bill_no,
        customer_name: editModalData.customer_name.trim(),
        customer_address: editModalData.customer_address.trim(),
        customer_mobile: editModalData.customer_mobile.trim(),
        customer_id: editModalData.customer_id.trim() || generateUniqueCustomerId(editModalData.customer_mobile, editModalData.bill_date),
        items: editModalData.items,
        labour_charge: l,
        transport_cost: t,
        discount: d,
        total_bill: computedTotalBill,
        client_payment: p,
        due_advance: computedDueAdvance,
        note: editModalData.note.trim(),
      };

      const res = await fetch("/api/bill-entry", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update bill");
      }

      await loadData();

      setSelectedBillForModal((prev) => ({
        ...prev,
        ...payload,
        dueThisBill: computedDueAdvance > 0 ? computedDueAdvance : 0,
        advanceThisBill: computedDueAdvance < 0 ? Math.abs(computedDueAdvance) : 0,
        runningBalance: (prev?.prevBalance || 0) + computedDueAdvance,
      }));

      setIsEditingModal(false);
      setSuccessMsg("Bill updated successfully!");
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err) {
      setModalEditErr(err.message || "Failed to save changes");
    } finally {
      setModalEditBusy(false);
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
        router.replace("/");
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
        router.replace("/");
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
        router.replace("/");
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
        router.replace("/");
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
        const totalBill = Number(b.total_bill) || 0;
        const payment = Number(b.client_payment) || 0;
        const net = Number(b.due_advance) || (totalBill - payment);

        let dueThisBill = 0;
        let advanceThisBill = 0;
        let dueReceived = 0;

        if (totalBill > payment) {
          const shortfall = totalBill - payment;
          if (prev < 0) {
            // Customer had previous advance balance
            const availableAdvance = Math.abs(prev);
            if (availableAdvance >= shortfall) {
              dueThisBill = 0;
            } else {
              dueThisBill = shortfall - availableAdvance;
            }
          } else {
            dueThisBill = shortfall;
          }
        } else if (payment > totalBill) {
          const excess = payment - totalBill;
          if (prev > 0) {
            dueReceived = Math.min(prev, excess);
            advanceThisBill = Math.max(0, excess - prev);
          } else {
            advanceThisBill = excess;
          }
        }

        running += net;
        balanceInfoMap.set(b.id, {
          prevBalance: prev,
          billNet: net,
          runningBalance: running,
          dueThisBill,
          advanceThisBill,
          dueReceived,
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
        dueThisBill: Math.max(0, (Number(b.total_bill) || 0) - (Number(b.client_payment) || 0)),
        advanceThisBill: Math.max(0, (Number(b.client_payment) || 0) - (Number(b.total_bill) || 0)),
        dueReceived: 0,
        isLatestBillForCustomer: false,
        customerFinalBalance: Number(b.due_advance) || 0,
      };
      return {
        ...b,
        prevBalance: info.prevBalance,
        billNet: info.billNet,
        runningBalance: info.runningBalance,
        dueThisBill: info.dueThisBill,
        advanceThisBill: info.advanceThisBill,
        dueReceived: info.dueReceived,
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

  const activeCustomerBills = useMemo(() => {
    if (!activeCustomerGroup || !activeCustomerGroup.bills) return [];
    return [...activeCustomerGroup.bills].sort((a, b) => {
      let diff = 0;
      if (a.bill_date && b.bill_date && a.bill_date !== b.bill_date) {
        diff = a.bill_date.localeCompare(b.bill_date);
      } else {
        const idA = Number(a.id) || 0;
        const idB = Number(b.id) || 0;
        diff = idA - idB;
      }
      return customerLedgerSort === "desc" ? -diff : diff;
    });
  }, [activeCustomerGroup, customerLedgerSort]);

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
        router.replace("/");
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
      await fetch("/api/auth/logout", { method: "DELETE" });
    } catch {}
    router.replace("/");
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

  // Dynamic column totals for filtered bills table (adapts to any filter, duration, or search)
  const filteredTableTotals = useMemo(() => {
    let totalBill = 0;
    let totalInvoicePayment = 0;
    let totalClientPayment = 0;
    let totalDueThisBill = 0;
    let totalAdvanceThisBill = 0;
    let totalDueReceived = 0;

    // Track unique customer latest balances within this filtered set
    const customerLatestBillMap = new Map();

    filteredBills.forEach((b) => {
      const tb = Number(b.total_bill || 0);
      const cp = Number(b.client_payment || 0);
      const dtb = Number(b.dueThisBill || 0);
      const atb = Number(b.advanceThisBill || 0);
      const dr = Number(b.dueReceived || 0);
      const invPay = Math.max(0, cp - dr - atb);

      totalBill += tb;
      totalInvoicePayment += invPay;
      totalClientPayment += cp;
      totalDueThisBill += dtb;
      totalAdvanceThisBill += atb;
      totalDueReceived += dr;

      const custKey = b.customer_id || (b.customer_mobile ? `M-${b.customer_mobile}` : `GUEST-${b.id}`);
      const existing = customerLatestBillMap.get(custKey);
      if (!existing) {
        customerLatestBillMap.set(custKey, b);
      } else {
        const bDate = b.bill_date || "";
        const exDate = existing.bill_date || "";
        if (bDate > exDate || (bDate === exDate && (Number(b.id) || 0) > (Number(existing.id) || 0))) {
          customerLatestBillMap.set(custKey, b);
        }
      }
    });

    let totalDueBalance = 0;
    let totalAdvBalance = 0;
    customerLatestBillMap.forEach((latestBill) => {
      const rBal = latestBill.runningBalance !== undefined ? Number(latestBill.runningBalance) : Number(latestBill.due_advance || 0);
      if (rBal > 0) totalDueBalance += rBal;
      else if (rBal < 0) totalAdvBalance += Math.abs(rBal);
    });

    return {
      totalBill,
      totalInvoicePayment,
      totalClientPayment,
      totalDueThisBill,
      totalAdvanceThisBill,
      totalDueReceived,
      totalDueBalance,
      totalAdvBalance,
      count: filteredBills.length,
    };
  }, [filteredBills]);


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
            "Customer Name",
            "Customer ID & Mobile",
            "Items Count",
            "Total Bill (BDT)",
            "Payment (BDT)",
            "Due (BDT)",
            "Advance (BDT)",
            "Due Recieved (BDT)",
            "Remaining Balance (BDT)",
            "Remarks / Note",
          ],
        ];

        let tBill = 0;
        let tPaid = 0;
        let tDue = 0;
        let tAdv = 0;
        let tDueRec = 0;

        billList.forEach((b, i) => {
          const runBal = b.runningBalance !== undefined ? Number(b.runningBalance) : Number(b.due_advance) || 0;
          const totalBill = Number(b.total_bill || 0);
          const payment = Number(b.client_payment || 0);
          const dueVal = Number(b.dueThisBill || 0);
          const advVal = Number(b.advanceThisBill || 0);
          const dueRecVal = Number(b.dueReceived || 0);
          const invoicePayment = Math.max(0, payment - dueRecVal - advVal);
          const itCount = Array.isArray(b.items) ? b.items.length : 0;
          const cidMobile = [b.customer_id, b.customer_mobile].filter(Boolean).join(" | ") || "-";

          tBill += totalBill;
          tPaid += invoicePayment;
          tDue += dueVal;
          tAdv += advVal;
          tDueRec += dueRecVal;

          const remBalStr =
            runBal > 0
              ? `Due: ${runBal.toFixed(2)}`
              : runBal < 0
              ? `Adv: ${Math.abs(runBal).toFixed(2)}`
              : "0.00";

          rows.push([
            i + 1,
            b.bill_date || "-",
            b.bill_no || "-",
            b.customer_name || "-",
            cidMobile,
            itCount,
            totalBill,
            invoicePayment,
            dueVal,
            advVal,
            dueRecVal,
            remBalStr,
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
          tBill,
          tPaid,
          tDue,
          tAdv,
          tDueRec,
          "",
          "",
        ]);

        const ws = XLSX.utils.aoa_to_sheet(rows);
        ws["!cols"] = [
          { wch: 6 },
          { wch: 12 },
          { wch: 12 },
          { wch: 22 },
          { wch: 25 },
          { wch: 12 },
          { wch: 16 },
          { wch: 16 },
          { wch: 14 },
          { wch: 14 },
          { wch: 18 },
          { wch: 20 },
          { wch: 28 },
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
            <h1>Sales</h1>
            <p>Chowdhury Engineering Works • Customer Invoicing &amp; Ledger</p>
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

          <Link href="/" className="be-nav-btn" title="Open Home Dashboard">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12l9-9 9 9M5 10v10a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V10" />
            </svg>
            Home
          </Link>
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
      </section>

      {/* Main Entry Form Card */}
      <section className="be-card">
        <div className="be-card-header">
          <h2 className="be-card-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--be-primary)" }}>
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            New Sales Entry
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
              <span>6. Item Breakdown (Item Name, Quantity, Unit, Rate, Sub-Total)</span>
            </div>

            <div className="be-items-container">
              <table className="be-items-table">
                <thead>
                  <tr>
                    <th style={{ width: "40px", textAlign: "center" }}>#</th>
                    <th>Item Description</th>
                    <th style={{ width: "120px" }}>Quantity</th>
                    <th style={{ width: "110px" }}>Unit</th>
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
                          placeholder="e.g. 10"
                          value={item.quantity !== undefined && item.quantity !== "" ? item.quantity : (item.weight || "")}
                          onChange={(e) => handleItemFieldChange(idx, "quantity", e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          placeholder="e.g. pcs"
                          list="unit-presets"
                          value={item.unit || ""}
                          onChange={(e) => handleItemFieldChange(idx, "unit", e.target.value)}
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

              {/* Datalist for unit presets */}
              <datalist id="unit-presets">
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
                style={{ fontSize: "0.8rem", padding: "4px 8px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5 }}
                title="Reset all filters"
              >
                <XIcon size={12} /> Clear Filter
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
                <th style={{ width: "32px", textAlign: "center", paddingLeft: "6px", paddingRight: "4px" }}>SL</th>
                <th style={{ minWidth: "82px", whiteSpace: "nowrap" }}>Date</th>
                <th style={{ minWidth: "75px", whiteSpace: "nowrap" }}>Bill No</th>
                <th style={{ minWidth: "120px" }}>Customer Name</th>
                <th style={{ minWidth: "135px" }}>Customer ID & Mobile</th>
                <th style={{ textAlign: "right", whiteSpace: "nowrap" }}>Total Bill (৳)</th>
                <th style={{ textAlign: "right", whiteSpace: "nowrap" }}>Payment (৳)</th>
                <th style={{ textAlign: "right", whiteSpace: "nowrap" }}>Due (৳)</th>
                <th style={{ textAlign: "right", whiteSpace: "nowrap" }}>Advance (৳)</th>
                <th style={{ textAlign: "right", whiteSpace: "nowrap" }}>Due Received (৳)</th>
                <th style={{ textAlign: "right", whiteSpace: "nowrap" }}>Remaining Balance (৳)</th>
              </tr>
            </thead>
            <tbody>
              {filteredBills.length === 0 ? (
                <tr>
                  <td colSpan={11} style={{ textAlign: "center", padding: "26px", color: "var(--be-text-muted)" }}>
                    No recorded bills found. Fill the form above and click &quot;Save & Record Bill&quot;.
                  </td>
                </tr>
              ) : (
                filteredBills.map((b, idx) => {
                  const totalBill = Number(b.total_bill || 0);
                  const payment = Number(b.client_payment || 0);
                  const dueThisBill = Number(b.dueThisBill || 0);
                  const advanceThisBill = Number(b.advanceThisBill || 0);
                  const dueReceived = Number(b.dueReceived || 0);
                  const invoicePayment = Math.max(0, payment - dueReceived - advanceThisBill);
                  const rBal = b.runningBalance !== undefined ? Number(b.runningBalance) : Number(b.due_advance || 0);
                  const prev = b.prevBalance || 0;
                  const isExpanded = expandedBillId === b.id;
                  const items = Array.isArray(b.items) ? b.items : [];

                  return (
                    <Fragment key={b.id}>
                      <tr
                        onClick={() => setSelectedBillForModal(b)}
                        className={`be-row-interactive ${isExpanded ? "expanded" : ""}`}
                        title="Click to view full order details in Pop-up"
                      >
                        <td
                          style={{ textAlign: "center", color: "var(--be-text-muted)", fontWeight: 600, paddingLeft: "6px", paddingRight: "4px" }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedBillId((prev) => (prev === b.id ? null : b.id));
                          }}
                          title={isExpanded ? "Collapse dropdown" : "Click to dropdown details underneath"}
                        >
                          <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 3 }}>
                            <span>{idx + 1}</span>
                            <svg
                              width="11"
                              height="11"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              style={{
                                transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                                transition: "transform 0.2s ease",
                                color: isExpanded ? "var(--be-primary)" : "#94a3b8",
                                cursor: "pointer",
                              }}
                            >
                              <polyline points="6 9 12 15 18 9" />
                            </svg>
                          </div>
                        </td>
                        <td style={{ whiteSpace: "nowrap", color: "#475569", fontSize: "0.8rem" }}>{b.bill_date || "—"}</td>
                        <td style={{ fontWeight: 700, color: "#1e293b", whiteSpace: "nowrap" }}>{b.bill_no || "—"}</td>
                        <td>
                          <div style={{ fontWeight: 700, color: "#0f172a" }}>{b.customer_name || "—"}</div>
                          {b.customer_address && (
                            <div style={{ fontSize: "0.74rem", color: "var(--be-text-muted)", lineHeight: 1.25, marginTop: "1px" }}>
                              {b.customer_address}
                            </div>
                          )}
                        </td>
                        <td>
                          <div style={{ fontFamily: "monospace", fontSize: "0.8rem", fontWeight: 700, color: "#2563eb", whiteSpace: "nowrap" }}>
                            {b.customer_id || "—"}
                          </div>
                          {b.customer_mobile && (
                            <div style={{ fontSize: "0.76rem", color: "var(--be-text-muted)", whiteSpace: "nowrap" }}>
                              {b.customer_mobile}
                            </div>
                          )}
                        </td>
                        <td style={{ textAlign: "right", fontWeight: 700, color: "#0f172a", whiteSpace: "nowrap" }}>
                          ৳ {fmt(totalBill)}
                        </td>
                        <td style={{ textAlign: "right", color: invoicePayment > 0 ? "#059669" : "var(--be-text-muted)", fontWeight: 700, whiteSpace: "nowrap" }}>
                          {invoicePayment > 0 ? `৳ ${fmt(invoicePayment)}` : "—"}
                        </td>
                        <td style={{ textAlign: "right", fontWeight: 700, color: dueThisBill > 0 ? "#dc2626" : "var(--be-text-muted)", whiteSpace: "nowrap" }}>
                          {dueThisBill > 0 ? `৳ ${fmt(dueThisBill)}` : "—"}
                        </td>
                        <td style={{ textAlign: "right", fontWeight: 700, color: advanceThisBill > 0 ? "#059669" : "var(--be-text-muted)", whiteSpace: "nowrap" }}>
                          {advanceThisBill > 0 ? `৳ ${fmt(advanceThisBill)}` : "—"}
                        </td>
                        <td style={{ textAlign: "right", fontWeight: 700, color: dueReceived > 0 ? "#2563eb" : "var(--be-text-muted)", whiteSpace: "nowrap" }}>
                          {dueReceived > 0 ? `৳ ${fmt(dueReceived)}` : "—"}
                        </td>
                        <td style={{ textAlign: "right", verticalAlign: "middle", whiteSpace: "nowrap" }}>
                          <div>
                            <div
                              style={{
                                fontWeight: 800,
                                fontSize: "0.88rem",
                                color: rBal > 0 ? "#dc2626" : rBal < 0 ? "#059669" : "var(--be-text-muted)",
                              }}
                            >
                              {rBal > 0
                                ? `Due: ৳ ${fmt(rBal)}`
                                : rBal < 0
                                ? `Adv: ৳ ${fmt(Math.abs(rBal))}`
                                : "Fully Settled"}
                            </div>

                            {prev !== 0 && (
                              <div
                                style={{
                                  fontSize: "0.7rem",
                                  color: "#64748b",
                                  marginTop: "2px",
                                  lineHeight: 1.2,
                                }}
                                title={`Previous Balance: ${prev > 0 ? `Due ৳ ${fmt(prev)}` : `Adv ৳ ${fmt(Math.abs(prev))}`}`}
                              >
                                <span>
                                  Prev:{" "}
                                  <strong style={{ color: prev > 0 ? "#b91c1c" : "#047857" }}>
                                    {prev > 0 ? `Due ${fmt(prev)}` : `Adv ${fmt(Math.abs(prev))}`}
                                  </strong>
                                </span>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* INLINE DROPDOWN ROW BENEATH ORDER */}
                      {isExpanded && (
                        <tr className="be-inline-expanded-row">
                          <td colSpan={11} style={{ padding: "0", background: "#f8fafc", borderBottom: "2px solid #cbd5e1" }}>
                            <div style={{ padding: "16px 20px", borderLeft: "4px solid #2563eb" }}>
                              {/* Top bar of dropdown */}
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "10px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                  <span style={{ fontWeight: 800, fontSize: "0.92rem", color: "#0f172a" }}>
                                    Order Items & Statement — Bill #{b.bill_no || "N/A"}
                                  </span>
                                  <span style={{ fontSize: "0.76rem", background: "#e0f2fe", color: "#0369a1", padding: "2px 8px", borderRadius: "12px", fontWeight: 700 }}>
                                    {items.length} {items.length === 1 ? "item" : "items"}
                                  </span>
                                </div>

                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                  <button
                                    type="button"
                                    onClick={() => setSelectedBillForModal(b)}
                                    className="be-btn-ghost"
                                    style={{ fontSize: "0.78rem", padding: "5px 11px", display: "inline-flex", alignItems: "center", gap: "6px", color: "#2563eb", background: "#eff6ff", borderRadius: "6px", fontWeight: 700, border: "1px solid #bfdbfe", cursor: "pointer" }}
                                  >
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M15 3h6v6" />
                                      <path d="M9 21H3v-6" />
                                      <path d="M21 3l-7 7" />
                                      <path d="M3 21l7-7" />
                                    </svg>
                                    Open Pop-up Modal
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setExpandedBillId(null)}
                                    className="be-btn-ghost"
                                    style={{ fontSize: "0.76rem", padding: "5px 9px", cursor: "pointer" }}
                                    title="Close dropdown"
                                  >
                                    ✕ Close
                                  </button>
                                </div>
                              </div>

                              {/* Items Table */}
                              {items.length > 0 ? (
                                <div style={{ overflowX: "auto", background: "#ffffff", borderRadius: "8px", border: "1px solid #e2e8f0", marginBottom: "12px" }}>
                                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                                    <thead>
                                      <tr style={{ background: "#f1f5f9", color: "#475569", textAlign: "left", fontSize: "0.72rem", textTransform: "uppercase" }}>
                                        <th style={{ padding: "8px 10px", width: "32px", textAlign: "center" }}>#</th>
                                        <th style={{ padding: "8px 10px" }}>Item Description</th>
                                        <th style={{ padding: "8px 10px", textAlign: "right" }}>Weight</th>
                                        <th style={{ padding: "8px 10px", textAlign: "right" }}>Qty</th>
                                        <th style={{ padding: "8px 10px", textAlign: "right" }}>Rate (৳)</th>
                                        <th style={{ padding: "8px 10px", textAlign: "right" }}>Subtotal (৳)</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {items.map((it, itIdx) => (
                                        <tr key={itIdx} style={{ borderTop: "1px solid #f1f5f9" }}>
                                          <td style={{ padding: "7px 10px", textAlign: "center", color: "#64748b" }}>{itIdx + 1}</td>
                                          <td style={{ padding: "7px 10px", fontWeight: 700, color: "#1e293b" }}>{it.name || "—"}</td>
                                          <td style={{ padding: "7px 10px", textAlign: "right", color: "#475569" }}>{it.weight || "—"}</td>
                                          <td style={{ padding: "7px 10px", textAlign: "right", color: "#475569" }}>{it.quantity || "—"}</td>
                                          <td style={{ padding: "7px 10px", textAlign: "right", color: "#475569" }}>{it.rate ? `৳ ${fmt(it.rate)}` : "—"}</td>
                                          <td style={{ padding: "7px 10px", textAlign: "right", fontWeight: 700, color: "#0f172a" }}>
                                            {it.subtotal ? `৳ ${fmt(it.subtotal)}` : "৳ 0.00"}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              ) : (
                                <div style={{ padding: "12px", background: "#ffffff", borderRadius: "8px", border: "1px dashed #cbd5e1", color: "#64748b", fontSize: "0.82rem", marginBottom: "12px" }}>
                                  Direct Payment / Settlement Entry (No individual item rows recorded).
                                </div>
                              )}

                              {/* Summary footer */}
                              <div style={{ display: "flex", flexWrap: "wrap", gap: "14px", justifyContent: "space-between", alignItems: "center", background: "#ffffff", padding: "10px 14px", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "0.82rem" }}>
                                <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", color: "#475569" }}>
                                  {Number(b.labour_charge || 0) > 0 && (
                                    <div>Labour: <strong style={{ color: "#0f172a" }}>৳ {fmt(b.labour_charge)}</strong></div>
                                  )}
                                  {Number(b.transport_cost || 0) > 0 && (
                                    <div>Transport: <strong style={{ color: "#0f172a" }}>৳ {fmt(b.transport_cost)}</strong></div>
                                  )}
                                  {Number(b.discount || 0) > 0 && (
                                    <div>Discount: <strong style={{ color: "#dc2626" }}>- ৳ {fmt(b.discount)}</strong></div>
                                  )}
                                  {b.note && (
                                    <div style={{ maxWidth: "350px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                      Note: <span style={{ fontStyle: "italic", color: "#1e293b" }}>&quot;{b.note}&quot;</span>
                                    </div>
                                  )}
                                </div>

                                <div style={{ display: "flex", gap: "14px", alignItems: "center" }}>
                                  <div>Total: <strong style={{ color: "#0f172a" }}>৳ {fmt(totalBill)}</strong></div>
                                  <div>Paid: <strong style={{ color: "#059669" }}>৳ {fmt(payment)}</strong></div>
                                  <div>
                                    Balance:{" "}
                                    <strong style={{ color: rBal > 0 ? "#dc2626" : rBal < 0 ? "#059669" : "#64748b" }}>
                                      {rBal > 0 ? `Due ৳ ${fmt(rBal)}` : rBal < 0 ? `Adv ৳ ${fmt(Math.abs(rBal))}` : "Settled"}
                                    </strong>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
            {filteredBills.length > 0 && (
              <tfoot>
                <tr>
                  <td
                    colSpan={5}
                    style={{
                      textAlign: "right",
                      fontWeight: 800,
                      fontSize: "0.82rem",
                      color: "#334155",
                      padding: "12px 10px",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                      <span>
                        {balanceFilter !== "all" || durationMode !== "all" || Boolean(search.trim())
                          ? "Filtered Total"
                          : "Overall Total"}
                      </span>
                      <span style={{ fontSize: "0.74rem", background: "#e2e8f0", color: "#475569", padding: "1px 7px", borderRadius: "10px", fontWeight: 700 }}>
                        {filteredTableTotals.count} {filteredTableTotals.count === 1 ? "Bill" : "Bills"}
                      </span>
                      :
                    </span>
                  </td>
                  <td style={{ textAlign: "right", fontWeight: 800, fontSize: "0.9rem", color: "#0f172a", whiteSpace: "nowrap", padding: "12px 8px" }}>
                    ৳ {fmt(filteredTableTotals.totalBill)}
                  </td>
                  <td style={{ textAlign: "right", fontWeight: 800, fontSize: "0.9rem", color: filteredTableTotals.totalInvoicePayment > 0 ? "#059669" : "var(--be-text-muted)", whiteSpace: "nowrap", padding: "12px 8px" }}>
                    {filteredTableTotals.totalInvoicePayment > 0 ? `৳ ${fmt(filteredTableTotals.totalInvoicePayment)}` : "৳ 0.00"}
                  </td>
                  <td style={{ textAlign: "right", fontWeight: 800, fontSize: "0.9rem", color: filteredTableTotals.totalDueThisBill > 0 ? "#dc2626" : "var(--be-text-muted)", whiteSpace: "nowrap", padding: "12px 8px" }}>
                    {filteredTableTotals.totalDueThisBill > 0 ? `৳ ${fmt(filteredTableTotals.totalDueThisBill)}` : "৳ 0.00"}
                  </td>
                  <td style={{ textAlign: "right", fontWeight: 800, fontSize: "0.9rem", color: filteredTableTotals.totalAdvanceThisBill > 0 ? "#059669" : "var(--be-text-muted)", whiteSpace: "nowrap", padding: "12px 8px" }}>
                    {filteredTableTotals.totalAdvanceThisBill > 0 ? `৳ ${fmt(filteredTableTotals.totalAdvanceThisBill)}` : "৳ 0.00"}
                  </td>
                  <td style={{ textAlign: "right", fontWeight: 800, fontSize: "0.9rem", color: filteredTableTotals.totalDueReceived > 0 ? "#2563eb" : "var(--be-text-muted)", whiteSpace: "nowrap", padding: "12px 8px" }}>
                    {filteredTableTotals.totalDueReceived > 0 ? `৳ ${fmt(filteredTableTotals.totalDueReceived)}` : "৳ 0.00"}
                  </td>
                  <td style={{ textAlign: "right", verticalAlign: "middle", whiteSpace: "nowrap", padding: "12px 8px" }}>
                    {filteredTableTotals.totalDueBalance > 0 && filteredTableTotals.totalAdvBalance > 0 ? (
                      <div>
                        <div style={{ fontWeight: 800, fontSize: "0.86rem", color: "#dc2626" }}>
                          Due: ৳ {fmt(filteredTableTotals.totalDueBalance)}
                        </div>
                        <div style={{ fontWeight: 700, fontSize: "0.74rem", color: "#059669", marginTop: "1px" }}>
                          Adv: ৳ {fmt(filteredTableTotals.totalAdvBalance)}
                        </div>
                      </div>
                    ) : filteredTableTotals.totalDueBalance > 0 ? (
                      <div style={{ fontWeight: 800, fontSize: "0.88rem", color: "#dc2626" }}>
                        Due: ৳ {fmt(filteredTableTotals.totalDueBalance)}
                      </div>
                    ) : filteredTableTotals.totalAdvBalance > 0 ? (
                      <div style={{ fontWeight: 800, fontSize: "0.88rem", color: "#059669" }}>
                        Adv: ৳ {fmt(filteredTableTotals.totalAdvBalance)}
                      </div>
                    ) : (
                      <div style={{ fontWeight: 800, fontSize: "0.85rem", color: "var(--be-text-muted)" }}>
                        ৳ 0.00
                      </div>
                    )}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </section>

      {/* ORDER DETAILS POP-UP MODAL (VIEW & EDIT) */}
      {selectedBillForModal && (() => {
        const b = selectedBillForModal;
        const totalBill = Number(b.total_bill || 0);
        const payment = Number(b.client_payment || 0);
        const dueThisBill = Number(b.dueThisBill || 0);
        const advanceThisBill = Number(b.advanceThisBill || 0);
        const dueReceived = Number(b.dueReceived || 0);
        const rBal = b.runningBalance !== undefined ? Number(b.runningBalance) : Number(b.due_advance || 0);
        const prev = b.prevBalance || 0;
        const items = Array.isArray(b.items) ? b.items : [];
        const itemsSubtotal = items.reduce((acc, it) => acc + (Number(it.subtotal) || 0), 0);

        // Edit Mode dynamic auto-calculations
        const editItemsSubtotal = isEditingModal && editModalData
          ? (editModalData.items || []).reduce((sum, it) => sum + (parseFloat(it.subtotal) || 0), 0)
          : 0;
        const editLabour = isEditingModal && editModalData ? parseFloat(editModalData.labour_charge) || 0 : 0;
        const editTransport = isEditingModal && editModalData ? parseFloat(editModalData.transport_cost) || 0 : 0;
        const editDiscount = isEditingModal && editModalData ? parseFloat(editModalData.discount) || 0 : 0;
        const editTotalBill = Math.max(0, editItemsSubtotal + editLabour + editTransport - editDiscount);
        let editDueThisBill = 0;
        let editAdvanceThisBill = 0;
        let editDueReceived = 0;
        if (editTotalBill > editPayment) {
          const shortfall = editTotalBill - editPayment;
          if (prev < 0) {
            const availAdv = Math.abs(prev);
            editDueThisBill = availAdv >= shortfall ? 0 : shortfall - availAdv;
          } else {
            editDueThisBill = shortfall;
          }
        } else if (editPayment > editTotalBill) {
          const excess = editPayment - editTotalBill;
          if (prev > 0) {
            editDueReceived = Math.min(prev, excess);
            editAdvanceThisBill = Math.max(0, excess - prev);
          } else {
            editAdvanceThisBill = excess;
          }
        }
        const editDueAdvance = editTotalBill - editPayment;
        const editRunningBalance = (prev || 0) + editDueAdvance;

        return (
          <div
            className="be-modal-overlay"
            onClick={() => {
              if (isEditingModal && !confirm("Discard unsaved changes?")) return;
              setSelectedBillForModal(null);
              setIsEditingModal(false);
              setEditModalData(null);
              setModalEditErr("");
            }}
            style={{ zIndex: 1100 }}
          >
            <div
              className="be-modal-box be-printable-modal"
              onClick={(e) => e.stopPropagation()}
              style={{
                maxWidth: "860px",
                width: "95%",
                maxHeight: "92vh",
                display: "flex",
                flexDirection: "column",
                padding: "0",
                borderRadius: "16px",
                overflow: "hidden",
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              }}
            >
              {/* Modal Header */}
              <div
                style={{
                  background: isEditingModal
                    ? "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)"
                    : "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
                  color: "#ffffff",
                  padding: "16px 24px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "12px",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                    <span
                      style={{
                        background: isEditingModal ? "#f59e0b" : "rgba(255,255,255,0.15)",
                        color: isEditingModal ? "#000000" : "#ffffff",
                        padding: "2px 8px",
                        borderRadius: "6px",
                        fontSize: "0.72rem",
                        fontWeight: 800,
                        letterSpacing: "0.05em",
                        textTransform: "uppercase",
                      }}
                    >
                      {isEditingModal ? "✏️ Edit Mode" : "Invoice Voucher"}
                    </span>
                    <span style={{ fontSize: "0.82rem", opacity: 0.8 }}>
                      {isEditingModal ? "Auto-Calculating Changes" : `Date: ${b.bill_date || "—"}`}
                    </span>
                  </div>

                  {isEditingModal ? (
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginTop: "2px" }}>
                      <span style={{ fontSize: "0.9rem", fontWeight: 700 }}>Bill No:</span>
                      <input
                        type="text"
                        className="be-input"
                        style={{ width: "120px", padding: "4px 8px", fontSize: "0.88rem", background: "#ffffff", color: "#0f172a", borderRadius: "6px" }}
                        value={editModalData.bill_no}
                        placeholder="Bill #"
                        onChange={(e) => setEditModalData({ ...editModalData, bill_no: e.target.value })}
                      />
                      <span style={{ fontSize: "0.9rem", fontWeight: 700, marginLeft: "4px" }}>Date:</span>
                      <input
                        type="date"
                        className="be-input"
                        style={{ width: "135px", padding: "4px 8px", fontSize: "0.84rem", background: "#ffffff", color: "#0f172a", borderRadius: "6px" }}
                        value={editModalData.bill_date}
                        onChange={(e) => handleModalDateChange(e.target.value)}
                      />
                    </div>
                  ) : (
                    <h2 style={{ margin: 0, fontSize: "1.35rem", fontWeight: 800, letterSpacing: "-0.02em" }}>
                      Bill #{b.bill_no || "N/A"}
                    </h2>
                  )}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div
                    style={{
                      padding: "5px 12px",
                      borderRadius: "20px",
                      fontSize: "0.82rem",
                      fontWeight: 800,
                      background: (isEditingModal ? editRunningBalance : rBal) > 0
                        ? "rgba(220, 38, 38, 0.2)"
                        : (isEditingModal ? editRunningBalance : rBal) < 0
                        ? "rgba(16, 185, 129, 0.2)"
                        : "rgba(148, 163, 184, 0.2)",
                      color: (isEditingModal ? editRunningBalance : rBal) > 0
                        ? "#fca5a5"
                        : (isEditingModal ? editRunningBalance : rBal) < 0
                        ? "#6ee7b7"
                        : "#cbd5e1",
                      border: `1px solid ${(isEditingModal ? editRunningBalance : rBal) > 0 ? "rgba(220, 38, 38, 0.4)" : (isEditingModal ? editRunningBalance : rBal) < 0 ? "rgba(16, 185, 129, 0.4)" : "rgba(148, 163, 184, 0.4)"}`,
                    }}
                  >
                    {isEditingModal
                      ? editRunningBalance > 0
                        ? `Live Due: ৳ ${fmt(editRunningBalance)}`
                        : editRunningBalance < 0
                        ? `Live Adv: ৳ ${fmt(Math.abs(editRunningBalance))}`
                        : "Live: Settled"
                      : rBal > 0
                      ? `Due: ৳ ${fmt(rBal)}`
                      : rBal < 0
                      ? `Adv: ৳ ${fmt(Math.abs(rBal))}`
                      : "Fully Settled"}
                  </div>

                  {!isEditingModal && (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Are you sure you want to delete Bill #${b.bill_no || b.id}? This will move it to Recycle Bin.`)) {
                          handleDelete(b.id, b.bill_no);
                          setSelectedBillForModal(null);
                        }
                      }}
                      style={{
                        background: "rgba(239, 68, 68, 0.2)",
                        border: "1px solid rgba(239, 68, 68, 0.35)",
                        color: "#fca5a5",
                        borderRadius: "8px",
                        width: "32px",
                        height: "32px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                      title="Delete Bill"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      if (isEditingModal && !confirm("Discard unsaved changes?")) return;
                      setSelectedBillForModal(null);
                      setIsEditingModal(false);
                      setEditModalData(null);
                      setModalEditErr("");
                    }}
                    className="be-modal-close-btn"
                    style={{
                      background: "rgba(255,255,255,0.12)",
                      border: "none",
                      color: "#ffffff",
                      borderRadius: "8px",
                      width: "32px",
                      height: "32px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    title="Close Modal"
                  >
                    <XIcon size={16} />
                  </button>
                </div>
              </div>

              {/* Scrollable Body */}
              <div style={{ padding: "18px 24px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "16px" }}>
                {modalEditErr && (
                  <div style={{ background: "#fee2e2", color: "#b91c1c", padding: "10px 14px", borderRadius: "8px", fontSize: "0.84rem", fontWeight: 700 }}>
                    {modalEditErr}
                  </div>
                )}

                {/* Customer Information Card */}
                {isEditingModal ? (
                  <div
                    style={{
                      background: "#fffbeb",
                      border: "1px solid #fde68a",
                      borderRadius: "12px",
                      padding: "14px 16px",
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                      gap: "12px",
                    }}
                  >
                    <div>
                      <label style={{ display: "block", fontSize: "0.72rem", color: "#92400e", textTransform: "uppercase", fontWeight: 800, marginBottom: "3px" }}>
                        Customer Name *
                      </label>
                      <input
                        type="text"
                        className="be-input"
                        value={editModalData.customer_name}
                        onChange={(e) => setEditModalData({ ...editModalData, customer_name: e.target.value })}
                        placeholder="Customer Name"
                        required
                      />
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "0.72rem", color: "#92400e", textTransform: "uppercase", fontWeight: 800, marginBottom: "3px" }}>
                        Mobile Number *
                      </label>
                      <input
                        type="text"
                        className="be-input"
                        value={editModalData.customer_mobile}
                        list="edit-modal-mobile-suggestions"
                        onChange={(e) => handleModalMobileChange(e.target.value)}
                        placeholder="Mobile (e.g. 01712345678)"
                        required
                      />
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "0.72rem", color: "#92400e", textTransform: "uppercase", fontWeight: 800, marginBottom: "3px" }}>
                        Customer ID
                      </label>
                      <input
                        type="text"
                        className="be-input"
                        style={{ fontFamily: "monospace" }}
                        value={editModalData.customer_id}
                        list="edit-modal-cid-suggestions"
                        onChange={(e) => handleModalCustomerIdChange(e.target.value)}
                        placeholder="e.g. CID-10-2026-01712"
                      />
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "0.72rem", color: "#92400e", textTransform: "uppercase", fontWeight: 800, marginBottom: "3px" }}>
                        Address
                      </label>
                      <input
                        type="text"
                        className="be-input"
                        value={editModalData.customer_address}
                        onChange={(e) => setEditModalData({ ...editModalData, customer_address: e.target.value })}
                        placeholder="Customer Address"
                      />
                    </div>

                    {/* Datalists for customer suggestions in edit modal */}
                    <datalist id="edit-modal-mobile-suggestions">
                      {allKnownCustomerProfiles.map((c) => (
                        <option key={c.customer_id} value={c.mobile}>
                          {c.name ? `${c.name} (${c.customer_id})` : c.customer_id}
                        </option>
                      ))}
                    </datalist>
                    <datalist id="edit-modal-cid-suggestions">
                      {allKnownCustomerProfiles.map((c) => (
                        <option key={c.customer_id} value={c.customer_id}>
                          {c.name ? `${c.name} • ` : ""}{c.mobile || ""}
                        </option>
                      ))}
                    </datalist>
                  </div>
                ) : (
                  <div
                    style={{
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: "12px",
                      padding: "14px 18px",
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                      gap: "14px",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "0.72rem", color: "#64748b", textTransform: "uppercase", fontWeight: 700, marginBottom: "3px" }}>
                        Customer Name
                      </div>
                      <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "#0f172a" }}>
                        {b.customer_name || "—"}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: "0.72rem", color: "#64748b", textTransform: "uppercase", fontWeight: 700, marginBottom: "3px" }}>
                        Mobile Number
                      </div>
                      <div style={{ fontSize: "0.92rem", fontWeight: 700, color: "#1e293b" }}>
                        {b.customer_mobile || "—"}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: "0.72rem", color: "#64748b", textTransform: "uppercase", fontWeight: 700, marginBottom: "3px" }}>
                        Customer ID
                      </div>
                      <div style={{ fontFamily: "monospace", fontSize: "0.85rem", fontWeight: 700, color: "#2563eb" }}>
                        {b.customer_id || "—"}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: "0.72rem", color: "#64748b", textTransform: "uppercase", fontWeight: 700, marginBottom: "3px" }}>
                        Address
                      </div>
                      <div style={{ fontSize: "0.85rem", color: "#334155" }}>
                        {b.customer_address || "—"}
                      </div>
                    </div>
                  </div>
                )}

                {/* Items Section */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <h3 style={{ margin: 0, fontSize: "0.92rem", fontWeight: 800, color: "#1e293b", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                      Ordered Items ({isEditingModal ? editModalData.items.length : items.length})
                    </h3>

                    {isEditingModal && (
                      <button
                        type="button"
                        onClick={handleModalAddItem}
                        className="be-btn-ghost"
                        style={{
                          fontSize: "0.78rem",
                          padding: "4px 10px",
                          color: "#16a34a",
                          background: "#f0fdf4",
                          borderRadius: "6px",
                          fontWeight: 700,
                          border: "1px solid #bbf7d0",
                          cursor: "pointer",
                        }}
                      >
                        + Add Item Row
                      </button>
                    )}
                  </div>

                  {isEditingModal ? (
                    <div style={{ overflowX: "auto", border: "1px solid #cbd5e1", borderRadius: "10px", background: "#ffffff" }}>
                      <datalist id="edit-modal-presets">
                        {ITEM_PRESETS.map((p) => (
                          <option key={p} value={p} />
                        ))}
                      </datalist>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                        <thead>
                          <tr style={{ background: "#f1f5f9", borderBottom: "1px solid #e2e8f0", color: "#475569", textTransform: "uppercase", fontSize: "0.72rem" }}>
                            <th style={{ padding: "8px 10px", width: "30px", textAlign: "center" }}>#</th>
                            <th style={{ padding: "8px 10px", minWidth: "160px" }}>Item Description</th>
                            <th style={{ padding: "8px 10px", width: "95px", textAlign: "right" }}>Quantity</th>
                            <th style={{ padding: "8px 10px", width: "80px", textAlign: "center" }}>Unit</th>
                            <th style={{ padding: "8px 10px", width: "85px", textAlign: "right" }}>Rate (৳)</th>
                            <th style={{ padding: "8px 10px", width: "110px", textAlign: "right" }}>Subtotal (৳)</th>
                            <th style={{ padding: "8px 10px", width: "40px", textAlign: "center" }}>✕</th>
                          </tr>
                        </thead>
                        <tbody>
                          {editModalData.items.map((it, i) => (
                            <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                              <td style={{ padding: "6px 8px", textAlign: "center", color: "#94a3b8", fontWeight: 700 }}>
                                {i + 1}
                              </td>
                              <td style={{ padding: "6px 8px" }}>
                                <input
                                  type="text"
                                  list="edit-modal-presets"
                                  className="be-input"
                                  style={{ padding: "5px 8px", fontSize: "0.82rem" }}
                                  value={it.name}
                                  placeholder="Item name"
                                  onChange={(e) => handleModalItemChange(i, "name", e.target.value)}
                                />
                              </td>
                              <td style={{ padding: "6px 8px" }}>
                                <input
                                  type="number"
                                  step="any"
                                  className="be-input"
                                  style={{ padding: "5px 8px", fontSize: "0.82rem", textAlign: "right" }}
                                  value={it.quantity !== undefined && it.quantity !== "" ? it.quantity : (it.weight || "")}
                                  placeholder="0"
                                  onChange={(e) => handleModalItemChange(i, "quantity", e.target.value)}
                                />
                              </td>
                              <td style={{ padding: "6px 8px" }}>
                                <input
                                  type="text"
                                  className="be-input"
                                  list="unit-presets"
                                  style={{ padding: "5px 8px", fontSize: "0.82rem", textAlign: "center" }}
                                  value={it.unit || ""}
                                  placeholder="pcs"
                                  onChange={(e) => handleModalItemChange(i, "unit", e.target.value)}
                                />
                              </td>
                              <td style={{ padding: "6px 8px" }}>
                                <input
                                  type="number"
                                  step="any"
                                  className="be-input"
                                  style={{ padding: "5px 8px", fontSize: "0.82rem", textAlign: "right" }}
                                  value={it.rate}
                                  placeholder="0.00"
                                  onChange={(e) => handleModalItemChange(i, "rate", e.target.value)}
                                />
                              </td>
                              <td style={{ padding: "6px 8px" }}>
                                <input
                                  type="number"
                                  step="any"
                                  className="be-input"
                                  style={{ padding: "5px 8px", fontSize: "0.82rem", textAlign: "right", fontWeight: 700, color: "#0f172a" }}
                                  value={it.subtotal}
                                  placeholder="0.00"
                                  onChange={(e) => handleModalItemChange(i, "subtotal", e.target.value)}
                                />
                              </td>
                              <td style={{ padding: "6px 8px", textAlign: "center" }}>
                                <button
                                  type="button"
                                  onClick={() => handleModalRemoveItem(i)}
                                  disabled={editModalData.items.length <= 1}
                                  className="be-del-row-btn"
                                  style={{ width: "26px", height: "26px", opacity: editModalData.items.length <= 1 ? 0.3 : 1 }}
                                  title="Remove item row"
                                >
                                  ✕
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : items.length === 0 ? (
                    <div style={{ padding: "18px", textAlign: "center", background: "#f8fafc", borderRadius: "10px", border: "1px dashed #cbd5e1", color: "#64748b", fontSize: "0.85rem" }}>
                      Direct Payment / Settlement Entry (No individual item rows recorded).
                    </div>
                  ) : (
                    <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: "10px", background: "#ffffff" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.84rem" }}>
                        <thead>
                          <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#475569", textTransform: "uppercase", fontSize: "0.72rem" }}>
                            <th style={{ padding: "9px 12px", width: "35px", textAlign: "center" }}>#</th>
                            <th style={{ padding: "9px 12px", textAlign: "left" }}>Item Description</th>
                            <th style={{ padding: "9px 12px", textAlign: "right" }}>Quantity</th>
                            <th style={{ padding: "9px 12px", textAlign: "center" }}>Unit</th>
                            <th style={{ padding: "9px 12px", textAlign: "right" }}>Rate (৳)</th>
                            <th style={{ padding: "9px 12px", textAlign: "right" }}>Subtotal (৳)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((it, i) => (
                            <tr key={i} style={{ borderBottom: i === items.length - 1 ? "none" : "1px solid #f1f5f9" }}>
                              <td style={{ padding: "9px 12px", textAlign: "center", color: "#94a3b8", fontWeight: 600 }}>{i + 1}</td>
                              <td style={{ padding: "9px 12px", fontWeight: 700, color: "#0f172a" }}>{it.name || "—"}</td>
                              <td style={{ padding: "9px 12px", textAlign: "right", color: "#475569" }}>{it.quantity !== undefined && it.quantity !== "" ? it.quantity : (it.weight || "—")}</td>
                              <td style={{ padding: "9px 12px", textAlign: "center", color: "#475569" }}>{it.unit || "pcs"}</td>
                              <td style={{ padding: "9px 12px", textAlign: "right", color: "#475569" }}>{it.rate ? `৳ ${fmt(it.rate)}` : "—"}</td>
                              <td style={{ padding: "9px 12px", textAlign: "right", fontWeight: 700, color: "#0f172a" }}>
                                {it.subtotal ? `৳ ${fmt(it.subtotal)}` : "৳ 0.00"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Financial Summary & Breakdown (Live Auto-Calculating) */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
                  {/* Left: Charges Breakdown */}
                  <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "14px 16px", display: "flex", flexDirection: "column", gap: "8px", fontSize: "0.85rem" }}>
                    <div style={{ fontSize: "0.74rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase", borderBottom: "1px solid #f1f5f9", paddingBottom: "6px" }}>
                      Bill Calculation {isEditingModal && <span style={{ color: "#16a34a" }}>• (Auto-Computed)</span>}
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "#475569" }}>
                      <span>Items Subtotal:</span>
                      <span style={{ fontWeight: 700, color: "#0f172a" }}>
                        ৳ {fmt(isEditingModal ? editItemsSubtotal : itemsSubtotal)}
                      </span>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "#475569" }}>
                      <span>Labour Charge (+):</span>
                      {isEditingModal ? (
                        <input
                          type="number"
                          step="any"
                          className="be-input"
                          style={{ width: "110px", padding: "4px 8px", fontSize: "0.82rem", textAlign: "right" }}
                          value={editModalData.labour_charge}
                          placeholder="0.00"
                          onChange={(e) => setEditModalData({ ...editModalData, labour_charge: e.target.value })}
                        />
                      ) : (
                        <span style={{ fontWeight: 600, color: "#0f172a" }}>৳ {fmt(b.labour_charge)}</span>
                      )}
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "#475569" }}>
                      <span>Transport Cost (+):</span>
                      {isEditingModal ? (
                        <input
                          type="number"
                          step="any"
                          className="be-input"
                          style={{ width: "110px", padding: "4px 8px", fontSize: "0.82rem", textAlign: "right" }}
                          value={editModalData.transport_cost}
                          placeholder="0.00"
                          onChange={(e) => setEditModalData({ ...editModalData, transport_cost: e.target.value })}
                        />
                      ) : (
                        <span style={{ fontWeight: 600, color: "#0f172a" }}>৳ {fmt(b.transport_cost)}</span>
                      )}
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "#dc2626" }}>
                      <span>Discount (-):</span>
                      {isEditingModal ? (
                        <input
                          type="number"
                          step="any"
                          className="be-input"
                          style={{ width: "110px", padding: "4px 8px", fontSize: "0.82rem", textAlign: "right", color: "#dc2626" }}
                          value={editModalData.discount}
                          placeholder="0.00"
                          onChange={(e) => setEditModalData({ ...editModalData, discount: e.target.value })}
                        />
                      ) : (
                        <span style={{ fontWeight: 600 }}>- ৳ {fmt(b.discount)}</span>
                      )}
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "8px", borderTop: "1px dashed #cbd5e1", fontSize: "0.95rem", fontWeight: 800, color: "#0f172a" }}>
                      <span>Grand Total Bill:</span>
                      <span style={{ color: "#0f172a", fontSize: "1.05rem" }}>
                        ৳ {fmt(isEditingModal ? editTotalBill : totalBill)}
                      </span>
                    </div>
                  </div>

                  {/* Right: Payment & Balance Status */}
                  <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "14px 16px", display: "flex", flexDirection: "column", gap: "8px", fontSize: "0.85rem" }}>
                    <div style={{ fontSize: "0.74rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase", borderBottom: "1px solid #e2e8f0", paddingBottom: "6px" }}>
                      Payment & Statement {isEditingModal && <span style={{ color: "#16a34a" }}>• (Live)</span>}
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "#059669", fontWeight: 700 }}>
                      <span>Client Payment Received:</span>
                      {isEditingModal ? (
                        <input
                          type="number"
                          step="any"
                          className="be-input"
                          style={{ width: "120px", padding: "4px 8px", fontSize: "0.85rem", textAlign: "right", fontWeight: 700, color: "#059669" }}
                          value={editModalData.client_payment}
                          placeholder="0.00"
                          onChange={(e) => setEditModalData({ ...editModalData, client_payment: e.target.value })}
                        />
                      ) : (
                        <span>৳ {fmt(payment)}</span>
                      )}
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", color: "#dc2626" }}>
                      <span>Due for this bill:</span>
                      <span style={{ fontWeight: 700 }}>
                        ৳ {fmt(isEditingModal ? editDueThisBill : dueThisBill)}
                      </span>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", color: "#059669" }}>
                      <span>Advance for this bill:</span>
                      <span style={{ fontWeight: 700 }}>
                        ৳ {fmt(isEditingModal ? editAdvanceThisBill : advanceThisBill)}
                      </span>
                    </div>

                    {dueReceived > 0 && (
                      <div style={{ display: "flex", justifyContent: "space-between", color: "#2563eb" }}>
                        <span>Due Received:</span>
                        <span style={{ fontWeight: 700 }}>৳ {fmt(dueReceived)}</span>
                      </div>
                    )}

                    {prev !== 0 && (
                      <div style={{ display: "flex", justifyContent: "space-between", color: "#64748b", fontSize: "0.8rem" }}>
                        <span>Previous Balance:</span>
                        <span style={{ fontWeight: 600, color: prev > 0 ? "#dc2626" : "#059669" }}>
                          {prev > 0 ? `Due ৳ ${fmt(prev)}` : `Adv ৳ ${fmt(Math.abs(prev))}`}
                        </span>
                      </div>
                    )}

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        paddingTop: "8px",
                        borderTop: "1px dashed #cbd5e1",
                        fontSize: "0.95rem",
                        fontWeight: 800,
                        color: (isEditingModal ? editRunningBalance : rBal) > 0
                          ? "#dc2626"
                          : (isEditingModal ? editRunningBalance : rBal) < 0
                          ? "#059669"
                          : "#475569",
                      }}
                    >
                      <span>Final Net Balance:</span>
                      <span>
                        {(isEditingModal ? editRunningBalance : rBal) > 0
                          ? `Due: ৳ ${fmt(isEditingModal ? editRunningBalance : rBal)}`
                          : (isEditingModal ? editRunningBalance : rBal) < 0
                          ? `Adv: ৳ ${fmt(Math.abs(isEditingModal ? editRunningBalance : rBal))}`
                          : "Fully Settled"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Note / Remarks */}
                <div>
                  <label style={{ display: "block", fontSize: "0.74rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase", marginBottom: "4px" }}>
                    Remarks / Special Note
                  </label>
                  {isEditingModal ? (
                    <input
                      type="text"
                      className="be-input"
                      placeholder="Optional remarks or customer notes..."
                      value={editModalData.note}
                      onChange={(e) => setEditModalData({ ...editModalData, note: e.target.value })}
                    />
                  ) : b.note ? (
                    <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "10px", padding: "10px 14px", fontSize: "0.84rem", color: "#92400e" }}>
                      {b.note}
                    </div>
                  ) : (
                    <div style={{ fontSize: "0.8rem", color: "#94a3b8", fontStyle: "italic" }}>
                      No note recorded.
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div
                className="be-modal-footer-btns"
                style={{
                  padding: "14px 24px",
                  background: "#f8fafc",
                  borderTop: "1px solid #e2e8f0",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "10px",
                }}
              >
                <div style={{ fontSize: "0.78rem", color: "#64748b" }}>
                  Record ID: #{b.id} {isEditingModal && <span style={{ color: "#d97706", fontWeight: 700 }}>(Unsaved edits)</span>}
                </div>

                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  {isEditingModal ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm("Discard unsaved changes?")) {
                            setIsEditingModal(false);
                            setEditModalData(null);
                            setModalEditErr("");
                          }
                        }}
                        disabled={modalEditBusy}
                        className="be-btn-ghost"
                        style={{
                          padding: "8px 16px",
                          fontSize: "0.84rem",
                          fontWeight: 700,
                          borderRadius: "8px",
                          cursor: "pointer",
                        }}
                      >
                        Cancel
                      </button>

                      <button
                        type="button"
                        onClick={handleSaveModalEdit}
                        disabled={modalEditBusy}
                        className="be-btn-primary"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "8px 20px",
                          fontSize: "0.84rem",
                          fontWeight: 800,
                          borderRadius: "8px",
                          background: "#059669",
                          cursor: modalEditBusy ? "not-allowed" : "pointer",
                          opacity: modalEditBusy ? 0.7 : 1,
                        }}
                      >
                        <CheckIcon size={15} />
                        {modalEditBusy ? "Saving..." : "Save Changes"}
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete Bill #${b.bill_no || b.id}? This will move it to Recycle Bin.`)) {
                            handleDelete(b.id, b.bill_no);
                            setSelectedBillForModal(null);
                          }
                        }}
                        className="be-btn-ghost"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "8px 14px",
                          fontSize: "0.84rem",
                          fontWeight: 700,
                          borderRadius: "8px",
                          background: "#fef2f2",
                          color: "#dc2626",
                          border: "1px solid #fecaca",
                          cursor: "pointer",
                        }}
                        title="Delete Bill"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                        Delete Bill
                      </button>

                      <button
                        type="button"
                        onClick={() => window.print()}
                        className="be-btn-ghost"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "8px 14px",
                          fontSize: "0.84rem",
                          fontWeight: 700,
                          borderRadius: "8px",
                          background: "#ffffff",
                          border: "1px solid #cbd5e1",
                          cursor: "pointer",
                        }}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="6 9 6 2 18 2 18 9" />
                          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                          <rect x="6" y="14" width="12" height="8" />
                        </svg>
                        Print Voucher
                      </button>

                      <button
                        type="button"
                        onClick={() => startEditingModal(b)}
                        className="be-btn-ghost"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "8px 16px",
                          fontSize: "0.84rem",
                          fontWeight: 700,
                          borderRadius: "8px",
                          background: "#eff6ff",
                          color: "#2563eb",
                          border: "1px solid #bfdbfe",
                          cursor: "pointer",
                        }}
                        title="Edit this bill's customer info, items, and calculations"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                        Edit Bill
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedBillForModal(null)}
                        className="be-btn-primary"
                        style={{
                          padding: "8px 18px",
                          fontSize: "0.84rem",
                          fontWeight: 700,
                          borderRadius: "8px",
                          cursor: "pointer",
                        }}
                      >
                        Close
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

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
                style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}
              >
                <XIcon size={16} />
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
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                      <h4 style={{ margin: 0, fontSize: "1rem", fontWeight: 800, color: "#1e293b" }}>
                        Order History ({activeCustomerBills.length} Bills)
                      </h4>
                      <div
                        style={{
                          display: "inline-flex",
                          background: "#f1f5f9",
                          padding: "3px",
                          borderRadius: "8px",
                          gap: "3px",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => setCustomerLedgerSort("asc")}
                          style={{
                            padding: "4px 9px",
                            borderRadius: "6px",
                            border: "none",
                            cursor: "pointer",
                            background: customerLedgerSort === "asc" ? "#2563eb" : "transparent",
                            color: customerLedgerSort === "asc" ? "#ffffff" : "#64748b",
                            fontWeight: 700,
                          }}
                        >
                          Oldest First (Ledger)
                        </button>
                        <button
                          type="button"
                          onClick={() => setCustomerLedgerSort("desc")}
                          style={{
                            padding: "4px 9px",
                            borderRadius: "6px",
                            border: "none",
                            cursor: "pointer",
                            background: customerLedgerSort === "desc" ? "#2563eb" : "transparent",
                            color: customerLedgerSort === "desc" ? "#ffffff" : "#64748b",
                            fontWeight: 700,
                          }}
                        >
                          Newest First
                        </button>
                      </div>
                    </div>

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

                  {activeCustomerBills.length === 0 ? (
                    <div style={{ padding: "30px", textAlign: "center", color: "#64748b", background: "#f8fafc", borderRadius: "10px" }}>
                      No bills recorded yet for this customer ID.
                    </div>
                  ) : (
                    <div className="be-cust-ledger-wrap">
                      <table className="be-cust-ledger-table">
                        <thead>
                          <tr>
                            <th style={{ width: "95px" }}>Date</th>
                            <th style={{ width: "95px" }}>Bill No.</th>
                            <th style={{ minWidth: "160px" }}>Item Description</th>
                            <th style={{ width: "85px", textAlign: "right" }}>Quantity</th>
                            <th style={{ width: "70px", textAlign: "center" }}>Unit</th>
                            <th style={{ width: "90px", textAlign: "right" }}>Rate (৳)</th>
                            <th style={{ width: "105px", textAlign: "right" }}>Subtotal (৳)</th>
                            <th style={{ width: "115px", textAlign: "right" }}>Bill Total (৳)</th>
                            <th style={{ width: "105px", textAlign: "right" }}>Payment (৳)</th>
                            <th style={{ width: "135px", textAlign: "right" }}>Remaining Balance</th>
                          </tr>
                        </thead>
                        <tbody>
                          {activeCustomerBills.map((b, billIdx) => {
                            const items = parseItems(b.items);
                            const itemsCount = items.length > 0 ? items.length : 1;
                            const isLastBill = billIdx === activeCustomerBills.length - 1;
                            const bal = b.runningBalance !== undefined ? b.runningBalance : (Number(b.due_advance) || 0);
                            const rows = items.length > 0 ? items : [{ name: "", weight: "", quantity: "", rate: "", subtotal: "" }];
                            const billBg = billIdx % 2 === 0 ? "#ffffff" : "#f8fafc";

                            return rows.map((it, idx) => {
                              const isFirstItem = idx === 0;
                              const isLastItemOfBill = idx === rows.length - 1;

                              const hasW = it.weight !== undefined && it.weight !== null && it.weight !== "" && Number(it.weight) > 0;
                              const hasQ = it.quantity !== undefined && it.quantity !== null && it.quantity !== "" && Number(it.quantity) > 0;
                              let displayQty = "—";
                              let displayUnit = it.unit || "—";

                              if (hasW && hasQ) {
                                displayQty = `${it.quantity} (${it.weight} kg)`;
                                displayUnit = it.unit || "pcs";
                              } else if (hasW) {
                                displayQty = it.weight;
                                displayUnit = it.unit || "kg";
                              } else if (hasQ) {
                                displayQty = it.quantity;
                                displayUnit = it.unit || "pcs";
                              }

                              const itemDesc = it.name
                                ? it.name
                                : (items.length === 0
                                  ? (b.note || (Number(b.total_bill) === 0 && Number(b.client_payment) > 0 ? "Payment Received" : "Bill Voucher"))
                                  : "—");

                              const rowBorderBottom = isLastItemOfBill
                                ? (isLastBill ? "none" : "2px solid #cbd5e1")
                                : "1px dashed #e2e8f0";

                              return (
                                <tr
                                  key={`${b.id}-${idx}`}
                                  className="be-ledger-row"
                                  style={{ background: billBg }}
                                >
                                  {/* 1. Date */}
                                  {isFirstItem && (
                                    <td
                                      rowSpan={itemsCount}
                                      style={{
                                        verticalAlign: "top",
                                        padding: "10px 10px",
                                        fontWeight: 600,
                                        color: "#334155",
                                        whiteSpace: "nowrap",
                                        borderRight: "1px solid #e2e8f0",
                                        borderBottom: rowBorderBottom,
                                        background: billBg,
                                      }}
                                    >
                                      {b.bill_date || "—"}
                                    </td>
                                  )}

                                  {/* 2. Bill no. */}
                                  {isFirstItem && (
                                    <td
                                      rowSpan={itemsCount}
                                      style={{
                                        verticalAlign: "top",
                                        padding: "10px 10px",
                                        whiteSpace: "nowrap",
                                        borderRight: "1px solid #e2e8f0",
                                        borderBottom: rowBorderBottom,
                                        background: billBg,
                                      }}
                                    >
                                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px" }}>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setSelectedBillForModal(b);
                                            setIsEditingModal(false);
                                          }}
                                          style={{
                                            background: "none",
                                            border: "none",
                                            padding: 0,
                                            fontWeight: 800,
                                            color: "#1e3a8a",
                                            cursor: "pointer",
                                            fontSize: "0.85rem",
                                            textDecoration: "underline",
                                            textDecorationColor: "#93c5fd",
                                          }}
                                          title="Click to view/edit bill details"
                                        >
                                          #{b.bill_no || b.id}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleDelete(b.id, b.bill_no)}
                                          style={{
                                            background: "none",
                                            border: "none",
                                            color: "#ef4444",
                                            cursor: "pointer",
                                            padding: "2px 4px",
                                            borderRadius: "4px",
                                            display: "inline-flex",
                                            alignItems: "center",
                                          }}
                                          title="Delete this Bill"
                                        >
                                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="3 6 5 6 21 6" />
                                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                          </svg>
                                        </button>
                                      </div>
                                    </td>
                                  )}

                                  {/* 3. Item Description */}
                                  <td
                                    style={{
                                      verticalAlign: "top",
                                      padding: "8px 10px",
                                      fontWeight: 600,
                                      color: "#1e293b",
                                      borderRight: "1px solid #e2e8f0",
                                      borderBottom: rowBorderBottom,
                                    }}
                                  >
                                    {itemDesc}
                                  </td>

                                  {/* 4. Quantity */}
                                  <td
                                    style={{
                                      verticalAlign: "top",
                                      padding: "8px 10px",
                                      textAlign: "right",
                                      color: "#334155",
                                      fontWeight: 600,
                                      borderRight: "1px solid #e2e8f0",
                                      borderBottom: rowBorderBottom,
                                    }}
                                  >
                                    {displayQty}
                                  </td>

                                  {/* 5. Unit */}
                                  <td
                                    style={{
                                      verticalAlign: "top",
                                      padding: "8px 10px",
                                      textAlign: "center",
                                      color: "#64748b",
                                      fontWeight: 500,
                                      fontSize: "0.78rem",
                                      borderRight: "1px solid #e2e8f0",
                                      borderBottom: rowBorderBottom,
                                    }}
                                  >
                                    {displayUnit !== "—" ? (
                                      <span style={{ background: "#f1f5f9", padding: "1px 6px", borderRadius: "4px", border: "1px solid #e2e8f0" }}>
                                        {displayUnit}
                                      </span>
                                    ) : "—"}
                                  </td>

                                  {/* 6. Rate */}
                                  <td
                                    style={{
                                      verticalAlign: "top",
                                      padding: "8px 10px",
                                      textAlign: "right",
                                      color: "#334155",
                                      fontWeight: 600,
                                      borderRight: "1px solid #e2e8f0",
                                      borderBottom: rowBorderBottom,
                                    }}
                                  >
                                    {it.rate ? `৳ ${fmt(it.rate)}` : "—"}
                                  </td>

                                  {/* 7. Subtotal */}
                                  <td
                                    style={{
                                      verticalAlign: "top",
                                      padding: "8px 10px",
                                      textAlign: "right",
                                      fontWeight: 700,
                                      color: "#0f172a",
                                      borderRight: "1px solid #e2e8f0",
                                      borderBottom: rowBorderBottom,
                                    }}
                                  >
                                    {it.subtotal ? `৳ ${fmt(it.subtotal)}` : "—"}
                                  </td>

                                  {/* 8. Bill Total */}
                                  {isFirstItem && (
                                    <td
                                      rowSpan={itemsCount}
                                      style={{
                                        verticalAlign: "top",
                                        padding: "10px 10px",
                                        textAlign: "right",
                                        fontWeight: 800,
                                        color: "#0f172a",
                                        borderRight: "1px solid #e2e8f0",
                                        borderBottom: rowBorderBottom,
                                        background: billBg,
                                      }}
                                    >
                                      <div>৳ {fmt(b.total_bill)}</div>
                                      {(Number(b.labour_charge) > 0 || Number(b.transport_cost) > 0 || Number(b.discount) > 0) && (
                                        <div style={{ fontSize: "0.7rem", color: "#64748b", marginTop: "3px", lineHeight: "1.25", fontWeight: 500 }}>
                                          {Number(b.labour_charge) > 0 && <div>+ Lab: ৳{fmt(b.labour_charge)}</div>}
                                          {Number(b.transport_cost) > 0 && <div>+ Tr: ৳{fmt(b.transport_cost)}</div>}
                                          {Number(b.discount) > 0 && <div style={{ color: "#059669" }}>- Disc: ৳{fmt(b.discount)}</div>}
                                        </div>
                                      )}
                                    </td>
                                  )}

                                  {/* 9. Payment */}
                                  {isFirstItem && (
                                    <td
                                      rowSpan={itemsCount}
                                      style={{
                                        verticalAlign: "top",
                                        padding: "10px 10px",
                                        textAlign: "right",
                                        fontWeight: 700,
                                        color: Number(b.client_payment) > 0 ? "#059669" : "#94a3b8",
                                        borderRight: "1px solid #e2e8f0",
                                        borderBottom: rowBorderBottom,
                                        background: billBg,
                                      }}
                                    >
                                      ৳ {fmt(b.client_payment)}
                                    </td>
                                  )}

                                  {/* 10. Remaining Balance */}
                                  {isFirstItem && (
                                    <td
                                      rowSpan={itemsCount}
                                      style={{
                                        verticalAlign: "top",
                                        padding: "10px 10px",
                                        textAlign: "right",
                                        borderBottom: rowBorderBottom,
                                        background: billBg,
                                      }}
                                    >
                                      <div
                                        style={{
                                          fontWeight: 800,
                                          fontSize: "0.85rem",
                                          color: bal > 0 ? "#dc2626" : bal < 0 ? "#2563eb" : "#059669",
                                        }}
                                      >
                                        {bal > 0 ? `Due: ৳ ${fmt(bal)}` : bal < 0 ? `Adv: ৳ ${fmt(Math.abs(bal))}` : "Settled"}
                                      </div>
                                      {b.prevBalance !== undefined && b.prevBalance !== 0 && (
                                        <div style={{ fontSize: "0.7rem", color: "#64748b", marginTop: "2px" }}>
                                          Net: {b.due_advance > 0 ? `+৳${fmt(b.due_advance)}` : b.due_advance < 0 ? `-৳${fmt(Math.abs(b.due_advance))}` : "৳0"}
                                        </div>
                                      )}
                                    </td>
                                  )}
                                </tr>
                              );
                            });
                          })}
                        </tbody>
                        <tfoot>
                          <tr>
                            <td colSpan={7} style={{ textAlign: "right", color: "#475569", fontWeight: 700, textTransform: "uppercase", fontSize: "0.75rem", letterSpacing: "0.03em" }}>
                              Total ({activeCustomerBills.length} Invoices):
                            </td>
                            <td style={{ textAlign: "right", fontWeight: 800, color: "#0f172a" }}>
                              ৳ {fmt(activeCustomerGroup.totalBilled)}
                            </td>
                            <td style={{ textAlign: "right", fontWeight: 800, color: "#059669" }}>
                              ৳ {fmt(activeCustomerGroup.totalPaid)}
                            </td>
                            <td style={{ textAlign: "right", fontWeight: 800 }}>
                              <span
                                style={{
                                  color: activeCustomerGroup.netDue > 0 ? "#dc2626" : activeCustomerGroup.netDue < 0 ? "#2563eb" : "#059669",
                                }}
                              >
                                {activeCustomerGroup.netDue > 0
                                  ? `Due: ৳ ${fmt(activeCustomerGroup.netDue)}`
                                  : activeCustomerGroup.netDue < 0
                                  ? `Adv: ৳ ${fmt(Math.abs(activeCustomerGroup.netDue))}`
                                  : "Fully Settled"}
                              </span>
                            </td>
                          </tr>
                        </tfoot>
                      </table>
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
                style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}
              >
                <XIcon size={16} />
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

