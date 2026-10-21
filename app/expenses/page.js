"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import * as XLSX from "xlsx-js-style";
import {
  batchTranslateTable,
  toBengaliDigits,
  toBengaliCurrency,
  translatePeriodLabel,
  applyExcelStyles,
  BN_MONTHS,
  BN_DAYS,
  BN_TERMS,
} from "@/lib/translator";
import {
  HomeIcon,
  UploadIcon,
  FileTextIcon,
  FolderIcon,
  CheckIcon,
  XIcon,
  TrashIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EditIcon,
  BarChartIcon,
} from "@/lib/icons";

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
const MODES = [
  { key: "day", label: "Daily" },
  { key: "week", label: "Weekly" },
  { key: "month", label: "Monthly" },
  { key: "year", label: "Yearly" },
  { key: "all", label: "All" },
];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const isDepositCategory = (cat) => {
  if (!cat) return false;
  const c = String(cat).trim().toLowerCase();
  return c === "bank deposit" || c === "company bank deposit";
};

const pad = (n) => String(n).padStart(2, "0");
const toStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromStr = (s) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const today = () => toStr(new Date());
const addDays = (s, n) => {
  const d = fromStr(s);
  d.setDate(d.getDate() + n);
  return toStr(d);
};
// Week runs Saturday -> Friday
const weekStart = (s) => {
  const d = fromStr(s || today());
  const daysSinceSat = (d.getDay() + 1) % 7;
  return addDays(toStr(d), -daysSinceSat);
};
const fmt = (n) =>
  Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const prettyDate = (s) => {
  if (!s) return "";
  const parts = s.split("-");
  if (parts.length !== 3) return s;
  const [y, m, d] = parts.map(Number);
  const dt = new Date(y, m - 1, d);
  if (isNaN(dt.getTime())) return s;
  return `${pad(dt.getDate())} ${MONTHS[dt.getMonth()].slice(0, 3)} ${dt.getFullYear()}`;
};

function getRange(mode, ref) {
  const d = fromStr(ref || today());
  if (mode === "day") return { from: ref, to: ref, label: `${DAYS[d.getDay()]}, ${prettyDate(ref)}` };
  if (mode === "week") {
    const from = weekStart(ref || today());
    const to = addDays(from, 6);
    return { from, to, label: `Sat, ${prettyDate(from)} – Fri, ${prettyDate(to)}` };
  }
  if (mode === "month") {
    const from = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`;
    const to = toStr(new Date(d.getFullYear(), d.getMonth() + 1, 0));
    return { from, to, label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}` };
  }
  if (mode === "year") {
    return { from: `${d.getFullYear()}-01-01`, to: `${d.getFullYear()}-12-31`, label: String(d.getFullYear()) };
  }
  return { from: "0000-01-01", to: "9999-12-31", label: "All Time" };
}

function shiftRef(mode, ref, dir) {
  const d = fromStr(ref || today());
  if (mode === "day") return addDays(ref, dir);
  if (mode === "week") {
    const start = weekStart(ref || today());
    return addDays(start, 7 * dir);
  }
  if (mode === "month") return toStr(new Date(d.getFullYear(), d.getMonth() + dir, 1));
  if (mode === "year") return toStr(new Date(d.getFullYear() + dir, 0, 1));
  return ref;
}

const defaultForm = () => ({
  expense_date: today(),
  title: "",
  category: CATEGORIES[0],
  amount: "",
  payment_method: "Cash",
  paid_to: "",
  phone: "",
  from_bank: "",
  to_bank: "",
  note: "",
});

export default function ExpensesPage() {
  const router = useRouter();
  const [expenses, setExpenses] = useState([]);
  const [salesBills, setSalesBills] = useState([]);
  const [clients, setClients] = useState([]);
  const [form, setForm] = useState(defaultForm());
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const [showDropdown, setShowDropdown] = useState(false);
  const [showFromBankDropdown, setShowFromBankDropdown] = useState(false);
  const [showToBankDropdown, setShowToBankDropdown] = useState(false);
  const [syncToLedger, setSyncToLedger] = useState(true);
  const [customClientType, setCustomClientType] = useState("supplier");
  const paidToRef = useRef(null);
  const fromBankRef = useRef(null);
  const toBankRef = useRef(null);

  // Excel Import States
  const [showImportModal, setShowImportModal] = useState(false);
  const [importPreview, setImportPreview] = useState(null);
  const [importBusy, setImportBusy] = useState(false);

  // Excel Language Modal States
  const [excelLangModal, setExcelLangModal] = useState({
    isOpen: false,
    type: "expenses", // 'expenses' | 'salary'
    title: "Download Expense Report",
  });
  const [translatingExcel, setTranslatingExcel] = useState(false);
  const [translatingProgress, setTranslatingProgress] = useState(0);
  const [importErr, setImportErr] = useState("");
  const [importSyncToLedger, setImportSyncToLedger] = useState(true);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  // Expense Popup Detail & Edit States
  const [selectedExpenseForModal, setSelectedExpenseForModal] = useState(null);
  const [isEditingModal, setIsEditingModal] = useState(false);
  const [editModalData, setEditModalData] = useState(null);
  const [modalBusy, setModalBusy] = useState(false);
  const [modalErr, setModalErr] = useState("");
  const [showModalDropdown, setShowModalDropdown] = useState(false);
  const [showModalFromBankDropdown, setShowModalFromBankDropdown] = useState(false);
  const [showModalToBankDropdown, setShowModalToBankDropdown] = useState(false);
  const modalPaidToRef = useRef(null);
  const modalFromBankRef = useRef(null);
  const modalToBankRef = useRef(null);

  // Synchronized Duration Filter States (shared between Top KPI Overview & Bottom Expense Table): 'day' | 'week' | 'month' | 'year' | 'all'
  const [mode, setMode] = useState("day");
  const [ref, setRef] = useState(today());
  const range = useMemo(() => getRange(mode, ref), [mode, ref]);
  const [catFilter, setCatFilter] = useState("all");
  const [search, setSearch] = useState("");

  const kpiMode = mode;
  const kpiRef = ref;
  const kpiRange = range;
  const setKpiMode = setMode;
  const setKpiRef = setRef;

  async function load() {
    try {
      const res = await fetch("/api/expenses");
      if (res.status === 401) return router.replace("/");
      const data = await res.json();
      if (res.ok) setExpenses(data.expenses || []);
    } catch (e) {
      console.error(e);
    }
    loadSalesBills();
  }

  async function loadSalesBills() {
    try {
      const res = await fetch("/api/bill-entry");
      if (res.ok) {
        const data = await res.json();
        setSalesBills(data.bills || []);
      }
    } catch (e) {
      console.error("Failed to load sales bills for cash in hand sync", e);
    }
  }

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

  const [extraStaff, setExtraStaff] = useState([]);

  // Load custom staff saved in browser
  useEffect(() => {
    try {
      const saved = localStorage.getItem("cew_extra_staff");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setExtraStaff(parsed);
      }
    } catch (_) { }
  }, []);

  function addCustomStaff(name) {
    const trimmed = (name || "").trim();
    if (!trimmed) return;
    if (
      !DEFAULT_STAFF.some((s) => s.toLowerCase() === trimmed.toLowerCase()) &&
      !extraStaff.some((s) => s.toLowerCase() === trimmed.toLowerCase())
    ) {
      setExtraStaff((prev) => {
        const next = [...prev, trimmed];
        try {
          localStorage.setItem("cew_extra_staff", JSON.stringify(next));
        } catch (_) { }
        return next;
      });
    }
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

  const isSalary = form.category === "Salary";
  const isOvertime = form.category === "Overtime";
  const isStaffExpense = isSalary; // Only Salary is staff expense. Overtime is a general business expense.
  const isSupplierPayment = form.category === "Supplier Payment (Raw Materials)";
  const isBankDeposit = isDepositCategory(form.category);

  const filteredStaff = useMemo(() => {
    const q = (form.paid_to || "").trim().toLowerCase();
    if (!q) return allStaff;
    return allStaff.filter((s) => s.toLowerCase().includes(q));
  }, [allStaff, form.paid_to]);

  const filteredBanks = useMemo(() => {
    const q = (form.paid_to || "").trim().toLowerCase();
    if (!q) return POPULAR_BANKS;
    return POPULAR_BANKS.filter((b) => b.toLowerCase().includes(q));
  }, [form.paid_to]);

  const filteredFromBanks = useMemo(() => {
    const q = (form.from_bank || "").trim().toLowerCase();
    if (!q) return POPULAR_BANKS;
    return POPULAR_BANKS.filter((b) => b.toLowerCase().includes(q));
  }, [form.from_bank]);

  const filteredToBanks = useMemo(() => {
    const q = (form.to_bank || "").trim().toLowerCase();
    if (!q) return POPULAR_BANKS;
    return POPULAR_BANKS.filter((b) => b.toLowerCase().includes(q));
  }, [form.to_bank]);

  const matchedStaff = useMemo(() => {
    const q = (form.paid_to || "").trim().toLowerCase();
    if (!q) return null;
    return allStaff.find((s) => s.toLowerCase() === q) || null;
  }, [allStaff, form.paid_to]);

  function handleCategoryChange(cat) {
    const isStaff = cat === "Salary";
    const isSupplier = cat === "Supplier Payment (Raw Materials)";
    const isDeposit = isDepositCategory(cat);

    setForm((prev) => {
      let nextPaidTo = prev.paid_to;
      let nextTitle = prev.title;
      let nextMethod = prev.payment_method;
      let nextToBank = prev.to_bank;

      if (isDeposit) {
        nextTitle = nextPaidTo?.trim() ? `Bank Deposit - ${nextPaidTo.trim()}` : "Bank Deposit";
      } else if (isStaff) {
        nextTitle = nextPaidTo?.trim() ? `Salary - ${nextPaidTo.trim()}` : "Staff Salary";
      } else if (isSupplier) {
        nextTitle = nextPaidTo?.trim() ? `Supplier Payment - ${nextPaidTo.trim()}` : "Supplier Payment";
      } else {
        // If switching from auto-title categories to general categories and title was auto-generated
        if (
          prev.category === "Bank Deposit" ||
          isDepositCategory(prev.category) ||
          prev.category === "Salary" ||
          prev.category === "Supplier Payment (Raw Materials)"
        ) {
          if (
            !nextTitle ||
            nextTitle === "Bank Deposit" ||
            nextTitle.startsWith("Bank Deposit -") ||
            nextTitle === "Staff Salary" ||
            nextTitle.startsWith("Salary -") ||
            nextTitle === "Supplier Payment" ||
            nextTitle.startsWith("Supplier Payment -")
          ) {
            nextTitle = "";
          }
        }
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
      setSyncToLedger(isSupplier);
      setShowDropdown(true);
    } else {
      setSyncToLedger(false);
      setShowDropdown(false);
    }
  }

  function handleSelectBank(bankName) {
    setForm((prev) => ({
      ...prev,
      paid_to: bankName,
      to_bank: bankName,
      title: !prev.title || prev.title === "Bank Deposit" || prev.title.startsWith("Bank Deposit -")
        ? `Bank Deposit - ${bankName}`
        : prev.title,
    }));
    setShowDropdown(false);
  }

  function handleSelectStaff(st) {
    setForm((prev) => ({
      ...prev,
      paid_to: st,
      title:
        !prev.title ||
          prev.title === "Staff Salary" ||
          prev.title.startsWith("Salary -")
          ? `Salary - ${st}`
          : prev.title,
    }));
    setShowDropdown(false);
  }

  function handleAddCustomStaff(name) {
    addCustomStaff(name);
    handleSelectStaff(name);
  }

  useEffect(() => {
    load();
    loadClients();
    loadSalesBills();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (paidToRef.current && !paidToRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
      if (fromBankRef.current && !fromBankRef.current.contains(event.target)) {
        setShowFromBankDropdown(false);
      }
      if (toBankRef.current && !toBankRef.current.contains(event.target)) {
        setShowToBankDropdown(false);
      }
      if (modalPaidToRef.current && !modalPaidToRef.current.contains(event.target)) {
        setShowModalDropdown(false);
      }
      if (modalFromBankRef.current && !modalFromBankRef.current.contains(event.target)) {
        setShowModalFromBankDropdown(false);
      }
      if (modalToBankRef.current && !modalToBankRef.current.contains(event.target)) {
        setShowModalToBankDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isEditSalary = editModalData?.category === "Salary";
  const isEditOvertime = editModalData?.category === "Overtime";
  const isEditStaffExpense = isEditSalary; // Only Salary is staff expense. Overtime is a general business expense.
  const isEditSupplierPayment = editModalData?.category === "Supplier Payment (Raw Materials)";

  const filteredEditStaff = useMemo(() => {
    if (!editModalData) return allStaff;
    const q = (editModalData.paid_to || "").trim().toLowerCase();
    if (!q) return allStaff;
    return allStaff.filter((s) => s.toLowerCase().includes(q));
  }, [allStaff, editModalData?.paid_to]);

  const filteredEditBanks = useMemo(() => {
    if (!editModalData) return POPULAR_BANKS;
    const q = (editModalData.paid_to || "").trim().toLowerCase();
    if (!q) return POPULAR_BANKS;
    return POPULAR_BANKS.filter((b) => b.toLowerCase().includes(q));
  }, [editModalData?.paid_to]);

  const filteredModalFromBanks = useMemo(() => {
    if (!editModalData) return POPULAR_BANKS;
    const q = (editModalData.from_bank || "").trim().toLowerCase();
    if (!q) return POPULAR_BANKS;
    return POPULAR_BANKS.filter((b) => b.toLowerCase().includes(q));
  }, [editModalData?.from_bank]);

  const filteredModalToBanks = useMemo(() => {
    if (!editModalData) return POPULAR_BANKS;
    const q = (editModalData.to_bank || "").trim().toLowerCase();
    if (!q) return POPULAR_BANKS;
    return POPULAR_BANKS.filter((b) => b.toLowerCase().includes(q));
  }, [editModalData?.to_bank]);

  const filteredClients = useMemo(() => {
    const q = (form.paid_to || "").trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) => (c.name || "").toLowerCase().includes(q));
  }, [clients, form.paid_to]);

  const filteredEditClients = useMemo(() => {
    if (!editModalData) return clients;
    const q = (editModalData.paid_to || "").trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) => (c.name || "").toLowerCase().includes(q));
  }, [clients, editModalData?.paid_to]);

  const matchedClient = useMemo(() => {
    const q = (form.paid_to || "").trim().toLowerCase();
    if (!q) return null;
    return clients.find((c) => (c.name || "").toLowerCase() === q) || null;
  }, [clients, form.paid_to]);

  function handleSelectClient(c) {
    setForm((prev) => ({
      ...prev,
      paid_to: c.name,
      title:
        !prev.title ||
          prev.title === "Supplier Payment" ||
          prev.title.startsWith("Supplier Payment -")
          ? `Supplier Payment - ${c.name}`
          : prev.title,
    }));
    setSyncToLedger(true);
    setShowDropdown(false);
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "DELETE" });
    router.replace("/");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErr("");
    setOk("");
    setBusy(true);

    if (isStaffExpense && form.paid_to.trim()) {
      addCustomStaff(form.paid_to.trim());
    }

    const isLinked = Boolean(!isStaffExpense && syncToLedger && form.paid_to.trim());
    const clientType = matchedClient
      ? (matchedClient.type === "dealer" ? "dealer" : "supplier")
      : customClientType;

    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          to_bank: isDepositCategory(form.category) ? (form.to_bank || form.paid_to.trim()) : form.to_bank,
          from_bank: isDepositCategory(form.category) ? (form.from_bank || "Cash Drawer") : form.from_bank,
          sync_to_ledger: isLinked,
          client_type: clientType,
        }),
      });
      if (res.status === 401) return router.replace("/");
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error || "Failed to save expense");
      } else {
        const syncMsg = isLinked
          ? ` • Synced as payment in ${form.paid_to.trim()}'s ledger`
          : "";
        setOk(`৳ ${fmt(form.amount)} expense recorded${syncMsg}.`);
        setRef(form.expense_date);
        setForm({
          ...defaultForm(),
          expense_date: form.expense_date,
          category: form.category,
          payment_method: form.payment_method,
        });
        await load();
        await loadClients();
      }
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  }

  function startEditingModal() {
    if (!selectedExpenseForModal) return;
    const x = selectedExpenseForModal;
    setEditModalData({
      id: x.id,
      expense_date: x.expense_date || today(),
      title: x.title || "",
      category: x.category || "General",
      amount: x.amount != null ? String(x.amount) : "",
      payment_method: x.payment_method || "Cash",
      paid_to: x.paid_to || "",
      phone: x.phone || "",
      from_bank: x.from_bank || "",
      to_bank: x.to_bank || "",
      note: x.note || "",
    });
    setIsEditingModal(true);
    setShowModalDropdown(false);
    setModalErr("");
  }

  function handleEditModalCategoryChange(cat) {
    const isStaff = cat === "Salary";
    const isSupplier = cat === "Supplier Payment (Raw Materials)";
    const isDeposit = isDepositCategory(cat);

    setEditModalData((prev) => {
      if (!prev) return prev;
      let nextPaidTo = prev.paid_to;
      let nextTitle = prev.title;
      let nextMethod = prev.payment_method;
      let nextToBank = prev.to_bank;

      if (isDeposit) {
        nextTitle = nextPaidTo?.trim() ? `Bank Deposit - ${nextPaidTo.trim()}` : "Bank Deposit";
      } else if (isStaff) {
        nextTitle = nextPaidTo?.trim() ? `Salary - ${nextPaidTo.trim()}` : "Staff Salary";
      } else if (isSupplier) {
        nextTitle = nextPaidTo?.trim() ? `Supplier Payment - ${nextPaidTo.trim()}` : "Supplier Payment";
      } else {
        if (
          prev.category === "Bank Deposit" ||
          isDepositCategory(prev.category) ||
          prev.category === "Salary" ||
          prev.category === "Supplier Payment (Raw Materials)"
        ) {
          if (
            !nextTitle ||
            nextTitle === "Bank Deposit" ||
            nextTitle.startsWith("Bank Deposit -") ||
            nextTitle === "Staff Salary" ||
            nextTitle.startsWith("Salary -") ||
            nextTitle === "Supplier Payment" ||
            nextTitle.startsWith("Supplier Payment -")
          ) {
            nextTitle = "";
          }
        }
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
      setShowModalDropdown(true);
    } else {
      setShowModalDropdown(false);
    }
  }

  function handleSelectEditModalBank(bankName) {
    setEditModalData((prev) => ({
      ...prev,
      paid_to: bankName,
      to_bank: bankName,
      title: !prev.title || prev.title === "Bank Deposit" || prev.title.startsWith("Bank Deposit -")
        ? `Bank Deposit - ${bankName}`
        : prev.title,
    }));
    setShowModalDropdown(false);
  }

  function handleSelectEditModalStaff(st) {
    setEditModalData((prev) => ({
      ...prev,
      paid_to: st,
      title:
        !prev.title ||
          prev.title === "Staff Salary" ||
          prev.title.startsWith("Salary -")
          ? `Salary - ${st}`
          : prev.title,
    }));
    setShowModalDropdown(false);
  }

  function handleAddCustomStaffToModal(name) {
    addCustomStaff(name);
    handleSelectEditModalStaff(name);
  }

  function handleSelectEditModalClient(c) {
    setEditModalData((prev) => ({
      ...prev,
      paid_to: c.name,
      title:
        !prev.title ||
          prev.title === "Supplier Payment" ||
          prev.title.startsWith("Supplier Payment -")
          ? `Supplier Payment - ${c.name}`
          : prev.title,
    }));
    setShowModalDropdown(false);
  }

  async function handleSaveEditModal() {
    if (!editModalData) return;
    setModalBusy(true);
    setModalErr("");
    const amount = parseFloat(editModalData.amount);
    if (!editModalData.title.trim()) {
      setModalBusy(false);
      setModalErr("Expense title is required");
      return;
    }
    if (isNaN(amount) || amount <= 0) {
      setModalBusy(false);
      setModalErr("Amount must be greater than 0");
      return;
    }

    if (isEditStaffExpense && editModalData.paid_to.trim()) {
      addCustomStaff(editModalData.paid_to.trim());
    }

    try {
      const res = await fetch("/api/expenses", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editModalData,
          to_bank: isDepositCategory(editModalData.category) ? (editModalData.to_bank || editModalData.paid_to.trim()) : editModalData.to_bank,
          from_bank: isDepositCategory(editModalData.category) ? (editModalData.from_bank || "Cash Drawer") : editModalData.from_bank,
          amount,
        }),
      });
      if (res.status === 401) {
        router.replace("/");
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setModalErr(data.error || "Failed to update expense");
        setModalBusy(false);
        return;
      }
      setOk("Expense updated successfully.");
      await load();
      setIsEditingModal(false);
      setEditModalData(null);
      setSelectedExpenseForModal(null);
      setShowModalDropdown(false);
    } catch (err) {
      setModalErr(err.message || "Failed to save");
    } finally {
      setModalBusy(false);
    }
  }

  async function handleDeleteFromModal() {
    if (!selectedExpenseForModal) return;
    const x = selectedExpenseForModal;
    const syncNote = x.linked_entry_id ? "\n(This will also remove the linked payment from the ledger)" : "";
    if (!confirm(`Are you sure you want to delete expense "${x.title}" (৳ ${fmt(x.amount)})?${syncNote}`)) return;
    setModalBusy(true);
    try {
      const res = await fetch(`/api/expenses?id=${x.id}`, { method: "DELETE" });
      if (res.status === 401) {
        router.replace("/");
        return;
      }
      setOk("Expense deleted.");
      await load();
      setSelectedExpenseForModal(null);
      setIsEditingModal(false);
      setEditModalData(null);
    } catch (err) {
      alert("Failed to delete: " + err.message);
    } finally {
      setModalBusy(false);
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return expenses.filter((x) => {
      if (x.expense_date < range.from || x.expense_date > range.to) return false;
      if (catFilter !== "all" && x.category !== catFilter) return false;
      if (q) {
        const hay = `${x.title} ${x.paid_to || ""} ${x.phone || ""} ${x.note || ""} ${x.category} ${x.payment_method || ""} ${x.from_bank || ""} ${x.to_bank || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [expenses, range, catFilter, search]);

  // Separate Actual Business Expenses vs Bank Deposits (Fund Transfers)
  const { actualExpenses, depositTransfers, totalActualExpense, totalDeposits } = useMemo(() => {
    const actual = [];
    const deposits = [];
    let actualSum = 0;
    let depSum = 0;

    filtered.forEach((x) => {
      if (isDepositCategory(x.category)) {
        deposits.push(x);
        depSum += Number(x.amount || 0);
      } else {
        actual.push(x);
        actualSum += Number(x.amount || 0);
      }
    });

    return {
      actualExpenses: actual,
      depositTransfers: deposits,
      totalActualExpense: actualSum,
      totalDeposits: depSum,
    };
  }, [filtered]);

  // Primary Total Expense reflects ONLY actual expenses (Eliminating double counting!)
  const total = totalActualExpense;

  // Dedicated calculations for Top KPI Cards (filtered strictly by kpiRange)
  const { kpiActualExpense, kpiDeposits, kpiBankExpense, kpiCashExpense } = useMemo(() => {
    let actualSum = 0;
    let depSum = 0;
    let bankSum = 0;
    let cashSum = 0;

    expenses.forEach((x) => {
      const d = x.expense_date ? String(x.expense_date).slice(0, 10) : "";
      if (kpiMode !== "all" && (d < kpiRange.from || d > kpiRange.to)) return;

      const amt = Number(x.amount || 0);
      if (isDepositCategory(x.category)) {
        depSum += amt;
      } else {
        actualSum += amt;
        const isBank = x.payment_method === "Bank" || (Boolean(x.from_bank) && x.payment_method !== "Cash");
        if (isBank) {
          bankSum += amt;
        } else {
          cashSum += amt;
        }
      }
    });

    return {
      kpiActualExpense: actualSum,
      kpiDeposits: depSum,
      kpiBankExpense: bankSum,
      kpiCashExpense: cashSum,
    };
  }, [expenses, kpiMode, kpiRange]);

  const kpiCashSummary = useMemo(() => {
    let allTimeSalesCash = 0;
    let prevSalesCash = 0;
    let periodSalesCash = 0;
    let allTimeTotalSales = 0;
    let periodTotalSales = 0;
    let allTimeSalesDue = 0;
    let periodSalesDue = 0;

    (salesBills || []).forEach((b) => {
      const tb = Number(b.total_bill || 0);
      const p = Number(b.client_payment || 0);
      const da = Number(b.due_advance || 0);
      const due = da > 0 ? da : 0;
      const d = b.bill_date ? String(b.bill_date).slice(0, 10) : "";

      allTimeTotalSales += tb;
      allTimeSalesCash += p;
      allTimeSalesDue += due;

      if (kpiMode !== "all" && d && d < kpiRange.from) {
        prevSalesCash += p;
      }

      if (kpiMode === "all" || (d && d >= kpiRange.from && d <= kpiRange.to)) {
        periodTotalSales += tb;
        periodSalesCash += p;
        periodSalesDue += due;
      }
    });

    let allTimeCashExpense = 0;
    let prevCashExpense = 0;
    let periodCashExpense = 0;
    let allTimeBankDeposits = 0;
    let prevBankDeposits = 0;
    let periodBankDeposits = 0;

    expenses.forEach((x) => {
      const amt = Number(x.amount || 0);
      const isDep = isDepositCategory(x.category);
      const isCash = !x.payment_method || x.payment_method === "Cash";
      const d = x.expense_date ? String(x.expense_date).slice(0, 10) : "";
      const isPrior = kpiMode !== "all" && d && d < kpiRange.from;
      const inKpi = kpiMode === "all" || (d && d >= kpiRange.from && d <= kpiRange.to);

      if (isDep) {
        allTimeBankDeposits += amt;
        if (isPrior) prevBankDeposits += amt;
        if (inKpi) periodBankDeposits += amt;
      } else if (isCash) {
        allTimeCashExpense += amt;
        if (isPrior) prevCashExpense += amt;
        if (inKpi) periodCashExpense += amt;
      }
    });

    const allTimeCashOutflow = allTimeCashExpense + allTimeBankDeposits;
    const allTimeNetCashInHand = allTimeSalesCash - allTimeCashOutflow;

    const prevCashOutflow = prevCashExpense + prevBankDeposits;
    const prevCashInHand = prevSalesCash - prevCashOutflow;

    const periodCashOutflow = periodCashExpense + periodBankDeposits;
    const periodNetCash = periodSalesCash - periodCashOutflow;

    const totalClosingCashInHand = kpiMode === "all" ? allTimeNetCashInHand : (prevCashInHand + periodNetCash);

    return {
      allTimeSalesCash,
      prevSalesCash,
      periodSalesCash,
      allTimeTotalSales,
      periodTotalSales,
      allTimeSalesDue,
      periodSalesDue,

      allTimeCashOutflow,
      allTimeNetCashInHand,

      prevCashOutflow,
      prevCashInHand,

      periodCashOutflow,
      periodNetCash,

      totalClosingCashInHand,
    };
  }, [salesBills, expenses, kpiMode, kpiRange]);

  // Bank Account Tracking & Balances across all-time and current period
  const bankAccountSummary = useMemo(() => {
    let allTimeDeposits = 0;
    let allTimeBankSpent = 0;
    let periodBankSpent = 0;
    const perBankMap = new Map();

    const getBank = (name) => {
      const clean = (name || "").trim() || "Main Bank";
      if (!perBankMap.has(clean)) {
        perBankMap.set(clean, { name: clean, deposits: 0, spent: 0, balance: 0 });
      }
      return perBankMap.get(clean);
    };

    expenses.forEach((x) => {
      const isDep = isDepositCategory(x.category);
      const amt = Number(x.amount || 0);

      if (isDep) {
        allTimeDeposits += amt;
        const targetBank = x.to_bank || x.from_bank || x.paid_to || "Main Bank";
        const b = getBank(targetBank);
        b.deposits += amt;
        b.balance += amt;
      } else {
        const isBankPaid = x.payment_method === "Bank" || Boolean(x.from_bank);
        if (isBankPaid) {
          allTimeBankSpent += amt;
          const sourceBank = x.from_bank || x.to_bank || "Main Bank";
          const b = getBank(sourceBank);
          b.spent += amt;
          b.balance -= amt;

          if (x.expense_date >= range.from && x.expense_date <= range.to) {
            periodBankSpent += amt;
          }
        }
      }
    });

    const netBalance = allTimeDeposits - allTimeBankSpent;
    const banks = Array.from(perBankMap.values()).filter((b) => b.deposits > 0 || b.spent > 0);

    return {
      allTimeDeposits,
      allTimeBankSpent,
      periodBankSpent,
      netBalance,
      banks,
    };
  }, [expenses, range]);

  const byCategory = useMemo(() => {
    const m = new Map();
    filtered.forEach((x) => m.set(x.category, (m.get(x.category) || 0) + x.amount));
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [filtered]);

  const byDay = useMemo(() => {
    const m = new Map();
    filtered.forEach((x) => {
      if (!m.has(x.expense_date)) m.set(x.expense_date, []);
      m.get(x.expense_date).push(x);
    });
    return Array.from(m.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  const activeDays = byDay.filter(([_, list]) => list.some((x) => !isDepositCategory(x.category))).length || byDay.length;

  const topCat = useMemo(() => {
    const m = new Map();
    actualExpenses.forEach((x) => m.set(x.category, (m.get(x.category) || 0) + x.amount));
    const sorted = Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
    return sorted[0] || byCategory[0];
  }, [actualExpenses, byCategory]);

  // Synchronized Total Cash in Hand & Sales Revenue (Sales Bills + Cash Expenses + Bank Deposits)
  const cashInHandSummary = useMemo(() => {
    // 1. Sales metrics (Billed Total, Cash Received, Dues from Customer Bills)
    let allTimeTotalSales = 0;
    let periodTotalSales = 0;
    let allTimeSalesCash = 0;
    let periodSalesCash = 0;
    let allTimeSalesDue = 0;
    let periodSalesDue = 0;
    let allTimeSalesCount = 0;
    let periodSalesCount = 0;

    (salesBills || []).forEach((b) => {
      const tb = Number(b.total_bill || 0);
      const p = Number(b.client_payment || 0);
      const da = Number(b.due_advance || 0);
      const due = da > 0 ? da : 0;
      const d = b.bill_date ? String(b.bill_date).slice(0, 10) : "";
      const inPeriod = d && d >= range.from && d <= range.to;

      allTimeTotalSales += tb;
      allTimeSalesCash += p;
      allTimeSalesDue += due;
      allTimeSalesCount += 1;

      if (inPeriod) {
        periodTotalSales += tb;
        periodSalesCash += p;
        periodSalesDue += due;
        periodSalesCount += 1;
      }
    });

    // 2. Cash spent on business expenses (Outflow)
    let allTimeCashExpense = 0;
    let periodCashExpense = 0;

    // 3. Cash deposited into Bank from drawer (Outflow to Bank)
    let allTimeBankDeposits = 0;
    let periodBankDeposits = 0;

    expenses.forEach((x) => {
      const amt = Number(x.amount || 0);
      const isDep = isDepositCategory(x.category);
      const isCash = !x.payment_method || x.payment_method === "Cash";
      const d = x.expense_date ? String(x.expense_date).slice(0, 10) : "";
      const inPeriod = d && d >= range.from && d <= range.to;

      if (isDep) {
        allTimeBankDeposits += amt;
        if (inPeriod) periodBankDeposits += amt;
      } else if (isCash) {
        allTimeCashExpense += amt;
        if (inPeriod) periodCashExpense += amt;
      }
    });

    const allTimeCashOutflow = allTimeCashExpense + allTimeBankDeposits;
    const allTimeNetCashInHand = allTimeSalesCash - allTimeCashOutflow;

    const periodCashOutflow = periodCashExpense + periodBankDeposits;
    const periodNetCash = periodSalesCash - periodCashOutflow;

    return {
      allTimeTotalSales,
      periodTotalSales,
      allTimeSalesCash,
      periodSalesCash,
      allTimeSalesDue,
      periodSalesDue,
      allTimeSalesCount,
      periodSalesCount,

      allTimeCashExpense,
      allTimeBankDeposits,
      allTimeCashOutflow,
      allTimeNetCashInHand,

      periodCashExpense,
      periodBankDeposits,
      periodCashOutflow,
      periodNetCash,
    };
  }, [salesBills, expenses, range]);

  function openExcelLanguageModal(type = "expenses", title = "Download Expense Report") {
    if (type === "expenses" && catFilter === "Salary") {
      type = "salary";
      title = "Download Salary Report";
    }
    setExcelLangModal({
      isOpen: true,
      type,
      title: title || (type === "salary" ? "Download Salary Report" : "Download Expense Report"),
    });
  }

  async function executeExportExcel(lang = "en") {
    const isBn = lang === "bn";
    if (isBn) {
      setTranslatingExcel(true);
      setTranslatingProgress(5);
    }

    try {
      const actualExpenses = [...filtered]
        .filter((x) => !isDepositCategory(x.category))
        .sort((a, b) => a.expense_date.localeCompare(b.expense_date));

      const fundTransfers = [...filtered]
        .filter((x) => isDepositCategory(x.category))
        .sort((a, b) => a.expense_date.localeCompare(b.expense_date));

      const actualExpenseTotal = actualExpenses.reduce((s, x) => s + Number(x.amount || 0), 0);
      const fundTransferTotal = fundTransfers.reduce((s, x) => s + Number(x.amount || 0), 0);

      let cashExpenseTotal = 0;
      let bankExpenseTotal = 0;
      actualExpenses.forEach((x) => {
        const amt = Number(x.amount || 0);
        const isCash = !x.payment_method || String(x.payment_method).trim().toLowerCase() === "cash";
        if (isCash) {
          cashExpenseTotal += amt;
        } else {
          bankExpenseTotal += amt;
        }
      });

      const headerCompany = isBn ? "চৌধুরী ইঞ্জিনিয়ারিং ওয়ার্কস" : "CHOWDHURY ENGINEERING WORKS";
      const periodLabel = isBn ? translatePeriodLabel(range.label) : range.label;
      const reportTitle = isBn
        ? `খরচ ও ফান্ড ট্রান্সফার রিপোর্ট – ${periodLabel}`
        : `EXPENSE & FUND TRANSFER REPORT – ${range.label}`;
      const sec1Title = isBn ? "বিভাগ ১: প্রকৃত ব্যবসায়িক খরচসমূহ" : "SECTION 1: ACTUAL BUSINESS EXPENSES";
      const sec2Title = isBn ? "বিভাগ ২: ফান্ড ট্রান্সফার (ব্যাংক জমা)" : "SECTION 2: FUND TRANSFER (BANK DEPOSITS)";
      const colHeaders = isBn
        ? ["তারিখ", "বিবরণ / শিরোনাম", "ক্যাটাগরি", "পদ্ধতি", "প্রাপক / প্রদানকারী", "পরিমাণ (টাকা)"]
        : ["Date", "Title", "Category", "Method", "Paid To", "Amount (BDT)"];

      const actualRows = actualExpenses.length > 0
        ? actualExpenses.map((x) => [
            isBn ? toBengaliDigits(x.expense_date) : x.expense_date,
            x.title,
            isBn ? (BN_TERMS[x.category] || x.category) : x.category,
            isBn ? (BN_TERMS[x.payment_method] || x.payment_method || "নগদ") : (x.payment_method || "Cash"),
            x.paid_to || "-",
            isBn ? toBengaliCurrency(x.amount) : Number(x.amount || 0),
          ])
        : [[
            "-",
            isBn ? "এই সময়ের জন্য কোনো খরচ পাওয়া যায়নি" : "No actual expenses for this period",
            "-",
            "-",
            "-",
            isBn ? "০" : 0,
          ]];

      const transferRows = fundTransfers.length > 0
        ? fundTransfers.map((x) => [
            isBn ? toBengaliDigits(x.expense_date) : x.expense_date,
            x.title,
            isBn ? (BN_TERMS[x.category] || x.category) : x.category,
            isBn ? (BN_TERMS[x.payment_method] || x.payment_method || "নগদ") : (x.payment_method || "Cash"),
            x.paid_to || "-",
            isBn ? toBengaliCurrency(x.amount) : Number(x.amount || 0),
          ])
        : [[
            "-",
            isBn ? "এই সময়ের জন্য কোনো ফান্ড ট্রান্সফার নেই" : "No fund transfer records for this period",
            "-",
            "-",
            "-",
            isBn ? "০" : 0,
          ]];

      let rows = [
        [headerCompany],
        [reportTitle],
        [],
        [sec1Title],
        colHeaders,
        ...actualRows,
        [isBn ? "মোট প্রকৃত খরচ" : "TOTAL ACTUAL EXPENSE", "", "", "", "", isBn ? toBengaliCurrency(actualExpenseTotal) : actualExpenseTotal],
        [],
        [sec2Title],
        colHeaders,
        ...transferRows,
        [isBn ? "মোট ফান্ড ট্রান্সফার" : "TOTAL FUND TRANSFER", "", "", "", "", isBn ? toBengaliCurrency(fundTransferTotal) : fundTransferTotal],
        [],
        [isBn ? "সারসংক্ষেপ" : "SUMMARY"],
        [isBn ? "মোট প্রকৃত ব্যবসায়িক খরচ (টাকা)" : "Total Actual Business Expense (BDT)", "", "", "", "", isBn ? toBengaliCurrency(actualExpenseTotal) : actualExpenseTotal],
        [isBn ? "মোট ফান্ড ট্রান্সফার / ব্যাংক জমা (টাকা)" : "Total Fund Transfer / Bank Deposits (BDT)", "", "", "", "", isBn ? toBengaliCurrency(fundTransferTotal) : fundTransferTotal],
        [isBn ? "সর্বমোট আউটফ্লো / ব্যয় (টাকা)" : "Grand Total Outflow (BDT)", "", "", "", "", isBn ? toBengaliCurrency(actualExpenseTotal + fundTransferTotal) : actualExpenseTotal + fundTransferTotal],
        [],
        [],
        ["", "", "", "", isBn ? "ক্যাশ ড্রয়ার থেকে খরচ" : "Expense From Cash Drawer", isBn ? toBengaliCurrency(cashExpenseTotal) : cashExpenseTotal],
        ["", "", "", "", isBn ? "ব্যাংক অ্যাকাউন্ট থেকে খরচ" : "Expense From Bank Account", isBn ? toBengaliCurrency(bankExpenseTotal) : bankExpenseTotal],
        ["", "", "", "", isBn ? "প্রকৃত ব্যবসায়িক মোট খরচ (টাকা)" : "Actual Business Expense Total (BDT)", isBn ? toBengaliCurrency(actualExpenseTotal) : actualExpenseTotal],
      ];

      if (isBn) {
        rows = await batchTranslateTable(rows, (pct) => setTranslatingProgress(pct));
      }

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws["!cols"] = [
        { wch: 15 },
        { wch: 32 },
        { wch: 28 },
        { wch: 16 },
        { wch: 36 },
        { wch: 20 },
      ];

      applyExcelStyles(ws, isBn);

      XLSX.utils.book_append_sheet(wb, ws, isBn ? "খরচের বিবরণ" : "Expenses");
      const langTag = isBn ? "_Bangla" : "";
      XLSX.writeFile(wb, `CEW_Expenses_${mode}_${range.label.replace(/[^a-zA-Z0-9]+/g, "_")}${langTag}.xlsx`);
    } catch (err) {
      console.error("Export expense Excel error:", err);
      alert("Failed to export Excel. Please try again.");
    } finally {
      setTranslatingExcel(false);
      setExcelLangModal((prev) => ({ ...prev, isOpen: false }));
    }
  }

  // Comprehensive Multi-Sheet Salary Excel Report
  async function executeExportSalaryExcel(lang = "en") {
    let salaryRows = filtered.filter((x) => x.category === "Salary");
    if (!salaryRows.length) {
      salaryRows = expenses.filter((x) => x.category === "Salary");
    }
    salaryRows.sort((a, b) => b.expense_date.localeCompare(a.expense_date));

    if (!salaryRows.length) {
      alert("No salary records found to export.");
      setExcelLangModal((prev) => ({ ...prev, isOpen: false }));
      return;
    }

    const isBn = lang === "bn";
    if (isBn) {
      setTranslatingExcel(true);
      setTranslatingProgress(5);
    }

    try {
      const grandSalaryTotal = salaryRows.reduce((s, x) => s + x.amount, 0);
      const headerCompany = isBn ? "চৌধুরী ইঞ্জিনিয়ারিং ওয়ার্কস" : "CHOWDHURY ENGINEERING WORKS";
      const periodLabel = isBn ? translatePeriodLabel(range.label) : range.label;

      // 1. DATA SHEET: All Salary Transactions
      let txnSheetRows = [
        [headerCompany],
        [isBn ? "স্টাফ বেতন ও মজুরি পরিশোধ খতিয়ান" : "SALARY PAYMENT DISBURSEMENT LEDGER"],
        [isBn
          ? `সময়কাল: ${periodLabel} | মোট রেকর্ড: ${toBengaliDigits(salaryRows.length)} | সর্বমোট: ৳ ${toBengaliCurrency(grandSalaryTotal)}`
          : `Period: ${range.label} | Total Records: ${salaryRows.length} | Grand Total: BDT ${fmt(grandSalaryTotal)}`],
        [],
        isBn
          ? [
              "ক্রমিক",
              "পরিশোধের তারিখ",
              "মাস-বছর",
              "কর্মচারীর নাম",
              "পদবী / কাজের বিবরণ",
              "পেমেন্ট মাধ্যম",
              "প্রেরক ব্যাংক / মাধ্যম",
              "প্রাপক ব্যাংক / অ্যাকাউন্ট",
              "বেতনের পরিমাণ (টাকা)",
              "মন্তব্য / বিবরণ",
            ]
          : [
              "SL",
              "Payment Date",
              "Month-Year",
              "Employee Name",
              "Title / Designation",
              "Payment Method",
              "From Bank / Channel",
              "To Bank / Account",
              "Salary Amount (BDT)",
              "Note / Remarks",
            ],
        ...salaryRows.map((x, i) => {
          const d = fromStr(x.expense_date);
          const mLabel = isBn
            ? `${BN_MONTHS[d.getMonth()]} ${toBengaliDigits(d.getFullYear())}`
            : `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
          const empName = x.paid_to || x.title || (isBn ? "কর্মচারী" : "Employee");
          const titleVal = isBn ? (BN_TERMS[x.title] || x.title || "বেতন") : (x.title || "Salary");
          const methodVal = isBn ? (BN_TERMS[x.payment_method] || x.payment_method || "নগদ") : (x.payment_method || "Cash");
          return [
            isBn ? toBengaliDigits(i + 1) : i + 1,
            isBn ? toBengaliDigits(x.expense_date) : x.expense_date,
            mLabel,
            empName,
            titleVal,
            methodVal,
            x.from_bank || "-",
            x.to_bank || "-",
            isBn ? toBengaliCurrency(x.amount) : x.amount,
            x.note || "-",
          ];
        }),
        [],
        [isBn ? "সর্বমোট" : "TOTAL", "", "", "", "", "", "", "", isBn ? toBengaliCurrency(grandSalaryTotal) : grandSalaryTotal, ""],
      ];

      // 2. MONTH-WISE BREAKDOWN SHEET
      const monthMap = new Map();
      salaryRows.forEach((x) => {
        const mKey = x.expense_date.slice(0, 7);
        if (!monthMap.has(mKey)) {
          monthMap.set(mKey, { total: 0, cash: 0, bank: 0, persons: new Set() });
        }
        const entry = monthMap.get(mKey);
        entry.total += x.amount;
        if (x.payment_method === "Cash") entry.cash += x.amount;
        else entry.bank += x.amount;
        entry.persons.add((x.paid_to || x.title).trim());
      });

      let monthSheetRows = [
        [headerCompany],
        [isBn ? "বেতন রিপোর্ট: মাস ভিত্তিক সারসংক্ষেপ" : "SALARY REPORT: MONTH-WISE TOTAL BREAKDOWN"],
        [],
        isBn
          ? [
              "ক্রমিক",
              "মাস - বছর",
              "কর্মচারীর সংখ্যা",
              "নগদ প্রদান (টাকা)",
              "ব্যাংক / ডিজিটাল (টাকা)",
              "সর্বমোট বেতন (টাকা)",
            ]
          : [
              "SL",
              "Month - Year",
              "Employees Paid",
              "Cash Disbursed (BDT)",
              "Bank / Digital (BDT)",
              "Total Salary Amount (BDT)",
            ],
        ...Array.from(monthMap.entries())
          .sort((a, b) => b[0].localeCompare(a[0]))
          .map(([mKey, v], idx) => {
            const [yr, mo] = mKey.split("-").map(Number);
            const mLabel = isBn
              ? `${BN_MONTHS[mo - 1]} ${toBengaliDigits(yr)}`
              : `${MONTHS[mo - 1]} ${yr}`;
            return [
              isBn ? toBengaliDigits(idx + 1) : idx + 1,
              mLabel,
              isBn ? toBengaliDigits(v.persons.size) : v.persons.size,
              isBn ? toBengaliCurrency(v.cash) : v.cash,
              isBn ? toBengaliCurrency(v.bank) : v.bank,
              isBn ? toBengaliCurrency(v.total) : v.total,
            ];
          }),
        [],
        [
          isBn ? "সর্বমোট" : "GRAND TOTAL",
          "",
          isBn
            ? toBengaliDigits(Array.from(new Set(salaryRows.map((x) => (x.paid_to || x.title).trim()))).size)
            : Array.from(new Set(salaryRows.map((x) => (x.paid_to || x.title).trim()))).size,
          isBn
            ? toBengaliCurrency(salaryRows.filter((x) => x.payment_method === "Cash").reduce((s, x) => s + x.amount, 0))
            : salaryRows.filter((x) => x.payment_method === "Cash").reduce((s, x) => s + x.amount, 0),
          isBn
            ? toBengaliCurrency(salaryRows.filter((x) => x.payment_method !== "Cash").reduce((s, x) => s + x.amount, 0))
            : salaryRows.filter((x) => x.payment_method !== "Cash").reduce((s, x) => s + x.amount, 0),
          isBn ? toBengaliCurrency(grandSalaryTotal) : grandSalaryTotal,
        ],
      ];

      // 3. EMPLOYEE / NAME-WISE BREAKDOWN SHEET
      const empMap = new Map();
      salaryRows.forEach((x) => {
        const name = (x.paid_to || x.title).trim();
        if (!empMap.has(name)) {
          empMap.set(name, {
            name,
            total: 0,
            months: new Set(),
            methods: new Set(),
            lastDate: x.expense_date,
          });
        }
        const entry = empMap.get(name);
        entry.total += x.amount;
        entry.months.add(x.expense_date.slice(0, 7));
        entry.methods.add(x.payment_method || "Cash");
        if (x.expense_date > entry.lastDate) entry.lastDate = x.expense_date;
      });

      let empSheetRows = [
        [headerCompany],
        [isBn ? "বেতন রিপোর্ট: কর্মচারী ভিত্তিক সারসংক্ষেপ" : "SALARY REPORT: EMPLOYEE-WISE TOTAL BREAKDOWN"],
        [],
        isBn
          ? [
              "ক্রমিক",
              "কর্মচারীর নাম",
              "মাসের সংখ্যা",
              "পেমেন্ট মাধ্যম",
              "সর্বশেষ প্রদানের তারিখ",
              "মোট প্রদত্ত বেতন (টাকা)",
            ]
          : [
              "SL",
              "Employee Name",
              "Months Count",
              "Payment Method(s)",
              "Last Payment Date",
              "Total Salary Paid (BDT)",
            ],
        ...Array.from(empMap.values())
          .sort((a, b) => b.total - a.total)
          .map((e, idx) => [
            isBn ? toBengaliDigits(idx + 1) : idx + 1,
            e.name,
            isBn ? toBengaliDigits(e.months.size) : e.months.size,
            Array.from(e.methods).map((m) => isBn ? (BN_TERMS[m] || m) : m).join(", "),
            isBn ? toBengaliDigits(e.lastDate) : e.lastDate,
            isBn ? toBengaliCurrency(e.total) : e.total,
          ]),
        [],
        [isBn ? "সর্বমোট" : "GRAND TOTAL", "", "", "", "", isBn ? toBengaliCurrency(grandSalaryTotal) : grandSalaryTotal],
      ];

      // 4. DATE-WISE BREAKDOWN SHEET
      const dateMap = new Map();
      salaryRows.forEach((x) => {
        const dt = x.expense_date;
        if (!dateMap.has(dt)) {
          dateMap.set(dt, { total: 0, persons: new Set(), methods: new Set() });
        }
        const entry = dateMap.get(dt);
        entry.total += x.amount;
        entry.persons.add((x.paid_to || x.title).trim());
        entry.methods.add(x.payment_method || "Cash");
      });

      let dateSheetRows = [
        [headerCompany],
        [isBn ? "বেতন রিপোর্ট: তারিখ ভিত্তিক সারসংক্ষেপ" : "SALARY REPORT: DATE-WISE TOTAL BREAKDOWN"],
        [],
        isBn
          ? ["ক্রমিক", "পরিশোধের তারিখ", "বার / দিন", "প্রাপকের সংখ্যা", "পেমেন্ট মাধ্যম", "মোট প্রদত্ত পরিমাণ (টাকা)"]
          : ["SL", "Payment Date", "Day", "Persons Paid", "Payment Methods", "Total Amount Disbursed (BDT)"],
        ...Array.from(dateMap.entries())
          .sort((a, b) => b[0].localeCompare(a[0]))
          .map(([dt, v], idx) => {
            const d = fromStr(dt);
            return [
              isBn ? toBengaliDigits(idx + 1) : idx + 1,
              isBn ? toBengaliDigits(dt) : dt,
              isBn ? BN_DAYS[d.getDay()] : DAYS[d.getDay()],
              isBn ? toBengaliDigits(v.persons.size) : v.persons.size,
              Array.from(v.methods).map((m) => isBn ? (BN_TERMS[m] || m) : m).join(", "),
              isBn ? toBengaliCurrency(v.total) : v.total,
            ];
          }),
        [],
        [isBn ? "সর্বমোট" : "GRAND TOTAL", "", "", "", "", isBn ? toBengaliCurrency(grandSalaryTotal) : grandSalaryTotal],
      ];

      if (isBn) {
        setTranslatingProgress(15);
        txnSheetRows = await batchTranslateTable(txnSheetRows, (p) => setTranslatingProgress(Math.round(15 + p * 0.4)));
        monthSheetRows = await batchTranslateTable(monthSheetRows, (p) => setTranslatingProgress(Math.round(55 + p * 0.15)));
        empSheetRows = await batchTranslateTable(empSheetRows, (p) => setTranslatingProgress(Math.round(70 + p * 0.15)));
        dateSheetRows = await batchTranslateTable(dateSheetRows, (p) => setTranslatingProgress(Math.round(85 + p * 0.15)));
      }

      const wb = XLSX.utils.book_new();

      const wsTxn = XLSX.utils.aoa_to_sheet(txnSheetRows);
      wsTxn["!cols"] = [
        { wch: 8 },
        { wch: 16 },
        { wch: 20 },
        { wch: 25 },
        { wch: 25 },
        { wch: 16 },
        { wch: 22 },
        { wch: 22 },
        { wch: 20 },
        { wch: 30 },
      ];
      applyExcelStyles(wsTxn, isBn);
      XLSX.utils.book_append_sheet(wb, wsTxn, isBn ? "বেতন লেনদেন" : "Salary Transactions");

      const wsMonth = XLSX.utils.aoa_to_sheet(monthSheetRows);
      wsMonth["!cols"] = [{ wch: 8 }, { wch: 24 }, { wch: 18 }, { wch: 22 }, { wch: 22 }, { wch: 24 }];
      applyExcelStyles(wsMonth, isBn);
      XLSX.utils.book_append_sheet(wb, wsMonth, isBn ? "মাস ভিত্তিক" : "Month-wise Breakdown");

      const wsEmp = XLSX.utils.aoa_to_sheet(empSheetRows);
      wsEmp["!cols"] = [{ wch: 8 }, { wch: 28 }, { wch: 16 }, { wch: 24 }, { wch: 20 }, { wch: 24 }];
      applyExcelStyles(wsEmp, isBn);
      XLSX.utils.book_append_sheet(wb, wsEmp, isBn ? "কর্মচারী বিবরণ" : "Employee Summary");

      const wsDate = XLSX.utils.aoa_to_sheet(dateSheetRows);
      wsDate["!cols"] = [{ wch: 8 }, { wch: 18 }, { wch: 14 }, { wch: 18 }, { wch: 25 }, { wch: 26 }];
      applyExcelStyles(wsDate, isBn);
      XLSX.utils.book_append_sheet(wb, wsDate, isBn ? "তারিখ ভিত্তিক" : "Date-wise Breakdown");

      const langTag = isBn ? "_Bangla" : "";
      XLSX.writeFile(wb, `CEW_Salary_Report_${today().replace(/-/g, "")}${langTag}.xlsx`);
    } catch (err) {
      console.error("Export salary Excel error:", err);
      alert("Failed to export Salary Excel. Please try again.");
    } finally {
      setTranslatingExcel(false);
      setExcelLangModal((prev) => ({ ...prev, isOpen: false }));
    }
  }

  // Generate and download a sample Excel file template
  function downloadSampleTemplate() {
    const rows = [
      ["Date", "Title", "Category", "Paid To", "Method", "From Bank", "To Bank", "Amount", "Note"],
      ["2026-10-15", "Steel Rod Purchase", "Raw Material", "Arafat", "Bank", "Islami Bank", "City Bank", 35000, "500kg BSRM rod"],
      ["2026-10-14", "Truck Freight Fare", "Transport", "Karim Transport", "Cash", "", "", 3500, "Factory to project site"],
      ["2026-10-13", "Daily Labour Wages", "Labour / Wages", "Workshop Team", "Cash", "", "", 6000, "Daily wages 4 persons"],
      ["2026-10-12", "Office Tea & Snacks", "Food & Tea", "Local Store", "bKash", "", "", 450, "Weekly tea bill"],
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [
      { wch: 12 },
      { wch: 25 },
      { wch: 16 },
      { wch: 20 },
      { wch: 10 },
      { wch: 16 },
      { wch: 16 },
      { wch: 12 },
      { wch: 30 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Expenses_Template");
    XLSX.writeFile(wb, "CEW_Expense_Import_Template.xlsx");
  }

  // Parse Excel Date helper
  function normalizeDate(val) {
    if (!val) return today();
    if (val instanceof Date && !isNaN(val.getTime())) {
      return toStr(val);
    }
    if (typeof val === "number") {
      // Excel serial date code
      const parsed = XLSX.SSF.parse_date_code(val);
      if (parsed) {
        return `${parsed.y}-${pad(parsed.m)}-${pad(parsed.d)}`;
      }
    }
    const s = String(val).trim();
    // Match YYYY-MM-DD
    if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(s)) {
      const [y, m, d] = s.split("-").map(Number);
      return `${y}-${pad(m)}-${pad(d)}`;
    }
    // Match DD/MM/YYYY or DD-MM-YYYY
    const dmy = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (dmy) {
      return `${dmy[3]}-${pad(dmy[2])}-${pad(dmy[1])}`;
    }
    return today();
  }

  // Read and parse uploaded file (.xlsx, .xls, .csv)
  function handleFileSelected(file) {
    if (!file) return;
    setImportErr("");
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array", cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        if (!sheet) throw new Error("No sheet found in Excel file.");

        const json = XLSX.utils.sheet_to_json(sheet, { defval: "" });
        if (!json || json.length === 0) {
          throw new Error("No data rows found in Excel sheet.");
        }

        const clientMap = new Map();
        clients.forEach((c) => {
          if (c.name) clientMap.set(c.name.trim().toLowerCase(), c);
        });

        const parsedRows = [];
        let skipped = 0;

        json.forEach((row, idx) => {
          // Normalize column headers by lowercase trimming
          const keys = Object.keys(row);
          const findVal = (patterns) => {
            const foundKey = keys.find((k) => {
              const lower = k.trim().toLowerCase();
              return patterns.some((p) => lower.includes(p));
            });
            return foundKey ? row[foundKey] : "";
          };

          const rawTitle = findVal(["title", "expense title", "particulars", "description", "বিবরণ", "নাম"]);
          const rawAmount = findVal(["amount", "tk", "taka", "টাকা", "পরিমাণ"]);
          const cleanAmount = typeof rawAmount === "number" ? rawAmount : parseFloat(String(rawAmount).replace(/[^0-9.-]/g, ""));

          if (!rawTitle || isNaN(cleanAmount) || cleanAmount <= 0) {
            skipped++;
            return;
          }

          const rawDate = findVal(["date", "expense date", "তারিখ"]);
          const rawCat = findVal(["category", "ক্যাটাগরি", "খাত"]);
          const rawPaidTo = findVal(["paid to", "paid_to", "supplier", "dealer", "party", "person", "কাকে প্রদান"]);
          const rawMethod = findVal(["method", "payment method", "মাধ্যম"]);
          const rawFromBank = findVal(["from bank", "from", "from account"]);
          const rawToBank = findVal(["to bank", "to", "to account"]);
          const rawNote = findVal(["note", "remarks", "মন্তব্য"]);

          // Match category
          let matchedCat = CATEGORIES.find((c) => c.toLowerCase() === String(rawCat).trim().toLowerCase());
          if (!matchedCat) matchedCat = "Other";

          // Match payment method
          let matchedMethod = "Cash";
          const mLower = String(rawMethod).trim().toLowerCase();
          if (mLower.includes("bank")) matchedMethod = "Bank";
          else if (mLower.includes("bkash")) matchedMethod = "bKash";
          else if (mLower.includes("nagad")) matchedMethod = "Nagad";
          else if (mLower.includes("cheque")) matchedMethod = "Cheque";
          else if (mLower.includes("cash")) matchedMethod = "Cash";
          else if (rawFromBank || rawToBank) matchedMethod = "Bank";

          const paidToTrimmed = String(rawPaidTo).trim();
          const existingClient = clientMap.get(paidToTrimmed.toLowerCase());

          parsedRows.push({
            sl: idx + 1,
            date: normalizeDate(rawDate),
            title: String(rawTitle).trim(),
            category: matchedCat,
            amount: cleanAmount,
            paid_to: paidToTrimmed,
            payment_method: matchedMethod,
            from_bank: String(rawFromBank).trim(),
            to_bank: String(rawToBank).trim(),
            note: String(rawNote).trim(),
            isDealerOrSupplier: Boolean(existingClient),
            clientType: existingClient?.type || "supplier",
          });
        });

        if (parsedRows.length === 0) {
          throw new Error("Could not find any rows with valid Title and Amount.");
        }

        const previewTotal = parsedRows.reduce((s, r) => s + r.amount, 0);
        setImportPreview({
          fileName: file.name,
          rows: parsedRows,
          totalAmount: previewTotal,
          skipped,
        });
      } catch (err) {
        setImportErr(err.message || "Failed to parse Excel file.");
        setImportPreview(null);
      }
    };

    reader.readAsArrayBuffer(file);
  }

  // Execute Bulk Import
  async function handleExecuteImport() {
    if (!importPreview || !importPreview.rows.length) return;
    setImportBusy(true);
    setImportErr("");

    try {
      const payload = {
        items: importPreview.rows.map((r) => ({
          expense_date: r.date,
          title: r.title,
          category: r.category,
          amount: r.amount,
          payment_method: r.payment_method,
          from_bank: r.from_bank,
          to_bank: r.to_bank,
          paid_to: r.paid_to,
          sync_to_ledger: Boolean(importSyncToLedger && r.paid_to && r.category !== "Salary"),
          client_type: r.clientType || "supplier",
          note: r.note,
        })),
      };

      const res = await fetch("/api/expenses/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.status === 401) return router.replace("/");
      const data = await res.json();

      if (!res.ok) {
        setImportErr(data.error || "Failed to import expenses.");
      } else {
        const syncMsg = data.synced > 0 ? ` (${data.synced} payments synced to Purchase ledger)` : "";
        setOk(`Successfully imported ${data.imported} expenses${syncMsg}!`);
        setShowImportModal(false);
        setImportPreview(null);
        await load();
        await loadClients();
      }
    } catch (e) {
      setImportErr(e.message || "Network error occurred during import.");
    } finally {
      setImportBusy(false);
    }
  }

  return (
    <main className="be-wrapper">
      <header className="be-header">
        <div className="be-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/cew-icon.png" alt="CEW" className="be-logo" />
          <div className="be-title-box">
            <h1>Expense</h1>
            <p>Chowdhury Engineering Works • Daily, Weekly, Monthly &amp; Yearly Expenses</p>
          </div>
        </div>
        <nav className="be-nav-actions">
          <Link href="/" className="be-nav-btn" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <HomeIcon size={14} /> Home
          </Link>
        </nav>
      </header>

      {/* Top Filter Bar (Synchronized with Expense Table) */}
      <div className="ex-kpi-filter-bar">
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span className="ex-kpi-filter-label">
            <BarChartIcon size={15} style={{ color: "#2563eb" }} /> Filter Period:
          </span>
          <div className="be-duration-group">
            {MODES.map((m) => (
              <button
                key={m.key}
                type="button"
                className={`be-duration-btn ${mode === m.key ? "active" : ""}`}
                onClick={() => {
                  setMode(m.key);
                  if (m.key === "week") {
                    setRef(weekStart(ref || today()));
                  }
                }}
              >
                {m.key === "all" ? "All Time" : m.label}
              </button>
            ))}
          </div>
        </div>

        {mode !== "all" && (
          <div className="ex-nav-group">
            <button
              type="button"
              className="ex-arrow"
              onClick={() => setRef(shiftRef(mode, ref, -1))}
              aria-label="Previous"
              title="Previous period"
            >
              <ChevronLeftIcon size={12} />
            </button>
            <span
              className="ex-range-label"
              style={{
                fontSize: "0.85rem",
                fontWeight: 700,
                color: "#1e3a8a",
                background: "#f8fafc",
                padding: "5px 12px",
                borderRadius: 7,
                border: "1px solid #e2e8f0",
                minWidth: 160,
                textAlign: "center",
              }}
            >
              {range.label}
            </span>
            <button
              type="button"
              className="ex-arrow"
              onClick={() => setRef(shiftRef(mode, ref, 1))}
              aria-label="Next"
              title="Next period"
            >
              <ChevronRightIcon size={12} />
            </button>
            <button
              type="button"
              className="be-nav-btn"
              style={{ fontSize: "0.76rem", padding: "4px 10px" }}
              onClick={() => {
                if (mode === "week") {
                  setRef(weekStart(today()));
                } else {
                  setRef(today());
                }
              }}
            >
              Current
            </button>
            <input
              type="date"
              className="be-input"
              style={{ width: 125, padding: "3px 6px", fontSize: "0.76rem", height: 28 }}
              value={ref}
              onChange={(e) => {
                if (!e.target.value) return;
                if (mode === "week") {
                  setRef(weekStart(e.target.value));
                } else {
                  setRef(e.target.value);
                }
              }}
              aria-label="Jump to date"
            />
          </div>
        )}
      </div>

      {/* KPI */}
      <section className="be-stats-grid">
        <div className="be-stat-card">
          <span className="label">Business Expense • {kpiRange.label}</span>
          <span className="val">৳ {fmt(kpiActualExpense)}</span>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4, fontSize: "0.76rem", fontWeight: 600, color: "#64748b" }}>
            <span>Bank: <span style={{ color: "#0f172a", fontWeight: 700 }}>৳ {fmt(kpiBankExpense)}</span></span>
            <span style={{ color: "#cbd5e1" }}>•</span>
            <span>Cash: <span style={{ color: "#0f172a", fontWeight: 700 }}>৳ {fmt(kpiCashExpense)}</span></span>
          </div>
        </div>
        <div className="be-stat-card deposit">
          <span className="label">Bank Deposits • {kpiRange.label}</span>
          <span className="val">৳ {fmt(kpiDeposits)}</span>
        </div>
        <div className="be-stat-card bank">
          <span className="label">Live Bank Balance (Net)</span>
          <span className="val">৳ {fmt(bankAccountSummary.netBalance)}</span>
        </div>
        <div className="be-stat-card inflow" style={{ background: "#eff6ff", borderColor: "#bfdbfe" }}>
          <span className="label" style={{ color: "#1e40af" }}>
            Cash Inflow • {kpiRange.label}
          </span>
          <span className="val" style={{ color: "#1d4ed8" }}>
            ৳ {fmt(kpiMode === "all" ? kpiCashSummary.allTimeSalesCash : kpiCashSummary.periodSalesCash)}
          </span>
        </div>
        <div className="be-stat-card cash" style={{ background: "#f0fdf4", borderColor: "#bbf7d0" }}>
          <span className="label" style={{ color: "#166534" }}>
            Cash in Hand • {kpiRange.label}
          </span>
          <span className="val" style={{ color: (kpiMode === "all" ? kpiCashSummary.allTimeNetCashInHand : kpiCashSummary.totalClosingCashInHand) >= 0 ? "#15803d" : "#b91c1c" }}>
            ৳ {fmt(kpiMode === "all" ? kpiCashSummary.allTimeNetCashInHand : kpiCashSummary.totalClosingCashInHand)}
          </span>
          {kpiMode !== "all" && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, fontSize: "0.75rem", fontWeight: 600, color: "#64748b", flexWrap: "wrap" }}>
              <span>Prev: <span style={{ color: "#0f172a", fontWeight: 700 }}>৳ {fmt(kpiCashSummary.prevCashInHand)}</span></span>
              <span style={{ color: "#cbd5e1" }}>•</span>
              <span>
                {kpiMode === "daily" ? "Today" : "Period"}:{" "}
                <span style={{ color: kpiCashSummary.periodNetCash >= 0 ? "#15803d" : "#b91c1c", fontWeight: 700 }}>
                  {kpiCashSummary.periodNetCash >= 0 ? "+" : "-"}৳ {fmt(Math.abs(kpiCashSummary.periodNetCash))}
                </span>
              </span>
            </div>
          )}
        </div>
      </section>


      {/* Entry form */}
      <section className="be-card">
        <div className="be-card-header">
          <h2 className="be-card-title">New Expense Entry</h2>
          <span style={{ fontSize: "0.82rem", color: "var(--be-text-muted)" }}>
            Record business costs and seamlessly sync dealer &amp; supplier ledger payments
          </span>
        </div>

        {err && (
          <div style={{ background: "#fee2e2", color: "#b91c1c", padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: "0.88rem", fontWeight: 600 }}>
            {err}
          </div>
        )}
        {ok && (
          <div style={{ background: "#ecfdf5", color: "#065f46", padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: "0.88rem", fontWeight: 600 }}>
            {ok}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Row 1 */}
          <div className="be-grid-4" style={{ marginBottom: 14 }}>
            <div className="be-field-group">
              <label htmlFor="ex-date">Date <span className="req">*</span></label>
              <input id="ex-date" type="date" className="be-input" value={form.expense_date} required
                onChange={(e) => setForm({ ...form, expense_date: e.target.value })} />
            </div>
            <div className="be-field-group">
              <label htmlFor="ex-title">Expense Title <span className="req">*</span></label>
              <input id="ex-title" className="be-input" placeholder="e.g. Truck fare, Worker wages, Steel purchase" value={form.title} required
                onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="be-field-group">
              <label htmlFor="ex-cat">Category</label>
              <select id="ex-cat" className="be-input" value={form.category}
                onChange={(e) => handleCategoryChange(e.target.value)}>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="be-field-group">
              <label htmlFor="ex-amount">Amount (৳) <span className="req">*</span></label>
              <input id="ex-amount" type="number" min="0" step="any" className="be-input" placeholder="0.00" value={form.amount} required
                onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>
          </div>

          {/* Row 2 */}
          <div className="be-grid-4" style={{ marginBottom: 14 }}>
            <div className="be-field-group">
              <label htmlFor="ex-method">Payment Method</label>
              <select id="ex-method" className="be-input" value={form.payment_method}
                onChange={(e) => setForm({ ...form, payment_method: e.target.value })}>
                {METHODS.map((m) => <option key={m}>{m}</option>)}
              </select>
            </div>

            {/* Paid To with searchable dropdown */}
            <div className="be-field-group" ref={paidToRef}>
              <label htmlFor="ex-paidto">
                {isStaffExpense
                  ? "Staff / Employee (Salary)"
                  : isSupplierPayment
                    ? "Supplier / Dealer Name"
                    : isDepositCategory(form.category)
                      ? "Deposited Bank Name / Account"
                      : "Paid To"}
              </label>
              <div className="ex-paidto-wrap">
                <input
                  id="ex-paidto"
                  className="be-input"
                  placeholder={
                    isStaffExpense
                      ? "Select staff (e.g. Shamim Accounts, Ikram...) or type name..."
                      : isSupplierPayment
                        ? "Select dealer / supplier (e.g. BSRM, Mujahid Dealer...) or type name..."
                        : isDepositCategory(form.category)
                          ? "Select bank (e.g. Islami Bank, City Bank...) or type bank name..."
                          : "e.g. Local store, Pump, Station, Driver, Self..."
                  }
                  value={form.paid_to}
                  autoComplete="off"
                  onFocus={() => {
                    if (isStaffExpense || isSupplierPayment || isDepositCategory(form.category)) {
                      setShowDropdown(true);
                    }
                  }}
                  onChange={(e) => {
                    const val = e.target.value;
                    setForm((prev) => {
                      let nextTitle = prev.title;
                      let nextToBank = prev.to_bank;
                      if (isStaffExpense) {
                        if (!prev.title || prev.title.startsWith("Salary -") || prev.title === "Staff Salary") {
                          nextTitle = val.trim() ? `Salary - ${val.trim()}` : `Staff Salary`;
                        }
                      } else if (isSupplierPayment) {
                        if (!prev.title || prev.title.startsWith("Supplier Payment -") || prev.title === "Supplier Payment") {
                          nextTitle = val.trim() ? `Supplier Payment - ${val.trim()}` : "Supplier Payment";
                        }
                      } else if (isDepositCategory(prev.category)) {
                        nextToBank = val;
                        if (!prev.title || prev.title === "Bank Deposit" || prev.title.startsWith("Bank Deposit -")) {
                          nextTitle = val.trim() ? `Bank Deposit - ${val.trim()}` : "Bank Deposit";
                        }
                      }
                      return {
                        ...prev,
                        paid_to: val,
                        to_bank: nextToBank,
                        title: nextTitle,
                      };
                    });
                    if (isStaffExpense || isSupplierPayment || isDepositCategory(form.category)) {
                      setShowDropdown(true);
                    }
                  }}
                />
                {showDropdown && (isStaffExpense || isSupplierPayment || isDepositCategory(form.category)) && (
                  <div className="ex-dropdown">
                    {isStaffExpense ? (
                      <>
                        <div className="ex-dropdown-header">
                          Company Staff List ({filteredStaff.length})
                        </div>
                        {filteredStaff.length === 0 ? (
                          <div className="ex-dropdown-empty">
                            No matching staff in list. You can add them below.
                          </div>
                        ) : (
                          filteredStaff.map((st) => (
                            <div
                              key={st}
                              className={`ex-dropdown-item ${form.paid_to.trim().toLowerCase() === st.toLowerCase() ? "active" : ""}`}
                              onClick={() => handleSelectStaff(st)}
                            >
                              <span style={{ fontWeight: 600 }}>{st}</span>
                              <span className="ex-tag-staff">Staff</span>
                            </div>
                          ))
                        )}
                        {form.paid_to.trim() &&
                          !allStaff.some(
                            (s) => s.toLowerCase() === form.paid_to.trim().toLowerCase()
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
                              onClick={() => handleAddCustomStaff(form.paid_to.trim())}
                            >
                              <span>+ Add "{form.paid_to.trim()}" as new Staff</span>
                              <span className="ex-tag-staff">New</span>
                            </div>
                          )}
                      </>
                    ) : isSupplierPayment ? (
                      <>
                        <div className="ex-dropdown-header">
                          Dealer &amp; Supplier List ({filteredClients.length})
                        </div>
                        {filteredClients.length === 0 ? (
                          <div className="ex-dropdown-empty">
                            No matching dealer or supplier. You can still use this as a free name.
                          </div>
                        ) : (
                          filteredClients.map((c) => {
                            const isSup = c.type === "supplier" || c.type === "client";
                            return (
                              <div
                                key={c.name}
                                className={`ex-dropdown-item ${form.paid_to === c.name ? "active" : ""}`}
                                onClick={() => handleSelectClient(c)}
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
                    ) : isDepositCategory(form.category) ? (
                      <>
                        <div className="ex-dropdown-header">
                          Popular Bangladesh Banks ({filteredBanks.length})
                        </div>
                        {filteredBanks.length === 0 ? (
                          <div className="ex-dropdown-empty">
                            No matching bank. You can still type any bank name.
                          </div>
                        ) : (
                          filteredBanks.map((b) => (
                            <div
                              key={b}
                              className={`ex-dropdown-item ${form.paid_to.trim().toLowerCase() === b.toLowerCase() ? "active" : ""}`}
                              onClick={() => handleSelectBank(b)}
                            >
                              <span style={{ fontWeight: 600 }}>{b}</span>
                              <span className="ex-method-pill bank" style={{ fontSize: "0.72rem" }}>Bank</span>
                            </div>
                          ))
                        )}
                        {form.paid_to.trim() &&
                          !POPULAR_BANKS.some(
                            (b) => b.toLowerCase() === form.paid_to.trim().toLowerCase()
                          ) && (
                            <div
                              className="ex-dropdown-item"
                              style={{
                                background: "#eff6ff",
                                color: "#1e40af",
                                borderTop: "1px dashed #bfdbfe",
                                fontWeight: 600,
                                cursor: "pointer",
                              }}
                              onClick={() => handleSelectBank(form.paid_to.trim())}
                            >
                              <span>+ Use "{form.paid_to.trim()}" as Bank</span>
                              <span className="ex-method-pill bank" style={{ fontSize: "0.72rem" }}>Custom</span>
                            </div>
                          )}
                      </>
                    ) : null}
                  </div>
                )}
              </div>
            </div>

            <div className="be-field-group">
              <label htmlFor="ex-phone">Phone No.</label>
              <input
                id="ex-phone"
                type="tel"
                className="be-input"
                placeholder="e.g. 01712345678"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>

            <div className="be-field-group">
              <label htmlFor="ex-note">Note</label>
              <input id="ex-note" className="be-input" placeholder="Optional remarks" value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })} />
            </div>
          </div>

          {/* Conditional Bank Fields: From Bank & To Bank (only for general bank payments, not Bank Deposit) */}
          {form.payment_method === "Bank" && !isDepositCategory(form.category) && (
            <div className="ex-bank-grid">
              <div className="be-field-group" ref={fromBankRef}>
                <label htmlFor="ex-from-bank">
                  From Bank / Account <span className="req">*</span>
                </label>
                <div className="ex-paidto-wrap">
                  <input
                    id="ex-from-bank"
                    className="be-input"
                    placeholder="Select bank or type account details..."
                    value={form.from_bank}
                    required
                    autoComplete="off"
                    onFocus={() => setShowFromBankDropdown(true)}
                    onChange={(e) => {
                      setForm({ ...form, from_bank: e.target.value });
                      setShowFromBankDropdown(true);
                    }}
                  />
                  {showFromBankDropdown && (
                    <div className="ex-dropdown" style={{ maxHeight: 220 }}>
                      <div className="ex-dropdown-header">
                        Select Bank ({filteredFromBanks.length})
                      </div>
                      {filteredFromBanks.length === 0 ? (
                        <div className="ex-dropdown-empty">
                          No matching preset bank. Your custom typed text will be saved.
                        </div>
                      ) : (
                        filteredFromBanks.map((b) => (
                          <div
                            key={b}
                            className={`ex-dropdown-item ${(form.from_bank || "").trim().toLowerCase() === b.toLowerCase() ? "active" : ""}`}
                            onClick={() => {
                              setForm((prev) => ({ ...prev, from_bank: b }));
                              setShowFromBankDropdown(false);
                            }}
                          >
                            <span style={{ fontWeight: 600 }}>{b}</span>
                            <span className="ex-method-pill bank" style={{ fontSize: "0.72rem" }}>Bank</span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="be-field-group" ref={toBankRef}>
                <label htmlFor="ex-to-bank">
                  To Bank / Account <span className="req">*</span>
                </label>
                <div className="ex-paidto-wrap">
                  <input
                    id="ex-to-bank"
                    className="be-input"
                    placeholder="Select bank or type account details..."
                    value={form.to_bank}
                    required
                    autoComplete="off"
                    onFocus={() => setShowToBankDropdown(true)}
                    onChange={(e) => {
                      setForm({ ...form, to_bank: e.target.value });
                      setShowToBankDropdown(true);
                    }}
                  />
                  {showToBankDropdown && (
                    <div className="ex-dropdown" style={{ maxHeight: 220 }}>
                      <div className="ex-dropdown-header">
                        Select Bank ({filteredToBanks.length})
                      </div>
                      {filteredToBanks.length === 0 ? (
                        <div className="ex-dropdown-empty">
                          No matching preset bank. Your custom typed text will be saved.
                        </div>
                      ) : (
                        filteredToBanks.map((b) => (
                          <div
                            key={b}
                            className={`ex-dropdown-item ${(form.to_bank || "").trim().toLowerCase() === b.toLowerCase() ? "active" : ""}`}
                            onClick={() => {
                              setForm((prev) => ({ ...prev, to_bank: b }));
                              setShowToBankDropdown(false);
                            }}
                          >
                            <span style={{ fontWeight: 600 }}>{b}</span>
                            <span className="ex-method-pill bank" style={{ fontSize: "0.72rem" }}>Bank</span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Bank Deposit Notification Banner */}
          {isDepositCategory(form.category) && (
            <div className="ex-sync-box" style={{ background: "#f0fdf4", borderColor: "#bbf7d0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ color: "#166534", fontSize: "0.88rem" }}>
                  <strong>Bank Deposit (Fund Movement):</strong> Deposited to <strong>{form.paid_to.trim() || "Bank"}</strong>. This will be credited to your <strong>Live Bank Balance</strong> and is <strong>excluded from actual business expenses</strong> to prevent double counting.
                </span>
              </div>
              <span className="ex-tag-supplier" style={{ background: "#dcfce7", color: "#15803d" }}>Fund Deposit</span>
            </div>
          )}

          {/* Staff Payroll Notification Banner (Only for Salary, NOT for Overtime) */}
          {isStaffExpense && form.paid_to.trim() && (
            <div className="ex-sync-box" style={{ background: "#fdf2f8", borderColor: "#fbcfe8" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ color: "#831843", fontSize: "0.88rem" }}>
                  <strong>Internal Staff Record (Salary):</strong> Payment to <strong>{form.paid_to.trim()}</strong> is recorded for the <strong>Salary &amp; Staff Report</strong>.
                  <span style={{ display: "block", fontSize: "0.78rem", color: "#9d174d", marginTop: 2 }}>
                    (Internal staff records are kept completely separate and will never affect Dealer / Supplier Purchase ledger).
                  </span>
                </span>
              </div>
              <span className="ex-tag-staff">Staff Payroll</span>
            </div>
          )}

          {/* Sync to Ledger Notification Banner for Non-Staff and Non-Deposit */}
          {!isStaffExpense && !isDepositCategory(form.category) && form.paid_to.trim() && (
            matchedClient ? (
              <div className="ex-sync-box">
                <label className="ex-sync-label">
                  <input
                    type="checkbox"
                    checked={syncToLedger}
                    onChange={(e) => setSyncToLedger(e.target.checked)}
                  />
                  <span>
                    <strong>Sync to Purchase Ledger:</strong> Record this expense as a <strong>Payment (৳ {fmt(form.amount || 0)})</strong> in{" "}
                    <strong>{matchedClient.name}</strong> ({matchedClient.type === "dealer" ? "Dealer" : "Supplier"})'s ledger.
                  </span>
                </label>
                <span className={matchedClient.type === "dealer" ? "ex-tag-dealer" : "ex-tag-supplier"}>
                  {matchedClient.type === "dealer" ? "Dealer Account" : "Supplier Account"}
                </span>
              </div>
            ) : isSupplierPayment ? (
              <div className="ex-sync-box manual-prompt">
                <label className="ex-sync-label">
                  <input
                    type="checkbox"
                    checked={syncToLedger}
                    onChange={(e) => setSyncToLedger(e.target.checked)}
                  />
                  <span>
                    Add <strong>"{form.paid_to.trim()}"</strong> as a new entity and sync to Purchase as:
                  </span>
                </label>
                {syncToLedger && (
                  <div style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                    <button
                      type="button"
                      className={`be-duration-btn ${customClientType === "supplier" ? "active" : ""}`}
                      style={{ padding: "4px 10px", fontSize: "0.78rem" }}
                      onClick={() => setCustomClientType("supplier")}
                    >
                      Supplier
                    </button>
                    <button
                      type="button"
                      className={`be-duration-btn ${customClientType === "dealer" ? "active" : ""}`}
                      style={{ padding: "4px 10px", fontSize: "0.78rem" }}
                      onClick={() => setCustomClientType("dealer")}
                    >
                      Dealer
                    </button>
                  </div>
                )}
              </div>
            ) : null
          )}

          <button id="ex-save" type="submit" className="be-btn be-btn-primary" disabled={busy}
            style={{ padding: "10px 22px", borderRadius: 8, fontWeight: 700, border: "none", cursor: "pointer" }}>
            {busy ? "Saving..." : "Save Expense"}
          </button>
        </form>
      </section>

      {/* Records */}
      <section className="be-card">
        <div className="be-card-header">
          <h2 className="be-card-title">Expense Records</h2>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              className="be-nav-btn btn-import-open"
              onClick={() => {
                setShowImportModal(true);
                setImportPreview(null);
                setImportErr("");
              }}
              title="Import past expenses from Excel or CSV file"
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <UploadIcon size={14} /> Import Excel
            </button>
            <button
              type="button"
              className="be-nav-btn"
              onClick={downloadSampleTemplate}
              title="Download formatted sample Excel template"
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <FileTextIcon size={14} /> Sample Template
            </button>
            {catFilter === "Salary" ? (
              <button
                type="button"
                className="be-nav-btn"
                onClick={() => openExcelLanguageModal("salary", `Staff / Salary Report`)}
                disabled={!filtered.length}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  background: "#991b1b",
                  color: "#ffffff",
                  borderColor: "#991b1b",
                  fontWeight: 700,
                }}
                title="Download comprehensive multi-sheet Staff Report (Date-wise, Month-wise, Employee breakdown)"
              >
                <FileTextIcon size={14} /> Export {catFilter} Report
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="be-nav-btn"
                  onClick={() => openExcelLanguageModal("expenses", "Expense & Fund Transfer Report")}
                  disabled={!filtered.length}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                >
                  <FileTextIcon size={14} /> Export Excel
                </button>
                {expenses.some((x) => x.category === "Salary") && (
                  <button
                    type="button"
                    className="be-nav-btn"
                    onClick={() => openExcelLanguageModal("salary", "Staff / Salary Report")}
                    style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                    title="Export multi-sheet Staff breakdown report for all salary payments"
                  >
                    <FileTextIcon size={14} /> Staff Report
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        <div className="ex-period-bar">
          <div className="be-duration-group">
            {MODES.map((m) => (
              <button key={m.key} type="button"
                className={`be-duration-btn ${mode === m.key ? "active" : ""}`}
                onClick={() => {
                  setMode(m.key);
                  if (m.key === "week") {
                    setRef(weekStart(ref || today()));
                  }
                }}>
                {m.label}
              </button>
            ))}
          </div>

          {mode !== "all" && (
            <div className="ex-nav-group">
              <button type="button" className="ex-arrow" onClick={() => setRef(shiftRef(mode, ref, -1))} aria-label="Previous">
                <ChevronLeftIcon size={12} />
              </button>
              <span className="ex-range-label">{range.label}</span>
              <button type="button" className="ex-arrow" onClick={() => setRef(shiftRef(mode, ref, 1))} aria-label="Next">
                <ChevronRightIcon size={12} />
              </button>
              <button
                type="button"
                className="be-nav-btn"
                onClick={() => {
                  if (mode === "week") {
                    setRef(weekStart(today()));
                  } else {
                    setRef(today());
                  }
                }}
                title={mode === "week" ? "Current Week (Saturday to Friday)" : undefined}
              >
                {mode === "day" ? "Today" : mode === "week" ? "This Week" : mode === "month" ? "This Month" : "This Year"}
              </button>
              <input
                type="date"
                className="be-input"
                style={{ width: 150 }}
                value={ref}
                onChange={(e) => {
                  if (!e.target.value) return;
                  if (mode === "week") {
                    setRef(weekStart(e.target.value));
                  } else {
                    setRef(e.target.value);
                  }
                }}
                aria-label="Jump to date"
              />
            </div>
          )}
        </div>

        <div className="ex-filters">
          <input className="be-input" placeholder="Search title, paid to, method, note..." value={search}
            onChange={(e) => setSearch(e.target.value)} />
          <select className="be-input" value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
            <option value="all">All Categories</option>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
          {(catFilter === "Salary" || catFilter === "Overtime") && (
            <button
              type="button"
              className="be-nav-btn"
              onClick={() => openExcelLanguageModal("salary", `${catFilter} Report`)}
              disabled={!filtered.length}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: "#991b1b",
                color: "#ffffff",
                borderColor: "#991b1b",
                fontWeight: 700,
                fontSize: "0.82rem",
              }}
              title={`Download ${catFilter} Breakdown Excel file`}
            >
              <FileTextIcon size={14} /> Download {catFilter} Report (Excel)
            </button>
          )}
        </div>

        {(catFilter === "Salary" || catFilter === "Overtime") && (
          <div
            className="ex-sync-box"
            style={{
              background: "#fef2f2",
              borderColor: "#fecaca",
              color: "#991b1b",
              margin: "6px 0 14px",
              padding: "10px 14px",
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontWeight: 600 }}>
              <FileTextIcon size={16} /> {catFilter} Filter Active ({filtered.length} entries • Total: ৳ {fmt(total)}): Excel export includes (1) Date-wise total, (2) Month-wise total, (3) Employee summary, and (4) Payment methods.
            </span>
            <button
              type="button"
              className="be-btn be-btn-primary"
              style={{ padding: "5px 14px", fontSize: "0.78rem", borderRadius: 7 }}
              onClick={() => openExcelLanguageModal("salary", `${catFilter} Report`)}
            >
              Export {catFilter} Excel
            </button>
          </div>
        )}

        {byCategory.length > 0 && (
          <div className="be-form-section">
            <div className="be-section-heading"><span>Category Breakdown</span></div>
            <div className="ex-breakdown">
              {byCategory.map(([c, v]) => (
                <div className="ex-bar-row" key={c}>
                  <strong>{c}</strong>
                  <div className="ex-bar-track">
                    <div className="ex-bar-fill" style={{ width: `${total ? (v / total) * 100 : 0}%` }} />
                  </div>
                  <span style={{ textAlign: "right" }}>
                    ৳ {fmt(v)} <span style={{ color: "var(--be-text-muted)" }}>({total ? ((v / total) * 100).toFixed(1) : 0}%)</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="be-ledger-table-wrap">
          <table className="be-ledger-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Title</th>
                <th>Category</th>
                <th>Paid To</th>
                <th>Method / Bank</th>
                <th style={{ textAlign: "right" }}>Amount</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="ex-empty">No expenses found for this period.</td></tr>
              )}
              {byDay.map(([day, list]) => (
                <DayGroup
                  key={day}
                  day={day}
                  list={list}
                  onSelect={(x) => {
                    setSelectedExpenseForModal(x);
                    setIsEditingModal(false);
                    setEditModalData(null);
                    setModalErr("");
                  }}
                  showHeader={mode !== "day"}
                />
              ))}
            </tbody>
            {filtered.length > 0 && (
              <tfoot className="ex-tfoot">
                <tr className="ex-tfoot-expense">
                  <td colSpan={5} style={{ color: "#0f172a" }}>
                    <strong>ACTUAL BUSINESS EXPENSES ({actualExpenses.length} entries)</strong>
                  </td>
                  <td style={{ textAlign: "right", color: "#0f172a", fontWeight: 800 }}>৳ {fmt(totalActualExpense)}</td>
                  <td></td>
                </tr>
                {totalDeposits > 0 && (
                  <tr className="ex-tfoot-deposit">
                    <td colSpan={5} style={{ color: "#166534" }}>
                      <strong style={{ color: "#166534" }}>BANK DEPOSITS / FUND TRANSFERS ({depositTransfers.length} entries)</strong>
                      <span style={{ fontSize: "0.75rem", marginLeft: 8, color: "#15803d", fontWeight: 500 }}>(Excluded from expense to prevent double counting)</span>
                    </td>
                    <td style={{ textAlign: "right", fontWeight: 800, color: "#15803d" }}>৳ {fmt(totalDeposits)}</td>
                    <td></td>
                  </tr>
                )}
              </tfoot>
            )}
          </table>
        </div>
      </section>

      {/* Excel Import Modal */}
      {showImportModal && (
        <div className="ex-modal-overlay" onClick={() => !importBusy && setShowImportModal(false)}>
          <div className="ex-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ex-modal-header">
              <div>
                <h3 className="ex-modal-title">Import Expenses from Excel / CSV</h3>
                <p className="ex-modal-subtitle">Upload past business expenses &amp; optionally sync payments to dealer/supplier ledger</p>
              </div>
              <button
                type="button"
                className="ex-modal-close"
                onClick={() => !importBusy && setShowImportModal(false)}
                title="Close"
                style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}
              >
                <XIcon size={16} />
              </button>
            </div>

            <div className="ex-modal-body">
              {importErr && (
                <div style={{ background: "#fee2e2", color: "#b91c1c", padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: "0.86rem", fontWeight: 600 }}>
                  {importErr}
                </div>
              )}

              {/* Dropzone */}
              <div
                className={`ex-dropzone ${dragActive ? "drag-active" : ""}`}
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragActive(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleFileSelected(e.dataTransfer.files[0]);
                  }
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={(e) => e.target.files && handleFileSelected(e.target.files[0])}
                />
                <div className="ex-dropzone-icon" style={{ display: "flex", justifyContent: "center", color: "#991b1b" }}>
                  <FolderIcon size={40} />
                </div>
                <div className="ex-dropzone-title">
                  {importPreview ? `File Loaded: ${importPreview.fileName}` : "Click or Drag & Drop Excel/CSV File Here"}
                </div>
                <div className="ex-dropzone-desc">
                  Supports .xlsx, .xls, .csv files. Columns: Date, Title, Category, Paid To, Method, From Bank, To Bank, Amount, Note
                </div>
              </div>

              {/* Options bar */}
              <div className="ex-modal-options">
                <label className="ex-sync-label">
                  <input
                    type="checkbox"
                    checked={importSyncToLedger}
                    onChange={(e) => setImportSyncToLedger(e.target.checked)}
                  />
                  <span>
                    Auto-sync matching <strong>Dealer / Supplier</strong> records to Purchase ledger
                  </span>
                </label>
                <button
                  type="button"
                  className="be-nav-btn"
                  onClick={downloadSampleTemplate}
                  style={{ fontSize: "0.78rem", display: "inline-flex", alignItems: "center", gap: 5 }}
                >
                  <FileTextIcon size={13} /> Download Sample Template
                </button>
              </div>

              {/* Preview Table */}
              {importPreview && (
                <div className="ex-preview-wrap">
                  <div className="ex-preview-header">
                    <span>
                      Preview: <strong>{importPreview.rows.length} valid rows found</strong>
                      {importPreview.skipped > 0 && ` (${importPreview.skipped} empty/invalid skipped)`}
                    </span>
                    <span style={{ color: "#991b1b" }}>
                      Total: <strong>৳ {fmt(importPreview.totalAmount)}</strong>
                    </span>
                  </div>

                  <div className="ex-preview-scroll">
                    <table className="ex-preview-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Date</th>
                          <th>Title</th>
                          <th>Category</th>
                          <th>Paid To</th>
                          <th>Method / Bank</th>
                          <th>Note</th>
                          <th style={{ textAlign: "right" }}>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importPreview.rows.map((r, i) => (
                          <tr key={i}>
                            <td>{i + 1}</td>
                            <td style={{ whiteSpace: "nowrap" }}>{r.date}</td>
                            <td style={{ fontWeight: 600 }}>{r.title}</td>
                            <td><span className="ex-cat-tag">{r.category}</span></td>
                            <td>
                              <span>{r.paid_to || "-"}</span>
                              {r.isDealerOrSupplier && (
                                <span className={r.clientType === "dealer" ? "ex-tag-dealer" : "ex-tag-supplier"} style={{ marginLeft: 6 }}>
                                  {r.clientType === "dealer" ? "Dealer" : "Supplier"}
                                </span>
                              )}
                            </td>
                            <td>
                              {r.payment_method === "Bank" ? (
                                <span className="ex-method-pill bank">
                                  {r.from_bank && r.to_bank ? `${r.from_bank} → ${r.to_bank}` : "Bank"}
                                </span>
                              ) : (
                                <span className="ex-method-pill">{r.payment_method}</span>
                              )}
                            </td>
                            <td style={{ color: "#64748b" }}>{r.note || "-"}</td>
                            <td style={{ textAlign: "right", fontWeight: 700 }}>৳ {fmt(r.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="ex-modal-footer">
              <button
                type="button"
                className="be-nav-btn"
                disabled={importBusy}
                onClick={() => setShowImportModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="be-btn be-btn-primary"
                disabled={!importPreview || importBusy}
                onClick={handleExecuteImport}
                style={{ padding: "8px 18px", borderRadius: 8, fontWeight: 700 }}
              >
                {importBusy
                  ? "Importing..."
                  : `Confirm & Import ${importPreview ? `(${importPreview.rows.length} Records)` : ""}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Expense Detail & Edit Popup Modal */}
      {selectedExpenseForModal && (
        <div
          className="ex-modal-overlay"
          style={{ zIndex: 1200 }}
          onClick={() => {
            if (isEditingModal && !confirm("Discard unsaved changes?")) return;
            setSelectedExpenseForModal(null);
            setIsEditingModal(false);
            setEditModalData(null);
            setModalErr("");
          }}
        >
          <div
            className="ex-modal"
            style={{ maxWidth: 650 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="ex-modal-header" style={{ background: isEditingModal ? "#fffbeb" : "#f8fafc" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span
                  style={{
                    background: isEditingModal ? "#f59e0b" : "#991b1b",
                    color: "#ffffff",
                    padding: "3px 9px",
                    borderRadius: "6px",
                    fontSize: "0.72rem",
                    fontWeight: 800,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                  }}
                >
                  {isEditingModal ? "✏️ Edit Mode" : "Expense Details"}
                </span>
                <h3 className="ex-modal-title" style={{ margin: 0, color: "#0f172a", fontSize: "1.1rem" }}>
                  {isEditingModal ? "Edit Expense Entry" : selectedExpenseForModal.title}
                </h3>
              </div>
              <button
                type="button"
                className="ex-modal-close"
                onClick={() => {
                  if (isEditingModal && !confirm("Discard unsaved changes?")) return;
                  setSelectedExpenseForModal(null);
                  setIsEditingModal(false);
                  setEditModalData(null);
                  setModalErr("");
                }}
                aria-label="Close"
              >
                <XIcon size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="ex-modal-body" style={{ padding: "20px 24px" }}>
              {modalErr && (
                <div className="be-msg err" style={{ marginBottom: 16 }}>
                  {modalErr}
                </div>
              )}

              {!isEditingModal ? (
                <>
                  {/* Amount Banner */}
                  <div className="ex-detail-amount-card">
                    <div>
                      <div className="ex-detail-label">
                        {isDepositCategory(selectedExpenseForModal.category)
                          ? "Bank Deposit Amount (Fund Movement)"
                          : "Total Expense Amount"}
                      </div>
                      <div
                        className="ex-detail-amount-val"
                        style={{ color: isDepositCategory(selectedExpenseForModal.category) ? "#15803d" : undefined }}
                      >
                        ৳ {fmt(selectedExpenseForModal.amount)}
                      </div>
                    </div>
                    <span
                      className={`ex-cat-tag ${isDepositCategory(selectedExpenseForModal.category) ? "deposit" : ""}`}
                      style={{ fontSize: "0.85rem", padding: "6px 12px" }}
                    >
                      {selectedExpenseForModal.category}
                    </span>
                  </div>

                  {isDepositCategory(selectedExpenseForModal.category) && (
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
                      <div className="ex-detail-value">{prettyDate(selectedExpenseForModal.expense_date)} ({selectedExpenseForModal.expense_date})</div>
                    </div>

                    <div className="ex-detail-item">
                      <div className="ex-detail-label">Title</div>
                      <div className="ex-detail-value">{selectedExpenseForModal.title}</div>
                    </div>

                    <div className="ex-detail-item">
                      <div className="ex-detail-label">Paid To / Recipient</div>
                      <div className="ex-detail-value">
                        {selectedExpenseForModal.paid_to || "—"}
                        {Boolean(selectedExpenseForModal.linked_client || selectedExpenseForModal.linked_entry_id) && (
                          <span className="ex-ledger-badge" style={{ marginLeft: 6 }}>
                            <CheckIcon size={11} /> Ledger Synced
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="ex-detail-item">
                      <div className="ex-detail-label">Phone Number</div>
                      <div className="ex-detail-value">
                        {selectedExpenseForModal.phone ? (
                          <a
                            href={`tel:${selectedExpenseForModal.phone}`}
                            style={{ color: "#2563eb", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}
                          >
                            📞 {selectedExpenseForModal.phone}
                          </a>
                        ) : (
                          "—"
                        )}
                      </div>
                    </div>

                    <div className="ex-detail-item">
                      <div className="ex-detail-label">Payment Method</div>
                      <div className="ex-detail-value">
                        {selectedExpenseForModal.payment_method || "Cash"}
                      </div>
                    </div>

                    {selectedExpenseForModal.payment_method === "Bank" && (
                      <div className="ex-detail-item">
                        <div className="ex-detail-label">Bank Channel</div>
                        <div className="ex-detail-value">
                          {selectedExpenseForModal.from_bank && selectedExpenseForModal.to_bank
                            ? `${selectedExpenseForModal.from_bank} → ${selectedExpenseForModal.to_bank}`
                            : selectedExpenseForModal.from_bank || selectedExpenseForModal.to_bank || "—"}
                        </div>
                      </div>
                    )}

                    <div className="ex-detail-item" style={{ gridColumn: "1 / -1" }}>
                      <div className="ex-detail-label">Note / Remarks</div>
                      <div className="ex-detail-value" style={{ color: selectedExpenseForModal.note ? "#0f172a" : "#94a3b8" }}>
                        {selectedExpenseForModal.note || "No remarks added"}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                /* Edit Form */
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <label className="be-label" style={{ fontSize: "0.8rem", fontWeight: 600 }}>Date *</label>
                      <input
                        type="date"
                        className="be-input"
                        value={editModalData.expense_date}
                        onChange={(e) => setEditModalData({ ...editModalData, expense_date: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="be-label" style={{ fontSize: "0.8rem", fontWeight: 600 }}>Expense Title *</label>
                      <input
                        type="text"
                        className="be-input"
                        value={editModalData.title}
                        onChange={(e) => setEditModalData({ ...editModalData, title: e.target.value })}
                        placeholder="Expense title"
                      />
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <label className="be-label" style={{ fontSize: "0.8rem", fontWeight: 600 }}>Category *</label>
                      <select
                        className="be-input"
                        value={editModalData.category}
                        onChange={(e) => handleEditModalCategoryChange(e.target.value)}
                      >
                        {CATEGORIES.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="be-label" style={{ fontSize: "0.8rem", fontWeight: 600 }}>Amount (৳) *</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="be-input"
                        value={editModalData.amount}
                        onChange={(e) => setEditModalData({ ...editModalData, amount: e.target.value })}
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  {/* Paid To with searchable dropdown */}
                  <div ref={modalPaidToRef}>
                    <label className="be-label" style={{ fontSize: "0.8rem", fontWeight: 600 }}>
                      {isDepositCategory(editModalData.category)
                        ? "Deposited Bank Name / Account *"
                        : isEditStaffExpense
                          ? "Staff / Employee (Salary)"
                          : isEditSupplierPayment
                            ? "Supplier / Dealer Name"
                            : "Paid To / Recipient"}
                    </label>
                    <div className="ex-paidto-wrap">
                      <input
                        type="text"
                        className="be-input"
                        placeholder={
                          isDepositCategory(editModalData.category)
                            ? "Select bank (e.g. Islami Bank, City Bank...) or type bank name..."
                            : isEditStaffExpense
                              ? "Select staff (e.g. Shamim Accounts, Ikram...) or type name..."
                              : isEditSupplierPayment
                                ? "Select dealer / supplier (e.g. BSRM, Mujahid Dealer...) or type name..."
                                : "Name of recipient, staff, or supplier"
                        }
                        value={editModalData.paid_to}
                        autoComplete="off"
                        onFocus={() => {
                          if (isDepositCategory(editModalData.category) || isEditStaffExpense || isEditSupplierPayment) {
                            setShowModalDropdown(true);
                          }
                        }}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditModalData((prev) => {
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
                          if (isDepositCategory(editModalData.category) || isEditStaffExpense || isEditSupplierPayment) {
                            setShowModalDropdown(true);
                          }
                        }}
                      />
                      {showModalDropdown && (isDepositCategory(editModalData.category) || isEditStaffExpense || isEditSupplierPayment) && (
                        <div className="ex-dropdown" style={{ maxHeight: 220 }}>
                          {isDepositCategory(editModalData.category) ? (
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
                                    className={`ex-dropdown-item ${(editModalData.paid_to || "").trim().toLowerCase() === b.toLowerCase() ? "active" : ""}`}
                                    onClick={() => handleSelectEditModalBank(b)}
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
                                    className={`ex-dropdown-item ${(editModalData.paid_to || "").trim().toLowerCase() === st.toLowerCase() ? "active" : ""}`}
                                    onClick={() => handleSelectEditModalStaff(st)}
                                  >
                                    <span style={{ fontWeight: 600 }}>{st}</span>
                                    <span className="ex-tag-staff">Staff</span>
                                  </div>
                                ))
                              )}
                              {(editModalData.paid_to || "").trim() &&
                                !allStaff.some(
                                  (s) => s.toLowerCase() === (editModalData.paid_to || "").trim().toLowerCase()
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
                                    onClick={() => handleAddCustomStaffToModal((editModalData.paid_to || "").trim())}
                                  >
                                    <span>+ Add "{(editModalData.paid_to || "").trim()}" as new Staff</span>
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
                                      className={`ex-dropdown-item ${editModalData.paid_to === c.name ? "active" : ""}`}
                                      onClick={() => handleSelectEditModalClient(c)}
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
                      <label className="be-label" style={{ fontSize: "0.8rem", fontWeight: 600 }}>Payment Method</label>
                      <select
                        className="be-input"
                        value={editModalData.payment_method}
                        onChange={(e) => setEditModalData({ ...editModalData, payment_method: e.target.value })}
                      >
                        <option value="Cash">Cash</option>
                        <option value="Bank">Bank Transfer</option>
                        <option value="Cheque">Cheque</option>
                        <option value="bKash">bKash</option>
                        <option value="Nagad">Nagad</option>
                        <option value="Rocket">Rocket</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="be-label" style={{ fontSize: "0.8rem", fontWeight: 600 }}>Phone No.</label>
                      <input
                        type="tel"
                        className="be-input"
                        value={editModalData.phone}
                        onChange={(e) => setEditModalData({ ...editModalData, phone: e.target.value })}
                        placeholder="e.g. 01712345678"
                      />
                    </div>
                  </div>

                  {editModalData.payment_method === "Bank" && !isDepositCategory(editModalData.category) && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <div ref={modalFromBankRef}>
                        <label className="be-label" style={{ fontSize: "0.8rem", fontWeight: 600 }}>
                          From Bank
                        </label>
                        <div className="ex-paidto-wrap">
                          <input
                            type="text"
                            className="be-input"
                            value={editModalData.from_bank}
                            placeholder="Select bank or type account..."
                            autoComplete="off"
                            onFocus={() => setShowModalFromBankDropdown(true)}
                            onChange={(e) => {
                              setEditModalData({ ...editModalData, from_bank: e.target.value });
                              setShowModalFromBankDropdown(true);
                            }}
                          />
                          {showModalFromBankDropdown && (
                            <div className="ex-dropdown" style={{ maxHeight: 200 }}>
                              <div className="ex-dropdown-header">Select Bank ({filteredModalFromBanks.length})</div>
                              {filteredModalFromBanks.length === 0 ? (
                                <div className="ex-dropdown-empty">No preset bank found. Your custom typed text will be saved.</div>
                              ) : (
                                filteredModalFromBanks.map((b) => (
                                  <div
                                    key={b}
                                    className={`ex-dropdown-item ${(editModalData.from_bank || "").trim().toLowerCase() === b.toLowerCase() ? "active" : ""}`}
                                    onClick={() => {
                                      setEditModalData((prev) => ({ ...prev, from_bank: b }));
                                      setShowModalFromBankDropdown(false);
                                    }}
                                  >
                                    <span style={{ fontWeight: 600 }}>{b}</span>
                                    <span className="ex-tag-supplier" style={{ background: "#dcfce7", color: "#15803d" }}>Bank</span>
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <div ref={modalToBankRef}>
                        <label className="be-label" style={{ fontSize: "0.8rem", fontWeight: 600 }}>
                          To Bank / Account
                        </label>
                        <div className="ex-paidto-wrap">
                          <input
                            type="text"
                            className="be-input"
                            value={editModalData.to_bank}
                            placeholder="Select bank or type account..."
                            autoComplete="off"
                            onFocus={() => setShowModalToBankDropdown(true)}
                            onChange={(e) => {
                              setEditModalData({ ...editModalData, to_bank: e.target.value });
                              setShowModalToBankDropdown(true);
                            }}
                          />
                          {showModalToBankDropdown && (
                            <div className="ex-dropdown" style={{ maxHeight: 200 }}>
                              <div className="ex-dropdown-header">Select Bank ({filteredModalToBanks.length})</div>
                              {filteredModalToBanks.length === 0 ? (
                                <div className="ex-dropdown-empty">No preset bank found. Your custom typed text will be saved.</div>
                              ) : (
                                filteredModalToBanks.map((b) => (
                                  <div
                                    key={b}
                                    className={`ex-dropdown-item ${(editModalData.to_bank || "").trim().toLowerCase() === b.toLowerCase() ? "active" : ""}`}
                                    onClick={() => {
                                      setEditModalData((prev) => ({ ...prev, to_bank: b }));
                                      setShowModalToBankDropdown(false);
                                    }}
                                  >
                                    <span style={{ fontWeight: 600 }}>{b}</span>
                                    <span className="ex-tag-supplier" style={{ background: "#dcfce7", color: "#15803d" }}>Bank</span>
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="be-label" style={{ fontSize: "0.8rem", fontWeight: 600 }}>Note / Remarks</label>
                    <input
                      type="text"
                      className="be-input"
                      value={editModalData.note}
                      onChange={(e) => setEditModalData({ ...editModalData, note: e.target.value })}
                      placeholder="Optional remarks"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="ex-modal-footer" style={{ justifyContent: "space-between" }}>
              {!isEditingModal ? (
                <>
                  <button
                    type="button"
                    onClick={handleDeleteFromModal}
                    disabled={modalBusy}
                    style={{
                      background: "#fee2e2",
                      color: "#991b1b",
                      border: "1px solid #fecaca",
                      padding: "8px 16px",
                      borderRadius: 8,
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
                      className="be-nav-btn"
                      style={{ padding: "8px 16px" }}
                      onClick={() => setSelectedExpenseForModal(null)}
                    >
                      Close
                    </button>
                    <button
                      type="button"
                      style={{
                        background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                        color: "#ffffff",
                        border: "none",
                        padding: "8px 18px",
                        borderRadius: 8,
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                      onClick={startEditingModal}
                    >
                      <EditIcon size={14} /> Edit Expense
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="be-nav-btn"
                    style={{ padding: "8px 16px" }}
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
                    style={{
                      background: "linear-gradient(135deg, #059669, #047857)",
                      color: "#ffffff",
                      border: "none",
                      padding: "8px 20px",
                      borderRadius: 8,
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                    onClick={handleSaveEditModal}
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

      {/* Excel Language Selection Modal & Translation Progress */}
      {excelLangModal.isOpen && (
        <div
          className="excel-lang-overlay"
          onClick={() => {
            if (!translatingExcel) setExcelLangModal((prev) => ({ ...prev, isOpen: false }));
          }}
        >
          <div className="excel-lang-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ background: "#dcfce7", color: "#15803d", width: 38, height: 38, borderRadius: 10, display: "grid", placeItems: "center" }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800, color: "#0f172a" }}>
                    Select Download Language
                  </h3>
                  <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "#64748b" }}>
                    {excelLangModal.title}
                  </p>
                </div>
              </div>
              {!translatingExcel && (
                <button
                  type="button"
                  onClick={() => setExcelLangModal((prev) => ({ ...prev, isOpen: false }))}
                  style={{ background: "transparent", border: "none", cursor: "pointer", color: "#94a3b8", padding: 4 }}
                >
                  <XIcon size={18} />
                </button>
              )}
            </div>

            {translatingExcel ? (
              <div style={{ padding: "16px 0", textAlign: "center" }}>
                <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#1e3a8a", marginBottom: 6 }}>
                  Translating and preparing Excel file... ({translatingProgress}%)
                </div>
                <p style={{ fontSize: "0.8rem", color: "#64748b", margin: "0 0 12px" }}>
                  Translating data entries into Bengali and styling the workbook. Please wait...
                </p>
                <div className="excel-lang-progress-track">
                  <div className="excel-lang-progress-bar" style={{ width: `${translatingProgress}%` }} />
                </div>
              </div>
            ) : (
              <>
                <p style={{ fontSize: "0.85rem", color: "#475569", margin: "10px 0 16px" }}>
                  Choose your preferred language format for this Excel (.xlsx) workbook export:
                </p>

                <div className="excel-lang-options">
                  <button
                    type="button"
                    className="excel-lang-btn bn"
                    onClick={() => {
                      if (excelLangModal.type === "salary") {
                        executeExportSalaryExcel("bn");
                      } else {
                        executeExportExcel("bn");
                      }
                    }}
                  >
                    <span style={{ fontSize: "1.3rem", marginBottom: 4 }}>🇧🇩</span>
                    <strong style={{ fontSize: "0.95rem", color: "#1e3a8a" }}>Bangla</strong>
                    <span className="excel-lang-badge" style={{ background: "#dbeafe", color: "#1e40af" }}>
                      Smart Translation
                    </span>
                  </button>

                  <button
                    type="button"
                    className="excel-lang-btn"
                    onClick={() => {
                      if (excelLangModal.type === "salary") {
                        executeExportSalaryExcel("en");
                      } else {
                        executeExportExcel("en");
                      }
                    }}
                  >
                    <span style={{ fontSize: "1.3rem", marginBottom: 4 }}>🇬🇧</span>
                    <strong style={{ fontSize: "0.95rem", color: "#0f172a" }}>English</strong>
                    <span className="excel-lang-badge" style={{ background: "#f1f5f9", color: "#475569" }}>
                      Original Data
                    </span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

function DayGroup({ day, list, onSelect, showHeader }) {
  const dayActual = list.filter((x) => !isDepositCategory(x.category)).reduce((s, x) => s + x.amount, 0);
  const dayDeposit = list.filter((x) => isDepositCategory(x.category)).reduce((s, x) => s + x.amount, 0);

  return (
    <>
      {showHeader && (
        <tr className="ex-day-row">
          <td colSpan={5}>
            <span>{DAYS[fromStr(day).getDay()]}, {prettyDate(day)}</span>
            {dayDeposit > 0 && (
              <span style={{ fontSize: "0.76rem", fontWeight: 500, marginLeft: 10, color: "#166534" }}>
                (Expense: ৳ {fmt(dayActual)} • Bank Deposit: ৳ {fmt(dayDeposit)})
              </span>
            )}
          </td>
          <td style={{ textAlign: "right" }}>৳ {fmt(dayActual)}</td>
          <td></td>
        </tr>
      )}
      {list.map((x) => {
        const isBank = x.payment_method === "Bank";
        const hasBankPair = x.from_bank && x.to_bank;
        const isDep = isDepositCategory(x.category);
        return (
          <tr
            key={x.id}
            onClick={() => onSelect(x)}
            className="ex-row-clickable"
            title="Click to view details, edit, or delete"
            style={isDep ? { background: "rgba(240, 253, 244, 0.45)" } : undefined}
          >
            <td style={{ whiteSpace: "nowrap" }}>{prettyDate(x.expense_date)}</td>
            <td style={{ fontWeight: 600 }}>{x.title}</td>
            <td>
              <span className={`ex-cat-tag ${isDep ? "deposit" : ""}`}>{x.category}</span>
              {isDep && <span className="ex-deposit-sub">Deposit (Not Expense)</span>}
            </td>
            <td>
              <div style={{ display: "inline-flex", alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ fontWeight: 600 }}>{x.paid_to || "-"}</span>
                {Boolean(x.linked_client || x.linked_entry_id) && (
                  <span className="ex-ledger-tick" title="Recorded as payment in Purchase ledger">
                    <CheckIcon size={10} />
                  </span>
                )}
              </div>
              {x.phone && (
                <span style={{ display: "block", fontSize: "0.75rem", color: "#64748b", marginTop: 2 }}>
                  📞 {x.phone}
                </span>
              )}
            </td>
            <td>
              {isBank ? (
                <span className="ex-method-pill bank" title={hasBankPair ? `${x.from_bank} → ${x.to_bank}` : (isDep ? `To: ${x.to_bank || x.from_bank || "Bank"}` : "Bank Transfer")}>
                  {hasBankPair ? `${x.from_bank} → ${x.to_bank}` : (x.from_bank || x.to_bank || "Bank")}
                </span>
              ) : (
                <span className="ex-method-pill">
                  {x.payment_method || "Cash"}
                </span>
              )}
            </td>
            <td style={{ textAlign: "right", fontWeight: 700, whiteSpace: "nowrap", color: isDep ? "#15803d" : undefined }}>
              ৳ {fmt(x.amount)}
            </td>
            <td style={{ color: "var(--be-text-muted)" }}>{x.note || "-"}</td>
          </tr>
        );
      })}
    </>
  );
}
