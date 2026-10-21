"use client";
import { useEffect, useState, useMemo, useRef, Fragment } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import * as XLSX from "xlsx";
import {
  HomeIcon,
  DownloadIcon,
  CheckIcon,
  XIcon,
  TrashIcon,
  SearchIcon,
  EditIcon,
  RefreshIcon,
  ClockIcon,
  ShieldIcon,
} from "@/lib/icons";
import "../bill-entry/entry.css";
import "../bill-calculator/bill.css";
import "./all-entries.css";

const ITEM_PRESETS = [
  "Design Sheet",
  "Plain Sheet Matte",
  "GP Door Frame",
  "Cork Sheet",
  "Bata",
  "Palla Mojuri",
  "Iron Item",
  "Making Charge",
  "Profile Sheet Local",
  "Profile Sheet Imported",
  "Canopy",
  "Insulation",
  'Screw 2" China',
  'Screw 1" China',
  'Screw 2" Taiwan',
  'Screw 1" Taiwan',
  "Gum Tape",
  "Side Cap",
  "Tua",
  "Drain",
  "Almari",
  "Metal Bed",
  "Table",
  "Dolna",
  "Trunk",
  "Metal Furniture",
  "Laser Cutting Charge",
  "Box Metal Door",
  "Single Metal Door",
  "PVC Door",
  "Metal Gate",
  "Lasercutting Metal Gate",
  "Thai Window Grill",
  "Sheet Window",
  "Mobile Window",
  "MS Sheet",
  "GP Sheet",
  "C-Purlin",
  "Decking Sheet",
  "Transportation",
];

const ITEM_SUGGESTED_UNIT = {
  "design sheet": "kg",
  "plain sheet matte": "kg",
  "gp door frame": "kg",
  "cork sheet": "pcs",
  "bata": "kg",
  "palla mojuri": "set",
  "iron item": "kg",
  "making charge": "pcs",
  "profile sheet local": "sft",
  "profile sheet imported": "sft",
  "canopy": "sft",
  "insulation": "sft",
  'screw 2" china': "pcs",
  'screw 1" china': "pcs",
  'screw 2" taiwan': "pcs",
  'screw 1" taiwan': "pcs",
  "gum tape": "pcs",
  "side cap": "rft",
  "tua": "rft",
  "drain": "rft",
  "almari": "kg",
  "metal bed": "pcs",
  "table": "pcs",
  "dolna": "pcs",
  "trunk": "pcs",
  "metal furniture": "pcs",
  "laser cutting charge": "sft",
  "box metal door": "kg",
  "single metal door": "kg",
  "pvc door": "pcs",
  "metal gate": "kg",
  "lasercutting metal gate": "sft",
  "thai window grill": "kg",
  "sheet window": "kg",
  "mobile window": "kg",
  "ms sheet": "kg",
  "gp sheet": "kg",
  "c-purlin": "kg",
  "decking sheet": "kg",
  "transportation": "trip",
};

const getSuggestedUnit = (name) => {
  if (!name) return "";
  const cleaned = String(name).trim().toLowerCase().replace(/[”"″]/g, '"');
  return ITEM_SUGGESTED_UNIT[cleaned] || "";
};

const CATEGORIES = [
  "General",
  "Bank Deposit",
  "Supplier Payment (Raw Materials)",
  "Carrying Charge (In)",
  "Carrying Charge (Out)",
  "Company Own Withdrawal",
  "Debt Payment",
  "Company Bank Deposit",
  "Farm",
  "Salary",
  "Overtime",
  "Fuel",
  "Hardware",
  "Repairing Materials",
  "Mechanic Fee",
  "Bazar",
  "Others",
];
const DEFAULT_STAFF = [
  "Ikram",
  "Jony",
  "Sohel",
  "Akter",
  "Shahim",
  "Juwel Office",
  "Ganesh",
  "Shamim Accounts",
  "Sujon",
  "Khala",
  "Babu",
  "Rakibul Guard",
  "Fajlur Rahman",
  "Ibrahim",
  "Aslam",
  "Atik Khamar",
  "Foyej Mollah",
  "Alamgir",
  "Liyon Laser",
  "Sohag Khamar",
  "Sourab",
  "Samadul Islam",
  "Shafiq",
  "Fahim",
  "Md Hasan",
  "Mujahid",
  "Sujan Gril",
  "Milan Driver",
  "Suvash",
  "Suman Grill",
  "Kamrul",
  "Paint Dulal",
  "Rajon",
];
const METHODS = ["Cash", "Bank", "bKash", "Nagad", "Cheque", "Other"];
const POPULAR_BANKS = [
  "Islami Bank Bangladesh",
  "The City Bank",
  "BRAC Bank",
  "Dutch-Bangla Bank (DBBL)",
  "Sonali Bank",
  "Eastern Bank (EBL)",
  "Pubali Bank",
  "Dhaka Bank",
  "Prime Bank",
  "Mutual Trust Bank (MTB)",
  "Bank Asia",
  "United Commercial Bank (UCB)",
  "Southeast Bank",
  "Janata Bank",
  "Agrani Bank",
  "Rupali Bank",
  "Al-Arafah Islami Bank",
  "Social Islami Bank (SIBL)",
  "Shahjalal Islami Bank",
  "EXIM Bank",
  "First Security Islami Bank (FSIB)",
  "Trust Bank",
  "NCC Bank",
  "National Bank",
  "The Premier Bank",
  "Mercantile Bank",
  "ONE Bank",
  "Jamuna Bank",
  "IFIC Bank",
  "Standard Bank",
  "AB Bank",
  "Uttara Bank",
  "Standard Chartered Bank",
  "HSBC",
  "Community Bank Bangladesh",
  "Midland Bank",
  "Meghna Bank",
  "South Bangla Agriculture & Commerce (SBAC) Bank",
  "NRB Bank",
  "NRBC Bank",
  "Modhumoti Bank",
  "Global Islami Bank",
  "Union Bank",
  "Shimanto Bank",
  "Bengal Commercial Bank",
  "Citizens Bank",
  "BASIC Bank",
  "Bangladesh Krishi Bank (BKB)",
  "Rajshahi Krishi Unnayan Bank (RAKUB)",
  "Bangladesh Development Bank (BDBL)",
  "Probashi Kallyan Bank",
  "Commercial Bank of Ceylon",
  "State Bank of India (SBI)",
  "Citibank N.A.",
  "Woori Bank",
  "Bank Alfalah",
  "ICB Islamic Bank",
  "bKash",
  "Nagad",
  "Rocket",
];
const isDepositCategory = (cat) => {
  const c = (cat || "").trim().toLowerCase();
  return c === "bank deposit" || c === "company bank deposit";
};

function generateUniqueCustomerId(mobileOrDate, dateStr) {
  const dt = dateStr ? new Date(dateStr) : (mobileOrDate && String(mobileOrDate).includes("-") ? new Date(mobileOrDate) : new Date());
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const y = dt.getFullYear();
  const random5 = Math.floor(10000 + Math.random() * 90000);
  return `CID-${m}-${y}-${random5}`;
}

const pad = (n) => String(n).padStart(2, "0");
const toStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = () => toStr(new Date());

const fmt = (n) =>
  Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const prettyDate = (s) => {
  if (!s) return "—";
  const parts = s.split("-");
  if (parts.length !== 3) return s;
  const [y, m, d] = parts.map(Number);
  const dt = new Date(y, m - 1, d);
  if (isNaN(dt.getTime())) return s;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${pad(dt.getDate())} ${months[dt.getMonth()]} ${dt.getFullYear()}`;
};

function getTypeBadge(item) {
  if (item.source === "customer_bill") {
    const isPay = item.flow === "in" || item.subType === "Customer Payment";
    return (
      <span className={`ae-tag-module ${isPay ? "customer_payment" : "customer_bill"}`}>
        {isPay ? "Customer Payment" : "Customer Bill"}
      </span>
    );
  }
  if (item.source === "dealer_supplier") {
    const isPay = item.subType === "Payment";
    return (
      <span className={`ae-tag-module ${isPay ? "dealer_payment" : "dealer_bill"}`}>
        {isPay ? "Dealer Payment" : "Dealer Bill"}
      </span>
    );
  }
  return (
    <span className="ae-tag-module expense">
      Expense • {item.subType || "General"}
    </span>
  );
}

export default function AllEntriesAuditPage() {
  const router = useRouter();
  const [entries, setEntries] = useState([]);
  const [recycleBin, setRecycleBin] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  const [okMsg, setOkMsg] = useState("");

  // Filters
  const [moduleFilter, setModuleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateRange, setDateRange] = useState("all");
  const [search, setSearch] = useState("");

  // Selection for bulk actions
  const [selectedUids, setSelectedUids] = useState(new Set());

  // Edit Modal (for Dealer / Supplier & Expense)
  const [editingEntry, setEditingEntry] = useState(null);
  const [editForm, setEditForm] = useState({
    date: "",
    party: "",
    title: "",
    billNo: "",
    amount: "",
    payment: "",
    method: "",
    fromBank: "",
    toBank: "",
    subType: "",
    note: "",
  });

  // Customer Bill Pop-up Modal & Edit State
  const [selectedCustomerBillForModal, setSelectedCustomerBillForModal] = useState(null);
  const [isEditingCustomerModal, setIsEditingCustomerModal] = useState(false);
  const [editCustomerModalData, setEditCustomerModalData] = useState(null);
  const [modalEditBusy, setModalEditBusy] = useState(false);
  const [modalEditErr, setModalEditErr] = useState("");

  // Purchase (Dealer / Supplier) Pop-up Modal & Edit State
  const [selectedPurchaseEntryForModal, setSelectedPurchaseEntryForModal] = useState(null);
  const [isEditingPurchaseModal, setIsEditingPurchaseModal] = useState(false);
  const [editPurchaseModalData, setEditPurchaseModalData] = useState(null);
  const [purchaseModalBusy, setPurchaseModalBusy] = useState(false);
  const [purchaseModalErr, setPurchaseModalErr] = useState("");

  // Expense Pop-up Modal & Edit State
  const [selectedExpenseForModal, setSelectedExpenseForModal] = useState(null);
  const [isEditingExpenseModal, setIsEditingExpenseModal] = useState(false);
  const [editExpenseModalData, setEditExpenseModalData] = useState(null);
  const [expenseModalBusy, setExpenseModalBusy] = useState(false);
  const [expenseModalErr, setExpenseModalErr] = useState("");
  const [showExpenseModalDropdown, setShowExpenseModalDropdown] = useState(false);
  const expenseModalPaidToRef = useRef(null);

  // Clients & Staff for Expense Autocomplete Suggestions
  const [clients, setClients] = useState([]);
  const [extraStaff, setExtraStaff] = useState([]);

  async function loadClients() {
    try {
      const res = await fetch("/api/clients");
      if (res.ok) {
        const list = await res.json();
        setClients(list || []);
      }
    } catch (e) {
      console.error("Failed to load clients list", e);
    }
  }

  async function loadData() {
    try {
      setLoading(true);
      setErrMsg("");
      const res = await fetch("/api/all-entries", { cache: "no-store" });
      if (res.status === 401) {
        router.replace("/");
        return;
      }
      if (res.status === 403) {
        router.replace("/?denied=1");
        return;
      }
      const data = await res.json();
      if (res.ok) {
        setEntries(data.entries || []);
        setRecycleBin(data.recycleBin || []);
        setCurrentUser(data.user || null);
      } else {
        setErrMsg(data.error || "Failed to load system entries");
      }
    } catch (e) {
      setErrMsg(e.message || "Network error loading entries");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    loadClients();
    try {
      const saved = localStorage.getItem("cew_extra_staff");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setExtraStaff(parsed);
      }
    } catch (_) { }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (expenseModalPaidToRef.current && !expenseModalPaidToRef.current.contains(e.target)) {
        setShowExpenseModalDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function addCustomStaff(name) {
    if (!name || !name.trim()) return;
    const clean = name.trim();
    if (allStaff.some((s) => s.toLowerCase() === clean.toLowerCase())) return;
    const next = [...extraStaff, clean];
    setExtraStaff(next);
    try {
      localStorage.setItem("cew_extra_staff", JSON.stringify(next));
    } catch (_) { }
  }

  const allStaff = useMemo(() => {
    const list = [...DEFAULT_STAFF];
    extraStaff.forEach((s) => {
      if (!list.some((existing) => existing.toLowerCase() === s.toLowerCase())) {
        list.push(s);
      }
    });
    return list;
  }, [extraStaff]);

  const isEditSalary = editExpenseModalData?.category === "Salary";
  const isEditStaffExpense = isEditSalary;
  const isEditSupplierPayment = editExpenseModalData?.category === "Supplier Payment (Raw Materials)";

  const filteredEditStaff = useMemo(() => {
    if (!editExpenseModalData) return allStaff;
    const q = (editExpenseModalData.paid_to || "").trim().toLowerCase();
    if (!q) return allStaff;
    return allStaff.filter((s) => s.toLowerCase().includes(q));
  }, [allStaff, editExpenseModalData?.paid_to]);

  const filteredEditClients = useMemo(() => {
    if (!editExpenseModalData) return clients;
    const q = (editExpenseModalData.paid_to || "").trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) => (c.name || "").toLowerCase().includes(q));
  }, [clients, editExpenseModalData?.paid_to]);

  const filteredEditBanks = useMemo(() => {
    if (!editExpenseModalData) return POPULAR_BANKS;
    const q = (editExpenseModalData.paid_to || "").trim().toLowerCase();
    if (!q) return POPULAR_BANKS;
    return POPULAR_BANKS.filter((b) => b.toLowerCase().includes(q));
  }, [editExpenseModalData?.paid_to]);

  // Filtered entries computation
  const filteredEntries = useMemo(() => {
    const todayStr = today();
    const now = new Date();
    const startOfWeek = new Date(now.setDate(now.getDate() - ((now.getDay() + 1) % 7)));
    const weekStartStr = toStr(startOfWeek);
    const monthStartStr = `${new Date().getFullYear()}-${pad(new Date().getMonth() + 1)}-01`;

    const q = search.trim().toLowerCase();

    return entries.filter((item) => {
      // 1. Module filter
      if (moduleFilter === "customer_bill" && item.source !== "customer_bill") {
        return false;
      }
      if (moduleFilter === "expense" && item.source !== "expense") {
        return false;
      }
      if (moduleFilter === "dealer_supplier") {
        if (item.source !== "dealer_supplier" && !item.isSynced) {
          return false;
        }
      }

      // 2. Status filter
      if (statusFilter !== "all" && (item.status || "pending") !== statusFilter) {
        return false;
      }

      // 3. Date range filter
      if (dateRange === "today" && item.date !== todayStr) {
        return false;
      }
      if (dateRange === "week" && item.date < weekStartStr) {
        return false;
      }
      if (dateRange === "month" && item.date < monthStartStr) {
        return false;
      }

      // 4. Search text
      if (q) {
        const text = [
          item.party,
          item.title,
          item.billNo,
          item.subType,
          item.method,
          item.fromBank,
          item.toBank,
          item.note,
          String(item.amount),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!text.includes(q)) return false;
      }

      return true;
    });
  }, [entries, moduleFilter, statusFilter, dateRange, search]);

  // Metric summaries
  const metrics = useMemo(() => {
    let approvedCount = 0;
    let pendingCount = 0;
    let totalAmount = 0;

    entries.forEach((e) => {
      if ((e.status || "pending") === "approved") approvedCount++;
      else pendingCount++;
      totalAmount += Number(e.amount || 0);
    });

    const moduleCounts = {
      all: entries.length,
      customer_bill: entries.filter((e) => e.source === "customer_bill").length,
      dealer_supplier: entries.filter((e) => e.source === "dealer_supplier" || e.isSynced).length,
      expense: entries.filter((e) => e.source === "expense").length,
      recycle_bin: recycleBin.length,
    };

    return {
      total: entries.length,
      approved: approvedCount,
      pending: pendingCount,
      totalAmount,
      moduleCounts,
    };
  }, [entries, recycleBin]);

  // Filtered Recycle Bin items
  const filteredRecycleBin = useMemo(() => {
    if (!recycleBin || !recycleBin.length) return [];
    const q = search.trim().toLowerCase();
    if (!q) return recycleBin;
    return recycleBin.filter((item) => {
      const hay = [
        item.party,
        item.customerName,
        item.billNo,
        item.subType,
        item.sourceLabel,
        item.deletedBy,
        item.note,
        String(item.amount),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [recycleBin, search]);

  // Chronological Customer Running Balance Calculation
  const customerBalanceMap = useMemo(() => {
    const custBills = entries.filter((e) => e.source === "customer_bill");
    if (!custBills.length) return new Map();

    const getCustKey = (b) => {
      if (b.customerId && b.customerId.trim()) return `ID:${b.customerId.trim()}`;
      if (b.customerMobile && b.customerMobile.trim()) {
        const clean = b.customerMobile.replace(/[^0-9]/g, "");
        if (clean.length >= 6) return `MOB:${clean}`;
      }
      return `BILL:${b.id}`;
    };

    const grouped = new Map();
    custBills.forEach((b) => {
      const key = getCustKey(b);
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(b);
    });

    const infoMap = new Map();
    grouped.forEach((list) => {
      const sorted = [...list].sort((a, b) => {
        if (a.date && b.date && a.date !== b.date) {
          return a.date.localeCompare(b.date);
        }
        return a.id - b.id;
      });

      let running = 0;
      sorted.forEach((b) => {
        const prev = running;
        const totalBill = Math.round((Number(b.totalBill) || 0) * 100) / 100;
        const payment = Math.round((Number(b.payment) || 0) * 100) / 100;
        let net = Math.round((totalBill - payment) * 100) / 100;
        if (Math.abs(net) < 0.005) net = 0;

        let dueThisBill = 0;
        let advanceThisBill = 0;
        let dueReceived = 0;

        if (totalBill - payment >= 0.005) {
          const shortfall = Math.round((totalBill - payment) * 100) / 100;
          if (prev <= -0.005) {
            // Customer had previous advance balance
            const availableAdvance = Math.abs(prev);
            if (availableAdvance >= shortfall) {
              dueThisBill = 0;
            } else {
              dueThisBill = Math.round((shortfall - availableAdvance) * 100) / 100;
            }
          } else {
            dueThisBill = shortfall;
          }
        } else if (payment - totalBill >= 0.005) {
          const excess = Math.round((payment - totalBill) * 100) / 100;
          if (prev >= 0.005) {
            dueReceived = Math.round(Math.min(prev, excess) * 100) / 100;
            advanceThisBill = Math.round(Math.max(0, excess - prev) * 100) / 100;
          } else {
            advanceThisBill = excess;
          }
        }

        running = Math.round((running + net) * 100) / 100;
        if (Math.abs(running) < 0.005) running = 0;
        infoMap.set(b.id, {
          prevBalance: prev,
          billNet: net,
          runningBalance: running,
          dueThisBill,
          advanceThisBill,
          dueReceived,
        });
      });
    });

    return infoMap;
  }, [entries]);

  // Chronological Dealer / Supplier Running Balance Calculation (per client/party)
  const dealerSupplierBalanceMap = useMemo(() => {
    const dsEntries = entries.filter((e) => e.source === "dealer_supplier" || e.isSynced);
    if (!dsEntries.length) return new Map();

    const grouped = new Map();
    dsEntries.forEach((e) => {
      const partyName = e.party || e.client_name || e.linkedClient || "";
      const party = partyName.trim().toLowerCase();
      if (!grouped.has(party)) grouped.set(party, []);
      grouped.get(party).push(e);
    });

    const infoMap = new Map();
    grouped.forEach((list) => {
      // Sort oldest to newest
      const sorted = [...list].sort((a, b) => {
        if (a.date && b.date && a.date !== b.date) {
          return a.date.localeCompare(b.date);
        }
        return (a.id || 0) - (b.id || 0);
      });

      let running = 0;
      sorted.forEach((e) => {
        const isBill = e.type === "bill" || (!e.type && e.subType === "Bill") || (e.source === "dealer_supplier" && e.flow === "none");
        const amt = Number(e.amount || 0);
        running += isBill ? amt : -amt;
        infoMap.set(e.uid, { runningBalance: running });
        if (e.id) infoMap.set(e.id, { runningBalance: running });
      });
    });

    return infoMap;
  }, [entries]);

  const startEditingPurchaseModal = (b) => {
    setIsEditingPurchaseModal(true);
    setPurchaseModalErr("");
    const isBill = b.type === "bill" || (!b.type && b.subType === "Bill") || (b.source === "dealer_supplier" && b.flow === "none");
    const rawItems = Array.isArray(b.items) && b.items.length > 0 ? b.items : [];

    setEditPurchaseModalData({
      id: b.id,
      source: b.source,
      uid: b.uid,
      type: isBill ? "bill" : "payment",
      client_name: b.party || b.client_name || "",
      entry_date: b.date || today(),
      bill_no: b.billNo && b.billNo !== "—" ? b.billNo : (b.bill_no || ""),
      weight: b.weight != null ? String(b.weight) : "",
      amount: b.amount != null ? String(b.amount) : "",
      from_bank: b.fromBank || b.from_bank || "",
      to_bank: b.toBank || b.to_bank || "",
      note: b.note || "",
      labour_cost: b.labour_cost !== undefined ? String(b.labour_cost) : (b.labourCost !== undefined ? String(b.labourCost) : ""),
      transport_cost: b.transport_cost !== undefined ? String(b.transport_cost) : (b.transportCost !== undefined ? String(b.transportCost) : ""),
      items: isBill
        ? (rawItems.length > 0
          ? rawItems.map((it) => ({
            name: it.name || "",
            quantity: it.quantity !== undefined && it.quantity !== "" ? String(it.quantity) : (it.weight != null ? String(it.weight) : ""),
            unit: it.unit || (it.weight ? "kg" : "pcs"),
            weight: it.weight != null ? String(it.weight) : "",
            rate: it.rate != null ? String(it.rate) : "",
            subtotal: it.subtotal != null ? String(it.subtotal) : "",
          }))
          : [{ name: "", quantity: "", unit: "kg", rate: "", subtotal: "" }])
        : [],
    });
  };

  const updatePurchaseEditItem = (index, field, value) => {
    setEditPurchaseModalData((prev) => {
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
        amount: itemsTotal > 0 || lab > 0 || tr > 0 ? String(Math.round((itemsTotal + lab + tr) * 100) / 100) : prev.amount,
      };
    });
  };

  const addPurchaseEditItem = () => {
    setEditPurchaseModalData((prev) => ({
      ...prev,
      items: [...prev.items, { name: "", quantity: "", unit: "kg", rate: "", subtotal: "" }],
    }));
  };

  const removePurchaseEditItem = (index) => {
    setEditPurchaseModalData((prev) => {
      if (prev.items.length <= 1) return prev;
      const nextItems = prev.items.filter((_, i) => i !== index);
      const itemsTotal = nextItems.reduce((acc, it) => acc + (parseFloat(it.subtotal) || 0), 0);
      const lab = parseFloat(prev.labour_cost) || 0;
      const tr = parseFloat(prev.transport_cost) || 0;
      return {
        ...prev,
        items: nextItems,
        amount: itemsTotal > 0 || lab > 0 || tr > 0 ? String(Math.round((itemsTotal + lab + tr) * 100) / 100) : prev.amount,
      };
    });
  };

  const updatePurchaseEditCost = (field, value) => {
    setEditPurchaseModalData((prev) => {
      const nextLabor = field === "labour_cost" ? value : prev.labour_cost;
      const nextTransport = field === "transport_cost" ? value : prev.transport_cost;
      const itemsTotal = (prev.items || []).reduce((acc, it) => acc + (parseFloat(it.subtotal) || 0), 0);
      const l = parseFloat(nextLabor) || 0;
      const t = parseFloat(nextTransport) || 0;
      return {
        ...prev,
        [field]: value,
        amount: itemsTotal > 0 || l > 0 || t > 0 ? String(Math.round((itemsTotal + l + t) * 100) / 100) : prev.amount,
      };
    });
  };

  async function handleSavePurchaseEditModal() {
    if (!editPurchaseModalData) return;
    const amt = parseFloat(editPurchaseModalData.amount);
    if (isNaN(amt) || amt <= 0) {
      setPurchaseModalErr("Amount must be greater than 0.");
      return;
    }
    setPurchaseModalBusy(true);
    setPurchaseModalErr("");

    try {
      if (editPurchaseModalData.source === "expense") {
        const payload = {
          expense_date: editPurchaseModalData.entry_date,
          amount: amt,
          from_bank: editPurchaseModalData.from_bank || null,
          to_bank: editPurchaseModalData.to_bank || null,
          note: editPurchaseModalData.note || null,
        };
        const res = await fetch(`/api/expenses/${editPurchaseModalData.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to update expense");
      } else {
        const cleanItems =
          editPurchaseModalData.type === "bill" && Array.isArray(editPurchaseModalData.items)
            ? editPurchaseModalData.items
              .map((it) => ({
                name: (it.name || "").trim(),
                quantity: it.quantity !== "" ? parseFloat(it.quantity) || 0 : null,
                unit: it.unit || "kg",
                weight: it.quantity !== "" ? parseFloat(it.quantity) || 0 : (it.weight !== "" ? parseFloat(it.weight) || 0 : null),
                rate: it.rate !== "" ? parseFloat(it.rate) || 0 : null,
                subtotal: it.subtotal !== "" ? parseFloat(it.subtotal) || 0 : null,
              }))
              .filter((it) => it.name || it.quantity || it.weight || it.rate || it.subtotal)
            : null;

        const payload = {
          entry_date: editPurchaseModalData.entry_date,
          bill_no: editPurchaseModalData.bill_no || null,
          weight: editPurchaseModalData.weight !== "" ? parseFloat(editPurchaseModalData.weight) || null : null,
          amount: amt,
          from_bank: editPurchaseModalData.from_bank || null,
          to_bank: editPurchaseModalData.to_bank || null,
          note: editPurchaseModalData.note || null,
          items: cleanItems && cleanItems.length > 0 ? cleanItems : null,
          labour_cost: editPurchaseModalData.labour_cost !== "" ? parseFloat(editPurchaseModalData.labour_cost) || null : null,
          transport_cost: editPurchaseModalData.transport_cost !== "" ? parseFloat(editPurchaseModalData.transport_cost) || null : null,
        };

        const res = await fetch(`/api/entries/${editPurchaseModalData.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to update purchase entry");
      }

      await loadData();

      setSelectedPurchaseEntryForModal((prev) => ({
        ...prev,
        date: editPurchaseModalData.entry_date,
        billNo: editPurchaseModalData.bill_no || "—",
        bill_no: editPurchaseModalData.bill_no,
        amount: amt,
        fromBank: editPurchaseModalData.from_bank,
        toBank: editPurchaseModalData.to_bank,
        note: editPurchaseModalData.note,
        items: editPurchaseModalData.items,
        labourCost: parseFloat(editPurchaseModalData.labour_cost) || 0,
        transportCost: parseFloat(editPurchaseModalData.transport_cost) || 0,
        labour_cost: parseFloat(editPurchaseModalData.labour_cost) || 0,
        transport_cost: parseFloat(editPurchaseModalData.transport_cost) || 0,
      }));

      setIsEditingPurchaseModal(false);
      setOkMsg("Purchase entry updated successfully!");
      setTimeout(() => setOkMsg(""), 4000);
    } catch (err) {
      setPurchaseModalErr(err.message || "Failed to save changes");
    } finally {
      setPurchaseModalBusy(false);
    }
  }

  async function handleDeleteFromPurchaseModal() {
    if (!selectedPurchaseEntryForModal) return;
    const b = selectedPurchaseEntryForModal;
    if (!confirm(`Are you sure you want to delete this ${b.type === "bill" ? "bill" : "payment"} entry? This will move it to Recycle Bin.`)) {
      return;
    }
    try {
      setBusy(true);
      const res = await fetch(`/api/all-entries?source=${b.source}&id=${b.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete entry");

      setSelectedPurchaseEntryForModal(null);
      setIsEditingPurchaseModal(false);
      setOkMsg("Entry deleted successfully.");
      setTimeout(() => setOkMsg(""), 4000);
      await loadData();
    } catch (err) {
      setErrMsg(err.message || "Failed to delete entry");
      setTimeout(() => setErrMsg(""), 5000);
    } finally {
      setBusy(false);
    }
  }

  function handleEditExpenseModalCategoryChange(cat) {
    const isStaff = cat === "Salary";
    const isSupplier = cat === "Supplier Payment (Raw Materials)";
    const isDeposit = isDepositCategory(cat);

    setEditExpenseModalData((prev) => {
      if (!prev) return prev;
      let nextPaidTo = prev.paid_to;
      let nextTitle = "";
      let nextMethod = prev.payment_method;
      let nextToBank = prev.to_bank;

      if (isStaff) {
        const isPrevStaff = allStaff.some(
          (s) => s.toLowerCase() === (prev.paid_to || "").trim().toLowerCase()
        );
        if (!isPrevStaff) {
          nextPaidTo = "";
        }
        nextTitle = nextPaidTo ? `Salary - ${nextPaidTo}` : `Staff Salary`;
      } else if (isSupplier) {
        const isPrevClient = clients.some(
          (c) => (c.name || "").toLowerCase() === (prev.paid_to || "").trim().toLowerCase()
        );
        if (!isPrevClient) {
          nextPaidTo = "";
        }
        nextTitle = nextPaidTo ? `Supplier Payment - ${nextPaidTo}` : "Supplier Payment";
      } else if (isDeposit) {
        nextTitle = "Bank Deposit";
        nextMethod = "Cash";
        nextToBank = "";
        nextPaidTo = "";
      } else {
        nextTitle = "";
        nextPaidTo = "";
      }

      return {
        ...prev,
        category: cat,
        paid_to: nextPaidTo,
        title: nextTitle,
        payment_method: nextMethod,
        to_bank: nextToBank,
      };
    });

    if (isStaff || isSupplier || isDeposit) {
      setShowExpenseModalDropdown(true);
    } else {
      setShowExpenseModalDropdown(false);
    }
  }

  function handleSelectEditExpenseModalBank(bankName) {
    setEditExpenseModalData((prev) => ({
      ...prev,
      paid_to: bankName,
      to_bank: bankName,
      title: !prev.title || prev.title === "Bank Deposit" || prev.title.startsWith("Bank Deposit -")
        ? `Bank Deposit - ${bankName}`
        : prev.title,
    }));
    setShowExpenseModalDropdown(false);
  }

  function handleSelectEditExpenseModalStaff(st) {
    setEditExpenseModalData((prev) => ({
      ...prev,
      paid_to: st,
      title:
        !prev.title ||
          prev.title === "Staff Salary" ||
          prev.title.startsWith("Salary -")
          ? `Salary - ${st}`
          : prev.title,
    }));
    setShowExpenseModalDropdown(false);
  }

  function handleAddCustomStaffToExpenseModal(name) {
    addCustomStaff(name);
    handleSelectEditExpenseModalStaff(name);
  }

  function handleSelectEditExpenseModalClient(c) {
    setEditExpenseModalData((prev) => ({
      ...prev,
      paid_to: c.name,
      phone: c.phone || c.mobile || prev.phone,
      title:
        !prev.title ||
          prev.title === "Supplier Payment" ||
          prev.title.startsWith("Supplier Payment -")
          ? `Supplier Payment - ${c.name}`
          : prev.title,
    }));
    setShowExpenseModalDropdown(false);
  }

  function startEditingExpenseModal(x) {
    if (!x) return;
    setEditExpenseModalData({
      id: x.id,
      expense_date: x.date || x.expense_date || today(),
      title: x.title || "",
      category: x.category || x.subType || "General",
      amount: x.amount != null ? String(x.amount) : "",
      payment_method: x.payment_method || x.paymentMethod || x.method || "Cash",
      paid_to: x.paid_to || x.paidTo || x.party || "",
      phone: x.phone || "",
      from_bank: x.from_bank || x.fromBank || "",
      to_bank: x.to_bank || x.toBank || "",
      note: x.note || "",
    });
    setIsEditingExpenseModal(true);
    setShowExpenseModalDropdown(false);
    setExpenseModalErr("");
  }

  async function handleSaveExpenseEditModal() {
    if (!editExpenseModalData) return;
    const amt = parseFloat(editExpenseModalData.amount);
    if (isNaN(amt) || amt <= 0) {
      setExpenseModalErr("Please enter a valid amount.");
      return;
    }
    if (!editExpenseModalData.title.trim()) {
      setExpenseModalErr("Title is required.");
      return;
    }
    if (isEditStaffExpense && editExpenseModalData.paid_to.trim()) {
      addCustomStaff(editExpenseModalData.paid_to.trim());
    }
    setExpenseModalBusy(true);
    setExpenseModalErr("");

    try {
      const payload = {
        source: "expense",
        id: editExpenseModalData.id,
        data: {
          date: editExpenseModalData.expense_date,
          expense_date: editExpenseModalData.expense_date,
          title: editExpenseModalData.title.trim(),
          category: editExpenseModalData.category,
          subType: editExpenseModalData.category,
          amount: amt,
          paid_to: editExpenseModalData.paid_to.trim(),
          party: editExpenseModalData.paid_to.trim(),
          phone: editExpenseModalData.phone.trim(),
          method: editExpenseModalData.payment_method,
          payment_method: editExpenseModalData.payment_method,
          from_bank: editExpenseModalData.from_bank || null,
          fromBank: editExpenseModalData.from_bank || null,
          to_bank: editExpenseModalData.to_bank || null,
          toBank: editExpenseModalData.to_bank || null,
          note: editExpenseModalData.note.trim(),
        },
      };

      const res = await fetch("/api/all-entries", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update expense entry");

      await loadData();

      setSelectedExpenseForModal((prev) => ({
        ...prev,
        date: editExpenseModalData.expense_date,
        title: editExpenseModalData.title.trim(),
        category: editExpenseModalData.category,
        subType: editExpenseModalData.category,
        amount: amt,
        paidTo: editExpenseModalData.paid_to.trim(),
        paid_to: editExpenseModalData.paid_to.trim(),
        party: editExpenseModalData.paid_to.trim(),
        phone: editExpenseModalData.phone.trim(),
        method: editExpenseModalData.payment_method,
        payment_method: editExpenseModalData.payment_method,
        paymentMethod: editExpenseModalData.payment_method,
        fromBank: editExpenseModalData.from_bank || null,
        from_bank: editExpenseModalData.from_bank || null,
        toBank: editExpenseModalData.to_bank || null,
        to_bank: editExpenseModalData.to_bank || null,
        note: editExpenseModalData.note.trim(),
      }));

      setIsEditingExpenseModal(false);
      setOkMsg("Expense entry updated successfully!");
      setTimeout(() => setOkMsg(""), 4000);
    } catch (err) {
      setExpenseModalErr(err.message || "Failed to save changes");
    } finally {
      setExpenseModalBusy(false);
    }
  }

  async function handleDeleteFromExpenseModal() {
    if (!selectedExpenseForModal) return;
    const x = selectedExpenseForModal;
    if (!confirm(`Are you sure you want to delete expense "${x.title}" (৳ ${fmt(x.amount)})? This will move it to Recycle Bin.`)) {
      return;
    }
    try {
      setBusy(true);
      const res = await fetch(`/api/all-entries?source=expense&id=${x.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete expense");

      setSelectedExpenseForModal(null);
      setIsEditingExpenseModal(false);
      setOkMsg("Expense entry moved to Recycle Bin.");
      setTimeout(() => setOkMsg(""), 4000);
      await loadData();
    } catch (err) {
      alert("Failed to delete expense: " + err.message);
    } finally {
      setBusy(false);
    }
  }


  // Known customers list for modal datalist
  const knownCustomers = useMemo(() => {
    const map = new Map();
    entries.forEach((e) => {
      if (e.source === "customer_bill") {
        const mob = e.customerMobile || "";
        const name = e.customerName || e.party || "";
        const cid = e.customerId || "";
        if (mob && !map.has(mob)) {
          map.set(mob, { name, mobile: mob, customer_id: cid, address: e.customerAddress || "" });
        }
      }
    });
    return Array.from(map.values());
  }, [entries]);

  const startEditingCustomerModal = (b) => {
    setIsEditingCustomerModal(true);
    setModalEditErr("");
    const rawItems = Array.isArray(b.items) && b.items.length > 0 ? b.items : [];
    setEditCustomerModalData({
      id: b.id,
      bill_no: b.billNo && b.billNo !== "—" ? b.billNo : "",
      bill_date: b.date || today(),
      customer_name: b.customerName || b.party || "",
      customer_mobile: b.customerMobile || "",
      customer_id: b.customerId || "",
      customer_address: b.customerAddress || "",
      items: rawItems.length > 0
        ? rawItems.map((it) => ({
          name: it.name || "",
          note: it.note || "",
          quantity: it.quantity !== undefined && it.quantity !== null && it.quantity !== "" ? String(it.quantity) : (it.weight !== undefined && it.weight !== null ? String(it.weight) : ""),
          unit: it.unit || "pcs",
          rate: it.rate !== undefined && it.rate !== null ? String(it.rate) : "",
          subtotal: it.subtotal !== undefined && it.subtotal !== null ? String(it.subtotal) : "",
        }))
        : [{ name: "", note: "", quantity: "", unit: "pcs", rate: "", subtotal: "" }],
      labour_charge: b.labourCharge !== undefined ? String(b.labourCharge) : "0",
      transport_cost: b.transportCost !== undefined ? String(b.transportCost) : "0",
      discount: b.discount !== undefined ? String(b.discount) : "0",
      client_payment: b.payment !== undefined ? String(b.payment) : "0",
      note: b.note || "",
    });
  };

  const handleCustomerModalItemChange = (idx, field, val) => {
    setEditCustomerModalData((prev) => {
      const items = [...prev.items];
      const row = { ...items[idx], [field]: val };

      // Auto Suggest Unit when Item Name is chosen or changed
      if (field === "name") {
        const suggested = getSuggestedUnit(val);
        if (suggested) {
          row.unit = suggested;
        }
      }

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

  const handleCustomerModalAddItem = () => {
    setEditCustomerModalData((prev) => ({
      ...prev,
      items: [...prev.items, { name: "", note: "", quantity: "", unit: "pcs", rate: "", subtotal: "" }],
    }));
  };

  const handleCustomerModalRemoveItem = (idx) => {
    setEditCustomerModalData((prev) => {
      if (prev.items.length <= 1) return prev;
      return {
        ...prev,
        items: prev.items.filter((_, i) => i !== idx),
      };
    });
  };

  const editCustomerItemsSubtotal = useMemo(() => {
    if (!editCustomerModalData?.items) return 0;
    return editCustomerModalData.items.reduce((sum, it) => {
      const v = parseFloat(it.subtotal);
      return sum + (isNaN(v) ? 0 : v);
    }, 0);
  }, [editCustomerModalData?.items]);

  const editCustomerTotalBill = useMemo(() => {
    if (!editCustomerModalData) return 0;
    const l = parseFloat(editCustomerModalData.labour_charge) || 0;
    const t = parseFloat(editCustomerModalData.transport_cost) || 0;
    const d = parseFloat(editCustomerModalData.discount) || 0;
    return Math.round(Math.max(0, editCustomerItemsSubtotal + l + t - d) * 100) / 100;
  }, [editCustomerModalData, editCustomerItemsSubtotal]);

  const editCustomerDueAdvance = useMemo(() => {
    if (!editCustomerModalData) return 0;
    const p = Math.round((parseFloat(editCustomerModalData.client_payment) || 0) * 100) / 100;
    let dueAdv = Math.round((editCustomerTotalBill - p) * 100) / 100;
    if (Math.abs(dueAdv) < 0.005) dueAdv = 0;
    return dueAdv;
  }, [editCustomerModalData, editCustomerTotalBill]);

  const editCustomerRunningBalance = useMemo(() => {
    if (!selectedCustomerBillForModal) return 0;
    const balInfo = customerBalanceMap.get(selectedCustomerBillForModal.id) || {};
    const prev = balInfo.prevBalance || 0;
    let rBal = Math.round((prev + editCustomerDueAdvance) * 100) / 100;
    if (Math.abs(rBal) < 0.005) rBal = 0;
    return rBal;
  }, [selectedCustomerBillForModal, customerBalanceMap, editCustomerDueAdvance]);

  async function handleSaveCustomerModalEdit() {
    if (!editCustomerModalData.customer_name?.trim()) {
      setModalEditErr("Customer Name is required.");
      return;
    }
    if (!editCustomerModalData.customer_mobile?.trim()) {
      setModalEditErr("Customer Mobile is required.");
      return;
    }

    setModalEditBusy(true);
    setModalEditErr("");

    try {
      const p = parseFloat(editCustomerModalData.client_payment) || 0;
      const l = parseFloat(editCustomerModalData.labour_charge) || 0;
      const t = parseFloat(editCustomerModalData.transport_cost) || 0;
      const d = parseFloat(editCustomerModalData.discount) || 0;

      const payload = {
        id: editCustomerModalData.id,
        bill_date: editCustomerModalData.bill_date,
        bill_no: editCustomerModalData.bill_no,
        customer_name: editCustomerModalData.customer_name.trim(),
        customer_address: (editCustomerModalData.customer_address || "").trim(),
        customer_mobile: editCustomerModalData.customer_mobile.trim(),
        customer_id: editCustomerModalData.customer_id.trim() || generateUniqueCustomerId(editCustomerModalData.customer_mobile, editCustomerModalData.bill_date),
        items: editCustomerModalData.items,
        labour_charge: l,
        transport_cost: t,
        discount: d,
        total_bill: editCustomerTotalBill,
        client_payment: p,
        due_advance: editCustomerDueAdvance,
        note: (editCustomerModalData.note || "").trim(),
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

      setSelectedCustomerBillForModal((prev) => ({
        ...prev,
        ...payload,
        party: payload.customer_name,
        customerName: payload.customer_name,
        customerMobile: payload.customer_mobile,
        customerAddress: payload.customer_address,
        customerId: payload.customer_id,
        billNo: payload.bill_no || "—",
        date: payload.bill_date,
        totalBill: payload.total_bill,
        payment: payload.client_payment,
        due: payload.due_advance,
        amount: payload.total_bill === 0 && payload.client_payment > 0 ? payload.client_payment : payload.total_bill,
        flow: payload.total_bill === 0 && payload.client_payment > 0 ? "in" : payload.client_payment === 0 ? "none" : "in_bill",
        note: payload.note,
      }));

      setIsEditingCustomerModal(false);
      setOkMsg("Customer bill updated successfully!");
      setTimeout(() => setOkMsg(""), 4000);
    } catch (err) {
      setModalEditErr(err.message || "Failed to save changes");
    } finally {
      setModalEditBusy(false);
    }
  }

  async function handleDeleteFromCustomerModal() {
    if (!selectedCustomerBillForModal) return;
    const b = selectedCustomerBillForModal;
    if (!confirm(`Are you sure you want to delete Bill #${b.billNo || b.id}? This will move it to Recycle Bin.`)) {
      return;
    }
    try {
      setBusy(true);
      const res = await fetch(`/api/all-entries?source=customer_bill&id=${b.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete entry");
      }
      setSelectedCustomerBillForModal(null);
      setIsEditingCustomerModal(false);
      setOkMsg("Bill deleted and moved to Recycle Bin.");
      setTimeout(() => setOkMsg(""), 4000);
      await loadData();
    } catch (err) {
      setErrMsg(err.message || "Failed to delete entry");
      setTimeout(() => setErrMsg(""), 5000);
    } finally {
      setBusy(false);
    }
  }

  // Actions
  async function handleToggleStatus(item) {
    const newStatus = (item.status || "pending") === "approved" ? "pending" : "approved";
    setBusy(true);
    setErrMsg("");
    setOkMsg("");

    try {
      const res = await fetch("/api/all-entries", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: item.source,
          id: item.id,
          status: newStatus,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrMsg(data.error || "Failed to update status");
      } else {
        setEntries((prev) =>
          prev.map((e) =>
            e.uid === item.uid
              ? {
                ...e,
                status: newStatus,
                approvedBy: newStatus === "approved" ? (currentUser?.username || "Admin") : null,
                approvedAt: newStatus === "approved" ? new Date().toISOString() : null,
              }
              : e
          )
        );
        setOkMsg(`Entry status updated to ${newStatus === "approved" ? "Approved" : "Pending"}.`);
      }
    } catch (e) {
      setErrMsg(e.message || "Network error");
    } finally {
      setBusy(false);
    }
  }

  // Bulk Approve
  async function handleBulkApprove() {
    if (selectedUids.size === 0) return;
    setBusy(true);
    setErrMsg("");
    setOkMsg("");

    const targetItems = entries.filter((e) => selectedUids.has(e.uid) && e.status !== "approved");
    if (targetItems.length === 0) {
      setOkMsg("Selected entries are already approved.");
      setBusy(false);
      return;
    }

    try {
      let count = 0;
      for (const item of targetItems) {
        const res = await fetch("/api/all-entries", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            source: item.source,
            id: item.id,
            status: "approved",
          }),
        });
        if (res.ok) count++;
      }
      setSelectedUids(new Set());
      setOkMsg(`Successfully approved ${count} entries.`);
      await loadData();
    } catch (e) {
      setErrMsg(e.message || "Failed during bulk approval");
    } finally {
      setBusy(false);
    }
  }

  // Edit Modal trigger
  function handleOpenEdit(item) {
    setEditingEntry(item);
    setEditForm({
      date: item.date || today(),
      party: item.party || "",
      title: item.title || "",
      billNo: item.billNo === "—" ? "" : item.billNo || "",
      amount: item.amount || "",
      payment: item.payment || "",
      method: item.method || "Cash",
      fromBank: item.fromBank || "",
      toBank: item.toBank || "",
      subType: item.subType || "",
      note: item.note || "",
    });
  }

  // Save Edit
  async function handleSaveEdit(e) {
    e.preventDefault();
    if (!editingEntry) return;
    setBusy(true);
    setErrMsg("");
    setOkMsg("");

    try {
      const res = await fetch("/api/all-entries", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: editingEntry.source,
          id: editingEntry.id,
          data: editForm,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrMsg(data.error || "Failed to update entry");
      } else {
        setOkMsg("Entry updated successfully.");
        setEditingEntry(null);
        await loadData();
      }
    } catch (err) {
      setErrMsg(err.message || "Network error updating entry");
    } finally {
      setBusy(false);
    }
  }

  // Delete Entry (Moves to Recycle Bin)
  async function handleDelete(item) {
    if (!confirm(`Move ${item.sourceLabel} entry for "${item.party}" (৳ ${fmt(item.amount)}) to Recycle Bin?`)) {
      return;
    }
    setBusy(true);
    setErrMsg("");
    setOkMsg("");

    try {
      const res = await fetch(`/api/all-entries?source=${item.source}&id=${item.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        setErrMsg(data.error || "Failed to delete entry");
      } else {
        setOkMsg("Entry moved to Recycle Bin.");
        await loadData();
      }
    } catch (err) {
      setErrMsg(err.message || "Network error deleting entry");
    } finally {
      setBusy(false);
    }
  }

  // Restore Item from Recycle Bin
  async function handleRestoreItem(item) {
    if (!confirm(`Restore ${item.sourceLabel} entry for "${item.party}"?`)) return;
    setBusy(true);
    setErrMsg("");
    setOkMsg("");
    try {
      const res = await fetch("/api/all-entries/recycle-bin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "restore",
          source: item.source,
          id: item.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to restore entry");
      setOkMsg(`Restored ${item.sourceLabel} entry for "${item.party}" successfully!`);
      await loadData();
    } catch (err) {
      setErrMsg(err.message || "Network error restoring entry");
    } finally {
      setBusy(false);
    }
  }

  // Permanently Delete Item from Recycle Bin
  async function handlePermanentDeleteItem(item) {
    if (
      !confirm(
        `Are you sure you want to PERMANENTLY delete this ${item.sourceLabel} entry for "${item.party}" (৳ ${fmt(item.amount)})?\n\nThis action CANNOT be undone and will permanently remove this record from the database!`
      )
    ) {
      return;
    }
    setBusy(true);
    setErrMsg("");
    setOkMsg("");
    try {
      const res = await fetch("/api/all-entries/recycle-bin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "permanent_delete",
          source: item.source,
          id: item.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete permanently");
      setOkMsg(`Permanently deleted ${item.sourceLabel} entry.`);
      await loadData();
    } catch (err) {
      setErrMsg(err.message || "Network error deleting entry");
    } finally {
      setBusy(false);
    }
  }

  // Empty Entire Recycle Bin
  async function handleEmptyRecycleBin() {
    if (recycleBin.length === 0) {
      alert("Recycle bin is already empty.");
      return;
    }
    if (
      !confirm(
        `Are you sure you want to EMPTY the Recycle Bin?\n\nAll ${recycleBin.length} deleted records across Sales, Purchase, and Expense will be PERMANENTLY REMOVED from the database and CANNOT be recovered!`
      )
    ) {
      return;
    }
    setBusy(true);
    setErrMsg("");
    setOkMsg("");
    try {
      const res = await fetch("/api/all-entries/recycle-bin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "empty" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to empty recycle bin");
      setOkMsg("Recycle bin emptied successfully.");
      await loadData();
    } catch (err) {
      setErrMsg(err.message || "Network error emptying recycle bin");
    } finally {
      setBusy(false);
    }
  }

  // Select all toggle
  function handleSelectAll(e) {
    if (e.target.checked) {
      setSelectedUids(new Set(filteredEntries.map((item) => item.uid)));
    } else {
      setSelectedUids(new Set());
    }
  }

  function handleToggleRowSelect(uid) {
    const next = new Set(selectedUids);
    if (next.has(uid)) next.delete(uid);
    else next.add(uid);
    setSelectedUids(next);
  }

  // Export to Excel
  function handleExportExcel() {
    if (filteredEntries.length === 0) {
      alert("No entries to export with current filters.");
      return;
    }

    const rows = [
      ["CHOWDHURY ENGINEERING WORKS"],
      ["ALL SYSTEM ENTRIES AUDIT & MASTER REPORT"],
      [`Generated on: ${today()} | Total Records: ${filteredEntries.length}`],
      [],
      [
        "SL",
        "Date",
        "Module",
        "Type / Category",
        "Party / Client / Recipient",
        "Bill No",
        "Amount (BDT)",
        "Payment (BDT)",
        "Due (BDT)",
        "Payment Method",
        "From Bank",
        "To Bank",
        "Approval Status",
        "Approved By",
        "Approved At",
        "Remarks / Note",
      ],
      ...filteredEntries.map((e, idx) => [
        idx + 1,
        e.date,
        e.sourceLabel,
        e.subType,
        e.party,
        e.billNo,
        e.amount,
        e.payment,
        e.due,
        e.method,
        e.fromBank || "—",
        e.toBank || "—",
        (e.status || "approved").toUpperCase(),
        e.approvedBy || "—",
        e.approvedAt || "—",
        e.note || "—",
      ]),
      [],
      [
        "TOTAL",
        "",
        "",
        "",
        "",
        "",
        filteredEntries.reduce((s, r) => s + Number(r.amount || 0), 0),
        filteredEntries.reduce((s, r) => s + Number(r.payment || 0), 0),
        filteredEntries.reduce((s, r) => s + Number(r.due || 0), 0),
      ],
    ];

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [
      { wch: 6 },
      { wch: 12 },
      { wch: 18 },
      { wch: 18 },
      { wch: 25 },
      { wch: 14 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 16 },
      { wch: 16 },
      { wch: 16 },
      { wch: 15 },
      { wch: 16 },
      { wch: 16 },
      { wch: 30 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Master_Audit_Entries");
    XLSX.writeFile(wb, `CEW_Master_Entries_Audit_${today().replace(/-/g, "")}.xlsx`);
  }

  const isAllSelected =
    filteredEntries.length > 0 && filteredEntries.every((e) => selectedUids.has(e.uid));

  return (
    <main className="be-wrapper">
      {/* Header */}
      <header className="be-header">
        <div className="be-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/cew-icon.png" alt="CEW" className="be-logo" />
          <div className="be-title-box">
            <h1>All Entries &amp; Approvals</h1>
            <p>
              Master ledger of Sales, Purchase, and Expense.
            </p>
          </div>
        </div>
        <nav className="be-nav-actions">
          <button
            type="button"
            className="be-nav-btn"
            onClick={loadData}
            title="Refresh All Records"
          >
            <RefreshIcon size={14} /> Refresh
          </button>
          <button
            type="button"
            className="be-nav-btn"
            onClick={handleExportExcel}
            style={{ background: "#f0fdf4", color: "#166534", borderColor: "#bbf7d0" }}
          >
            <DownloadIcon size={14} /> Export Audit Excel
          </button>
          <Link href="/" className="be-nav-btn">
            <HomeIcon size={14} /> Dashboard
          </Link>
        </nav>
      </header>

      {/* Notifications */}
      {errMsg && (
        <div style={{ background: "#fee2e2", color: "#b91c1c", padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: "0.88rem", fontWeight: 600 }}>
          {errMsg}
        </div>
      )}
      {okMsg && (
        <div style={{ background: "#ecfdf5", color: "#047857", padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: "0.88rem", fontWeight: 600 }}>
          {okMsg}
        </div>
      )}

      {/* Metric KPI Cards */}
      <section className="ae-metric-grid">
        <div className="ae-metric-card total">
          <span className="ae-metric-label">
            Total System Entries
            <ShieldIcon size={15} color="var(--be-primary)" />
          </span>
          <span className="ae-metric-val">{metrics.total}</span>
        </div>

        <div className="ae-metric-card approved">
          <span className="ae-metric-label">
            Approved Entries
            <CheckIcon size={15} color="#10b981" />
          </span>
          <span className="ae-metric-val">{metrics.approved}</span>
        </div>

        <div className="ae-metric-card pending">
          <span className="ae-metric-label">
            Pending Approval
            <ClockIcon size={15} color="#f59e0b" />
          </span>
          <span className="ae-metric-val">{metrics.pending}</span>
        </div>

        <div className="ae-metric-card amount">
          <span className="ae-metric-label">
            Total Monetary Volume
            <span style={{ fontSize: "0.74rem" }}>BDT</span>
          </span>
          <span className="ae-metric-val">৳ {fmt(metrics.totalAmount)}</span>
        </div>
      </section>

      {/* Filter Panel */}
      <section className="ae-filter-panel">
        <div className="ae-filter-row">
          {/* Module Tabs */}
          <div className="ae-tabs-group">
            <button
              type="button"
              className={`ae-tab-btn ${moduleFilter === "all" ? "active" : ""}`}
              onClick={() => setModuleFilter("all")}
            >
              All Modules
              <span className="ae-tab-badge">{metrics.moduleCounts.all}</span>
            </button>
            <button
              type="button"
              className={`ae-tab-btn ${moduleFilter === "customer_bill" ? "active" : ""}`}
              onClick={() => setModuleFilter("customer_bill")}
            >
              Sales
              <span className="ae-tab-badge">{metrics.moduleCounts.customer_bill}</span>
            </button>
            <button
              type="button"
              className={`ae-tab-btn ${moduleFilter === "dealer_supplier" ? "active" : ""}`}
              onClick={() => setModuleFilter("dealer_supplier")}
            >
              Purchase
              <span className="ae-tab-badge">{metrics.moduleCounts.dealer_supplier}</span>
            </button>
            <button
              type="button"
              className={`ae-tab-btn ${moduleFilter === "expense" ? "active" : ""}`}
              onClick={() => setModuleFilter("expense")}
            >
              Expense
              <span className="ae-tab-badge">{metrics.moduleCounts.expense}</span>
            </button>
            <button
              type="button"
              className={`ae-tab-btn ${moduleFilter === "recycle_bin" ? "active" : ""}`}
              onClick={() => setModuleFilter("recycle_bin")}
              style={
                moduleFilter === "recycle_bin"
                  ? { background: "#fee2e2", color: "#b91c1c", borderColor: "#fca5a5", fontWeight: 800 }
                  : {}
              }
            >
              <TrashIcon size={13} style={{ marginRight: 4, verticalAlign: "-2px" }} />
              Recycle Bin
              <span
                className="ae-tab-badge"
                style={
                  moduleFilter === "recycle_bin"
                    ? { background: "#ef4444", color: "#ffffff" }
                    : { background: "#fecaca", color: "#991b1b" }
                }
              >
                {metrics.moduleCounts.recycle_bin}
              </span>
            </button>
          </div>

          {/* Search Input */}
          <div className="ae-search-wrap">
            <span className="ae-search-icon">
              <SearchIcon size={15} />
            </span>
            <input
              type="text"
              className="ae-search-input"
              placeholder="Search by party, bill no, title, amount..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Sub-Filters: Status & Date */}
        <div className="ae-sub-filters">
          {moduleFilter !== "recycle_bin" && (
            <div className="ae-pill-group">
              <span className="ae-pill-label">Status:</span>
              <button
                type="button"
                className={`ae-pill-btn ${statusFilter === "all" ? "active" : ""}`}
                onClick={() => setStatusFilter("all")}
              >
                All
              </button>
              <button
                type="button"
                className={`ae-pill-btn ${statusFilter === "pending" ? "active" : ""}`}
                onClick={() => setStatusFilter("pending")}
                style={statusFilter === "pending" ? { background: "#f59e0b", borderColor: "#f59e0b" } : {}}
              >
                Pending ({metrics.pending})
              </button>
              <button
                type="button"
                className={`ae-pill-btn ${statusFilter === "approved" ? "active" : ""}`}
                onClick={() => setStatusFilter("approved")}
                style={statusFilter === "approved" ? { background: "#10b981", borderColor: "#10b981" } : {}}
              >
                Approved ({metrics.approved})
              </button>
            </div>
          )}

          <div className="ae-pill-group">
            <span className="ae-pill-label">Date:</span>
            <button
              type="button"
              className={`ae-pill-btn ${dateRange === "all" ? "active" : ""}`}
              onClick={() => setDateRange("all")}
            >
              All Time
            </button>
            <button
              type="button"
              className={`ae-pill-btn ${dateRange === "today" ? "active" : ""}`}
              onClick={() => setDateRange("today")}
            >
              Today
            </button>
            <button
              type="button"
              className={`ae-pill-btn ${dateRange === "week" ? "active" : ""}`}
              onClick={() => setDateRange("week")}
            >
              This Week
            </button>
            <button
              type="button"
              className={`ae-pill-btn ${dateRange === "month" ? "active" : ""}`}
              onClick={() => setDateRange("month")}
            >
              This Month
            </button>
          </div>
        </div>
      </section>

      {/* Bulk Action Bar if items selected */}
      {selectedUids.size > 0 && (
        <div className="ae-bulk-bar">
          <span>
            <strong>{selectedUids.size}</strong> item(s) selected
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              className="ae-btn-action approve-btn"
              onClick={handleBulkApprove}
              disabled={busy}
            >
              <CheckIcon size={14} /> Approve Selected
            </button>
            <button
              type="button"
              className="ae-btn-action"
              onClick={() => setSelectedUids(new Set())}
            >
              Deselect All
            </button>
          </div>
        </div>
      )}

      {/* Main Table Card */}
      <section className="be-card">
        <div className="be-card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
          <div>
            <h2 className="be-card-title">
              {moduleFilter === "recycle_bin"
                ? `Recycle Bin (${filteredRecycleBin.length})`
                : `Entries List (${filteredEntries.length})`}
            </h2>
            <span style={{ fontSize: "0.82rem", color: "var(--be-text-muted)" }}>
              {moduleFilter === "recycle_bin"
                ? `Showing ${filteredRecycleBin.length} of ${recycleBin.length} deleted items from Sales, Purchase & Expense`
                : `Showing ${filteredEntries.length} of ${entries.length} records`}
            </span>
          </div>
          {moduleFilter === "recycle_bin" && (
            <button
              type="button"
              className="be-btn"
              onClick={handleEmptyRecycleBin}
              disabled={busy || recycleBin.length === 0}
              style={{
                background: "#dc2626",
                color: "#ffffff",
                borderColor: "#b91c1c",
                fontSize: "0.82rem",
                fontWeight: 700,
                padding: "6px 14px",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                borderRadius: "8px",
                cursor: busy || recycleBin.length === 0 ? "not-allowed" : "pointer",
              }}
              title="Permanently empty all items in the Recycle Bin"
            >
              <TrashIcon size={14} /> Empty Recycle Bin
            </button>
          )}
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--be-text-muted)" }}>
            Loading all entries...
          </div>
        ) : (moduleFilter === "recycle_bin" ? filteredRecycleBin.length === 0 : filteredEntries.length === 0) ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--be-text-muted)" }}>
            {moduleFilter === "recycle_bin"
              ? "Recycle bin is empty. No deleted records found."
              : "No entries match the current filters."}
          </div>
        ) : (
          <div className="tablewrap">
            <table className="ae-ledger-table">
              <thead>
                {moduleFilter === "recycle_bin" ? (
                  <tr>
                    <th style={{ width: 45, textAlign: "center" }}>SL</th>
                    <th style={{ width: 95 }}>Date</th>
                    <th style={{ width: 105 }}>Module</th>
                    <th style={{ width: 130 }}>Type</th>
                    <th style={{ minWidth: 160 }}>Party / Particulars</th>
                    <th style={{ width: 95 }}>Bill No.</th>
                    <th style={{ width: 120, textAlign: "right" }}>Amount (৳)</th>
                    <th style={{ width: 130, textAlign: "center" }}>Deleted By</th>
                    <th style={{ width: 85, textAlign: "center" }}>Restore</th>
                    <th style={{ width: 85, textAlign: "center" }}>Delete</th>
                  </tr>
                ) : moduleFilter === "dealer_supplier" ? (
                  <tr>
                    <th style={{ width: 95 }}>Date</th>
                    <th style={{ width: 115 }}>Bill No.</th>
                    <th style={{ minWidth: 150 }}>Item Description</th>
                    <th className="num" style={{ width: 90 }}>Weight</th>
                    <th className="num" style={{ width: 85 }}>Rate</th>
                    <th className="num" style={{ width: 100 }}>Subtotal</th>
                    <th className="num" style={{ width: 115 }}>Total Bill</th>
                    <th style={{ minWidth: 135 }}>Payment Method</th>
                    <th className="num" style={{ width: 110 }}>Payment</th>
                    <th className="num" style={{ width: 130 }}>Remaining Balance</th>
                    <th style={{ width: 90, textAlign: "center" }}>Status</th>
                    <th style={{ width: 80, textAlign: "center" }}>Entry By</th>
                  </tr>
                ) : moduleFilter === "customer_bill" ? (
                  <tr>
                    <th style={{ width: 32, textAlign: "center", padding: "8px 4px" }}>SL</th>
                    <th style={{ width: 80, whiteSpace: "nowrap", padding: "8px 5px" }}>Date</th>
                    <th style={{ width: 62, whiteSpace: "nowrap", padding: "8px 5px" }}>Bill No</th>
                    <th style={{ minWidth: 100, padding: "8px 6px" }}>Customer Name</th>
                    <th style={{ width: 110, whiteSpace: "nowrap", padding: "8px 5px" }}>Customer ID & Mobile</th>
                    <th style={{ textAlign: "right", whiteSpace: "nowrap", width: 80, padding: "8px 5px" }}>Total Bill (৳)</th>
                    <th style={{ textAlign: "right", whiteSpace: "nowrap", width: 78, padding: "8px 5px" }}>Payment (৳)</th>
                    <th style={{ textAlign: "right", whiteSpace: "nowrap", width: 66, padding: "8px 5px" }}>Due (৳)</th>
                    <th style={{ textAlign: "right", whiteSpace: "nowrap", width: 66, padding: "8px 5px" }}>Advance (৳)</th>
                    <th style={{ textAlign: "right", whiteSpace: "nowrap", width: 76, padding: "8px 5px" }}>Due Received (৳)</th>
                    <th style={{ textAlign: "right", whiteSpace: "nowrap", width: 95, padding: "8px 5px" }}>Remaining Balance (৳)</th>
                    <th style={{ textAlign: "center", width: 78, padding: "8px 4px" }}>Status</th>
                    <th style={{ textAlign: "center", width: 68, padding: "8px 4px" }}>Entry By</th>
                  </tr>
                ) : moduleFilter === "expense" ? (
                  <tr>
                    <th style={{ width: 95 }}>Date</th>
                    <th style={{ minWidth: 160 }}>Title</th>
                    <th style={{ minWidth: 140 }}>Category</th>
                    <th style={{ minWidth: 140 }}>Paid To</th>
                    <th style={{ minWidth: 135 }}>Method / Bank</th>
                    <th className="num" style={{ width: 120, textAlign: "right" }}>Amount (৳)</th>
                    <th style={{ minWidth: 130 }}>Note</th>
                    <th style={{ width: 95, textAlign: "center" }}>Status</th>
                    <th style={{ width: 85, textAlign: "center" }}>Entry By</th>
                  </tr>
                ) : (
                  <tr>
                    <th style={{ width: 34, textAlign: "center" }}>
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={handleSelectAll}
                      />
                    </th>
                    <th style={{ width: 44 }}>SL</th>
                    <th style={{ width: 105 }}>Date</th>
                    <th style={{ width: 140 }}>Type</th>
                    <th>{moduleFilter === "all" ? "Party / Name" : "Party / Particulars"}</th>
                    <th style={{ width: 95 }}>Bill</th>
                    <th style={{ width: 130, textAlign: "right" }}>Amount (৳)</th>
                    {moduleFilter !== "all" && <th style={{ width: 140 }}>Payment Method</th>}
                    <th style={{ width: 110, textAlign: "center" }}>Status</th>
                    <th style={{ width: 110, textAlign: "center" }}>Entry By</th>
                    {moduleFilter !== "all" && <th style={{ width: 85, textAlign: "right" }}>Actions</th>}
                  </tr>
                )}
              </thead>
              <tbody>
                {moduleFilter === "recycle_bin" ? (
                  filteredRecycleBin.map((item, idx) => (
                    <tr
                      key={item.uid}
                      style={{ cursor: "default" }}
                    >
                      <td style={{ textAlign: "center", color: "var(--be-text-muted)", fontSize: "0.82rem" }}>
                        {idx + 1}
                      </td>
                      <td style={{ whiteSpace: "nowrap", fontSize: "0.82rem" }}>
                        {prettyDate(item.date)}
                      </td>
                      <td>
                        <span
                          className="ae-tag-source"
                          style={{
                            background:
                              item.source === "customer_bill"
                                ? "#eff6ff"
                                : item.source === "dealer_supplier"
                                  ? "#ecfdf5"
                                  : "#fef3c7",
                            color:
                              item.source === "customer_bill"
                                ? "#1d4ed8"
                                : item.source === "dealer_supplier"
                                  ? "#047857"
                                  : "#b45309",
                            border: "1px solid currentColor",
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            padding: "2px 8px",
                            borderRadius: "6px",
                            display: "inline-block",
                          }}
                        >
                          {item.sourceLabel}
                        </span>
                      </td>
                      <td style={{ fontSize: "0.82rem", fontWeight: 600, color: "#334155" }}>
                        {item.subType || "—"}
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: "#0f172a" }}>{item.party || "—"}</div>
                        {item.customerMobile && (
                          <div style={{ fontSize: "0.74rem", color: "var(--be-text-muted)" }}>
                            {item.customerMobile}
                          </div>
                        )}
                        {item.note && (
                          <div style={{ fontSize: "0.72rem", color: "#64748b", fontStyle: "italic", marginTop: "2px" }}>
                            {item.note}
                          </div>
                        )}
                      </td>
                      <td style={{ fontFamily: "monospace", fontSize: "0.82rem", fontWeight: 700, color: "#475569" }}>
                        {item.billNo || "—"}
                      </td>
                      <td style={{ textAlign: "right", fontWeight: 700, color: "#0f172a", whiteSpace: "nowrap" }}>
                        ৳ {fmt(item.amount)}
                      </td>
                      <td style={{ textAlign: "center", whiteSpace: "nowrap" }}>
                        <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#dc2626" }}>
                          {item.deletedBy || "Admin"}
                        </div>
                        {item.deletedAt && item.deletedAt !== "—" && (
                          <div style={{ fontSize: "0.7rem", color: "#94a3b8" }}>
                            {item.deletedAt}
                          </div>
                        )}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <button
                          type="button"
                          onClick={() => handleRestoreItem(item)}
                          className="be-btn-ghost"
                          style={{
                            fontSize: "0.76rem",
                            fontWeight: 700,
                            color: "#059669",
                            background: "#ecfdf5",
                            border: "1px solid #a7f3d0",
                            padding: "4px 8px",
                            borderRadius: "6px",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                          title="Restore this record back to active entries"
                        >
                          <RefreshIcon size={12} /> Restore
                        </button>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <button
                          type="button"
                          onClick={() => handlePermanentDeleteItem(item)}
                          className="be-btn-ghost"
                          style={{
                            fontSize: "0.76rem",
                            fontWeight: 700,
                            color: "#dc2626",
                            background: "#fee2e2",
                            border: "1px solid #fca5a5",
                            padding: "4px 8px",
                            borderRadius: "6px",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                          title="Permanently delete from database"
                        >
                          <TrashIcon size={12} /> Delete
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  filteredEntries.map((item, idx) => {
                    const isApproved = (item.status || "pending") === "approved";
                    const isSelected = selectedUids.has(item.uid);

                    if (moduleFilter === "customer_bill") {
                      const balInfo = customerBalanceMap.get(item.id) || {};
                      const totalBill = Number(item.totalBill || 0);
                      const payment = Number(item.payment || 0);
                      const dueThisBill = balInfo.dueThisBill !== undefined ? balInfo.dueThisBill : Math.max(0, totalBill - payment);
                      const advanceThisBill = balInfo.advanceThisBill !== undefined ? balInfo.advanceThisBill : Math.max(0, payment - totalBill);
                      const dueReceived = Number(balInfo.dueReceived || 0);
                      const invoicePayment = Math.max(0, payment - dueReceived - advanceThisBill);
                      const rBal = balInfo.runningBalance !== undefined ? balInfo.runningBalance : (item.due || 0);
                      const prev = balInfo.prevBalance || 0;

                      return (
                        <tr
                          key={item.uid}
                          onClick={() => setSelectedCustomerBillForModal(item)}
                          className="be-row-interactive"
                          style={{ cursor: "pointer" }}
                          title="Click to view full order details & edit/delete"
                        >
                          <td style={{ textAlign: "center", color: "var(--be-text-muted)", fontSize: "0.8rem", padding: "7px 4px" }}>
                            {idx + 1}
                          </td>
                          <td style={{ whiteSpace: "nowrap", color: "#475569", fontSize: "0.78rem", padding: "7px 5px" }}>
                            {item.date || "—"}
                          </td>
                          <td style={{ fontWeight: 700, color: "#1e293b", whiteSpace: "nowrap", padding: "7px 5px", fontSize: "0.8rem" }}>
                            {item.billNo && item.billNo !== "—" ? `#${item.billNo}` : "—"}
                          </td>
                          <td style={{ padding: "7px 6px" }}>
                            <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "0.84rem" }}>
                              {item.customerName || item.party || "—"}
                            </div>
                            {item.customerAddress && (
                              <div style={{ fontSize: "0.7rem", color: "var(--be-text-muted)", lineHeight: 1.2, marginTop: "1px" }}>
                                {item.customerAddress}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: "7px 5px" }}>
                            <div style={{ fontFamily: "monospace", fontSize: "0.76rem", fontWeight: 700, color: "#2563eb", whiteSpace: "nowrap" }}>
                              {item.customerId || "—"}
                            </div>
                            {item.customerMobile && (
                              <div style={{ fontSize: "0.72rem", color: "var(--be-text-muted)", whiteSpace: "nowrap" }}>
                                {item.customerMobile}
                              </div>
                            )}
                          </td>
                          <td style={{ textAlign: "right", fontWeight: 700, color: "#0f172a", whiteSpace: "nowrap", padding: "7px 5px", fontSize: "0.8rem" }}>
                            ৳ {fmt(totalBill)}
                          </td>
                          <td style={{ textAlign: "right", color: invoicePayment >= 0.005 ? "#059669" : "var(--be-text-muted)", fontWeight: 700, whiteSpace: "nowrap", padding: "7px 5px", fontSize: "0.8rem" }}>
                            {invoicePayment >= 0.005 ? `৳ ${fmt(invoicePayment)}` : "—"}
                          </td>
                          <td style={{ textAlign: "right", fontWeight: 700, color: dueThisBill >= 0.005 ? "#dc2626" : "var(--be-text-muted)", whiteSpace: "nowrap", padding: "7px 5px", fontSize: "0.8rem" }}>
                            {dueThisBill >= 0.005 ? `৳ ${fmt(dueThisBill)}` : "—"}
                          </td>
                          <td style={{ textAlign: "right", fontWeight: 700, color: advanceThisBill >= 0.005 ? "#059669" : "var(--be-text-muted)", whiteSpace: "nowrap", padding: "7px 5px", fontSize: "0.8rem" }}>
                            {advanceThisBill >= 0.005 ? `৳ ${fmt(advanceThisBill)}` : "—"}
                          </td>
                          <td style={{ textAlign: "right", fontWeight: 700, color: dueReceived >= 0.005 ? "#2563eb" : "var(--be-text-muted)", whiteSpace: "nowrap", padding: "7px 5px", fontSize: "0.8rem" }}>
                            {dueReceived >= 0.005 ? `৳ ${fmt(dueReceived)}` : "—"}
                          </td>
                          <td style={{ textAlign: "right", verticalAlign: "middle", whiteSpace: "nowrap", padding: "7px 5px" }}>
                            <div>
                              <div
                                style={{
                                  fontWeight: 800,
                                  fontSize: "0.82rem",
                                  color: rBal >= 0.005 ? "#dc2626" : rBal <= -0.005 ? "#059669" : "var(--be-text-muted)",
                                }}
                              >
                                {rBal >= 0.005
                                  ? `Due: ৳ ${fmt(rBal)}`
                                  : rBal <= -0.005
                                    ? `Adv: ৳ ${fmt(Math.abs(rBal))}`
                                    : "Fully Settled"}
                              </div>
                              {Math.abs(prev) >= 0.005 && (
                                <div
                                  style={{
                                    fontSize: "0.66rem",
                                    color: "#64748b",
                                    marginTop: "1px",
                                    lineHeight: 1.15,
                                  }}
                                  title={`Previous Balance: ${prev >= 0.005 ? `Due ৳ ${fmt(prev)}` : `Adv ৳ ${fmt(Math.abs(prev))}`}`}
                                >
                                  <span>
                                    Prev:{" "}
                                    <strong style={{ color: prev >= 0.005 ? "#b91c1c" : "#047857" }}>
                                      {prev >= 0.005 ? `Due ${fmt(prev)}` : `Adv ${fmt(Math.abs(prev))}`}
                                    </strong>
                                  </span>
                                </div>
                              )}
                            </div>
                          </td>
                          <td style={{ textAlign: "center", padding: "7px 4px" }} onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              className={`ae-status-btn ${isApproved ? "approved" : "pending"}`}
                              onClick={() => handleToggleStatus(item)}
                              disabled={busy}
                              style={{ fontSize: "0.72rem", padding: "3px 8px" }}
                              title={
                                isApproved
                                  ? `Approved by: ${item.approvedBy || "Admin"}${item.approvedAt ? ` on ${item.approvedAt}` : ""}. Click to change to Pending.`
                                  : "Pending Approval. Click to Approve now."
                              }
                            >
                              {isApproved ? (
                                <>
                                  <CheckIcon size={11} /> Approved
                                </>
                              ) : (
                                <>
                                  <ClockIcon size={11} /> Pending
                                </>
                              )}
                            </button>
                          </td>
                          <td style={{ textAlign: "center", whiteSpace: "nowrap", padding: "7px 4px" }}>
                            <span
                              style={{
                                display: "inline-block",
                                padding: "2px 7px",
                                borderRadius: "5px",
                                fontSize: "0.74rem",
                                fontWeight: 700,
                                background: "#f1f5f9",
                                color: "#334155",
                                border: "1px solid #e2e8f0",
                              }}
                            >
                              {item.entryBy || item.approvedBy || "Admin"}
                            </span>
                          </td>
                        </tr>
                      );
                    }

                    if (moduleFilter === "dealer_supplier") {
                      const isBill = item.type === "bill" || (!item.type && item.subType === "Bill") || (item.source === "dealer_supplier" && item.flow === "none");
                      const hasItems = isBill && Array.isArray(item.items) && item.items.length > 0;
                      const items = hasItems ? item.items : null;
                      const itemsCount = items ? items.length : 1;
                      const isLastRow = idx === filteredEntries.length - 1;
                      const rowBorderBottom = isLastRow ? "none" : "2px solid #cbd5e1";
                      const billBg = idx % 2 === 0 ? "#ffffff" : "#f8fafc";
                      const balInfo = dealerSupplierBalanceMap.get(item.uid) || dealerSupplierBalanceMap.get(item.id) || {};
                      const rBal = balInfo.runningBalance !== undefined ? balInfo.runningBalance : Number(item.amount || 0);

                      if (!isBill) {
                        // PAYMENT ENTRY ROW
                        return (
                          <tr
                            key={item.uid}
                            className="ae-ledger-row"
                            onClick={() => setSelectedPurchaseEntryForModal(item)}
                            title="Click to view full details, edit, or delete"
                            style={{ background: billBg, borderBottom: rowBorderBottom, cursor: "pointer" }}
                          >
                            <td style={{ verticalAlign: "top", whiteSpace: "nowrap" }}>
                              {item.date}
                            </td>
                            <td style={{ verticalAlign: "top", fontWeight: 700, color: "#1e293b" }}>
                              <div>{item.billNo && item.billNo !== "—" ? `Bill #${item.billNo}` : "—"}</div>
                              {item.party && (
                                <div className="ae-party-pill">
                                  <span>{item.party}</span>
                                </div>
                              )}
                            </td>
                            <td style={{ verticalAlign: "top" }}>
                              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                <span style={{ fontWeight: 700, color: "#065f46" }}>Payment</span>
                                {item.note && <span style={{ fontSize: "0.75rem", fontStyle: "italic", color: "#64748b" }}>{item.note}</span>}
                              </div>
                            </td>
                            <td className="num" style={{ verticalAlign: "top", color: "#94a3b8" }}>—</td>
                            <td className="num" style={{ verticalAlign: "top", color: "#94a3b8" }}>—</td>
                            <td className="num" style={{ verticalAlign: "top", color: "#94a3b8" }}>—</td>
                            <td className="num" style={{ verticalAlign: "top", color: "#94a3b8" }}>—</td>
                            <td style={{ verticalAlign: "top" }}>
                              {item.fromBank || item.toBank ? (
                                <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "#0f172a", background: "#f1f5f9", padding: "2px 7px", borderRadius: 4, display: "inline-block" }}>
                                  {item.fromBank && item.toBank ? `${item.fromBank} → ${item.toBank}` : item.fromBank || item.toBank}
                                </span>
                              ) : item.method && item.method !== "Payment" && item.method !== "Bill" ? (
                                <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "#0f172a", background: "#f1f5f9", padding: "2px 7px", borderRadius: 4, display: "inline-block" }}>
                                  {item.method}
                                </span>
                              ) : (
                                <span style={{ color: "#94a3b8" }}>Cash / Direct</span>
                              )}
                            </td>
                            <td className="num" style={{ verticalAlign: "top", fontWeight: 700, color: "#059669", whiteSpace: "nowrap" }}>
                              − ৳ {fmt(item.amount)}
                            </td>
                            <td className="num" style={{ verticalAlign: "top", whiteSpace: "nowrap" }}>
                              <b style={{ color: rBal >= 0 ? "#dc2626" : "#059669" }}>
                                ৳ {fmt(rBal)}
                              </b>
                            </td>
                            <td style={{ textAlign: "center", verticalAlign: "top" }} onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                className={`ae-status-btn ${isApproved ? "approved" : "pending"}`}
                                onClick={() => handleToggleStatus(item)}
                                disabled={busy}
                                style={{ fontSize: "0.72rem", padding: "3px 8px" }}
                                title={
                                  isApproved
                                    ? `Approved by: ${item.approvedBy || "Admin"}${item.approvedAt ? ` on ${item.approvedAt}` : ""}. Click to change to Pending.`
                                    : "Pending Approval. Click to Approve now."
                                }
                              >
                                {isApproved ? (
                                  <>
                                    <CheckIcon size={11} /> Approved
                                  </>
                                ) : (
                                  <>
                                    <ClockIcon size={11} /> Pending
                                  </>
                                )}
                              </button>
                            </td>
                            <td style={{ textAlign: "center", verticalAlign: "top", whiteSpace: "nowrap" }}>
                              <span
                                style={{
                                  display: "inline-block",
                                  padding: "2px 7px",
                                  borderRadius: "5px",
                                  fontSize: "0.74rem",
                                  fontWeight: 700,
                                  background: "#f1f5f9",
                                  color: "#334155",
                                  border: "1px solid #e2e8f0",
                                }}
                              >
                                {item.entryBy || item.approvedBy || "Admin"}
                              </span>
                            </td>
                          </tr>
                        );
                      }

                      if (items) {
                        return items.map((it, itemIdx) => {
                          const isFirstItem = itemIdx === 0;
                          const isLastItemOfBill = itemIdx === items.length - 1;
                          const itemBorderBottom = isLastItemOfBill ? rowBorderBottom : "1px dashed #e2e8f0";

                          return (
                            <tr
                              key={`${item.uid}-${itemIdx}`}
                              className="ae-ledger-row"
                              onClick={() => setSelectedPurchaseEntryForModal(item)}
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
                                  }}
                                >
                                  {item.date}
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
                                  }}
                                >
                                  <div>{item.billNo && item.billNo !== "—" ? `Bill #${item.billNo}` : "—"}</div>
                                  {item.party && (
                                    <div className="ae-party-pill">
                                      <span>{item.party}</span>
                                    </div>
                                  )}
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
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  <div>+ ৳ {fmt(item.amount)}</div>
                                  {((item.labour_cost || item.labourCost) > 0 || (item.transport_cost || item.transportCost) > 0) && (
                                    <div style={{ fontSize: "0.7rem", color: "#64748b", marginTop: 2, fontWeight: 500, lineHeight: 1.25 }}>
                                      {(item.labour_cost || item.labourCost) > 0 && <div>+ Lab: ৳{fmt(item.labour_cost || item.labourCost)}</div>}
                                      {(item.transport_cost || item.transportCost) > 0 && <div>+ Tr: ৳{fmt(item.transport_cost || item.transportCost)}</div>}
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
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  <b style={{ color: rBal >= 0 ? "#dc2626" : "#059669" }}>
                                    ৳ {fmt(rBal)}
                                  </b>
                                </td>
                              )}
                              {isFirstItem && (
                                <td
                                  rowSpan={itemsCount}
                                  style={{
                                    textAlign: "center",
                                    verticalAlign: "top",
                                    borderBottom: rowBorderBottom,
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    type="button"
                                    className={`ae-status-btn ${isApproved ? "approved" : "pending"}`}
                                    onClick={() => handleToggleStatus(item)}
                                    disabled={busy}
                                    style={{ fontSize: "0.72rem", padding: "3px 8px" }}
                                    title={
                                      isApproved
                                        ? `Approved by: ${item.approvedBy || "Admin"}${item.approvedAt ? ` on ${item.approvedAt}` : ""}. Click to change to Pending.`
                                        : "Pending Approval. Click to Approve now."
                                    }
                                  >
                                    {isApproved ? (
                                      <>
                                        <CheckIcon size={11} /> Approved
                                      </>
                                    ) : (
                                      <>
                                        <ClockIcon size={11} /> Pending
                                      </>
                                    )}
                                  </button>
                                </td>
                              )}
                              {isFirstItem && (
                                <td
                                  rowSpan={itemsCount}
                                  style={{
                                    textAlign: "center",
                                    verticalAlign: "top",
                                    whiteSpace: "nowrap",
                                    borderBottom: rowBorderBottom,
                                  }}
                                >
                                  <span
                                    style={{
                                      display: "inline-block",
                                      padding: "2px 7px",
                                      borderRadius: "5px",
                                      fontSize: "0.74rem",
                                      fontWeight: 700,
                                      background: "#f1f5f9",
                                      color: "#334155",
                                      border: "1px solid #e2e8f0",
                                    }}
                                  >
                                    {item.entryBy || item.approvedBy || "Admin"}
                                  </span>
                                </td>
                              )}
                            </tr>
                          );
                        });
                      }

                      // BILL WITHOUT ITEMS
                      return (
                        <tr
                          key={item.uid}
                          className="ae-ledger-row"
                          onClick={() => setSelectedPurchaseEntryForModal(item)}
                          title="Click to view full details, edit, or delete"
                          style={{ background: billBg, borderBottom: rowBorderBottom, cursor: "pointer" }}
                        >
                          <td style={{ verticalAlign: "top", whiteSpace: "nowrap" }}>
                            {item.date}
                          </td>
                          <td style={{ verticalAlign: "top", fontWeight: 700, color: "#0f172a" }}>
                            <div>{item.billNo && item.billNo !== "—" ? `Bill #${item.billNo}` : "—"}</div>
                            {item.party && (
                              <div className="ae-party-pill">
                                <span>{item.party}</span>
                              </div>
                            )}
                          </td>
                          <td style={{ verticalAlign: "top", fontWeight: 600 }}>
                            {item.note || "General Bill"}
                          </td>
                          <td className="num" style={{ verticalAlign: "top" }}>
                            {item.weight != null ? `${fmt(item.weight)} kg` : "—"}
                          </td>
                          <td className="num" style={{ verticalAlign: "top", color: "#94a3b8" }}>—</td>
                          <td className="num" style={{ verticalAlign: "top", fontWeight: 700 }}>৳ {fmt(item.amount)}</td>
                          <td className="num" style={{ verticalAlign: "top", fontWeight: 800, whiteSpace: "nowrap" }}>+ ৳ {fmt(item.amount)}</td>
                          <td style={{ verticalAlign: "top", color: "#94a3b8" }}>—</td>
                          <td className="num" style={{ verticalAlign: "top", color: "#94a3b8" }}>—</td>
                          <td className="num" style={{ verticalAlign: "top", whiteSpace: "nowrap" }}>
                            <b style={{ color: rBal >= 0 ? "#dc2626" : "#059669" }}>
                              ৳ {fmt(rBal)}
                            </b>
                          </td>
                          <td style={{ textAlign: "center", verticalAlign: "top" }} onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              className={`ae-status-btn ${isApproved ? "approved" : "pending"}`}
                              onClick={() => handleToggleStatus(item)}
                              disabled={busy}
                              style={{ fontSize: "0.72rem", padding: "3px 8px" }}
                              title={
                                isApproved
                                  ? `Approved by: ${item.approvedBy || "Admin"}${item.approvedAt ? ` on ${item.approvedAt}` : ""}. Click to change to Pending.`
                                  : "Pending Approval. Click to Approve now."
                              }
                            >
                              {isApproved ? (
                                <>
                                  <CheckIcon size={11} /> Approved
                                </>
                              ) : (
                                <>
                                  <ClockIcon size={11} /> Pending
                                </>
                              )}
                            </button>
                          </td>
                          <td style={{ textAlign: "center", verticalAlign: "top", whiteSpace: "nowrap" }}>
                            <span
                              style={{
                                display: "inline-block",
                                padding: "2px 7px",
                                borderRadius: "5px",
                                fontSize: "0.74rem",
                                fontWeight: 700,
                                background: "#f1f5f9",
                                color: "#334155",
                                border: "1px solid #e2e8f0",
                              }}
                            >
                              {item.entryBy || item.approvedBy || "Admin"}
                            </span>
                          </td>
                        </tr>
                      );
                    }

                    if (moduleFilter === "expense") {
                      const isBank = item.method === "Bank" || item.payment_method === "Bank";
                      const hasBankPair = Boolean((item.fromBank || item.from_bank) && (item.toBank || item.to_bank));
                      const isDep = isDepositCategory(item.category || item.subType);
                      const rowBg = isDep ? "rgba(240, 253, 244, 0.45)" : (idx % 2 === 0 ? "#ffffff" : "#f8fafc");

                      return (
                        <tr
                          key={item.uid}
                          className="ae-ledger-row"
                          onClick={() => {
                            setSelectedExpenseForModal(item);
                            setIsEditingExpenseModal(false);
                            setEditExpenseModalData(null);
                            setExpenseModalErr("");
                          }}
                          title="Click to view full expense details, edit, or delete"
                          style={{ background: rowBg, cursor: "pointer" }}
                        >
                          <td style={{ verticalAlign: "middle", whiteSpace: "nowrap" }}>
                            {item.date}
                          </td>
                          <td style={{ verticalAlign: "middle", fontWeight: 600, color: "#0f172a" }}>
                            {item.title}
                          </td>
                          <td style={{ verticalAlign: "middle" }}>
                            <span className={`ex-cat-tag ${isDep ? "deposit" : ""}`}>
                              {item.category || item.subType || "General"}
                            </span>
                            {isDep && <span className="ex-deposit-sub">Deposit (Not Expense)</span>}
                          </td>
                          <td style={{ verticalAlign: "middle" }}>
                            <span style={{ fontWeight: 600, color: "#1e293b" }}>{item.paidTo || item.paid_to || item.party || "—"}</span>
                            {item.phone && (
                              <span style={{ display: "block", fontSize: "0.75rem", color: "#64748b", marginTop: 2 }}>
                                📞 {item.phone}
                              </span>
                            )}
                            {Boolean(item.isSynced || item.linkedClient || item.linkedEntryId) && (
                              <span className="ex-ledger-badge" title="Recorded as payment in Purchase ledger" style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                                <CheckIcon size={11} /> Ledger
                              </span>
                            )}
                          </td>
                          <td style={{ verticalAlign: "middle" }}>
                            {isBank ? (
                              <span className="ex-method-pill bank" title={hasBankPair ? `${item.fromBank || item.from_bank} → ${item.toBank || item.to_bank}` : (isDep ? `To: ${item.toBank || item.fromBank || "Bank"}` : "Bank Transfer")}>
                                {hasBankPair ? `${item.fromBank || item.from_bank} → ${item.toBank || item.to_bank}` : (item.fromBank || item.from_bank || item.toBank || item.to_bank || "Bank")}
                              </span>
                            ) : (
                              <span className="ex-method-pill">
                                {item.method || item.payment_method || "Cash"}
                              </span>
                            )}
                          </td>
                          <td className="num" style={{ verticalAlign: "middle", textAlign: "right", fontWeight: 700, whiteSpace: "nowrap", color: isDep ? "#15803d" : "#0f172a" }}>
                            ৳ {fmt(item.amount)}
                          </td>
                          <td style={{ verticalAlign: "middle", color: item.note ? "#475569" : "#94a3b8", fontSize: "0.82rem" }}>
                            {item.note || "—"}
                          </td>
                          <td style={{ textAlign: "center", verticalAlign: "middle" }} onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              className={`ae-status-btn ${isApproved ? "approved" : "pending"}`}
                              onClick={() => handleToggleStatus(item)}
                              disabled={busy}
                              style={{ fontSize: "0.72rem", padding: "3px 8px" }}
                              title={
                                isApproved
                                  ? `Approved by: ${item.approvedBy || "Admin"}${item.approvedAt ? ` on ${item.approvedAt}` : ""}. Click to change to Pending.`
                                  : "Pending Approval. Click to Approve now."
                              }
                            >
                              {isApproved ? (
                                <>
                                  <CheckIcon size={11} /> Approved
                                </>
                              ) : (
                                <>
                                  <ClockIcon size={11} /> Pending
                                </>
                              )}
                            </button>
                          </td>
                          <td style={{ textAlign: "center", verticalAlign: "middle", whiteSpace: "nowrap" }}>
                            <span
                              style={{
                                display: "inline-block",
                                padding: "2px 7px",
                                borderRadius: "5px",
                                fontSize: "0.74rem",
                                fontWeight: 700,
                                background: "#f1f5f9",
                                color: "#334155",
                                border: "1px solid #e2e8f0",
                              }}
                            >
                              {item.entryBy || item.approvedBy || "Admin"}
                            </span>
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <tr
                        key={item.uid}
                        style={{ ...(isSelected ? { background: "#fef9c3" } : {}), cursor: "pointer" }}
                        className="ae-ledger-row"
                        onClick={() => {
                          if (item.source === "expense") {
                            setSelectedExpenseForModal(item);
                            setIsEditingExpenseModal(false);
                            setEditExpenseModalData(null);
                            setExpenseModalErr("");
                          } else if (item.source === "customer_bill") {
                            setSelectedCustomerBillForModal(item);
                          } else if (item.source === "dealer_supplier") {
                            setSelectedPurchaseEntryForModal(item);
                          }
                        }}
                        title="Click to view details, edit or delete"
                      >
                        <td style={{ textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleRowSelect(item.uid)}
                          />
                        </td>
                        <td style={{ color: "var(--be-text-muted)", fontSize: "0.8rem" }}>
                          {idx + 1}
                        </td>
                        <td style={{ whiteSpace: "nowrap", fontWeight: 600 }}>
                          {prettyDate(item.date)}
                        </td>
                        <td>
                          {getTypeBadge(item)}
                        </td>
                        <td>
                          <div className="ae-party-name">{item.party}</div>
                          {item.isSynced && (
                            <div className="ae-synced-sub">
                              Synced to {item.linkedClient || "Dealer"}&apos;s ledger
                            </div>
                          )}
                          {item.note && (
                            <div className="ae-note-text" title={item.note}>
                              {item.note}
                            </div>
                          )}
                        </td>
                        <td>
                          {item.billNo && item.billNo !== "—" ? (
                            <span className="ae-bill-badge">#{item.billNo}</span>
                          ) : (
                            <span className="ae-dash-text">—</span>
                          )}
                        </td>
                        <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                          {item.flow === "in" ? (
                            <span className="ae-amount-text in" style={{ color: "#059669", fontWeight: 800 }}>
                              + ৳ {fmt(item.amount)}
                            </span>
                          ) : item.flow === "out" ? (
                            <span className="ae-amount-text out" style={{ color: "#dc2626", fontWeight: 800 }}>
                              - ৳ {fmt(item.amount)}
                            </span>
                          ) : item.flow === "in_bill" ? (
                            <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-end" }}>
                              <span className="ae-amount-text none" style={{ color: "#0f172a", fontWeight: 800 }}>
                                ৳ {fmt(item.totalBill || item.amount)}
                              </span>
                              {item.payment > 0 && (
                                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#059669", marginTop: "1px" }}>
                                  + ৳ {fmt(item.payment)}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="ae-amount-text none" style={{ color: "#0f172a", fontWeight: 800 }}>
                              ৳ {fmt(item.amount)}
                            </span>
                          )}
                        </td>
                        {moduleFilter !== "all" && (
                          <td>
                            <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#1e293b" }}>
                              {item.method || "Cash"}
                            </div>
                            {item.fromBank && item.toBank && (
                              <div className="ae-bank-sub" title={`${item.fromBank} → ${item.toBank}`}>
                                {item.fromBank} → {item.toBank}
                              </div>
                            )}
                          </td>
                        )}
                        <td style={{ textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            className={`ae-status-btn ${isApproved ? "approved" : "pending"}`}
                            onClick={() => handleToggleStatus(item)}
                            disabled={busy}
                            title={
                              isApproved
                                ? `Approved by: ${item.approvedBy || "Admin"}${item.approvedAt ? ` on ${item.approvedAt}` : ""}. Click to change to Pending.`
                                : "Pending Approval. Click to Approve now."
                            }
                          >
                            {isApproved ? (
                              <>
                                <CheckIcon size={12} /> Approved
                              </>
                            ) : (
                              <>
                                <ClockIcon size={12} /> Pending
                              </>
                            )}
                          </button>
                        </td>
                        <td style={{ textAlign: "center", whiteSpace: "nowrap" }}>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "3px 9px",
                              borderRadius: "6px",
                              fontSize: "0.78rem",
                              fontWeight: 700,
                              background: "#f1f5f9",
                              color: "#334155",
                              border: "1px solid #e2e8f0",
                            }}
                          >
                            {item.entryBy || item.approvedBy || "Admin"}
                          </span>
                        </td>
                        {moduleFilter !== "all" && (
                          <td onClick={(e) => e.stopPropagation()}>
                            <div className="ae-actions-cell">
                              <button
                                type="button"
                                className="ae-icon-btn edit"
                                onClick={() => handleOpenEdit(item)}
                                title="Edit Entry"
                              >
                                <EditIcon size={14} />
                              </button>
                              <button
                                type="button"
                                className="ae-icon-btn delete"
                                onClick={() => handleDelete(item)}
                                title="Delete Entry"
                              >
                                <TrashIcon size={14} />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
              {moduleFilter === "dealer_supplier" && filteredEntries.length > 0 && (() => {
                const dsTotalBill = filteredEntries.reduce((s, r) => {
                  const isBill = r.type === "bill" || (!r.type && r.subType === "Bill") || (r.source === "dealer_supplier" && r.flow === "none");
                  return s + (isBill ? Number(r.amount || 0) : 0);
                }, 0);
                const dsTotalPaid = filteredEntries.reduce((s, r) => {
                  const isPay = r.type === "payment" || (!r.type && r.subType === "Payment") || r.flow === "out";
                  return s + (isPay ? Number(r.amount || 0) : 0);
                }, 0);
                const dsNet = dsTotalBill - dsTotalPaid;

                return (
                  <tfoot>
                    <tr style={{ background: "#f8fafc", fontWeight: 700 }}>
                      <td colSpan={6} style={{ textAlign: "right", fontWeight: 700, textTransform: "uppercase", fontSize: "0.75rem", letterSpacing: "0.02em", padding: "10px 8px" }}>
                        TOTAL ({filteredEntries.length} ENTRIES):
                      </td>
                      <td className="num" style={{ fontWeight: 800, color: "#0f172a", textAlign: "right", padding: "10px 8px", whiteSpace: "nowrap" }}>
                        ৳ {fmt(dsTotalBill)}
                      </td>
                      <td></td>
                      <td className="num" style={{ fontWeight: 800, color: "#059669", textAlign: "right", padding: "10px 8px", whiteSpace: "nowrap" }}>
                        − ৳ {fmt(dsTotalPaid)}
                      </td>
                      <td className="num" style={{ fontWeight: 800, textAlign: "right", padding: "10px 8px", whiteSpace: "nowrap" }}>
                        <span style={{ color: dsNet >= 0 ? "#dc2626" : "#059669" }}>
                          ৳ {fmt(dsNet)}
                        </span>
                      </td>
                      <td></td>
                      <td></td>
                    </tr>
                  </tfoot>
                );
              })()}

              {moduleFilter === "expense" && filteredEntries.length > 0 && (() => {
                const actualExpenses = filteredEntries.filter((x) => !isDepositCategory(x.category || x.subType));
                const totalActual = actualExpenses.reduce((s, x) => s + Number(x.amount || 0), 0);
                const deposits = filteredEntries.filter((x) => isDepositCategory(x.category || x.subType));
                const totalDep = deposits.reduce((s, x) => s + Number(x.amount || 0), 0);

                return (
                  <tfoot className="ex-tfoot">
                    <tr className="ex-tfoot-expense">
                      <td colSpan={5} style={{ color: "#0f172a", padding: "12px 10px" }}>
                        <strong>ACTUAL BUSINESS EXPENSES ({actualExpenses.length} entries)</strong>
                      </td>
                      <td style={{ textAlign: "right", color: "#0f172a", fontWeight: 800, padding: "12px 10px", whiteSpace: "nowrap" }}>
                        ৳ {fmt(totalActual)}
                      </td>
                      <td colSpan={3}></td>
                    </tr>
                    {totalDep > 0 && (
                      <tr className="ex-tfoot-deposit">
                        <td colSpan={5} style={{ color: "#166534", padding: "12px 10px" }}>
                          <strong style={{ color: "#166534" }}>BANK DEPOSITS / FUND TRANSFERS ({deposits.length} entries)</strong>
                          <span style={{ fontSize: "0.75rem", marginLeft: 8, color: "#15803d", fontWeight: 500 }}>(Excluded from expense to prevent double counting)</span>
                        </td>
                        <td style={{ textAlign: "right", fontWeight: 800, color: "#15803d", padding: "12px 10px", whiteSpace: "nowrap" }}>
                          ৳ {fmt(totalDep)}
                        </td>
                        <td colSpan={3}></td>
                      </tr>
                    )}
                  </tfoot>
                );
              })()}

              {moduleFilter === "recycle_bin" && filteredRecycleBin.length > 0 && (() => {
                const totalAmount = filteredRecycleBin.reduce((s, r) => s + Number(r.amount || 0), 0);
                return (
                  <tfoot>
                    <tr style={{ background: "#fef2f2", fontWeight: 700, borderTop: "2px solid #fecaca" }}>
                      <td colSpan={6} style={{ textAlign: "right", fontWeight: 800, textTransform: "uppercase", fontSize: "0.8rem", color: "#991b1b", padding: "10px 8px" }}>
                        TOTAL DELETED VOLUME ({filteredRecycleBin.length} {filteredRecycleBin.length === 1 ? "ENTRY" : "ENTRIES"}):
                      </td>
                      <td className="num" style={{ fontWeight: 800, color: "#b91c1c", textAlign: "right", padding: "10px 8px", whiteSpace: "nowrap" }}>
                        ৳ {fmt(totalAmount)}
                      </td>
                      <td colSpan={3}></td>
                    </tr>
                  </tfoot>
                );
              })()}
            </table>
          </div>
        )}
      </section>

      {/* Customer Bill Pop-up Modal with Full Voucher, Order Items, Live Edit & Delete */}
      {selectedCustomerBillForModal && (() => {
        const b = selectedCustomerBillForModal;
        const balInfo = customerBalanceMap.get(b.id) || {};
        const totalBill = Number(b.totalBill || 0);
        const payment = Number(b.payment || 0);
        const dueThisBill = balInfo.dueThisBill !== undefined ? balInfo.dueThisBill : Math.max(0, totalBill - payment);
        const advanceThisBill = balInfo.advanceThisBill !== undefined ? balInfo.advanceThisBill : Math.max(0, payment - totalBill);
        const dueReceived = Number(balInfo.dueReceived || 0);
        const rBal = balInfo.runningBalance !== undefined ? balInfo.runningBalance : (b.due || 0);
        const prev = balInfo.prevBalance || 0;
        const items = Array.isArray(b.items) ? b.items : [];
        const itemsSubtotal = items.reduce((sum, it) => sum + (Number(it.subtotal) || 0), 0);

        return (
          <div
            className="be-modal-overlay"
            onClick={() => {
              if (isEditingCustomerModal && !confirm("Discard unsaved changes?")) return;
              setSelectedCustomerBillForModal(null);
              setIsEditingCustomerModal(false);
              setEditCustomerModalData(null);
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
                  background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
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
                        background: isEditingCustomerModal ? "#f59e0b" : "rgba(255,255,255,0.15)",
                        color: isEditingCustomerModal ? "#000000" : "#ffffff",
                        padding: "2px 8px",
                        borderRadius: "6px",
                        fontSize: "0.72rem",
                        fontWeight: 800,
                        letterSpacing: "0.05em",
                        textTransform: "uppercase",
                      }}
                    >
                      {isEditingCustomerModal ? "✏️ Edit Mode" : "Invoice Voucher"}
                    </span>
                    <span style={{ fontSize: "0.82rem", opacity: 0.8 }}>
                      {isEditingCustomerModal ? "Auto-Calculating Changes" : `Date: ${b.date || "—"}`}
                    </span>
                  </div>

                  {isEditingCustomerModal ? (
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginTop: "2px" }}>
                      <span style={{ fontSize: "0.9rem", fontWeight: 700 }}>Bill No:</span>
                      <input
                        type="text"
                        className="be-input"
                        style={{ width: "120px", padding: "4px 8px", fontSize: "0.88rem", background: "#ffffff", color: "#0f172a", borderRadius: "6px" }}
                        value={editCustomerModalData?.bill_no || ""}
                        placeholder="Bill #"
                        onChange={(e) => setEditCustomerModalData({ ...editCustomerModalData, bill_no: e.target.value })}
                      />
                      <span style={{ fontSize: "0.9rem", fontWeight: 700, marginLeft: "4px" }}>Date:</span>
                      <input
                        type="date"
                        className="be-input"
                        style={{ width: "135px", padding: "4px 8px", fontSize: "0.84rem", background: "#ffffff", color: "#0f172a", borderRadius: "6px" }}
                        value={editCustomerModalData?.bill_date || ""}
                        onChange={(e) => setEditCustomerModalData({ ...editCustomerModalData, bill_date: e.target.value })}
                      />
                    </div>
                  ) : (
                    <h2 style={{ margin: 0, fontSize: "1.35rem", fontWeight: 800, letterSpacing: "-0.02em" }}>
                      Bill #{b.billNo && b.billNo !== "—" ? b.billNo : "N/A"}
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
                      background: (isEditingCustomerModal ? editCustomerRunningBalance : rBal) >= 0.005
                        ? "rgba(220, 38, 38, 0.2)"
                        : (isEditingCustomerModal ? editCustomerRunningBalance : rBal) <= -0.005
                          ? "rgba(16, 185, 129, 0.2)"
                          : "rgba(148, 163, 184, 0.2)",
                      color: (isEditingCustomerModal ? editCustomerRunningBalance : rBal) >= 0.005
                        ? "#fca5a5"
                        : (isEditingCustomerModal ? editCustomerRunningBalance : rBal) <= -0.005
                          ? "#6ee7b7"
                          : "#cbd5e1",
                      border: `1px solid ${(isEditingCustomerModal ? editCustomerRunningBalance : rBal) >= 0.005 ? "rgba(220, 38, 38, 0.4)" : (isEditingCustomerModal ? editCustomerRunningBalance : rBal) <= -0.005 ? "rgba(16, 185, 129, 0.4)" : "rgba(148, 163, 184, 0.4)"}`,
                    }}
                  >
                    {isEditingCustomerModal
                      ? editCustomerRunningBalance >= 0.005
                        ? `Live Due: ৳ ${fmt(editCustomerRunningBalance)}`
                        : editCustomerRunningBalance <= -0.005
                          ? `Live Adv: ৳ ${fmt(Math.abs(editCustomerRunningBalance))}`
                          : "Live: Settled"
                      : rBal >= 0.005
                        ? `Due: ৳ ${fmt(rBal)}`
                        : rBal <= -0.005
                          ? `Adv: ৳ ${fmt(Math.abs(rBal))}`
                          : "Fully Settled"}
                  </div>

                  {!isEditingCustomerModal && (
                    <button
                      type="button"
                      onClick={handleDeleteFromCustomerModal}
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
                      <TrashIcon size={15} />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      if (isEditingCustomerModal && !confirm("Discard unsaved changes?")) return;
                      setSelectedCustomerBillForModal(null);
                      setIsEditingCustomerModal(false);
                      setEditCustomerModalData(null);
                      setModalEditErr("");
                    }}
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

              {/* Scrollable Modal Body */}
              <div style={{ padding: "18px 24px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: "16px" }}>
                {modalEditErr && (
                  <div style={{ background: "#fee2e2", color: "#b91c1c", padding: "10px 14px", borderRadius: "8px", fontSize: "0.84rem", fontWeight: 700 }}>
                    {modalEditErr}
                  </div>
                )}

                {/* Customer Info Card */}
                {isEditingCustomerModal ? (
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
                        value={editCustomerModalData?.customer_name || ""}
                        onChange={(e) => setEditCustomerModalData({ ...editCustomerModalData, customer_name: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "0.72rem", color: "#92400e", textTransform: "uppercase", fontWeight: 800, marginBottom: "3px" }}>
                        Customer Mobile *
                      </label>
                      <input
                        type="text"
                        className="be-input"
                        value={editCustomerModalData?.customer_mobile || ""}
                        onChange={(e) => setEditCustomerModalData({ ...editCustomerModalData, customer_mobile: e.target.value })}
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
                        style={{ fontFamily: "monospace", color: "#2563eb", fontWeight: 700 }}
                        value={editCustomerModalData?.customer_id || ""}
                        onChange={(e) => setEditCustomerModalData({ ...editCustomerModalData, customer_id: e.target.value })}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "0.72rem", color: "#92400e", textTransform: "uppercase", fontWeight: 800, marginBottom: "3px" }}>
                        Address
                      </label>
                      <input
                        type="text"
                        className="be-input"
                        value={editCustomerModalData?.customer_address || ""}
                        onChange={(e) => setEditCustomerModalData({ ...editCustomerModalData, customer_address: e.target.value })}
                      />
                    </div>
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
                        {b.customerName || b.party || "—"}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: "0.72rem", color: "#64748b", textTransform: "uppercase", fontWeight: 700, marginBottom: "3px" }}>
                        Mobile Number
                      </div>
                      <div style={{ fontSize: "0.92rem", fontWeight: 700, color: "#1e293b" }}>
                        {b.customerMobile || "—"}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: "0.72rem", color: "#64748b", textTransform: "uppercase", fontWeight: 700, marginBottom: "3px" }}>
                        Customer ID
                      </div>
                      <div style={{ fontFamily: "monospace", fontSize: "0.85rem", fontWeight: 700, color: "#2563eb" }}>
                        {b.customerId || "—"}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: "0.72rem", color: "#64748b", textTransform: "uppercase", fontWeight: 700, marginBottom: "3px" }}>
                        Address
                      </div>
                      <div style={{ fontSize: "0.85rem", color: "#334155" }}>
                        {b.customerAddress || "—"}
                      </div>
                    </div>
                  </div>
                )}

                {/* Items Section */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <h3 style={{ margin: 0, fontSize: "0.92rem", fontWeight: 800, color: "#1e293b", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                      Ordered Items ({isEditingCustomerModal ? editCustomerModalData?.items?.length || 0 : items.length})
                    </h3>

                    {isEditingCustomerModal && (
                      <button
                        type="button"
                        onClick={handleCustomerModalAddItem}
                        className="be-btn-ghost"
                        style={{ fontSize: "0.78rem", padding: "4px 10px", color: "#2563eb", background: "#eff6ff", borderRadius: "6px", fontWeight: 700, border: "1px solid #bfdbfe", cursor: "pointer" }}
                      >
                        + Add Item
                      </button>
                    )}
                  </div>

                  {isEditingCustomerModal ? (
                    <div style={{ overflowX: "auto", border: "1px solid #cbd5e1", borderRadius: "10px", background: "#ffffff" }}>
                      <datalist id="all-entries-modal-presets">
                        {ITEM_PRESETS.map((p) => (
                          <option key={p} value={p} />
                        ))}
                      </datalist>
                      <datalist id="all-entries-unit-presets">
                        <option value="pcs" />
                        <option value="kg" />
                        <option value="sft" />
                        <option value="rft" />
                        <option value="meter" />
                        <option value="roll" />
                        <option value="box" />
                        <option value="trip" />
                        <option value="set" />
                        <option value="nos" />
                        <option value="ton" />
                        <option value="bundle" />
                        <option value="coil" />
                      </datalist>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                        <thead>
                          <tr style={{ background: "#f1f5f9", borderBottom: "1px solid #e2e8f0", color: "#475569", textTransform: "uppercase", fontSize: "0.72rem" }}>
                            <th style={{ padding: "8px 10px", width: "30px", textAlign: "center" }}>#</th>
                            <th style={{ padding: "8px 10px", minWidth: "150px" }}>Item Description</th>
                            <th style={{ padding: "8px 10px", width: "135px" }}>Item Note</th>
                            <th style={{ padding: "8px 10px", width: "95px", textAlign: "right" }}>Quantity</th>
                            <th style={{ padding: "8px 10px", width: "80px", textAlign: "center" }}>Unit</th>
                            <th style={{ padding: "8px 10px", width: "85px", textAlign: "right" }}>Rate (৳)</th>
                            <th style={{ padding: "8px 10px", width: "110px", textAlign: "right" }}>Subtotal (৳)</th>
                            <th style={{ padding: "8px 10px", width: "40px", textAlign: "center" }}>✕</th>
                          </tr>
                        </thead>
                        <tbody>
                          {editCustomerModalData?.items?.map((it, i) => (
                            <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                              <td style={{ padding: "6px 8px", textAlign: "center", color: "#94a3b8", fontWeight: 700 }}>
                                {i + 1}
                              </td>
                              <td style={{ padding: "6px 8px" }}>
                                <input
                                  type="text"
                                  list="all-entries-modal-presets"
                                  className="be-input"
                                  style={{ padding: "5px 8px", fontSize: "0.82rem" }}
                                  value={it.name}
                                  placeholder="Item name"
                                  onChange={(e) => handleCustomerModalItemChange(i, "name", e.target.value)}
                                />
                              </td>
                              <td style={{ padding: "6px 8px" }}>
                                <input
                                  type="text"
                                  className="be-input"
                                  style={{ padding: "5px 8px", fontSize: "0.82rem" }}
                                  value={it.note || ""}
                                  placeholder="Note / specs"
                                  onChange={(e) => handleCustomerModalItemChange(i, "note", e.target.value)}
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
                                  onChange={(e) => handleCustomerModalItemChange(i, "quantity", e.target.value)}
                                />
                              </td>
                              <td style={{ padding: "6px 8px" }}>
                                <input
                                  type="text"
                                  className="be-input"
                                  list="all-entries-unit-presets"
                                  style={{ padding: "5px 8px", fontSize: "0.82rem", textAlign: "center" }}
                                  value={it.unit || ""}
                                  placeholder="pcs"
                                  onChange={(e) => handleCustomerModalItemChange(i, "unit", e.target.value)}
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
                                  onChange={(e) => handleCustomerModalItemChange(i, "rate", e.target.value)}
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
                                  onChange={(e) => handleCustomerModalItemChange(i, "subtotal", e.target.value)}
                                />
                              </td>
                              <td style={{ padding: "6px 8px", textAlign: "center" }}>
                                <button
                                  type="button"
                                  onClick={() => handleCustomerModalRemoveItem(i)}
                                  disabled={editCustomerModalData?.items?.length <= 1}
                                  className="be-del-row-btn"
                                  style={{ width: "26px", height: "26px", opacity: editCustomerModalData?.items?.length <= 1 ? 0.3 : 1 }}
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
                      <datalist id="all-entries-unit-presets">
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
                              <td style={{ padding: "9px 12px", color: "#0f172a" }}>
                                <div style={{ fontWeight: 700 }}>{it.name || "—"}</div>
                                {it.note && (
                                  <div style={{ fontSize: "0.76rem", color: "#64748b", marginTop: "2px", display: "inline-flex", alignItems: "center", gap: 4, background: "#f8fafc", padding: "1px 6px", borderRadius: "4px", border: "1px solid #e2e8f0" }}>
                                    <span style={{ color: "#94a3b8" }}>Note:</span> {it.note}
                                  </div>
                                )}
                              </td>
                              <td style={{ padding: "9px 12px", textAlign: "right", color: "#475569" }}>
                                {it.quantity !== undefined && it.quantity !== "" ? it.quantity : (it.weight || "—")}
                              </td>
                              <td style={{ padding: "9px 12px", textAlign: "center", color: "#475569" }}>
                                {it.unit || (it.weight ? "kg" : "pcs")}
                              </td>
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

                {/* Financial Summary & Breakdown */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
                  {/* Left: Charges Breakdown */}
                  <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "14px 16px", display: "flex", flexDirection: "column", gap: "8px", fontSize: "0.85rem" }}>
                    <div style={{ fontSize: "0.74rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase", borderBottom: "1px solid #f1f5f9", paddingBottom: "6px" }}>
                      Bill Calculation {isEditingCustomerModal && <span style={{ color: "#16a34a" }}>• (Auto-Computed)</span>}
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "#475569" }}>
                      <span>Items Subtotal:</span>
                      <span style={{ fontWeight: 700, color: "#0f172a" }}>
                        ৳ {fmt(isEditingCustomerModal ? editCustomerItemsSubtotal : itemsSubtotal)}
                      </span>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "#475569" }}>
                      <span>Labour Charge (+):</span>
                      {isEditingCustomerModal ? (
                        <input
                          type="number"
                          step="any"
                          className="be-input"
                          style={{ width: "120px", padding: "4px 8px", fontSize: "0.85rem", textAlign: "right" }}
                          value={editCustomerModalData?.labour_charge || ""}
                          placeholder="0.00"
                          onChange={(e) => setEditCustomerModalData({ ...editCustomerModalData, labour_charge: e.target.value })}
                        />
                      ) : (
                        <span>৳ {fmt(b.labourCharge || 0)}</span>
                      )}
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "#475569" }}>
                      <span>Transportation Cost (+):</span>
                      {isEditingCustomerModal ? (
                        <input
                          type="number"
                          step="any"
                          className="be-input"
                          style={{ width: "120px", padding: "4px 8px", fontSize: "0.85rem", textAlign: "right" }}
                          value={editCustomerModalData?.transport_cost || ""}
                          placeholder="0.00"
                          onChange={(e) => setEditCustomerModalData({ ...editCustomerModalData, transport_cost: e.target.value })}
                        />
                      ) : (
                        <span>৳ {fmt(b.transportCost || 0)}</span>
                      )}
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "#b91c1c" }}>
                      <span>Discount (-):</span>
                      {isEditingCustomerModal ? (
                        <input
                          type="number"
                          step="any"
                          className="be-input"
                          style={{ width: "120px", padding: "4px 8px", fontSize: "0.85rem", textAlign: "right", color: "#b91c1c", fontWeight: 700 }}
                          value={editCustomerModalData?.discount || ""}
                          placeholder="0.00"
                          onChange={(e) => setEditCustomerModalData({ ...editCustomerModalData, discount: e.target.value })}
                        />
                      ) : (
                        <span style={{ fontWeight: 700 }}>৳ {fmt(b.discount || 0)}</span>
                      )}
                    </div>

                    <div style={{ borderTop: "1px dashed #cbd5e1", paddingTop: "8px", marginTop: "4px", display: "flex", justifyContent: "space-between", alignItems: "center", fontWeight: 800 }}>
                      <span style={{ color: "#1e293b" }}>Total Bill Amount:</span>
                      <span style={{ color: "#0f172a", fontSize: "1.05rem" }}>
                        ৳ {fmt(isEditingCustomerModal ? editCustomerTotalBill : totalBill)}
                      </span>
                    </div>
                  </div>

                  {/* Right: Payment & Balance Status */}
                  <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "14px 16px", display: "flex", flexDirection: "column", gap: "8px", fontSize: "0.85rem" }}>
                    <div style={{ fontSize: "0.74rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase", borderBottom: "1px solid #e2e8f0", paddingBottom: "6px" }}>
                      Payment & Statement {isEditingCustomerModal && <span style={{ color: "#16a34a" }}>• (Live)</span>}
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "#059669", fontWeight: 700 }}>
                      <span>Client Payment Received:</span>
                      {isEditingCustomerModal ? (
                        <input
                          type="number"
                          step="any"
                          className="be-input"
                          style={{ width: "120px", padding: "4px 8px", fontSize: "0.85rem", textAlign: "right", fontWeight: 700, color: "#059669" }}
                          value={editCustomerModalData?.client_payment || ""}
                          placeholder="0.00"
                          onChange={(e) => setEditCustomerModalData({ ...editCustomerModalData, client_payment: e.target.value })}
                        />
                      ) : (
                        <span>৳ {fmt(payment)}</span>
                      )}
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", color: "#dc2626" }}>
                      <span>Due for this bill:</span>
                      <span style={{ fontWeight: 700 }}>
                        ৳ {fmt(isEditingCustomerModal ? (editCustomerDueAdvance >= 0.005 ? editCustomerDueAdvance : 0) : dueThisBill)}
                      </span>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", color: "#059669" }}>
                      <span>Advance for this bill:</span>
                      <span style={{ fontWeight: 700 }}>
                        ৳ {fmt(isEditingCustomerModal ? (editCustomerDueAdvance <= -0.005 ? Math.abs(editCustomerDueAdvance) : 0) : advanceThisBill)}
                      </span>
                    </div>

                    {dueReceived >= 0.005 && !isEditingCustomerModal && (
                      <div style={{ display: "flex", justifyContent: "space-between", color: "#2563eb" }}>
                        <span>Due Received:</span>
                        <span style={{ fontWeight: 700 }}>৳ {fmt(dueReceived)}</span>
                      </div>
                    )}

                    {Math.abs(prev) >= 0.005 && (
                      <div style={{ display: "flex", justifyContent: "space-between", color: "#64748b", fontSize: "0.8rem" }}>
                        <span>Previous Balance:</span>
                        <span style={{ fontWeight: 600, color: prev >= 0.005 ? "#dc2626" : "#059669" }}>
                          {prev >= 0.005 ? `Due ৳ ${fmt(prev)}` : `Adv ৳ ${fmt(Math.abs(prev))}`}
                        </span>
                      </div>
                    )}

                    <div
                      style={{
                        borderTop: "1px solid #e2e8f0",
                        paddingTop: "8px",
                        marginTop: "4px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        fontWeight: 800,
                        fontSize: "0.95rem",
                        color: (isEditingCustomerModal ? editCustomerRunningBalance : rBal) >= 0.005
                          ? "#dc2626"
                          : (isEditingCustomerModal ? editCustomerRunningBalance : rBal) <= -0.005
                            ? "#059669"
                            : "#475569",
                      }}
                    >
                      <span>Final Net Balance:</span>
                      <span>
                        {(isEditingCustomerModal ? editCustomerRunningBalance : rBal) >= 0.005
                          ? `Due: ৳ ${fmt(isEditingCustomerModal ? editCustomerRunningBalance : rBal)}`
                          : (isEditingCustomerModal ? editCustomerRunningBalance : rBal) <= -0.005
                            ? `Adv: ৳ ${fmt(Math.abs(isEditingCustomerModal ? editCustomerRunningBalance : rBal))}`
                            : "Fully Settled"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Remarks / Note */}
                <div>
                  <label style={{ display: "block", fontSize: "0.74rem", fontWeight: 800, color: "#64748b", textTransform: "uppercase", marginBottom: "4px" }}>
                    Remarks / Special Note
                  </label>
                  {isEditingCustomerModal ? (
                    <input
                      type="text"
                      className="be-input"
                      placeholder="Optional remarks or customer notes..."
                      value={editCustomerModalData?.note || ""}
                      onChange={(e) => setEditCustomerModalData({ ...editCustomerModalData, note: e.target.value })}
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
                  Record ID: #{b.id} {isEditingCustomerModal && <span style={{ color: "#d97706", fontWeight: 700 }}>(Unsaved edits)</span>}
                </div>

                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  {isEditingCustomerModal ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm("Discard unsaved changes?")) {
                            setIsEditingCustomerModal(false);
                            setEditCustomerModalData(null);
                            setModalEditErr("");
                          }
                        }}
                        className="be-btn"
                        disabled={modalEditBusy}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveCustomerModalEdit}
                        className="be-btn be-btn-primary"
                        disabled={modalEditBusy}
                        style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                      >
                        {modalEditBusy ? "Saving..." : "Save Changes"}
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => startEditingCustomerModal(b)}
                        className="be-btn be-btn-primary"
                        style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.85rem", padding: "8px 16px" }}
                      >
                        <EditIcon size={14} /> Edit Bill
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCustomerBillForModal(null);
                          setIsEditingCustomerModal(false);
                          setEditCustomerModalData(null);
                        }}
                        className="be-btn"
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

      {/* Purchase (Dealer / Supplier) Pop-up Modal with Full Voucher, Purchased Items, Live Edit & Delete */}
      {selectedPurchaseEntryForModal && (() => {
        const b = selectedPurchaseEntryForModal;
        const isBill = b.type === "bill" || (!b.type && b.subType === "Bill") || (b.source === "dealer_supplier" && b.flow === "none");
        const items = Array.isArray(b.items) ? b.items : [];
        const itemsSubtotal = items.reduce((sum, it) => sum + (Number(it.subtotal) || 0), 0);
        const balInfo = dealerSupplierBalanceMap.get(b.uid) || dealerSupplierBalanceMap.get(b.id) || {};
        const rBal = balInfo.runningBalance !== undefined ? balInfo.runningBalance : Number(b.amount || 0);
        const isApproved = (b.status || "pending") === "approved";

        return (
          <div
            className="be-modal-overlay"
            style={{ zIndex: 1200, padding: "16px" }}
            onClick={() => {
              if (isEditingPurchaseModal && !confirm("Discard unsaved changes?")) return;
              setSelectedPurchaseEntryForModal(null);
              setIsEditingPurchaseModal(false);
              setEditPurchaseModalData(null);
              setPurchaseModalErr("");
            }}
          >
            <div
              className="be-modal-box"
              style={{
                maxWidth: "820px",
                width: "100%",
                maxHeight: "92vh",
                display: "flex",
                flexDirection: "column",
                padding: 0,
                borderRadius: "16px",
                overflow: "hidden",
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                background: "#ffffff",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Executive Dark Header matching Purchase Page */}
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
                      background: isEditingPurchaseModal
                        ? "#f59e0b"
                        : isBill
                          ? "#e11d48"
                          : "#059669",
                      color: isEditingPurchaseModal ? "#000000" : "#ffffff",
                      padding: "3px 9px",
                      borderRadius: "6px",
                      fontSize: "0.72rem",
                      fontWeight: 800,
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                    }}
                  >
                    {isEditingPurchaseModal
                      ? "✏️ Edit Mode"
                      : isBill
                        ? "Purchase Bill Voucher"
                        : "Payment Voucher"}
                  </span>
                  <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, color: "#fff" }}>
                    {isBill
                      ? b.billNo && b.billNo !== "—"
                        ? `Bill #${b.billNo}`
                        : "Bill Voucher"
                      : "Payment Voucher"}
                  </h3>
                  <span style={{ fontSize: "0.85rem", opacity: 0.85 }}>
                    ({b.party || b.client_name || "Dealer"})
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (isEditingPurchaseModal && !confirm("Discard unsaved changes?")) return;
                    setSelectedPurchaseEntryForModal(null);
                    setIsEditingPurchaseModal(false);
                    setEditPurchaseModalData(null);
                    setPurchaseModalErr("");
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
                  <XIcon size={16} />
                </button>
              </div>

              {/* Modal Body */}
              <div style={{ padding: "20px 22px", overflowY: "auto", flex: 1, maxHeight: "calc(92vh - 140px)" }}>
                {!isEditingPurchaseModal ? (
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
                        <div style={{ fontWeight: 700, color: "#0f172a", marginTop: 2 }}>{b.date || "—"}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>Bill No.</div>
                        <div style={{ fontWeight: 700, color: "#0f172a", marginTop: 2 }}>
                          {b.billNo && b.billNo !== "—" ? `#${b.billNo}` : "—"}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>Party / Client</div>
                        <div style={{ fontWeight: 700, color: "#0f172a", marginTop: 2 }}>
                          {b.party || b.client_name || "—"}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>Type</div>
                        <div style={{ fontWeight: 700, marginTop: 2, color: isBill ? "#e11d48" : "#059669" }}>
                          {isBill ? "Purchase Bill" : "Payment"}
                        </div>
                      </div>
                    </div>

                    {/* BILL DETAILS */}
                    {isBill ? (
                      <>
                        {items.length > 0 ? (
                          <div style={{ marginBottom: 18 }}>
                            <h4 style={{ margin: "0 0 8px 0", fontSize: "0.95rem", fontWeight: 700, color: "#1e293b" }}>
                              Purchased Items ({items.length})
                            </h4>
                            <div style={{ border: "1px solid #cbd5e1", borderRadius: "10px", overflow: "hidden" }}>
                              <table style={{ minWidth: "100%", width: "100%", borderCollapse: "collapse" }}>
                                <thead>
                                  <tr style={{ background: "#f8fafc", borderBottom: "2px solid #cbd5e1" }}>
                                    <th style={{ width: "45px", padding: "10px 12px", fontSize: "0.78rem", fontWeight: 700, color: "#475569", textTransform: "uppercase", textAlign: "left" }}>SL</th>
                                    <th style={{ padding: "10px 12px", fontSize: "0.78rem", fontWeight: 700, color: "#475569", textTransform: "uppercase", textAlign: "left" }}>Item Description</th>
                                    <th style={{ width: "95px", textAlign: "right", padding: "10px 12px", fontSize: "0.78rem", fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>Quantity</th>
                                    <th style={{ width: "75px", textAlign: "center", padding: "10px 12px", fontSize: "0.78rem", fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>Unit</th>
                                    <th style={{ width: "95px", textAlign: "right", padding: "10px 12px", fontSize: "0.78rem", fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>Rate (৳)</th>
                                    <th style={{ width: "115px", textAlign: "right", padding: "10px 12px", fontSize: "0.78rem", fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>Subtotal (৳)</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {items.map((it, idx) => (
                                    <tr key={idx} style={{ borderBottom: idx < items.length - 1 ? "1px solid #f1f5f9" : "none" }}>
                                      <td style={{ color: "#64748b", padding: "9px 12px" }}>{idx + 1}</td>
                                      <td style={{ fontWeight: 600, color: "#0f172a", padding: "9px 12px" }}>{it.name || "Item"}</td>
                                      <td style={{ textAlign: "right", padding: "9px 12px" }}>
                                        {it.quantity !== undefined && it.quantity !== "" ? fmt(it.quantity) : (it.weight != null && it.weight !== "" ? fmt(it.weight) : "—")}
                                      </td>
                                      <td style={{ textAlign: "center", color: "#64748b", padding: "9px 12px" }}>
                                        {it.unit || (it.weight ? "kg" : "pcs")}
                                      </td>
                                      <td style={{ textAlign: "right", padding: "9px 12px" }}>{it.rate != null && it.rate !== "" ? `৳ ${fmt(it.rate)}` : "—"}</td>
                                      <td style={{ textAlign: "right", fontWeight: 700, padding: "9px 12px", color: "#0f172a" }}>{it.subtotal != null && it.subtotal !== "" ? `৳ ${fmt(it.subtotal)}` : "—"}</td>
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
                              <span style={{ fontWeight: 700, color: "#0f172a" }}>{b.note || "General Bill"}</span>
                            </div>
                            {b.weight != null && (
                              <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span style={{ color: "#64748b", fontWeight: 600 }}>Weight:</span>
                                <span style={{ fontWeight: 700, color: "#0f172a" }}>{fmt(b.weight)} kg</span>
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
                          {(Number(b.labour_cost || b.labourCost) > 0) && (
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.88rem" }}>
                              <span style={{ color: "#64748b" }}>Labour / Handling Charge:</span>
                              <span style={{ fontWeight: 600, color: "#0f172a" }}>+ ৳ {fmt(b.labour_cost || b.labourCost)}</span>
                            </div>
                          )}
                          {(Number(b.transport_cost || b.transportCost) > 0) && (
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.88rem" }}>
                              <span style={{ color: "#64748b" }}>Transport / Delivery Cost:</span>
                              <span style={{ fontWeight: 600, color: "#0f172a" }}>+ ৳ {fmt(b.transport_cost || b.transportCost)}</span>
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
                              + ৳ {fmt(b.amount)}
                            </span>
                          </div>
                        </div>
                      </>
                    ) : (
                      /* PAYMENT DETAILS */
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
                          <span style={{ color: "#065f46", fontWeight: 700, fontSize: "1rem" }}>Payment Paid to Party:</span>
                          <span style={{ fontSize: "1.5rem", fontWeight: 800, color: "#059669" }}>
                            − ৳ {fmt(b.amount)}
                          </span>
                        </div>

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #e2e8f0", paddingTop: 10 }}>
                          <span style={{ color: "#64748b", fontWeight: 600 }}>Payment Method:</span>
                          <span
                            style={{
                              fontWeight: 700,
                              color: "#0f172a",
                              background: "#f1f5f9",
                              padding: "4px 10px",
                              borderRadius: 6,
                              fontSize: "0.85rem",
                              border: "1px solid #cbd5e1",
                            }}
                          >
                            {b.fromBank && b.toBank
                              ? `${b.fromBank} → ${b.toBank}`
                              : b.fromBank || b.toBank || b.method || "Cash / Direct"}
                          </span>
                        </div>

                        {b.billNo && b.billNo !== "—" && (
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #e2e8f0", paddingTop: 10 }}>
                            <span style={{ color: "#64748b", fontWeight: 600 }}>Against Bill No:</span>
                            <span style={{ fontWeight: 700, color: "#0f172a" }}>#{b.billNo}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Note Section */}
                    {b.note && (
                      <div style={{ marginTop: 14, background: "#f8fafc", padding: "10px 14px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: "0.85rem", color: "#475569" }}>
                        <span style={{ fontWeight: 700, color: "#1e293b", marginRight: 6 }}>Note:</span>
                        {b.note}
                      </div>
                    )}

                    {/* Audit & Approval Status Bar */}
                    <div
                      style={{
                        marginTop: 16,
                        padding: "12px 16px",
                        background: isApproved ? "#f0fdf4" : "#fffbeb",
                        border: `1px solid ${isApproved ? "#bbf7d0" : "#fde68a"}`,
                        borderRadius: "10px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: 10,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: "0.85rem", fontWeight: 700, color: isApproved ? "#166534" : "#92400e" }}>
                          Status: {isApproved ? "Approved" : "Pending Approval"}
                        </span>
                        <span style={{ fontSize: "0.78rem", color: "#64748b" }}>
                          (Recorded by: {b.entryBy || b.approvedBy || "Admin"})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          await handleToggleStatus(b);
                          setSelectedPurchaseEntryForModal((prev) => prev ? { ...prev, status: isApproved ? "pending" : "approved" } : null);
                        }}
                        disabled={busy}
                        style={{
                          background: isApproved ? "#fef2f2" : "#15803d",
                          border: `1px solid ${isApproved ? "#fca5a5" : "#15803d"}`,
                          color: isApproved ? "#b91c1c" : "#ffffff",
                          padding: "5px 12px",
                          borderRadius: "6px",
                          fontSize: "0.78rem",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        {isApproved ? "Mark as Pending" : "✓ Approve Entry"}
                      </button>
                    </div>

                    {/* Modal Footer Buttons */}
                    <div
                      style={{
                        background: "#f8fafc",
                        borderTop: "1px solid #e2e8f0",
                        padding: "14px 22px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 10,
                        margin: "18px -22px -20px -22px",
                      }}
                    >
                      <button
                        type="button"
                        onClick={handleDeleteFromPurchaseModal}
                        disabled={busy}
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
                        <TrashIcon size={14} /> Delete Entry
                      </button>

                      <div style={{ display: "flex", gap: 10 }}>
                        <button
                          type="button"
                          style={{
                            background: "#ffffff",
                            border: "1px solid #cbd5e1",
                            color: "#475569",
                            padding: "8px 16px",
                            borderRadius: "8px",
                            fontSize: "0.84rem",
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                          onClick={() => {
                            setSelectedPurchaseEntryForModal(null);
                            setIsEditingPurchaseModal(false);
                            setEditPurchaseModalData(null);
                          }}
                        >
                          Close
                        </button>
                        <button
                          type="button"
                          style={{
                            background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                            border: "none",
                            color: "#ffffff",
                            padding: "8px 18px",
                            borderRadius: "8px",
                            fontSize: "0.84rem",
                            fontWeight: 700,
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            boxShadow: "0 2px 4px rgba(37,99,235,0.2)",
                          }}
                          onClick={() => startEditingPurchaseModal(b)}
                        >
                          <EditIcon size={14} /> Edit Entry
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* EDIT MODE */
                  <div>
                    {purchaseModalErr && (
                      <div style={{ background: "#fee2e2", border: "1px solid #fecaca", color: "#dc2626", padding: "8px 12px", borderRadius: 8, marginBottom: 14, fontSize: "0.85rem", fontWeight: 600 }}>
                        {purchaseModalErr}
                      </div>
                    )}

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                      <div>
                        <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#475569" }}>Date</label>
                        <input
                          type="date"
                          className="be-input"
                          value={editPurchaseModalData.entry_date}
                          onChange={(e) => setEditPurchaseModalData({ ...editPurchaseModalData, entry_date: e.target.value })}
                          style={{ marginTop: 4 }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#475569" }}>
                          {editPurchaseModalData.type === "bill" ? "Bill No." : "Against Bill No (Optional)"}
                        </label>
                        <input
                          type="text"
                          className="be-input"
                          placeholder="e.g. B-105"
                          value={editPurchaseModalData.bill_no}
                          onChange={(e) => setEditPurchaseModalData({ ...editPurchaseModalData, bill_no: e.target.value })}
                          style={{ marginTop: 4 }}
                        />
                      </div>
                    </div>

                    {editPurchaseModalData.type === "bill" ? (
                      <>
                        {/* Items Editor */}
                        {Array.isArray(editPurchaseModalData.items) && editPurchaseModalData.items.length > 0 ? (
                          <div style={{ marginBottom: 14 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                              <label style={{ fontSize: "0.85rem", fontWeight: 700, color: "#1e293b", margin: 0 }}>
                                Purchased Items
                              </label>
                              <button
                                type="button"
                                onClick={addPurchaseEditItem}
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
                              {editPurchaseModalData.items.map((it, idx) => (
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
                                    className="be-input"
                                    placeholder="Item name"
                                    value={it.name}
                                    onChange={(e) => updatePurchaseEditItem(idx, "name", e.target.value)}
                                    list="item-presets-list"
                                    style={{ padding: "6px 8px", fontSize: "0.82rem" }}
                                  />
                                  <input
                                    type="number"
                                    step="any"
                                    className="be-input"
                                    placeholder="Quantity"
                                    value={it.quantity !== undefined && it.quantity !== "" ? it.quantity : (it.weight || "")}
                                    onChange={(e) => updatePurchaseEditItem(idx, "quantity", e.target.value)}
                                    style={{ padding: "6px 8px", fontSize: "0.82rem" }}
                                  />
                                  <input
                                    type="text"
                                    className="be-input"
                                    placeholder="Unit"
                                    list="purchase-unit-presets"
                                    value={it.unit || ""}
                                    onChange={(e) => updatePurchaseEditItem(idx, "unit", e.target.value)}
                                    style={{ padding: "6px 8px", fontSize: "0.82rem", textAlign: "center" }}
                                  />
                                  <input
                                    type="number"
                                    step="any"
                                    className="be-input"
                                    placeholder="Rate (৳)"
                                    value={it.rate}
                                    onChange={(e) => updatePurchaseEditItem(idx, "rate", e.target.value)}
                                    style={{ padding: "6px 8px", fontSize: "0.82rem" }}
                                  />
                                  <input
                                    type="number"
                                    step="any"
                                    className="be-input"
                                    placeholder="Subtotal"
                                    value={it.subtotal}
                                    onChange={(e) => updatePurchaseEditItem(idx, "subtotal", e.target.value)}
                                    style={{ padding: "6px 8px", fontSize: "0.82rem", fontWeight: 700 }}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => removePurchaseEditItem(idx)}
                                    disabled={editPurchaseModalData.items.length <= 1}
                                    style={{
                                      background: "none",
                                      border: "none",
                                      color: editPurchaseModalData.items.length <= 1 ? "#cbd5e1" : "#ef4444",
                                      cursor: editPurchaseModalData.items.length <= 1 ? "not-allowed" : "pointer",
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
                        ) : null}

                        {/* Extra Costs */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.2fr", gap: 12, marginBottom: 14 }}>
                          <div>
                            <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#475569" }}>Labour Cost (৳)</label>
                            <input
                              type="number"
                              step="any"
                              className="be-input"
                              placeholder="0"
                              value={editPurchaseModalData.labour_cost}
                              onChange={(e) => updatePurchaseEditCost("labour_cost", e.target.value)}
                              style={{ marginTop: 4 }}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#475569" }}>Transport Cost (৳)</label>
                            <input
                              type="number"
                              step="any"
                              className="be-input"
                              placeholder="0"
                              value={editPurchaseModalData.transport_cost}
                              onChange={(e) => updatePurchaseEditCost("transport_cost", e.target.value)}
                              style={{ marginTop: 4 }}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#475569" }}>Total Bill Amount (৳)</label>
                            <input
                              type="number"
                              step="any"
                              className="be-input"
                              value={editPurchaseModalData.amount}
                              onChange={(e) => setEditPurchaseModalData({ ...editPurchaseModalData, amount: e.target.value })}
                              style={{ marginTop: 4, fontWeight: 700, color: "#991b1b" }}
                            />
                          </div>
                        </div>
                      </>
                    ) : (
                      /* Payment Edit Fields */
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 14 }}>
                        <div>
                          <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#475569" }}>Payment Amount (৳)</label>
                          <input
                            type="number"
                            step="any"
                            className="be-input"
                            value={editPurchaseModalData.amount}
                            onChange={(e) => setEditPurchaseModalData({ ...editPurchaseModalData, amount: e.target.value })}
                            style={{ marginTop: 4, fontWeight: 700, color: "#059669" }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#475569" }}>From Bank / Method</label>
                          <input
                            type="text"
                            className="be-input"
                            placeholder="e.g. Islami Bank"
                            value={editPurchaseModalData.from_bank}
                            onChange={(e) => setEditPurchaseModalData({ ...editPurchaseModalData, from_bank: e.target.value })}
                            style={{ marginTop: 4 }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#475569" }}>To Bank / Account</label>
                          <input
                            type="text"
                            className="be-input"
                            placeholder="e.g. City Bank"
                            value={editPurchaseModalData.to_bank}
                            onChange={(e) => setEditPurchaseModalData({ ...editPurchaseModalData, to_bank: e.target.value })}
                            style={{ marginTop: 4 }}
                          />
                        </div>
                      </div>
                    )}

                    <div style={{ marginBottom: 16 }}>
                      <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#475569" }}>Note / Remarks</label>
                      <input
                        type="text"
                        className="be-input"
                        placeholder="Optional note"
                        value={editPurchaseModalData.note}
                        onChange={(e) => setEditPurchaseModalData({ ...editPurchaseModalData, note: e.target.value })}
                        style={{ marginTop: 4 }}
                      />
                    </div>

                    {/* Edit Form Buttons */}
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, borderTop: "1px solid #e2e8f0", paddingTop: 14 }}>
                      <button
                        type="button"
                        onClick={() => setIsEditingPurchaseModal(false)}
                        className="be-btn"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSavePurchaseEditModal}
                        disabled={purchaseModalBusy}
                        className="be-btn be-btn-primary"
                      >
                        {purchaseModalBusy ? "Saving..." : "Save Changes"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Expense Pop-up Modal with Details, Status, Live Edit & Delete */}
      {selectedExpenseForModal && (() => {
        const x = selectedExpenseForModal;
        const isDep = isDepositCategory(x.category || x.subType);
        const isApproved = (x.status || "pending") === "approved";

        return (
          <div
            className="be-modal-overlay"
            style={{ zIndex: 1200, padding: "16px" }}
            onClick={() => {
              if (isEditingExpenseModal && !confirm("Discard unsaved changes?")) return;
              setSelectedExpenseForModal(null);
              setIsEditingExpenseModal(false);
              setEditExpenseModalData(null);
              setExpenseModalErr("");
            }}
          >
            <div
              className="be-modal-box"
              style={{
                maxWidth: "680px",
                width: "100%",
                maxHeight: "92vh",
                display: "flex",
                flexDirection: "column",
                padding: 0,
                borderRadius: "16px",
                overflow: "hidden",
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                background: "#ffffff",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div
                style={{
                  background: isEditingExpenseModal ? "#fffbeb" : "#f8fafc",
                  borderBottom: "1px solid #e2e8f0",
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
                      background: isEditingExpenseModal ? "#f59e0b" : "#991b1b",
                      color: "#ffffff",
                      padding: "3px 9px",
                      borderRadius: "6px",
                      fontSize: "0.72rem",
                      fontWeight: 800,
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                    }}
                  >
                    {isEditingExpenseModal ? "✏️ Edit Mode" : "Expense Details"}
                  </span>
                  <h3 style={{ margin: 0, color: "#0f172a", fontSize: "1.1rem", fontWeight: 700 }}>
                    {isEditingExpenseModal ? "Edit Expense Entry" : x.title}
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (isEditingExpenseModal && !confirm("Discard unsaved changes?")) return;
                    setSelectedExpenseForModal(null);
                    setIsEditingExpenseModal(false);
                    setEditExpenseModalData(null);
                    setExpenseModalErr("");
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#64748b",
                    width: "32px",
                    height: "32px",
                    borderRadius: "8px",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                  }}
                  title="Close"
                >
                  <XIcon size={16} />
                </button>
              </div>

              {/* Modal Body */}
              <div style={{ padding: "20px 22px", overflowY: "auto", flex: 1, maxHeight: "calc(92vh - 140px)" }}>
                {expenseModalErr && (
                  <div style={{ background: "#fee2e2", border: "1px solid #fecaca", color: "#dc2626", padding: "9px 13px", borderRadius: 8, marginBottom: 16, fontSize: "0.85rem", fontWeight: 600 }}>
                    {expenseModalErr}
                  </div>
                )}

                {!isEditingExpenseModal ? (
                  <div>
                    {/* Amount Banner */}
                    <div className="ex-detail-amount-card">
                      <div>
                        <div className="ex-detail-label">
                          {isDep ? "Bank Deposit Amount (Fund Movement)" : "Total Expense Amount"}
                        </div>
                        <div
                          className="ex-detail-amount-val"
                          style={{ color: isDep ? "#15803d" : "#991b1b" }}
                        >
                          ৳ {fmt(x.amount)}
                        </div>
                      </div>
                      <span
                        className={`ex-cat-tag ${isDep ? "deposit" : ""}`}
                        style={{ fontSize: "0.85rem", padding: "6px 12px" }}
                      >
                        {x.category || x.subType || "General"}
                      </span>
                    </div>

                    {isDep && (
                      <div
                        style={{
                          background: "#f0fdf4",
                          border: "1px solid #bbf7d0",
                          borderRadius: 8,
                          padding: "9px 14px",
                          color: "#166534",
                          fontSize: "0.82rem",
                          fontWeight: 600,
                          marginBottom: 14,
                        }}
                      >
                        🏦 <strong>Bank Fund Movement:</strong> This amount was deposited into your bank account. It is tracked in your live bank balance and excluded from business expenses to avoid double counting.
                      </div>
                    )}

                    {/* Details Grid */}
                    <div className="ex-detail-grid">
                      <div className="ex-detail-item">
                        <div className="ex-detail-label">Date</div>
                        <div className="ex-detail-value">{prettyDate(x.date)} ({x.date})</div>
                      </div>

                      <div className="ex-detail-item">
                        <div className="ex-detail-label">Title</div>
                        <div className="ex-detail-value">{x.title}</div>
                      </div>

                      <div className="ex-detail-item">
                        <div className="ex-detail-label">Paid To / Recipient</div>
                        <div className="ex-detail-value">
                          {x.paidTo || x.paid_to || x.party || "—"}
                          {Boolean(x.isSynced || x.linkedClient || x.linkedEntryId) && (
                            <span className="ex-ledger-badge" style={{ marginLeft: 6 }}>
                              <CheckIcon size={11} /> Ledger Synced
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="ex-detail-item">
                        <div className="ex-detail-label">Phone Number</div>
                        <div className="ex-detail-value">
                          {x.phone ? (
                            <a
                              href={`tel:${x.phone}`}
                              style={{ color: "#2563eb", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}
                            >
                              📞 {x.phone}
                            </a>
                          ) : (
                            "—"
                          )}
                        </div>
                      </div>

                      <div className="ex-detail-item">
                        <div className="ex-detail-label">Payment Method</div>
                        <div className="ex-detail-value">
                          {x.paymentMethod || x.payment_method || x.method || "Cash"}
                        </div>
                      </div>

                      {(x.method === "Bank" || x.payment_method === "Bank") && (
                        <div className="ex-detail-item">
                          <div className="ex-detail-label">Bank Channel</div>
                          <div className="ex-detail-value">
                            {x.fromBank && x.toBank
                              ? `${x.fromBank} → ${x.toBank}`
                              : x.fromBank || x.toBank || x.from_bank || x.to_bank || "—"}
                          </div>
                        </div>
                      )}

                      <div className="ex-detail-item" style={{ gridColumn: "1 / -1" }}>
                        <div className="ex-detail-label">Note / Remarks</div>
                        <div className="ex-detail-value" style={{ color: x.note ? "#0f172a" : "#94a3b8" }}>
                          {x.note || "No remarks added"}
                        </div>
                      </div>
                    </div>

                    {/* Audit & Approval Status Bar */}
                    <div
                      style={{
                        marginTop: 16,
                        padding: "12px 16px",
                        background: isApproved ? "#f0fdf4" : "#fffbeb",
                        border: `1px solid ${isApproved ? "#bbf7d0" : "#fde68a"}`,
                        borderRadius: "10px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: 10,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: "0.85rem", fontWeight: 700, color: isApproved ? "#166534" : "#92400e" }}>
                          Status: {isApproved ? "Approved" : "Pending Approval"}
                        </span>
                        <span style={{ fontSize: "0.78rem", color: "#64748b" }}>
                          (Recorded by: {x.entryBy || x.approvedBy || "Admin"})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          await handleToggleStatus(x);
                          setSelectedExpenseForModal((prev) => prev ? { ...prev, status: isApproved ? "pending" : "approved" } : null);
                        }}
                        disabled={busy}
                        style={{
                          background: isApproved ? "#fef2f2" : "#15803d",
                          border: `1px solid ${isApproved ? "#fca5a5" : "#15803d"}`,
                          color: isApproved ? "#b91c1c" : "#ffffff",
                          padding: "5px 12px",
                          borderRadius: "6px",
                          fontSize: "0.78rem",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        {isApproved ? "Mark as Pending" : "✓ Approve Entry"}
                      </button>
                    </div>

                    {/* Footer Actions */}
                    <div
                      style={{
                        background: "#f8fafc",
                        borderTop: "1px solid #e2e8f0",
                        padding: "14px 22px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 10,
                        margin: "18px -22px -20px -22px",
                      }}
                    >
                      <button
                        type="button"
                        onClick={handleDeleteFromExpenseModal}
                        disabled={busy}
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
                        <TrashIcon size={14} /> Delete Expense
                      </button>

                      <div style={{ display: "flex", gap: 10 }}>
                        <button
                          type="button"
                          style={{
                            background: "#ffffff",
                            border: "1px solid #cbd5e1",
                            color: "#475569",
                            padding: "8px 16px",
                            borderRadius: "8px",
                            fontSize: "0.84rem",
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                          onClick={() => {
                            setSelectedExpenseForModal(null);
                            setIsEditingExpenseModal(false);
                            setEditExpenseModalData(null);
                          }}
                        >
                          Close
                        </button>
                        <button
                          type="button"
                          style={{
                            background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                            border: "none",
                            color: "#ffffff",
                            padding: "8px 18px",
                            borderRadius: "8px",
                            fontSize: "0.84rem",
                            fontWeight: 700,
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            boxShadow: "0 2px 4px rgba(37,99,235,0.2)",
                          }}
                          onClick={() => startEditingExpenseModal(x)}
                        >
                          <EditIcon size={14} /> Edit Expense
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Edit Form */
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <div>
                        <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#475569" }}>Date *</label>
                        <input
                          type="date"
                          className="be-input"
                          value={editExpenseModalData.expense_date}
                          onChange={(e) => setEditExpenseModalData({ ...editExpenseModalData, expense_date: e.target.value })}
                          style={{ marginTop: 4 }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#475569" }}>Category *</label>
                        <select
                          className="be-select"
                          value={editExpenseModalData.category}
                          onChange={(e) => handleEditExpenseModalCategoryChange(e.target.value)}
                          style={{ marginTop: 4, width: "100%" }}
                        >
                          {CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#475569" }}>Title / Purpose *</label>
                      <input
                        type="text"
                        className="be-input"
                        placeholder="e.g. Office Stationery, Factory Repair"
                        value={editExpenseModalData.title}
                        onChange={(e) => setEditExpenseModalData({ ...editExpenseModalData, title: e.target.value })}
                        style={{ marginTop: 4 }}
                      />
                    </div>

                    {/* Paid To with searchable dropdown */}
                    <div ref={expenseModalPaidToRef}>
                      <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#475569" }}>
                        {isDepositCategory(editExpenseModalData.category)
                          ? "Deposited Bank Name / Account *"
                          : isEditStaffExpense
                            ? "Staff / Employee (Salary)"
                            : isEditSupplierPayment
                              ? "Supplier / Dealer Name"
                              : "Paid To / Recipient"}
                      </label>
                      <div className="ex-paidto-wrap" style={{ marginTop: 4 }}>
                        <input
                          type="text"
                          className="be-input"
                          placeholder={
                            isDepositCategory(editExpenseModalData.category)
                              ? "Select bank or type bank name..."
                              : isEditStaffExpense
                                ? "Select staff (e.g. Shamim Accounts, Ikram...) or type name..."
                                : isEditSupplierPayment
                                  ? "Select dealer / supplier (e.g. BSRM, Mujahid Dealer...) or type name..."
                                  : "Name of recipient, staff, or supplier"
                          }
                          value={editExpenseModalData.paid_to}
                          autoComplete="off"
                          onFocus={() => {
                            if (isDepositCategory(editExpenseModalData.category) || isEditStaffExpense || isEditSupplierPayment) {
                              setShowExpenseModalDropdown(true);
                            }
                          }}
                          onChange={(e) => {
                            const val = e.target.value;
                            setEditExpenseModalData((prev) => {
                              let nextTitle = prev.title;
                              if (isDepositCategory(prev.category)) {
                                if (!prev.title || prev.title.startsWith("Bank Deposit -") || prev.title === "Bank Deposit") {
                                  nextTitle = val.trim() ? `Bank Deposit - ${val.trim()}` : "Bank Deposit";
                                }
                              } else if (isEditStaffExpense) {
                                if (!prev.title || prev.title.startsWith("Salary -") || prev.title === "Staff Salary") {
                                  nextTitle = val.trim() ? `Salary - ${val.trim()}` : `Staff Salary`;
                                }
                              } else if (isEditSupplierPayment) {
                                if (!prev.title || prev.title.startsWith("Supplier Payment -") || prev.title === "Supplier Payment") {
                                  nextTitle = val.trim() ? `Supplier Payment - ${val.trim()}` : "Supplier Payment";
                                }
                              }
                              return {
                                ...prev,
                                paid_to: val,
                                to_bank: isDepositCategory(prev.category) ? val : prev.to_bank,
                                title: nextTitle,
                              };
                            });
                            if (isDepositCategory(editExpenseModalData.category) || isEditStaffExpense || isEditSupplierPayment) {
                              setShowExpenseModalDropdown(true);
                            }
                          }}
                        />
                        {showExpenseModalDropdown && (isDepositCategory(editExpenseModalData.category) || isEditStaffExpense || isEditSupplierPayment) && (
                          <div className="ex-dropdown" style={{ maxHeight: 220 }}>
                            {isDepositCategory(editExpenseModalData.category) ? (
                              <>
                                <div className="ex-dropdown-header">
                                  Bangladesh Popular Banks ({filteredEditBanks.length})
                                </div>
                                {filteredEditBanks.length === 0 ? (
                                  <div className="ex-dropdown-empty">
                                    No preset bank found. Your custom typed bank name will be saved.
                                  </div>
                                ) : (
                                  filteredEditBanks.map((b) => (
                                    <div
                                      key={b}
                                      className={`ex-dropdown-item ${(editExpenseModalData.paid_to || "").trim().toLowerCase() === b.toLowerCase() ? "active" : ""}`}
                                      onClick={() => handleSelectEditExpenseModalBank(b)}
                                    >
                                      <span style={{ fontWeight: 600 }}>{b}</span>
                                      <span className="ex-tag-supplier" style={{ background: "#dcfce7", color: "#15803d" }}>Bank</span>
                                    </div>
                                  ))
                                )}
                              </>
                            ) : isEditStaffExpense ? (
                              <>
                                <div className="ex-dropdown-header">
                                  Company Staff List ({filteredEditStaff.length})
                                </div>
                                {filteredEditStaff.length === 0 ? (
                                  <div className="ex-dropdown-empty">
                                    No matching staff in list. You can add them below.
                                  </div>
                                ) : (
                                  filteredEditStaff.map((st) => (
                                    <div
                                      key={st}
                                      className={`ex-dropdown-item ${(editExpenseModalData.paid_to || "").trim().toLowerCase() === st.toLowerCase() ? "active" : ""}`}
                                      onClick={() => handleSelectEditExpenseModalStaff(st)}
                                    >
                                      <span style={{ fontWeight: 600 }}>{st}</span>
                                      <span className="ex-tag-staff">Staff</span>
                                    </div>
                                  ))
                                )}
                                {(editExpenseModalData.paid_to || "").trim() &&
                                  !allStaff.some(
                                    (s) => s.toLowerCase() === (editExpenseModalData.paid_to || "").trim().toLowerCase()
                                  ) && (
                                    <div
                                      className="ex-dropdown-item"
                                      style={{
                                        background: "#fdf2f8",
                                        color: "#be185d",
                                        borderTop: "1px dashed #fbcfe8",
                                        fontWeight: 600,
                                        cursor: "pointer",
                                      }}
                                      onClick={() => handleAddCustomStaffToExpenseModal((editExpenseModalData.paid_to || "").trim())}
                                    >
                                      <span>+ Add "{(editExpenseModalData.paid_to || "").trim()}" as new Staff</span>
                                      <span className="ex-tag-staff">New</span>
                                    </div>
                                  )}
                              </>
                            ) : (
                              <>
                                <div className="ex-dropdown-header">
                                  Dealer &amp; Supplier List ({filteredEditClients.length})
                                </div>
                                {filteredEditClients.length === 0 ? (
                                  <div className="ex-dropdown-empty">
                                    No matching dealer or supplier. You can still use this as a free name.
                                  </div>
                                ) : (
                                  filteredEditClients.map((c) => {
                                    const isSup = c.type === "supplier" || c.type === "client";
                                    return (
                                      <div
                                        key={c.name}
                                        className={`ex-dropdown-item ${editExpenseModalData.paid_to === c.name ? "active" : ""}`}
                                        onClick={() => handleSelectEditExpenseModalClient(c)}
                                      >
                                        <span style={{ fontWeight: 600 }}>{c.name}</span>
                                        <span className={isSup ? "ex-tag-supplier" : "ex-tag-dealer"}>
                                          {isSup ? "Supplier" : "Dealer"}
                                        </span>
                                      </div>
                                    );
                                  })
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <div>
                        <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#475569" }}>Phone Number</label>
                        <input
                          type="text"
                          className="be-input"
                          placeholder="017xxxxxxxx"
                          value={editExpenseModalData.phone}
                          onChange={(e) => setEditExpenseModalData({ ...editExpenseModalData, phone: e.target.value })}
                          style={{ marginTop: 4 }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#475569" }}>Payment Method *</label>
                        <select
                          className="be-select"
                          value={editExpenseModalData.payment_method}
                          onChange={(e) => setEditExpenseModalData({ ...editExpenseModalData, payment_method: e.target.value })}
                          style={{ marginTop: 4, width: "100%" }}
                        >
                          {METHODS.map((m) => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#475569" }}>Amount (৳) *</label>
                      <input
                        type="number"
                        step="any"
                        className="be-input"
                        placeholder="0.00"
                        value={editExpenseModalData.amount}
                        onChange={(e) => setEditExpenseModalData({ ...editExpenseModalData, amount: e.target.value })}
                        style={{ marginTop: 4, fontWeight: 700 }}
                      />
                    </div>

                    {editExpenseModalData.payment_method === "Bank" && (
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, background: "#f8fafc", padding: "12px", borderRadius: 8, border: "1px dashed #cbd5e1" }}>
                        <div>
                          <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#475569" }}>From Bank / Account</label>
                          <input
                            type="text"
                            className="be-input"
                            list="ae-popular-banks"
                            placeholder="e.g. Islami Bank"
                            value={editExpenseModalData.from_bank}
                            onChange={(e) => setEditExpenseModalData({ ...editExpenseModalData, from_bank: e.target.value })}
                            style={{ marginTop: 4 }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#475569" }}>To Bank / Account</label>
                          <input
                            type="text"
                            className="be-input"
                            list="ae-popular-banks"
                            placeholder="e.g. City Bank"
                            value={editExpenseModalData.to_bank}
                            onChange={(e) => setEditExpenseModalData({ ...editExpenseModalData, to_bank: e.target.value })}
                            style={{ marginTop: 4 }}
                          />
                        </div>
                      </div>
                    )}

                    <div>
                      <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#475569" }}>Note / Remarks</label>
                      <input
                        type="text"
                        className="be-input"
                        placeholder="Optional remarks"
                        value={editExpenseModalData.note}
                        onChange={(e) => setEditExpenseModalData({ ...editExpenseModalData, note: e.target.value })}
                        style={{ marginTop: 4 }}
                      />
                    </div>

                    {/* Edit Buttons */}
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, borderTop: "1px solid #e2e8f0", paddingTop: 14 }}>
                      <button
                        type="button"
                        onClick={() => setIsEditingExpenseModal(false)}
                        className="be-btn"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveExpenseEditModal}
                        disabled={expenseModalBusy}
                        className="be-btn be-btn-primary"
                      >
                        {expenseModalBusy ? "Saving..." : "Save Changes"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      <datalist id="ae-popular-banks">
        {POPULAR_BANKS.map((b) => (
          <option key={b} value={b} />
        ))}
      </datalist>

      {/* Edit Modal */}
      {editingEntry && (
        <div className="ae-modal-overlay">
          <div className="ae-modal-card">
            <div className="ae-modal-header">
              <h3 className="ae-modal-title">
                Edit {editingEntry.sourceLabel} Entry
              </h3>
              <button
                type="button"
                className="be-btn-link"
                onClick={() => setEditingEntry(null)}
                style={{ cursor: "pointer", border: "none", background: "transparent" }}
              >
                <XIcon size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit}>
              <div className="ae-modal-body">
                <div className="be-grid-2">
                  <div className="be-field-group">
                    <label>Date *</label>
                    <input
                      type="date"
                      className="be-input"
                      value={editForm.date}
                      required
                      onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                    />
                  </div>
                  <div className="be-field-group">
                    <label>Amount (৳) *</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      className="be-input"
                      value={editForm.amount}
                      required
                      onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                    />
                  </div>
                </div>

                <div className="be-field-group">
                  <label>
                    {editingEntry.source === "customer_bill"
                      ? "Customer Name *"
                      : editingEntry.source === "dealer_supplier"
                        ? "Dealer / Supplier Name *"
                        : "Paid To / Staff Name"}
                  </label>
                  <input
                    type="text"
                    className="be-input"
                    value={editForm.party}
                    required
                    onChange={(e) => setEditForm({ ...editForm, party: e.target.value })}
                  />
                </div>

                {editingEntry.source === "expense" && (
                  <div className="be-grid-2">
                    <div className="be-field-group">
                      <label>Expense Title *</label>
                      <input
                        type="text"
                        className="be-input"
                        value={editForm.title}
                        required
                        onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                      />
                    </div>
                    <div className="be-field-group">
                      <label>Category</label>
                      <input
                        type="text"
                        className="be-input"
                        value={editForm.subType}
                        onChange={(e) => setEditForm({ ...editForm, subType: e.target.value })}
                      />
                    </div>
                  </div>
                )}

                {editingEntry.source !== "expense" && (
                  <div className="be-field-group">
                    <label>Bill No</label>
                    <input
                      type="text"
                      className="be-input"
                      placeholder="e.g. 1024"
                      value={editForm.billNo}
                      onChange={(e) => setEditForm({ ...editForm, billNo: e.target.value })}
                    />
                  </div>
                )}

                <div className="be-grid-2">
                  <div className="be-field-group">
                    <label>Payment Method</label>
                    <input
                      type="text"
                      className="be-input"
                      placeholder="e.g. Cash, Bank, bKash"
                      value={editForm.method}
                      onChange={(e) => setEditForm({ ...editForm, method: e.target.value })}
                    />
                  </div>
                  <div className="be-field-group">
                    <label>From Bank</label>
                    <input
                      type="text"
                      className="be-input"
                      placeholder="Optional"
                      value={editForm.fromBank}
                      onChange={(e) => setEditForm({ ...editForm, fromBank: e.target.value })}
                    />
                  </div>
                </div>

                <div className="be-field-group">
                  <label>To Bank</label>
                  <input
                    type="text"
                    className="be-input"
                    placeholder="Optional"
                    value={editForm.toBank}
                    onChange={(e) => setEditForm({ ...editForm, toBank: e.target.value })}
                  />
                </div>

                <div className="be-field-group">
                  <label>Remarks / Note</label>
                  <input
                    type="text"
                    className="be-input"
                    placeholder="Optional note"
                    value={editForm.note}
                    onChange={(e) => setEditForm({ ...editForm, note: e.target.value })}
                  />
                </div>
              </div>

              <div className="ae-modal-footer">
                <button
                  type="button"
                  className="be-btn"
                  onClick={() => setEditingEntry(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="be-btn be-btn-primary"
                  disabled={busy}
                >
                  {busy ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
