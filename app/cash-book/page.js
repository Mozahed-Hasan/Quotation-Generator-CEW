"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import TopPageNav from "@/lib/TopPageNav";
import * as XLSX from "xlsx-js-style";
import { exportReportToPdf } from "@/lib/pdfExport";
import { batchTranslateTable, toBengaliDigits } from "@/lib/translator";
import {
  HomeIcon,
  DownloadIcon,
  SearchIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  TrendingUpIcon,
  WalletIcon,
  ClipboardListIcon,
  CheckIcon,
  XIcon,
  EditIcon,
} from "@/lib/icons";
import "../bill-entry/entry.css";
import "./cash-book.css";

function formatNum(val, dec = 0) {
  const n = Number(val || 0);
  if (isNaN(n)) return "0";
  return n.toLocaleString("en-IN", {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  });
}

function getTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getStartOfWeek(dateStr) {
  const d = new Date(dateStr);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday as first day
  const monday = new Date(d.setDate(diff));
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, "0")}-${String(monday.getDate()).padStart(2, "0")}`;
}

function getEndOfWeek(dateStr) {
  const start = new Date(getStartOfWeek(dateStr));
  const sunday = new Date(start.setDate(start.getDate() + 6));
  return `${sunday.getFullYear()}-${String(sunday.getMonth() + 1).padStart(2, "0")}-${String(sunday.getDate()).padStart(2, "0")}`;
}

export default function CashBookPage() {
  const todayStr = useMemo(() => getTodayStr(), []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rawInflow, setRawInflow] = useState([]);
  const [rawOutflow, setRawOutflow] = useState([]);

  // Filter states
  // preset: "daily" | "weekly" | "monthly" | "yearly" | "custom" | "all"
  const [preset, setPreset] = useState("monthly");
  const [selectedDate, setSelectedDate] = useState(() => todayStr);
  const [selectedMonth, setSelectedMonth] = useState(() => todayStr.slice(0, 7));
  const [selectedYear, setSelectedYear] = useState(() => String(new Date().getFullYear()));
  const [customFrom, setCustomFrom] = useState(() => todayStr.slice(0, 7) + "-01");
  const [customTo, setCustomTo] = useState(() => todayStr);

  // View state: "inflow" | "outflow" | "ledger"
  const [activeTab, setActiveTab] = useState("inflow");

  // Local table filters
  const [inflowSearch, setInflowSearch] = useState("");
  const [inflowTypeFilter, setInflowTypeFilter] = useState("all");
  const [outflowSearch, setOutflowSearch] = useState("");
  const [outflowCatFilter, setOutflowCatFilter] = useState("all");

  // Progressive Lazy Loading on Scroll (Sales Table Behavior)
  const [inflowVisibleCount, setInflowVisibleCount] = useState(25);
  const [outflowVisibleCount, setOutflowVisibleCount] = useState(25);
  const [ledgerVisibleCount, setLedgerVisibleCount] = useState(25);

  const inflowWrapRef = useRef(null);
  const inflowSentinelRef = useRef(null);
  const outflowWrapRef = useRef(null);
  const outflowSentinelRef = useRef(null);
  const ledgerWrapRef = useRef(null);
  const ledgerSentinelRef = useRef(null);

  useEffect(() => {
    setInflowVisibleCount(25);
  }, [preset, selectedDate, selectedMonth, selectedYear, customFrom, customTo, inflowSearch, inflowTypeFilter]);

  useEffect(() => {
    setOutflowVisibleCount(25);
  }, [preset, selectedDate, selectedMonth, selectedYear, customFrom, customTo, outflowSearch, outflowCatFilter]);

  useEffect(() => {
    setLedgerVisibleCount(25);
  }, [preset, selectedDate, selectedMonth, selectedYear, customFrom, customTo]);

  // Export language modal state
  const [langModal, setLangModal] = useState({ isOpen: false, format: "xlsx" });
  const [translating, setTranslating] = useState(false);

  // Reconciled Opening Cash Baseline Setting (1st November 2026: ৳8,626)
  const [openingSetting, setOpeningSetting] = useState({
    date: "2026-11-01",
    amount: 8626,
    note: "Reconciled initial cash drawer baseline on 1st November 2026",
  });
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [adjustDate, setAdjustDate] = useState("2026-11-01");
  const [adjustAmount, setAdjustAmount] = useState("8626");
  const [adjustNote, setAdjustNote] = useState("Reconciled initial cash drawer baseline on 1st November 2026");
  const [adjustBusy, setAdjustBusy] = useState(false);
  const [adjustErr, setAdjustErr] = useState("");

  // Fetch data
  async function loadCashData() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/cash-book", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to load Cash Book records.");
      } else {
        setRawInflow(data.inflow || []);
        setRawOutflow(data.outflow || []);
        if (data.openingSetting) {
          setOpeningSetting(data.openingSetting);
          setAdjustDate(data.openingSetting.date || "2026-11-01");
          setAdjustAmount(String(data.openingSetting.amount != null ? data.openingSetting.amount : 8626));
          setAdjustNote(data.openingSetting.note || "");
        }
      }
    } catch (err) {
      console.error(err);
      setError("Network error while connecting to Cash Book API.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCashData();
  }, []);

  async function handleSaveAdjustOpening(e) {
    e.preventDefault();
    setAdjustBusy(true);
    setAdjustErr("");
    try {
      const res = await fetch("/api/cash-book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: adjustDate,
          amount: Number(adjustAmount) || 0,
          note: adjustNote,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAdjustErr(data.error || "Failed to update opening balance");
      } else {
        setOpeningSetting(data.openingSetting);
        setAdjustModalOpen(false);
      }
    } catch (err) {
      console.error(err);
      setAdjustErr("Network error while saving opening balance");
    } finally {
      setAdjustBusy(false);
    }
  }

  // Compute active date range label, bounds & predicate
  const filterInfo = useMemo(() => {
    let startDate = "2026-11-01";
    let endDate = todayStr;
    let label = "";

    if (preset === "daily") {
      startDate = selectedDate;
      endDate = selectedDate;
      label = `Day: ${selectedDate}`;
    } else if (preset === "weekly") {
      startDate = getStartOfWeek(selectedDate);
      endDate = getEndOfWeek(selectedDate);
      label = `Week: ${startDate} to ${endDate}`;
    } else if (preset === "monthly") {
      startDate = `${selectedMonth}-01`;
      const [y, m] = selectedMonth.split("-").map(Number);
      const lastDay = new Date(y, m, 0).getDate();
      endDate = `${selectedMonth}-${String(lastDay).padStart(2, "0")}`;
      label = `Month: ${selectedMonth}`;
    } else if (preset === "yearly") {
      startDate = `${selectedYear}-01-01`;
      endDate = `${selectedYear}-12-31`;
      label = `Year: ${selectedYear}`;
    } else if (preset === "custom") {
      startDate = customFrom || "2026-11-01";
      endDate = customTo || todayStr;
      label = `Custom: ${startDate} to ${endDate}`;
    } else {
      startDate = openingSetting.date || "2026-11-01";
      endDate = todayStr;
      label = "All Time";
    }

    return {
      label,
      startDate,
      endDate,
      match: (d) => {
        if (!d) return false;
        if (preset === "all") return true;
        return d >= startDate && d <= endDate;
      },
    };
  }, [preset, selectedDate, selectedMonth, selectedYear, customFrom, customTo, todayStr, openingSetting.date]);

  // Apply duration filter
  const timeFilteredInflow = useMemo(() => {
    return rawInflow.filter((item) => filterInfo.match(item.date));
  }, [rawInflow, filterInfo]);

  const timeFilteredOutflow = useMemo(() => {
    return rawOutflow.filter((item) => filterInfo.match(item.date));
  }, [rawOutflow, filterInfo]);

  // Progressive Check and Balance: Compute opening cash balance for the active filter
  const periodOpeningBalance = useMemo(() => {
    const baseDate = openingSetting.date || "2026-11-01";
    const baseAmt = Number(openingSetting.amount != null ? openingSetting.amount : 8626);
    const filterStart = filterInfo.startDate;

    if (filterStart < baseDate) {
      return 0; // Pre-baseline historical entries
    }
    if (filterStart === baseDate) {
      return baseAmt;
    }

    // Cash movement between baseDate and filterStart
    let priorIn = 0;
    rawInflow.forEach((i) => {
      if (i.date >= baseDate && i.date < filterStart) {
        priorIn += Number(i.amount || 0);
      }
    });

    let priorOut = 0;
    rawOutflow.forEach((o) => {
      if (o.date >= baseDate && o.date < filterStart) {
        priorOut += Number(o.amount || 0);
      }
    });

    return baseAmt + priorIn - priorOut;
  }, [openingSetting, filterInfo.startDate, rawInflow, rawOutflow]);

  // Top KPI calculations (incorporating Opening Cash in Hand)
  const kpiTotals = useMemo(() => {
    let totalInflow = 0;
    timeFilteredInflow.forEach((i) => {
      totalInflow += Number(i.amount || 0);
    });

    let totalOutflow = 0;
    timeFilteredOutflow.forEach((o) => {
      totalOutflow += Number(o.amount || 0);
    });

    const closingCashInHand = periodOpeningBalance + totalInflow - totalOutflow;

    return {
      openingBalance: periodOpeningBalance,
      totalInflow,
      totalOutflow,
      closingCashInHand,
      netCashInHand: closingCashInHand,
      inflowCount: timeFilteredInflow.length,
      outflowCount: timeFilteredOutflow.length,
    };
  }, [periodOpeningBalance, timeFilteredInflow, timeFilteredOutflow]);

  // Filtered Inflow for Sheet 1
  const displayedInflow = useMemo(() => {
    const q = (inflowSearch || "").trim().toLowerCase();
    return timeFilteredInflow.filter((item) => {
      if (inflowTypeFilter !== "all" && item.transType !== inflowTypeFilter) {
        return false;
      }
      if (!q) return true;
      const party = (item.party || "").toLowerCase();
      const phone = (item.phone || "").toLowerCase();
      const billNo = (item.billNo || "").toLowerCase();
      const desc = (item.description || "").toLowerCase();
      const note = (item.note || "").toLowerCase();
      return (
        party.includes(q) ||
        phone.includes(q) ||
        billNo.includes(q) ||
        desc.includes(q) ||
        note.includes(q)
      );
    });
  }, [timeFilteredInflow, inflowSearch, inflowTypeFilter]);

  // Filtered Outflow for Sheet 2
  const displayedOutflow = useMemo(() => {
    const q = (outflowSearch || "").trim().toLowerCase();
    return timeFilteredOutflow.filter((item) => {
      if (outflowCatFilter !== "all" && item.category !== outflowCatFilter) {
        return false;
      }
      if (!q) return true;
      const cat = (item.category || "").toLowerCase();
      const party = (item.party || "").toLowerCase();
      const note = (item.note || "").toLowerCase();
      const title = (item.title || "").toLowerCase();
      return (
        cat.includes(q) ||
        party.includes(q) ||
        note.includes(q) ||
        title.includes(q)
      );
    });
  }, [timeFilteredOutflow, outflowSearch, outflowCatFilter]);

  // Unique categories for outflow filter dropdown
  const outflowCategories = useMemo(() => {
    const set = new Set();
    rawOutflow.forEach((o) => {
      if (o.category) set.add(o.category);
    });
    return Array.from(set).sort();
  }, [rawOutflow]);

  // Combined Day-by-Day Chronological Ledger (incorporating Opening Cash in Hand)
  const combinedLedger = useMemo(() => {
    const events = [];

    // Add opening balance entry as the first event if this period has an opening cash baseline
    if (periodOpeningBalance !== 0 || filterInfo.startDate >= (openingSetting.date || "2026-11-01")) {
      const isBase = filterInfo.startDate <= (openingSetting.date || "2026-11-01");
      events.push({
        id: "opening_balance_row",
        date: filterInfo.startDate,
        type: "OPENING",
        badge: "Opening Cash",
        party: isBase ? "Cash Drawer Baseline" : "Opening Cash Balance",
        note: isBase
          ? (openingSetting.note || "Initial physical cash in drawer on 1st November")
          : `Brought forward cash in drawer on ${filterInfo.startDate}`,
        billNo: "—",
        inflow: periodOpeningBalance,
        outflow: 0,
        isOpening: true,
      });
    }

    timeFilteredInflow.forEach((i) => {
      events.push({
        id: `in_${i.id}`,
        date: i.date,
        type: "IN",
        badge: i.transType,
        party: i.party,
        note: i.description || i.note || "Cash Received",
        billNo: i.billNo,
        inflow: Number(i.amount || 0),
        outflow: 0,
        isOpening: false,
      });
    });
    timeFilteredOutflow.forEach((o) => {
      events.push({
        id: `out_${o.id}`,
        date: o.date,
        type: "OUT",
        badge: o.category,
        party: o.party,
        note: o.note || o.title || "Cash Expense",
        billNo: "—",
        inflow: 0,
        outflow: Number(o.amount || 0),
        isOpening: false,
      });
    });

    // Sort ascending for running balance calculation, with OPENING row always first
    events.sort((a, b) => {
      const dt = (a.date || "").localeCompare(b.date || "");
      if (dt !== 0) return dt;
      if (a.isOpening) return -1;
      if (b.isOpening) return 1;
      return a.id.localeCompare(b.id);
    });

    let running = 0;
    return events.map((ev) => {
      if (ev.isOpening) {
        running = ev.inflow;
      } else {
        running = running + ev.inflow - ev.outflow;
      }
      return {
        ...ev,
        balance: running,
      };
    });
  }, [timeFilteredInflow, timeFilteredOutflow, periodOpeningBalance, filterInfo.startDate, openingSetting]);

  // Infinite Scroll Observer & Container Scroll Watcher
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const observers = [];

    const setupObserver = (sentinelEl, wrapEl, setFn) => {
      if (!sentinelEl) return;
      // 1. Observer attached to table wrapper
      if (wrapEl) {
        const obsWrap = new IntersectionObserver(
          (entries) => {
            if (entries[0]?.isIntersecting) {
              setFn((prev) => prev + 25);
            }
          },
          { root: wrapEl, rootMargin: "140px" }
        );
        obsWrap.observe(sentinelEl);
        observers.push(obsWrap);
      }

      // 2. Observer attached to main viewport
      const obsViewport = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting) {
            setFn((prev) => prev + 25);
          }
        },
        { rootMargin: "180px" }
      );
      obsViewport.observe(sentinelEl);
      observers.push(obsViewport);
    };

    if (activeTab === "inflow") {
      setupObserver(inflowSentinelRef.current, inflowWrapRef.current, setInflowVisibleCount);
    } else if (activeTab === "outflow") {
      setupObserver(outflowSentinelRef.current, outflowWrapRef.current, setOutflowVisibleCount);
    } else if (activeTab === "ledger") {
      setupObserver(ledgerSentinelRef.current, ledgerWrapRef.current, setLedgerVisibleCount);
    }

    return () => observers.forEach((o) => o.disconnect());
  }, [
    activeTab,
    displayedInflow.length,
    displayedOutflow.length,
    combinedLedger.length,
    inflowVisibleCount,
    outflowVisibleCount,
    ledgerVisibleCount,
  ]);

  function handleTableScroll(e, setFn, currentCount, totalCount) {
    if (currentCount >= totalCount) return;
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 120) {
      setFn((prev) => prev + 25);
    }
  }

  // Stepper functions
  function shiftDate(str, days) {
    const d = new Date(str || todayStr);
    d.setDate(d.getDate() + days);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function shiftMonth(str, months) {
    const [y, m] = (str || todayStr.slice(0, 7)).split("-").map(Number);
    const d = new Date(y, m - 1 + months, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }

  function shiftYear(str, years) {
    const y = Number(str || new Date().getFullYear());
    return String(y + years);
  }

  /* ===================================================================
     EXPORT: EXCEL (.xlsx)
  =================================================================== */
  async function handleExportExcel(lang = "en") {
    try {
      setTranslating(true);
      const isBn = lang === "bn";
      const numFn = isBn ? toBengaliDigits : (v) => v;

      const wb = XLSX.utils.book_new();

      // Sheet 1: Summary & Cash Position
      const summaryRows = [
        ["CASH BOOK & CASH FLOW STATEMENT"],
        [`Period: ${filterInfo.label}`],
        [`Generated: ${new Date().toLocaleString()}`],
        [],
        ["OVERALL CASH POSITION", ""],
        ["Opening Cash Balance (Baseline / Forwarded)", `৳ ${formatNum(kpiTotals.openingBalance, 0)}`],
        ["Total Cash Inflow (Sales, Advances & Due Received)", `৳ ${formatNum(kpiTotals.totalInflow, 0)}`],
        ["Total Cash Outflow (Expenses & Payouts)", `৳ ${formatNum(kpiTotals.totalOutflow, 0)}`],
        ["Closing Cash in Hand (Drawer Balance)", `৳ ${formatNum(kpiTotals.closingCashInHand, 0)}`],
        ["Cash Inflow Transactions Count", String(kpiTotals.inflowCount)],
        ["Cash Outflow Transactions Count", String(kpiTotals.outflowCount)],
      ];
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
      XLSX.utils.book_append_sheet(wb, wsSummary, "Overview");

      // Sheet 2: Cash Inflow
      const inHeaders = isBn
        ? ["ক্রম", "তারিখ", "মেমো / বিল নং", "কাস্টমার নাম", "মোবাইল", "লেনদেনের ধরণ", "কাজের বিবরণ / নোট", "আদায়কৃত ক্যাশ (৳)", "এন্ট্রি বাই"]
        : ["SL", "Date", "Memo/Bill #", "Customer Name", "Mobile", "Transaction Type", "Description / Note", "Cash Received (Tk)", "Entry By"];

      const inRows = displayedInflow.map((r, idx) => [
        numFn(String(idx + 1)),
        r.date,
        r.billNo,
        r.party,
        r.phone,
        r.transType,
        r.description,
        numFn(formatNum(r.amount, 0)),
        r.entryBy,
      ]);

      const inTotalRow = [
        "",
        "",
        "",
        "",
        "",
        isBn ? "মোট জমা:" : "TOTAL INFLOW:",
        "",
        numFn(formatNum(kpiTotals.totalInflow, 0)),
        "",
      ];

      const wsInflow = XLSX.utils.aoa_to_sheet([inHeaders, ...inRows, inTotalRow]);
      XLSX.utils.book_append_sheet(wb, wsInflow, isBn ? "ক্যাশ জমা (Inflow)" : "Cash Inflow");

      // Sheet 3: Cash Outflow
      const outHeaders = isBn
        ? ["ক্রম", "তারিখ", "খরচের খাত / ক্যাটাগরি", "কাকে দেওয়া হয়েছে", "খরচের বিবরণ / নোট", "পেমেন্ট মাধ্যম", "খরচের টাকা (৳)", "এন্ট্রি বাই"]
        : ["SL", "Date", "Expense Category", "Paid To / Staff", "Note / Purpose", "Payment Method", "Cash Paid (Tk)", "Entry By"];

      const outRows = displayedOutflow.map((r, idx) => [
        numFn(String(idx + 1)),
        r.date,
        r.category,
        r.party,
        r.note,
        r.method,
        numFn(formatNum(r.amount, 0)),
        r.entryBy,
      ]);

      const outTotalRow = [
        "",
        "",
        "",
        "",
        isBn ? "মোট খরচ:" : "TOTAL OUTFLOW:",
        "",
        numFn(formatNum(kpiTotals.totalOutflow, 0)),
        "",
      ];

      const wsOutflow = XLSX.utils.aoa_to_sheet([outHeaders, ...outRows, outTotalRow]);
      XLSX.utils.book_append_sheet(wb, wsOutflow, isBn ? "ক্যাশ খরচ (Outflow)" : "Cash Outflow");

      const safePeriod = filterInfo.label.replace(/[^a-zA-Z0-9_-]/g, "_");
      XLSX.writeFile(wb, `Cash_Book_${safePeriod}_${lang}.xlsx`);
    } catch (err) {
      console.error(err);
      alert("Failed to export Excel file.");
    } finally {
      setTranslating(false);
      setLangModal({ isOpen: false, format: "xlsx" });
    }
  }

  /* ===================================================================
     EXPORT: PDF (.pdf)
  =================================================================== */
  async function handleExportPdf(lang = "en") {
    try {
      setTranslating(true);
      const isBn = lang === "bn";
      const numFn = isBn ? toBengaliDigits : (v) => v;

      const summaryHeaders = isBn
        ? ["বিবরণ", "হিসাব / ফলাফল"]
        : ["Metric / Description", "Amount / Value"];

      const summaryRows = [
        [isBn ? "সময়কাল" : "Filter Period", filterInfo.label],
        [isBn ? "ওপেনিং ক্যাশ ব্যালেন্স (Opening Balance)" : "Opening Cash Balance", `Tk ${numFn(formatNum(kpiTotals.openingBalance, 0))}`],
        [isBn ? "মোট ক্যাশ আদায় (Sales, Advances & Dues)" : "Total Cash Inflow", `Tk ${numFn(formatNum(kpiTotals.totalInflow, 0))}`],
        [isBn ? "মোট ক্যাশ খরচ (Cash Expenses)" : "Total Cash Outflow", `Tk ${numFn(formatNum(kpiTotals.totalOutflow, 0))}`],
        [isBn ? "ক্যাশ ড্রয়ার ব্যালেন্স (Closing Cash in Hand)" : "Closing Cash in Hand (Drawer)", `Tk ${numFn(formatNum(kpiTotals.closingCashInHand, 0))}`],
        [isBn ? "মোট লেনদেনের সংখ্যা" : "Total Cash Transactions", numFn(String(kpiTotals.inflowCount + kpiTotals.outflowCount))],
      ];

      const inHeaders = isBn
        ? ["ক্রম", "তারিখ", "বিল নং", "কাস্টমার নাম", "মোবাইল", "ধরণ", "বিবরণ", "টাকা (Tk)", "এন্ট্রি"]
        : ["SL", "Date", "Bill #", "Customer", "Mobile", "Type", "Description", "Cash In (Tk)", "Entry"];

      const inRows = displayedInflow.map((r, idx) => [
        numFn(String(idx + 1)),
        r.date,
        r.billNo,
        r.party,
        r.phone,
        r.transType,
        r.description,
        numFn(formatNum(r.amount, 0)),
        r.entryBy,
      ]);

      const inFoot = [
        [
          "",
          "",
          "",
          "",
          "",
          "",
          isBn ? "মোট জমা:" : "TOTAL INFLOW:",
          numFn(formatNum(kpiTotals.totalInflow, 0)),
          "",
        ],
      ];

      const outHeaders = isBn
        ? ["ক্রম", "তারিখ", "খাত / ক্যাটাগরি", "কাকে দেওয়া হলো", "খরচের নোট", "টাকা (Tk)", "এন্ট্রি"]
        : ["SL", "Date", "Category", "Paid To", "Note / Purpose", "Cash Out (Tk)", "Entry"];

      const outRows = displayedOutflow.map((r, idx) => [
        numFn(String(idx + 1)),
        r.date,
        r.category,
        r.party,
        r.note,
        numFn(formatNum(r.amount, 0)),
        r.entryBy,
      ]);

      const outFoot = [
        [
          "",
          "",
          "",
          "",
          isBn ? "মোট খরচ:" : "TOTAL OUTFLOW:",
          numFn(formatNum(kpiTotals.totalOutflow, 0)),
          "",
        ],
      ];

      const safePeriod = filterInfo.label.replace(/[^a-zA-Z0-9_-]/g, "_");

      await exportReportToPdf({
        filename: `Cash_Book_${safePeriod}_${lang}.pdf`,
        title: isBn ? "ক্যাশ বুক ও ক্যাশ ফ্লো বিবরণী" : "CASH BOOK & CASH FLOW STATEMENT",
        subtitle: `${filterInfo.label}   |   Closing Cash: Tk ${formatNum(kpiTotals.closingCashInHand, 0)}`,
        sheets: [
          {
            sheetTitle: isBn ? "সারসংক্ষেপ ও ক্যাশ ব্যালেন্স" : "Summary & Net Cash Position",
            headers: summaryHeaders,
            rows: summaryRows,
            summaryRows: [],
            rightAlignCols: [1],
          },
          {
            sheetTitle: isBn ? "ক্যাশ জমা (Sales, Advances & Dues)" : "Cash Inflow (Sales, Advances & Due Received)",
            headers: inHeaders,
            rows: inRows,
            summaryRows: inFoot,
            rightAlignCols: [7],
          },
          {
            sheetTitle: isBn ? "ক্যাশ খরচ (Expenses & Payouts)" : "Cash Outflow (Expenses & Payouts)",
            headers: outHeaders,
            rows: outRows,
            summaryRows: outFoot,
            rightAlignCols: [5],
          },
        ],
        lang,
        orientation: "landscape",
      });
    } catch (err) {
      console.error(err);
      alert("Failed to export PDF file.");
    } finally {
      setTranslating(false);
      setLangModal({ isOpen: false, format: "pdf" });
    }
  }

  return (
    <main className="be-wrapper cb-wrapper">
      {/* Top Header */}
      <header className="be-header">
        <div className="be-brand">
          <div className="be-title-box">
            <h1>Cash Book</h1>
            <p>
              {filterInfo.label} • All Cash Sales, Advances, Due Received &amp; Cash Expenses
            </p>
          </div>
        </div>
        <nav className="be-nav-actions" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <TopPageNav active="cash-book" />
          <Link
            href="/"
            className="be-nav-btn"
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <HomeIcon size={14} /> Home
          </Link>
        </nav>
      </header>

      {error && (
        <div style={{ background: "#fee2e2", color: "#dc2626", padding: "10px 14px", borderRadius: 10, marginBottom: 16, fontWeight: 700, fontSize: "0.85rem" }}>
          {error}
        </div>
      )}

      {/* Filter Controls Bar */}
      <section className="cb-filter-bar">
        <div className="cb-filter-top-row">
          {/* Preset Buttons */}
          <div className="cb-presets-group">
            {[
              { id: "daily", label: "Daily" },
              { id: "weekly", label: "Weekly" },
              { id: "monthly", label: "Monthly" },
              { id: "yearly", label: "Yearly" },
              { id: "custom", label: "Custom Range" },
              { id: "all", label: "All Time" },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                className={`cb-preset-btn ${preset === p.id ? "active" : ""}`}
                onClick={() => setPreset(p.id)}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Export & Baseline Actions */}
          <div className="cb-actions-right">
            <button
              type="button"
              className="cb-export-btn"
              style={{ background: "#f8fafc", color: "#334155", border: "1px solid #cbd5e1" }}
              onClick={() => {
                setAdjustDate(openingSetting.date || "2026-11-01");
                setAdjustAmount(String(openingSetting.amount != null ? openingSetting.amount : 8626));
                setAdjustNote(openingSetting.note || "");
                setAdjustModalOpen(true);
              }}
              title="Adjust or view the reconciled cash drawer opening baseline"
            >
              <EditIcon size={14} />
              <span>Adjust Opening Cash</span>
            </button>
            <button
              type="button"
              className="cb-export-btn excel"
              onClick={() => setLangModal({ isOpen: true, format: "xlsx" })}
              disabled={loading}
              title="Download Excel Report with Summary & Details"
            >
              <DownloadIcon size={14} />
              <span>Export Excel</span>
            </button>
            <button
              type="button"
              className="cb-export-btn pdf"
              onClick={() => setLangModal({ isOpen: true, format: "pdf" })}
              disabled={loading}
              title="Download PDF Report with Summary & Details"
            >
              <DownloadIcon size={14} />
              <span>Export PDF</span>
            </button>
          </div>
        </div>

        {/* Dynamic Date Pickers & Steppers */}
        <div className="cb-date-controls">
          {preset === "daily" && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div className="cb-stepper-box">
                <button
                  type="button"
                  className="cb-stepper-btn"
                  onClick={() => setSelectedDate(shiftDate(selectedDate, -1))}
                  title="Previous Day"
                >
                  <ChevronLeftIcon size={14} />
                </button>
                <input
                  type="date"
                  className="cb-stepper-input"
                  value={selectedDate}
                  onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
                />
                <button
                  type="button"
                  className="cb-stepper-btn"
                  onClick={() => setSelectedDate(shiftDate(selectedDate, 1))}
                  title="Next Day"
                >
                  <ChevronRightIcon size={14} />
                </button>
              </div>
              <button
                type="button"
                className="st-action-btn secondary"
                style={{ height: 36, padding: "0 10px", fontSize: "0.78rem" }}
                onClick={() => setSelectedDate(todayStr)}
              >
                Today
              </button>
            </div>
          )}

          {preset === "weekly" && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div className="cb-stepper-box">
                <button
                  type="button"
                  className="cb-stepper-btn"
                  onClick={() => setSelectedDate(shiftDate(selectedDate, -7))}
                  title="Previous Week"
                >
                  <ChevronLeftIcon size={14} />
                </button>
                <input
                  type="date"
                  className="cb-stepper-input"
                  value={selectedDate}
                  onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
                />
                <button
                  type="button"
                  className="cb-stepper-btn"
                  onClick={() => setSelectedDate(shiftDate(selectedDate, 7))}
                  title="Next Week"
                >
                  <ChevronRightIcon size={14} />
                </button>
              </div>
              <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 700 }}>
                Week: {getStartOfWeek(selectedDate)} ── {getEndOfWeek(selectedDate)}
              </span>
            </div>
          )}

          {preset === "monthly" && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div className="cb-stepper-box">
                <button
                  type="button"
                  className="cb-stepper-btn"
                  onClick={() => setSelectedMonth(shiftMonth(selectedMonth, -1))}
                  title="Previous Month"
                >
                  <ChevronLeftIcon size={14} />
                </button>
                <input
                  type="month"
                  className="cb-stepper-input"
                  value={selectedMonth}
                  onChange={(e) => e.target.value && setSelectedMonth(e.target.value)}
                />
                <button
                  type="button"
                  className="cb-stepper-btn"
                  onClick={() => setSelectedMonth(shiftMonth(selectedMonth, 1))}
                  title="Next Month"
                >
                  <ChevronRightIcon size={14} />
                </button>
              </div>
              <button
                type="button"
                className="st-action-btn secondary"
                style={{ height: 36, padding: "0 10px", fontSize: "0.78rem" }}
                onClick={() => setSelectedMonth(todayStr.slice(0, 7))}
              >
                This Month
              </button>
            </div>
          )}

          {preset === "yearly" && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div className="cb-stepper-box">
                <button
                  type="button"
                  className="cb-stepper-btn"
                  onClick={() => setSelectedYear(shiftYear(selectedYear, -1))}
                  title="Previous Year"
                >
                  <ChevronLeftIcon size={14} />
                </button>
                <input
                  type="number"
                  min="2020"
                  max="2035"
                  className="cb-stepper-input"
                  style={{ width: 70 }}
                  value={selectedYear}
                  onChange={(e) => e.target.value && setSelectedYear(e.target.value)}
                />
                <button
                  type="button"
                  className="cb-stepper-btn"
                  onClick={() => setSelectedYear(shiftYear(selectedYear, 1))}
                  title="Next Year"
                >
                  <ChevronRightIcon size={14} />
                </button>
              </div>
              <button
                type="button"
                className="st-action-btn secondary"
                style={{ height: 36, padding: "0 10px", fontSize: "0.78rem" }}
                onClick={() => setSelectedYear(String(new Date().getFullYear()))}
              >
                Current Year
              </button>
            </div>
          )}

          {preset === "custom" && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#64748b" }}>From:</span>
                <input
                  type="date"
                  className="be-input"
                  style={{ height: 34, fontSize: "0.82rem", width: 140 }}
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#64748b" }}>To:</span>
                <input
                  type="date"
                  className="be-input"
                  style={{ height: 34, fontSize: "0.82rem", width: 140 }}
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Top 4 KPI Summary Cards */}
      <section className="cb-kpi-grid">
        {/* Card 1: Opening Cash Balance */}
        <div className="cb-kpi-card" style={{ borderColor: "#cbd5e1" }}>
          <div className="cb-kpi-head">
            <span className="cb-kpi-title">Opening Cash Balance</span>
            <span className="cb-kpi-badge" style={{ background: "#f1f5f9", color: "#475569" }}>
              {filterInfo.startDate}
            </span>
          </div>
          <div className="cb-kpi-value" style={{ color: "#0f172a" }}>
            ৳{formatNum(kpiTotals.openingBalance, 0)}
          </div>
          <div className="cb-kpi-sub">
            Baseline: {openingSetting.date} (৳{formatNum(openingSetting.amount, 0)})
          </div>
        </div>

        {/* Card 2: Total Cash Inflow */}
        <div className="cb-kpi-card inflow">
          <div className="cb-kpi-head">
            <span className="cb-kpi-title">Total Cash Inflow</span>
            <span className="cb-kpi-badge inflow">{kpiTotals.inflowCount} receipts</span>
          </div>
          <div className="cb-kpi-value inflow">৳{formatNum(kpiTotals.totalInflow, 0)}</div>
          <div className="cb-kpi-sub">
            Sales, Customer Advances &amp; Due Collections
          </div>
        </div>

        {/* Card 3: Total Cash Outflow */}
        <div className="cb-kpi-card outflow">
          <div className="cb-kpi-head">
            <span className="cb-kpi-title">Total Cash Outflow</span>
            <span className="cb-kpi-badge outflow">{kpiTotals.outflowCount} payouts</span>
          </div>
          <div className="cb-kpi-value outflow">৳{formatNum(kpiTotals.totalOutflow, 0)}</div>
          <div className="cb-kpi-sub">
            Expenses, Factory Payouts &amp; Cash Supplier Bills
          </div>
        </div>

        {/* Card 4: Closing Cash in Hand */}
        <div className="cb-kpi-card balance">
          <div className="cb-kpi-head">
            <span className="cb-kpi-title">Net Cash in Hand</span>
            <span className={`cb-kpi-badge ${kpiTotals.closingCashInHand >= 0 ? "balance" : "outflow"}`}>
              {kpiTotals.closingCashInHand >= 0 ? "Drawer Safe" : "Deficit"}
            </span>
          </div>
          <div className={`cb-kpi-value ${kpiTotals.closingCashInHand >= 0 ? "positive" : "negative"}`}>
            ৳{formatNum(kpiTotals.closingCashInHand, 0)}
          </div>
          <div className="cb-kpi-sub">
            Opening (৳{formatNum(kpiTotals.openingBalance, 0)}) + Inflow − Outflow
          </div>
        </div>
      </section>

      {/* View Switcher Tabs */}
      <section className="cb-tabs-wrap">
        <div className="cb-view-tabs" role="tablist">
          <button
            type="button"
            className={`cb-tab-pill ${activeTab === "inflow" ? "active" : ""}`}
            onClick={() => setActiveTab("inflow")}
          >
            <TrendingUpIcon size={14} />
            <span>Sheet 1: Cash Inflow (Sales &amp; Dues)</span>
            <span className="cb-tab-count">{displayedInflow.length}</span>
          </button>
          <button
            type="button"
            className={`cb-tab-pill ${activeTab === "outflow" ? "active" : ""}`}
            onClick={() => setActiveTab("outflow")}
          >
            <WalletIcon size={14} />
            <span>Sheet 2: Cash Outflow (Expenses &amp; Payouts)</span>
            <span className="cb-tab-count">{displayedOutflow.length}</span>
          </button>
          <button
            type="button"
            className={`cb-tab-pill ${activeTab === "ledger" ? "active" : ""}`}
            onClick={() => setActiveTab("ledger")}
          >
            <span>Day-by-Day Cash Statement</span>
            <span className="cb-tab-count">{combinedLedger.length}</span>
          </button>
        </div>

        <div style={{ fontSize: "0.82rem", color: "#64748b", fontWeight: 600 }}>
          Showing records for <strong>{filterInfo.label}</strong>
        </div>
      </section>

      {/* Loading state */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 48, color: "#64748b", fontWeight: 700 }}>
          Loading Cash Book transactions...
        </div>
      ) : activeTab === "ledger" ? (
        /* DAY-BY-DAY COMBINED CASH STATEMENT */
        <div className="cb-sheet-card">
          <div className="cb-sheet-head">
            <div className="cb-sheet-title-box">
              <h2 className="cb-sheet-title">Chronological Cash Statement (Running Balance)</h2>
            </div>
            <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 700 }}>
              {combinedLedger.length} total events
            </span>
          </div>

          <div
            className="cb-table-wrap"
            ref={ledgerWrapRef}
            onScroll={(e) => handleTableScroll(e, setLedgerVisibleCount, ledgerVisibleCount, combinedLedger.length)}
          >
            <table className="cb-table">
              <thead>
                <tr>
                  <th style={{ width: 44 }}>#</th>
                  <th style={{ width: 100 }}>Date</th>
                  <th style={{ width: 80 }}>Flow</th>
                  <th>Party / Contact</th>
                  <th>Type / Category</th>
                  <th>Details / Memo</th>
                  <th style={{ textAlign: "right", width: 120 }}>Inflow (৳)</th>
                  <th style={{ textAlign: "right", width: 120 }}>Outflow (৳)</th>
                  <th style={{ textAlign: "right", width: 130 }}>Balance (৳)</th>
                </tr>
              </thead>
              <tbody>
                {combinedLedger.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="cb-empty-box">
                      No cash transactions recorded for {filterInfo.label}.
                    </td>
                  </tr>
                ) : (
                  combinedLedger.slice(0, ledgerVisibleCount).map((row, idx) => (
                    <tr key={row.id}>
                      <td style={{ color: "#64748b", fontWeight: 700 }}>{idx + 1}</td>
                      <td style={{ fontWeight: 700, whiteSpace: "nowrap" }}>{row.date}</td>
                      <td>
                        <span
                          className={`cb-badge ${row.type === "IN" ? "due" : "outflow"}`}
                          style={{
                            background: row.type === "IN" ? "#dcfce7" : "#fee2e2",
                            color: row.type === "IN" ? "#15803d" : "#b91c1c",
                          }}
                        >
                          {row.type}
                        </span>
                      </td>
                      <td style={{ fontWeight: 700 }}>{row.party}</td>
                      <td>
                        <span className="cb-badge category">{row.badge}</span>
                      </td>
                      <td style={{ color: "#475569" }}>
                        {row.billNo && row.billNo !== "—" ? `Bill #${row.billNo} • ` : ""}
                        {row.note}
                      </td>
                      <td style={{ textAlign: "right", color: row.inflow > 0 ? "#059669" : "#94a3b8", fontWeight: row.inflow > 0 ? 800 : 400 }}>
                        {row.inflow > 0 ? `+৳${formatNum(row.inflow, 0)}` : "—"}
                      </td>
                      <td style={{ textAlign: "right", color: row.outflow > 0 ? "#dc2626" : "#94a3b8", fontWeight: row.outflow > 0 ? 800 : 400 }}>
                        {row.outflow > 0 ? `-৳${formatNum(row.outflow, 0)}` : "—"}
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          fontWeight: 800,
                          color: row.balance >= 0 ? "#0369a1" : "#dc2626",
                        }}
                      >
                        ৳{formatNum(row.balance, 0)}
                      </td>
                    </tr>
                  ))
                )}
                {combinedLedger.length > ledgerVisibleCount && (
                  <tr ref={ledgerSentinelRef}>
                    <td colSpan={9} style={{ textAlign: "center", padding: "14px", color: "#64748b", fontSize: "0.8rem", fontWeight: 600 }}>
                      Showing {Math.min(ledgerVisibleCount, combinedLedger.length)} of {combinedLedger.length} entries — scroll down to load more{" "}
                      <button
                        type="button"
                        onClick={() => setLedgerVisibleCount(combinedLedger.length)}
                        style={{ marginLeft: 8, background: "transparent", border: "none", color: "#2563eb", fontWeight: 700, cursor: "pointer", textDecoration: "underline" }}
                      >
                        (Load All)
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={6} style={{ textAlign: "right" }}>Total Summary:</td>
                  <td style={{ textAlign: "right", color: "#059669" }}>৳{formatNum(kpiTotals.totalInflow, 0)}</td>
                  <td style={{ textAlign: "right", color: "#dc2626" }}>৳{formatNum(kpiTotals.totalOutflow, 0)}</td>
                  <td style={{ textAlign: "right", color: kpiTotals.netCashInHand >= 0 ? "#0369a1" : "#dc2626" }}>
                    ৳{formatNum(kpiTotals.netCashInHand, 0)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      ) : (
        /* SINGLE ACTIVE SHEET VIEW */
        <div className="cb-sheets-grid single">
          {/* SHEET 1: CASH INFLOW */}
          {activeTab === "inflow" && (
            <div className="cb-sheet-card">
              <div className="cb-sheet-head">
                <div className="cb-sheet-title-box">
                  <TrendingUpIcon size={16} />
                  <h2 className="cb-sheet-title">Sheet 1: Cash Inflow (Sales &amp; Dues)</h2>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="cb-kpi-badge inflow">৳{formatNum(kpiTotals.totalInflow, 0)}</span>
                  <Link href="/sales" className="st-action-btn secondary" style={{ padding: "4px 8px", fontSize: "0.72rem" }}>
                    Open Sales
                  </Link>
                </div>
              </div>

              {/* Inflow Local Toolbar */}
              <div className="cb-sheet-toolbar">
                <div style={{ position: "relative", flex: 1 }}>
                  <SearchIcon
                    size={13}
                    style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}
                  />
                  <input
                    type="text"
                    className="cb-search-input"
                    placeholder="Search customer, bill#, phone..."
                    value={inflowSearch}
                    onChange={(e) => setInflowSearch(e.target.value)}
                  />
                </div>
                <select
                  className="be-input"
                  style={{ width: "auto", height: 34, padding: "0 8px", fontSize: "0.76rem" }}
                  value={inflowTypeFilter}
                  onChange={(e) => setInflowTypeFilter(e.target.value)}
                >
                  <option value="all">All Types</option>
                  <option value="Sales Cash">Sales Cash</option>
                  <option value="Due Collection / Payment">Due Collections</option>
                  <option value="Advance Received">Advance Received</option>
                  <option value="Full Sales Payment">Full Payments</option>
                  <option value="Sales Partial / Advance">Partial Payments</option>
                </select>
              </div>

              {/* Inflow Table */}
              <div
                className="cb-table-wrap"
                ref={inflowWrapRef}
                onScroll={(e) => handleTableScroll(e, setInflowVisibleCount, inflowVisibleCount, displayedInflow.length)}
              >
                <table className="cb-table">
                  <thead>
                    <tr>
                      <th style={{ width: 38 }}>#</th>
                      <th style={{ width: 85 }}>Date</th>
                      <th style={{ width: 75 }}>Bill #</th>
                      <th>Customer</th>
                      <th>Type</th>
                      <th>Details</th>
                      <th style={{ textAlign: "right", width: 100 }}>Received (৳)</th>
                      <th style={{ width: 65 }}>By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedInflow.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="cb-empty-box">
                          No cash received records match your filter.
                        </td>
                      </tr>
                    ) : (
                      displayedInflow.slice(0, inflowVisibleCount).map((r, idx) => (
                        <tr key={r.id}>
                          <td style={{ color: "#64748b", fontWeight: 700 }}>{idx + 1}</td>
                          <td style={{ fontWeight: 700, whiteSpace: "nowrap" }}>{r.date}</td>
                          <td style={{ fontWeight: 700 }}>
                            {r.billNo !== "—" ? (
                              <Link
                                href={`/sales?search=${encodeURIComponent(r.billNo)}`}
                                style={{ color: "#1d4ed8", textDecoration: "none" }}
                              >
                                #{r.billNo}
                              </Link>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td>
                            <div style={{ fontWeight: 800 }}>{r.party}</div>
                            {r.phone && (
                              <div style={{ fontSize: "0.72rem", color: "#64748b" }}>{r.phone}</div>
                            )}
                          </td>
                          <td>
                            <span
                              className={`cb-badge ${
                                r.transType.includes("Due")
                                  ? "due"
                                  : r.transType.includes("Advance")
                                  ? "advance"
                                  : "sale"
                              }`}
                            >
                              {r.transType}
                            </span>
                          </td>
                          <td style={{ fontSize: "0.76rem", color: "#475569", maxWidth: 180, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={r.description}>
                            {r.description}
                          </td>
                          <td style={{ textAlign: "right" }} className="cb-amt-inflow">
                            ৳{formatNum(r.amount, 0)}
                          </td>
                          <td style={{ fontSize: "0.72rem", color: "#64748b" }}>{r.entryBy}</td>
                        </tr>
                      ))
                    )}
                    {displayedInflow.length > inflowVisibleCount && (
                      <tr ref={inflowSentinelRef}>
                        <td colSpan={8} style={{ textAlign: "center", padding: "14px", color: "#64748b", fontSize: "0.8rem", fontWeight: 600 }}>
                          Showing {Math.min(inflowVisibleCount, displayedInflow.length)} of {displayedInflow.length} entries — scroll down to load more{" "}
                          <button
                            type="button"
                            onClick={() => setInflowVisibleCount(displayedInflow.length)}
                            style={{ marginLeft: 8, background: "transparent", border: "none", color: "#2563eb", fontWeight: 700, cursor: "pointer", textDecoration: "underline" }}
                          >
                            (Load All)
                          </button>
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={6} style={{ textAlign: "right" }}>Total Inflow:</td>
                      <td style={{ textAlign: "right" }} className="cb-amt-inflow">
                        ৳{formatNum(displayedInflow.reduce((acc, c) => acc + Number(c.amount || 0), 0), 0)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* SHEET 2: CASH OUTFLOW */}
          {activeTab === "outflow" && (
            <div className="cb-sheet-card">
              <div className="cb-sheet-head">
                <div className="cb-sheet-title-box">
                  <WalletIcon size={16} />
                  <h2 className="cb-sheet-title">Sheet 2: Cash Outflow (Expenses &amp; Payouts)</h2>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="cb-kpi-badge outflow">৳{formatNum(kpiTotals.totalOutflow, 0)}</span>
                  <Link href="/expense" className="st-action-btn secondary" style={{ padding: "4px 8px", fontSize: "0.72rem" }}>
                    Open Expense
                  </Link>
                </div>
              </div>

              {/* Outflow Local Toolbar */}
              <div className="cb-sheet-toolbar">
                <div style={{ position: "relative", flex: 1 }}>
                  <SearchIcon
                    size={13}
                    style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}
                  />
                  <input
                    type="text"
                    className="cb-search-input"
                    placeholder="Search category, paid to, note..."
                    value={outflowSearch}
                    onChange={(e) => setOutflowSearch(e.target.value)}
                  />
                </div>
                <select
                  className="be-input"
                  style={{ width: "auto", height: 34, padding: "0 8px", fontSize: "0.76rem" }}
                  value={outflowCatFilter}
                  onChange={(e) => setOutflowCatFilter(e.target.value)}
                >
                  <option value="all">All Categories</option>
                  {outflowCategories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Outflow Table */}
              <div
                className="cb-table-wrap"
                ref={outflowWrapRef}
                onScroll={(e) => handleTableScroll(e, setOutflowVisibleCount, outflowVisibleCount, displayedOutflow.length)}
              >
                <table className="cb-table">
                  <thead>
                    <tr>
                      <th style={{ width: 38 }}>#</th>
                      <th style={{ width: 85 }}>Date</th>
                      <th>Category</th>
                      <th>Paid To</th>
                      <th>Note / Purpose</th>
                      <th style={{ textAlign: "right", width: 100 }}>Paid (৳)</th>
                      <th style={{ width: 65 }}>By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedOutflow.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="cb-empty-box">
                          No cash expenses match your filter.
                        </td>
                      </tr>
                    ) : (
                      displayedOutflow.slice(0, outflowVisibleCount).map((r, idx) => (
                        <tr key={r.id}>
                          <td style={{ color: "#64748b", fontWeight: 700 }}>{idx + 1}</td>
                          <td style={{ fontWeight: 700, whiteSpace: "nowrap" }}>{r.date}</td>
                          <td>
                            <span className="cb-badge category">{r.category}</span>
                          </td>
                          <td style={{ fontWeight: 700 }}>{r.party}</td>
                          <td style={{ fontSize: "0.76rem", color: "#475569", maxWidth: 180, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={r.note}>
                            {r.note || r.title}
                          </td>
                          <td style={{ textAlign: "right" }} className="cb-amt-outflow">
                            ৳{formatNum(r.amount, 0)}
                          </td>
                          <td style={{ fontSize: "0.72rem", color: "#64748b" }}>{r.entryBy}</td>
                        </tr>
                      ))
                    )}
                    {displayedOutflow.length > outflowVisibleCount && (
                      <tr ref={outflowSentinelRef}>
                        <td colSpan={7} style={{ textAlign: "center", padding: "14px", color: "#64748b", fontSize: "0.8rem", fontWeight: 600 }}>
                          Showing {Math.min(outflowVisibleCount, displayedOutflow.length)} of {displayedOutflow.length} entries — scroll down to load more{" "}
                          <button
                            type="button"
                            onClick={() => setOutflowVisibleCount(displayedOutflow.length)}
                            style={{ marginLeft: 8, background: "transparent", border: "none", color: "#2563eb", fontWeight: 700, cursor: "pointer", textDecoration: "underline" }}
                          >
                            (Load All)
                          </button>
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={5} style={{ textAlign: "right" }}>Total Outflow:</td>
                      <td style={{ textAlign: "right" }} className="cb-amt-outflow">
                        ৳{formatNum(displayedOutflow.reduce((acc, c) => acc + Number(c.amount || 0), 0), 0)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* EXPORT LANGUAGE SELECTION MODAL */}
      {langModal.isOpen && (
        <div className="cb-lang-modal" onClick={() => !translating && setLangModal({ isOpen: false, format: "xlsx" })}>
          <div className="cb-lang-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800, color: "#0f172a" }}>
                Export Cash Book ({langModal.format.toUpperCase()})
              </h3>
              <button
                type="button"
                onClick={() => setLangModal({ isOpen: false, format: "xlsx" })}
                style={{ background: "transparent", border: "none", cursor: "pointer", color: "#94a3b8", padding: 4 }}
              >
                <XIcon size={18} />
              </button>
            </div>

            <p style={{ fontSize: "0.84rem", color: "#64748b", margin: "0 0 16px", lineHeight: 1.4 }}>
              Choose your preferred report language. The file will include the top KPI summary calculations along with Sheet 1 (Cash Inflow) and Sheet 2 (Cash Outflow) for <strong>{filterInfo.label}</strong>.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
              <button
                type="button"
                className="st-action-btn secondary"
                style={{ height: 44, fontSize: "0.86rem", fontWeight: 700 }}
                disabled={translating}
                onClick={() => (langModal.format === "xlsx" ? handleExportExcel("en") : handleExportPdf("en"))}
              >
                English Version
              </button>
              <button
                type="button"
                className="st-action-btn primary"
                style={{ height: 44, fontSize: "0.86rem", fontWeight: 700 }}
                disabled={translating}
                onClick={() => (langModal.format === "xlsx" ? handleExportExcel("bn") : handleExportPdf("bn"))}
              >
                বাংলা সংস্করণ (Bangla)
              </button>
            </div>

            {translating && (
              <div style={{ textAlign: "center", fontSize: "0.8rem", color: "#0369a1", fontWeight: 700 }}>
                Preparing report and translating rows...
              </div>
            )}
          </div>
        </div>
      )}
      {/* ADJUST OPENING CASH MODAL */}
      {adjustModalOpen && (
        <div className="cb-lang-modal" onClick={() => !adjustBusy && setAdjustModalOpen(false)}>
          <div className="cb-lang-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800, color: "#0f172a" }}>
                Adjust Opening Cash Baseline
              </h3>
              <button
                type="button"
                onClick={() => setAdjustModalOpen(false)}
                disabled={adjustBusy}
                style={{ background: "transparent", border: "none", cursor: "pointer", color: "#94a3b8", padding: 4 }}
              >
                <XIcon size={18} />
              </button>
            </div>

            <p style={{ fontSize: "0.82rem", color: "#64748b", margin: "0 0 14px", lineHeight: 1.4 }}>
              Set the physical cash drawer reconciliation baseline. All subsequent daily balances and check-and-balance calculations forward from this baseline.
            </p>

            {adjustErr && (
              <div style={{ background: "#fee2e2", color: "#dc2626", padding: "8px 12px", borderRadius: 8, marginBottom: 12, fontSize: "0.8rem", fontWeight: 700 }}>
                {adjustErr}
              </div>
            )}

            <form onSubmit={handleSaveAdjustOpening}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "#475569", marginBottom: 4 }}>
                  Baseline Start Date
                </label>
                <input
                  type="date"
                  className="be-input"
                  style={{ width: "100%", height: 38, fontSize: "0.85rem" }}
                  value={adjustDate}
                  onChange={(e) => setAdjustDate(e.target.value)}
                  required
                />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "#475569", marginBottom: 4 }}>
                  Opening Cash Amount (৳)
                </label>
                <input
                  type="number"
                  step="any"
                  className="be-input"
                  style={{ width: "100%", height: 38, fontSize: "0.85rem" }}
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  placeholder="e.g. 8626"
                  required
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "#475569", marginBottom: 4 }}>
                  Reconciliation Note / Reason
                </label>
                <input
                  type="text"
                  className="be-input"
                  style={{ width: "100%", height: 38, fontSize: "0.85rem" }}
                  value={adjustNote}
                  onChange={(e) => setAdjustNote(e.target.value)}
                  placeholder="e.g. Reconciled physical cash drawer baseline on 1st November 2026"
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button
                  type="button"
                  className="st-action-btn secondary"
                  style={{ height: 36, fontSize: "0.82rem", padding: "0 14px" }}
                  onClick={() => setAdjustModalOpen(false)}
                  disabled={adjustBusy}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="st-action-btn primary"
                  style={{ height: 36, fontSize: "0.82rem", padding: "0 18px", fontWeight: 700 }}
                  disabled={adjustBusy}
                >
                  {adjustBusy ? "Saving..." : "Save Baseline"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
