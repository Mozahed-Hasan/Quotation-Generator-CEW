"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import TopPageNav from "@/lib/TopPageNav";
import * as XLSX from "xlsx-js-style";
import { exportReportToPdf, aoaToPdfSheet } from "@/lib/pdfExport";
import { batchTranslateTable, toBengaliDigits } from "@/lib/translator";
import {
  HomeIcon,
  CheckIcon,
  XIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DownloadIcon,
  SearchIcon,
  EditIcon,
  TrashIcon,
  PlusIcon,
  UsersIcon,
  WalletIcon,
  ClockIcon,
  ClipboardListIcon,
} from "@/lib/icons";
import "../bill-entry/entry.css";
import "./staff.css";
import "./staff-v2.css";

function PrinterIcon({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "middle", flexShrink: 0 }}>
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </svg>
  );
}

function CalendarIcon({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "middle", flexShrink: 0 }}>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function SmartphoneIcon({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "middle", flexShrink: 0 }}>
      <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
      <line x1="12" y1="18" x2="12.01" y2="18" />
    </svg>
  );
}

function MonitorIcon({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "middle", flexShrink: 0 }}>
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );
}

// Exact same staff list as Expense & Classic Staff pages
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

const MONTHS_EN = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];

function getLocalTodayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function shiftDateStr(dateStr, delta) {
  const [y, m, d] = String(dateStr || "").split("-").map(Number);
  if (!y || !m || !d) return dateStr;
  const dt = new Date(y, m - 1, d + delta);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(
    dt.getDate()
  ).padStart(2, "0")}`;
}

function shiftMonth(monthKey, delta) {
  const [y, m] = String(monthKey || "").split("-").map(Number);
  if (!y || !m) return monthKey;
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function getDaysInMonth(monthKey) {
  const [y, m] = String(monthKey || "").split("-").map(Number);
  if (!y || !m) return 30;
  return new Date(y, m, 0).getDate();
}

function getInitials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "ST";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function toEnDigits(val) {
  if (val === null || val === undefined || val === "") return "";
  return String(val).replace(/[০-৯]/g, (d) => String(BN_DIGITS.indexOf(d)));
}

function parseAnyNumber(val) {
  if (val === null || val === undefined) return null;
  const clean = toEnDigits(String(val)).replace(/,/g, "").trim();
  if (clean === "" || clean === "-") return null;
  const num = Number(clean);
  return Number.isFinite(num) ? num : null;
}

function formatNum(num, decimals = 2) {
  const n = Number(num || 0);
  return n.toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatSlipAccounting(num, useBn = false, dashIfZero = false) {
  const n = Number(num || 0);
  if (Math.abs(n) < 0.005) {
    return dashIfZero ? "-" : "";
  }
  const absFormatted = Math.abs(n).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const out = useBn ? toBengaliDigits(absFormatted) : absFormatted;
  return n < 0 ? `(${out})` : out;
}

export default function StaffAttendanceV2Page() {
  const todayStr = useMemo(() => getLocalTodayStr(), []);
  const [entryDate, setEntryDate] = useState(todayStr);
  const [monthKey, setMonthKey] = useState(() => todayStr.slice(0, 7));

  // Primary View Tab (Desktop): "daily" | "matrix" | "slips" | "directory"
  const [activeTab, setActiveTab] = useState("matrix");
  const initialViewportSetRef = useRef(false);

  // Mobile-First Experience & PC Phone Preview Mode
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [phonePreviewOnPc, setPhonePreviewOnPc] = useState(false);
  const [mobileTab, setMobileTab] = useState("attendance"); // "attendance" | "accounts"
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const [expandedOtStaff, setExpandedOtStaff] = useState(null);
  const [mobileAccSearch, setMobileAccSearch] = useState("");
  const [mobileAccFilter, setMobileAccFilter] = useState("active"); // "active" | "cash" | "due" | "all"
  const [expandedCalStaff, setExpandedCalStaff] = useState(null);

  // Track responsive viewport width dynamically for true mobile vs desktop UX
  useEffect(() => {
    function syncViewport() {
      const mobileNow = typeof window !== "undefined" && window.innerWidth < 768;
      setIsMobileViewport(mobileNow);
      if (!initialViewportSetRef.current) {
        initialViewportSetRef.current = true;
        if (mobileNow) setActiveTab("daily");
      }
    }
    syncViewport();
    window.addEventListener("resize", syncViewport);
    return () => window.removeEventListener("resize", syncViewport);
  }, []);

  const showMobileExperience = isMobileViewport || phonePreviewOnPc;

  // Sync monthKey when entryDate moves to a different month
  useEffect(() => {
    if (entryDate && entryDate.slice(0, 7) !== monthKey) {
      setMonthKey(entryDate.slice(0, 7));
    }
  }, [entryDate, monthKey]);

  function handleMonthChange(nextMonth) {
    if (!nextMonth || nextMonth === monthKey) return;
    setMonthKey(nextMonth);
    const curDay = Number(entryDate.split("-")[2] || 1);
    const maxDay = getDaysInMonth(nextMonth);
    const clampedDay = String(Math.min(curDay, maxDay)).padStart(2, "0");
    setEntryDate(`${nextMonth}-${clampedDay}`);
  }

  // Extra staff shared with Expense & Classic Staff pages
  const [extraStaff, setExtraStaff] = useState([]);
  useEffect(() => {
    try {
      const saved = localStorage.getItem("cew_extra_staff");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setExtraStaff(parsed);
      }
    } catch (_) {}
  }, []);

  function addCustomStaffToList(name) {
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
        } catch (_) {}
        return next;
      });
    }
  }

  // Server data for the selected month
  const [profiles, setProfiles] = useState({});
  const [records, setRecords] = useState({});
  const [monthExpenses, setMonthExpenses] = useState([]);
  const [deletedStaff, setDeletedStaff] = useState([]);
  const [loading, setLoading] = useState(true);

  async function loadMonthData(targetMonth = monthKey) {
    setLoading(true);
    try {
      const res = await fetch(`/api/staff?month=${encodeURIComponent(targetMonth)}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (data.ok) {
        setProfiles(data.profiles || {});
        setRecords(data.records || {});
        setMonthExpenses(data.expenses || []);
        setDeletedStaff(data.deletedStaff || []);
      }
    } catch (err) {
      console.error("Failed to load staff data:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMonthData(monthKey);
  }, [monthKey]);

  // Combined master list of staff (excluding deleted staff)
  const allStaffList = useMemo(() => {
    const list = [...DEFAULT_STAFF];
    const addUnique = (name) => {
      const n = String(name || "").trim();
      if (!n) return;
      if (!list.some((x) => x.toLowerCase() === n.toLowerCase())) {
        list.push(n);
      }
    };
    extraStaff.forEach(addUnique);
    Object.keys(profiles).forEach(addUnique);
    Object.keys(records).forEach(addUnique);
    monthExpenses.forEach((e) => addUnique(e.paid_to));

    let localDeleted = [];
    try {
      const s = localStorage.getItem("cew_deleted_staff");
      if (s) localDeleted = JSON.parse(s);
    } catch (_) {}
    const deletedLower = [...(deletedStaff || []), ...localDeleted].map((x) =>
      String(x).toLowerCase()
    );

    return list.filter((s) => !deletedLower.includes(s.toLowerCase()));
  }, [extraStaff, profiles, records, monthExpenses, deletedStaff]);

  function removeStaffFromLocal(name) {
    try {
      const savedExtra = localStorage.getItem("cew_extra_staff");
      if (savedExtra) {
        const parsed = JSON.parse(savedExtra);
        if (Array.isArray(parsed)) {
          const next = parsed.filter((s) => s.toLowerCase() !== name.toLowerCase());
          localStorage.setItem("cew_extra_staff", JSON.stringify(next));
          setExtraStaff(next);
        }
      }
      const savedDel = localStorage.getItem("cew_deleted_staff");
      const delList = savedDel ? JSON.parse(savedDel) : [];
      if (!delList.some((s) => s.toLowerCase() === name.toLowerCase())) {
        delList.push(name);
        localStorage.setItem("cew_deleted_staff", JSON.stringify(delList));
      }
    } catch (_) {}
  }

  function renameStaffInLocal(oldName, newName) {
    try {
      const savedExtra = localStorage.getItem("cew_extra_staff");
      if (savedExtra) {
        const parsed = JSON.parse(savedExtra);
        if (Array.isArray(parsed)) {
          const next = parsed.map((s) =>
            s.toLowerCase() === oldName.toLowerCase() ? newName : s
          );
          localStorage.setItem("cew_extra_staff", JSON.stringify(next));
          setExtraStaff(next);
        }
      }
    } catch (_) {}
  }

  // Month rules matching Classic page
  const monthNum = useMemo(() => Number(monthKey.split("-")[1] || 1), [monthKey]);
  const yearNum = useMemo(() => Number(monthKey.split("-")[0] || 2026), [monthKey]);
  const salaryDivisor = monthNum === 2 ? 28 : 30;
  const daysInMonth = useMemo(() => getDaysInMonth(monthKey), [monthKey]);
  const monthLabelEn = `${MONTHS_EN[monthNum - 1] || ""} ${yearNum}`;

  // Build monthly summary + daily Expense cash taken map for every staff member
  const staffSummaries = useMemo(() => {
    return allStaffList.map((staffName) => {
      const prof = profiles[staffName] || { monthly_salary: 0 };
      const rec = records[staffName] || { attendance: {}, overtime: {}, prev_balance: 0 };

      let totalAttendance = 0;
      let totalOvertimeHours = 0;
      let presentDaysCount = 0;
      let halfDaysCount = 0;
      let absentDaysCount = 0;
      const recordedDays = [];

      for (const [dKey, val] of Object.entries(rec.attendance || {})) {
        const num = parseAnyNumber(val);
        if (num !== null) {
          totalAttendance += num;
          if (num === 1) presentDaysCount++;
          else if (num === 0.5) halfDaysCount++;
          else if (num === 0) absentDaysCount++;

          recordedDays.push({
            day: Number(dKey),
            att: num,
            ot: Number(rec.overtime?.[dKey] || 0),
          });
        }
      }

      for (const [dKey, val] of Object.entries(rec.overtime || {})) {
        const num = parseAnyNumber(val);
        if (num !== null && num > 0) {
          totalOvertimeHours += num;
          if (!recordedDays.some((x) => x.day === Number(dKey))) {
            recordedDays.push({ day: Number(dKey), att: 0, ot: num });
          }
        }
      }

      recordedDays.sort((a, b) => a.day - b.day);

      // Pull Cash Taken directly from Expense page (Salary & Overtime categories)
      const matchingExpenses = monthExpenses.filter(
        (exp) =>
          String(exp.paid_to || "").trim().toLowerCase() === staffName.toLowerCase()
      );
      const expByDay = {};
      const expItemsByDay = {};
      matchingExpenses.forEach((exp) => {
        const dNum = Number(exp.day_num);
        expByDay[dNum] = (expByDay[dNum] || 0) + Number(exp.amount || 0);
        if (!expItemsByDay[dNum]) expItemsByDay[dNum] = [];
        expItemsByDay[dNum].push(exp);
      });

      const totalCashTaken = matchingExpenses.reduce(
        (sum, exp) => sum + Number(exp.amount || 0),
        0
      );

      const overtimeDays = totalOvertimeHours / 8;
      const totalWorkDays = totalAttendance + overtimeDays;
      const monthlySalary = Number(prof.monthly_salary || 0);
      const earnedSalary =
        monthlySalary > 0 ? (monthlySalary / salaryDivisor) * totalWorkDays : 0;
      const prevBalance = Number(rec.prev_balance || 0);
      const remainingPayable = earnedSalary + prevBalance - totalCashTaken;

      const hasActivity =
        monthlySalary > 0 ||
        totalAttendance > 0 ||
        totalOvertimeHours > 0 ||
        totalCashTaken > 0 ||
        prevBalance !== 0;

      return {
        staffName,
        attendanceMap: rec.attendance || {},
        overtimeMap: rec.overtime || {},
        monthlySalary,
        totalAttendance,
        presentDaysCount,
        halfDaysCount,
        absentDaysCount,
        totalOvertimeHours,
        overtimeDays,
        totalWorkDays,
        earnedSalary,
        prevBalance,
        totalCashTaken,
        remainingPayable,
        recordedDays,
        matchingExpenses,
        expByDay,
        expItemsByDay,
        hasActivity,
      };
    });
  }, [allStaffList, profiles, records, monthExpenses, salaryDivisor]);

  const summaryByName = useMemo(() => {
    const map = {};
    staffSummaries.forEach((s) => {
      map[s.staffName] = s;
    });
    return map;
  }, [staffSummaries]);

  // Selected day for Daily Attendance Roster
  const currentDayNum = Number(entryDate.split("-")[2] || 1);
  const currentDayKey = String(currentDayNum);

  // KPI Aggregates
  const kpiStats = useMemo(() => {
    let activeCount = 0;
    let totalWorkDaysSum = 0;
    let totalOtSum = 0;
    let totalCashSum = 0;
    let totalCashTxCount = 0;
    let totalNetPayableSum = 0;
    let todayPresent = 0;
    let todayHalf = 0;
    let todayAbsent = 0;
    let todayMarked = 0;

    staffSummaries.forEach((s) => {
      if (s.hasActivity) activeCount++;
      totalWorkDaysSum += s.totalWorkDays;
      totalOtSum += s.totalOvertimeHours;
      totalCashSum += s.totalCashTaken;
      totalCashTxCount += s.matchingExpenses.length;
      if (s.hasActivity) {
        totalNetPayableSum += s.remainingPayable;
      }

      const dVal = s.attendanceMap?.[currentDayKey];
      if (dVal !== undefined && dVal !== "") {
        todayMarked++;
        const n = Number(dVal);
        if (n === 1) todayPresent++;
        else if (n === 0.5) todayHalf++;
        else if (n === 0) todayAbsent++;
      }
    });

    return {
      activeCount,
      totalWorkDaysSum,
      totalOtSum,
      totalCashSum,
      totalCashTxCount,
      totalNetPayableSum,
      todayPresent,
      todayHalf,
      todayAbsent,
      todayMarked,
    };
  }, [staffSummaries, currentDayKey]);

  // =========================================================================
  // VIEW 1 STATE: DAILY ATTENDANCE ROSTER (Mobile-First + Desktop Quick Table)
  // =========================================================================
  const [rosterState, setRosterState] = useState({});
  const [rosterSearch, setRosterSearch] = useState("");
  const [rosterFilter, setRosterFilter] = useState("all"); // "all" | "unmarked" | "present" | "half" | "absent" | "ot" | "cash"
  const [rosterSaving, setRosterSaving] = useState(false);
  const [rosterMsg, setRosterMsg] = useState("");
  const [savingSingleName, setSavingSingleName] = useState("");

  useEffect(() => {
    const dayKey = String(Number(entryDate.split("-")[2] || 1));
    const next = {};
    allStaffList.forEach((name) => {
      const rec = records[name];
      const existingAtt = rec?.attendance?.[dayKey];
      const existingOt = rec?.overtime?.[dayKey];
      const hasExisting = existingAtt !== undefined && existingAtt !== "";
      next[name] = {
        att: hasExisting ? String(existingAtt) : "",
        ot: existingOt !== undefined && existingOt !== 0 ? String(existingOt) : "",
        hasExisting,
        dirty: false,
      };
    });
    setRosterState(next);
  }, [entryDate, records, allStaffList]);

  function updateRosterRow(name, patch) {
    setRosterState((prev) => {
      const cur = prev[name] || { att: "", ot: "", hasExisting: false, dirty: false };
      return {
        ...prev,
        [name]: {
          ...cur,
          ...patch,
          dirty: true,
        },
      };
    });
  }

  function applyBulkStatusToRoster(onlyUnmarked = false, statusVal = "1") {
    setRosterState((prev) => {
      const next = { ...prev };
      filteredRosterStaff.forEach((name) => {
        const cur = next[name] || { att: "", ot: "", hasExisting: false, dirty: false };
        if (onlyUnmarked && cur.att !== "") return;
        next[name] = {
          ...cur,
          att: statusVal,
          dirty: true,
        };
      });
      return next;
    });
  }

  const filteredRosterStaff = useMemo(() => {
    const q = (rosterSearch || "").trim().toLowerCase();
    return allStaffList.filter((name) => {
      if (q && !name.toLowerCase().includes(q)) return false;
      const row = rosterState[name] || { att: "", ot: "" };
      const sum = summaryByName[name];
      if (rosterFilter === "unmarked") return row.att === "";
      if (rosterFilter === "present") return row.att === "1";
      if (rosterFilter === "half") return row.att === "0.5";
      if (rosterFilter === "absent") return row.att === "0";
      if (rosterFilter === "ot") return Number(row.ot || 0) > 0;
      if (rosterFilter === "cash") return Number(sum?.expByDay?.[currentDayNum] || 0) > 0;
      return true;
    });
  }, [allStaffList, rosterSearch, rosterFilter, rosterState, summaryByName, currentDayNum]);

  const rosterCounts = useMemo(() => {
    let p = 0;
    let hd = 0;
    let a = 0;
    let unmarked = 0;
    let dirty = 0;
    let cashTodayCount = 0;
    allStaffList.forEach((name) => {
      const r = rosterState[name];
      if (!r || r.att === "") unmarked++;
      else if (r.att === "1") p++;
      else if (r.att === "0.5") hd++;
      else if (r.att === "0") a++;
      if (r?.dirty) dirty++;
      if (Number(summaryByName[name]?.expByDay?.[currentDayNum] || 0) > 0) cashTodayCount++;
    });
    return { p, hd, a, unmarked, dirty, cashTodayCount };
  }, [allStaffList, rosterState, summaryByName, currentDayNum]);

  async function handleSaveRosterAll(saveOnlyDirty = true) {
    const entries = [];
    for (const name of allStaffList) {
      const r = rosterState[name];
      if (!r) continue;
      if (saveOnlyDirty && !r.dirty) continue;
      if (!saveOnlyDirty && r.att === "" && !r.hasExisting && !r.dirty) continue;
      const parsedAtt = r.att === "" ? null : parseAnyNumber(r.att);
      const parsedOt = parseAnyNumber(r.ot);
      entries.push({
        staff_name: name,
        attendance: parsedAtt,
        overtime: parsedOt !== null && parsedOt > 0 ? parsedOt : 0,
      });
    }

    if (entries.length === 0) {
      setRosterMsg("No changes pending to save.");
      setTimeout(() => setRosterMsg(""), 2500);
      return;
    }

    const targetMonth = entryDate.slice(0, 7);
    const dayNum = Number(entryDate.split("-")[2]);
    setRosterSaving(true);
    setRosterMsg("");
    try {
      const res = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "bulk_save_attendance",
          month_key: targetMonth,
          day: dayNum,
          entries,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        await loadMonthData(targetMonth);
        setRosterMsg(`Saved attendance for ${entries.length} staff on Day ${dayNum}`);
        setTimeout(() => setRosterMsg(""), 3500);
      } else {
        setRosterMsg(data.error || "Failed to save attendance");
      }
    } catch (err) {
      console.error(err);
      setRosterMsg("Network error while saving attendance");
    } finally {
      setRosterSaving(false);
    }
  }

  async function handleSaveSingleRosterRow(name) {
    const r = rosterState[name];
    if (!r) return;
    const targetMonth = entryDate.slice(0, 7);
    const dayNum = Number(entryDate.split("-")[2]);
    const parsedAtt = r.att === "" ? null : parseAnyNumber(r.att);
    const parsedOt = parseAnyNumber(r.ot);

    setSavingSingleName(name);
    try {
      const res = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_attendance",
          staff_name: name,
          month_key: targetMonth,
          day: dayNum,
          attendance: parsedAtt,
          overtime: parsedOt !== null && parsedOt > 0 ? parsedOt : 0,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setRecords((prev) => ({
          ...prev,
          [name]: {
            ...(prev[name] || { prev_balance: 0 }),
            ...data.record,
          },
        }));
        setRosterMsg(`Saved ${name} for Day ${dayNum}`);
        setTimeout(() => setRosterMsg(""), 2500);
      }
    } catch (err) {
      console.error(err);
      setRosterMsg("Failed to save row");
    } finally {
      setSavingSingleName("");
    }
  }

  // =========================================================================
  // VIEW 2 STATE: MONTHLY MATRIX + CELL QUICK-EDIT MODAL
  // =========================================================================
  const [matrixSearch, setMatrixSearch] = useState("");
  const [matrixFilter, setMatrixFilter] = useState("all"); // "all" | "active"
  const [matrixMode, setMatrixMode] = useState("grid"); // "grid" | "cards"
  const [showDailyCashRows, setShowDailyCashRows] = useState(true);

  const [cellModal, setCellModal] = useState(null); // { staffName, day, att, ot, expenses }
  const [cellSaving, setCellSaving] = useState(false);

  const filteredMatrixStaff = useMemo(() => {
    let list = staffSummaries;
    if (matrixFilter === "active") {
      list = list.filter((s) => s.hasActivity || s.totalAttendance > 0 || s.totalOvertimeHours > 0);
    }
    const q = (matrixSearch || "").trim().toLowerCase();
    if (q) {
      list = list.filter((s) => s.staffName.toLowerCase().includes(q));
    }
    return list;
  }, [staffSummaries, matrixFilter, matrixSearch]);

  function openCellModal(staffItem, dayNum) {
    const dStr = String(dayNum);
    const curAtt = staffItem.attendanceMap?.[dStr];
    const curOt = staffItem.overtimeMap?.[dStr];
    const dayExpenses = staffItem.expItemsByDay?.[dayNum] || [];
    setCellModal({
      staffName: staffItem.staffName,
      day: dayNum,
      att: curAtt !== undefined && curAtt !== "" ? String(curAtt) : "",
      ot: curOt !== undefined && curOt !== 0 ? String(curOt) : "",
      expenses: dayExpenses,
      monthCashTotal: staffItem.totalCashTaken,
    });
  }

  async function handleSaveCellModal(e) {
    e.preventDefault();
    if (!cellModal) return;
    setCellSaving(true);
    try {
      const parsedAtt = cellModal.att === "" ? null : parseAnyNumber(cellModal.att);
      const parsedOt = parseAnyNumber(cellModal.ot);
      const res = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_attendance",
          staff_name: cellModal.staffName,
          month_key: monthKey,
          day: cellModal.day,
          attendance: parsedAtt,
          overtime: parsedOt !== null && parsedOt > 0 ? parsedOt : 0,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setRecords((prev) => ({
          ...prev,
          [cellModal.staffName]: {
            ...(prev[cellModal.staffName] || { prev_balance: 0 }),
            ...data.record,
          },
        }));
        setCellModal(null);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to save cell attendance");
    } finally {
      setCellSaving(false);
    }
  }

  // =========================================================================
  // VIEW 3 & 4 STATE: SLIPS, DIRECTORY & SETUP/PROFILE MODALS
  // =========================================================================
  const [slipFilter, setSlipFilter] = useState("active"); // "active" | "all"
  const [slipSearch, setSlipSearch] = useState("");
  const [dirSearch, setDirSearch] = useState("");

  const visibleSlips = useMemo(() => {
    let list = staffSummaries;
    if (slipFilter === "active") {
      const active = list.filter((s) => s.hasActivity);
      list = active.length > 0 ? active : list.slice(0, 6);
    }
    const q = (slipSearch || "").trim().toLowerCase();
    if (q) {
      list = list.filter((s) => s.staffName.toLowerCase().includes(q));
    }
    return list;
  }, [staffSummaries, slipFilter, slipSearch]);

  const filteredDirectoryStaff = useMemo(() => {
    const q = (dirSearch || "").trim().toLowerCase();
    if (!q) return staffSummaries;
    return staffSummaries.filter((s) => s.staffName.toLowerCase().includes(q));
  }, [staffSummaries, dirSearch]);

  const filteredMobileAccounts = useMemo(() => {
    let list = staffSummaries;
    if (mobileAccFilter === "active") {
      const active = list.filter((s) => s.hasActivity);
      list = active.length > 0 ? active : list;
    } else if (mobileAccFilter === "cash") {
      list = list.filter((s) => s.totalCashTaken > 0);
    } else if (mobileAccFilter === "due") {
      list = list.filter((s) => Math.abs(s.remainingPayable) >= 0.5 || s.earnedSalary > 0);
    }
    const q = (mobileAccSearch || "").trim().toLowerCase();
    if (q) {
      list = list.filter((s) => s.staffName.toLowerCase().includes(q));
    }
    return list;
  }, [staffSummaries, mobileAccFilter, mobileAccSearch]);

  const mobileAccountTotals = useMemo(() => {
    return staffSummaries.reduce(
      (acc, s) => {
        if (s.hasActivity) {
          acc.earned += s.earnedSalary;
          acc.cash += s.totalCashTaken;
          acc.payable += s.remainingPayable;
        }
        return acc;
      },
      { earned: 0, cash: 0, payable: 0 }
    );
  }, [staffSummaries]);

  // Salary & Previous Balance Modal
  const [setupModal, setSetupModal] = useState(null); // { staffName, salary, prevBalance }
  const [setupSaving, setSetupSaving] = useState(false);

  function openSetupModal(staffName = allStaffList[0] || "") {
    const prof = profiles[staffName] || { monthly_salary: 0 };
    const rec = records[staffName] || { prev_balance: 0 };
    setSetupModal({
      staffName,
      salary: prof.monthly_salary > 0 ? String(prof.monthly_salary) : "",
      prevBalance: rec.prev_balance !== 0 && rec.prev_balance !== undefined ? String(rec.prev_balance) : "",
    });
  }

  async function handleSaveSetupModal(e) {
    e.preventDefault();
    if (!setupModal?.staffName) return;
    const name = setupModal.staffName.trim();
    addCustomStaffToList(name);
    const parsedSalary = parseAnyNumber(setupModal.salary) || 0;
    const parsedPrev = parseAnyNumber(setupModal.prevBalance) || 0;

    setSetupSaving(true);
    try {
      const res = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_setup",
          staff_name: name,
          month_key: monthKey,
          monthly_salary: parsedSalary,
          prev_balance: parsedPrev,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setProfiles((prev) => ({
          ...prev,
          [name]: { staff_name: name, monthly_salary: parsedSalary },
        }));
        setRecords((prev) => ({
          ...prev,
          [name]: {
            ...(prev[name] || { attendance: {}, overtime: {} }),
            staff_name: name,
            month_key: monthKey,
            prev_balance: parsedPrev,
          },
        }));
        setSetupModal(null);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to save salary settings");
    } finally {
      setSetupSaving(false);
    }
  }

  // Add / Rename / Edit Staff Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editModalStaff, setEditModalStaff] = useState({ originalName: "", name: "", salary: "" });
  const [editModalBusy, setEditModalBusy] = useState(false);
  const [editModalError, setEditModalError] = useState("");

  function openEditModal(staffName = "") {
    setEditModalError("");
    if (staffName) {
      const currentSalary = profiles[staffName]?.monthly_salary || 0;
      setEditModalStaff({
        originalName: staffName,
        name: staffName,
        salary: currentSalary > 0 ? String(currentSalary) : "",
      });
    } else {
      setEditModalStaff({ originalName: "", name: "", salary: "" });
    }
    setEditModalOpen(true);
  }

  async function handleSaveEditStaff(e) {
    e.preventDefault();
    const oldName = (editModalStaff.originalName || "").trim();
    const newName = (editModalStaff.name || "").trim();
    const salary = parseAnyNumber(editModalStaff.salary) || 0;
    if (!newName) {
      setEditModalError("Staff name cannot be empty");
      return;
    }

    setEditModalBusy(true);
    setEditModalError("");
    try {
      const res = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_staff",
          old_name: oldName || newName,
          new_name: newName,
          monthly_salary: salary,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        if (oldName && oldName.toLowerCase() !== newName.toLowerCase()) {
          renameStaffInLocal(oldName, newName);
        }
        addCustomStaffToList(newName);
        setEditModalOpen(false);
        await loadMonthData(monthKey);
      } else {
        setEditModalError(data.error || "Failed to save staff");
      }
    } catch (err) {
      console.error(err);
      setEditModalError("Network error while saving staff");
    } finally {
      setEditModalBusy(false);
    }
  }

  async function handleDeleteStaff(name) {
    if (!window.confirm(`Are you sure you want to delete "${name}" from the active staff list?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/staff?name=${encodeURIComponent(name)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.ok) {
        removeStaffFromLocal(name);
        setDeletedStaff((prev) => [...prev, name]);
        await loadMonthData(monthKey);
      } else {
        alert(data.error || "Failed to delete staff");
      }
    } catch (err) {
      console.error(err);
      alert("Network error while deleting staff");
    }
  }

  // =========================================================================
  // EXCEL & PDF EXPORTS (Parity with Classic Page + Direct Matrix Export)
  // =========================================================================
  const [excelLangModal, setExcelLangModal] = useState({ isOpen: false, format: "xlsx" });
  const [translatingExcel, setTranslatingExcel] = useState(false);
  const [translatingProgress, setTranslatingProgress] = useState(0);

  function exportAttendanceMatrixDirect() {
    const dayCols = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const headers = [
      "SL",
      "Staff Name",
      "Monthly Salary (BDT)",
      ...dayCols.map((d) => {
        const dObj = new Date(yearNum, monthNum - 1, d);
        return `${String(d).padStart(2, "0")} (${WEEKDAYS_SHORT[dObj.getDay()]})`;
      }),
      "Present (P)",
      "Half Day (HD)",
      "Absent (A)",
      "Overtime (Hrs)",
      "Total Work Days",
      "Earned Salary (BDT)",
      "Cash Taken - Expense (BDT)",
      "Prev. Due (BDT)",
      "Net Payable (BDT)",
    ];

    const sheetRows = [
      ["CHOWDHURY ENGINEERING WORKS"],
      [`MONTHLY STAFF ATTENDANCE & EXPENSE CASH SHEET - ${monthLabelEn.toUpperCase()}`],
      [],
      headers,
    ];

    filteredMatrixStaff.forEach((item, idx) => {
      const dayCells = dayCols.map((d) => {
        const dStr = String(d);
        const att = item.attendanceMap?.[dStr];
        const ot = Number(item.overtimeMap?.[dStr] || 0);
        if (att === 1) return ot > 0 ? `P (+${ot}h)` : "P";
        if (att === 0.5) return ot > 0 ? `HD (+${ot}h)` : "HD";
        if (att === 0) return "A";
        return ot > 0 ? `+${ot}h` : "-";
      });

      sheetRows.push([
        idx + 1,
        item.staffName,
        item.monthlySalary > 0 ? item.monthlySalary : "",
        ...dayCells,
        item.presentDaysCount,
        item.halfDaysCount,
        item.absentDaysCount,
        item.totalOvertimeHours > 0 ? item.totalOvertimeHours.toFixed(1) : "0",
        item.totalWorkDays.toFixed(2),
        item.earnedSalary > 0 ? item.earnedSalary.toFixed(2) : "0.00",
        item.totalCashTaken > 0 ? item.totalCashTaken.toFixed(2) : "0.00",
        item.prevBalance !== 0 ? item.prevBalance.toFixed(2) : "0.00",
        item.remainingPayable.toFixed(2),
      ]);

      if (showDailyCashRows) {
        sheetRows.push([
          "",
          "Cash Taken (Expense)",
          "",
          ...dayCols.map((d) => {
            const c = item.expByDay?.[d] || 0;
            return c > 0 ? c.toFixed(0) : "0";
          }),
          "",
          "",
          "",
          "",
          "",
          "",
          item.totalCashTaken > 0 ? item.totalCashTaken.toFixed(2) : "0.00",
          "",
          "",
        ]);
      }
    });

    const footerRow = [
      "",
      "DAILY TOTAL PRESENT",
      "",
      ...dayCols.map((d) => {
        const dStr = String(d);
        let dailyP = 0;
        filteredMatrixStaff.forEach((item) => {
          const att = item.attendanceMap?.[dStr];
          if (att === 1) dailyP += 1;
          else if (att === 0.5) dailyP += 0.5;
        });
        return dailyP > 0 ? dailyP : "";
      }),
    ];
    sheetRows.push([]);
    sheetRows.push(footerRow);

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(sheetRows);
    ws["!cols"] = [
      { wch: 6 },
      { wch: 24 },
      { wch: 18 },
      ...dayCols.map(() => ({ wch: 9 })),
      { wch: 11 },
      { wch: 12 },
      { wch: 10 },
      { wch: 14 },
      { wch: 15 },
      { wch: 18 },
      { wch: 22 },
      { wch: 15 },
      { wch: 18 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, "Monthly Attendance");
    XLSX.writeFile(wb, `Staff_Monthly_Attendance_${monthKey}.xlsx`);
  }

  async function executeExportExcel(lang = "en", format = excelLangModal.format || "xlsx") {
    const isBn = lang === "bn";
    const isPdf = format === "pdf";
    if (isBn || isPdf) {
      setTranslatingExcel(true);
      setTranslatingProgress(10);
    }

    try {
      const wb = XLSX.utils.book_new();
      const fmtVal = (n, d = 2) => {
        const formatted = formatNum(n, d);
        return isBn ? toBengaliDigits(formatted) : formatted;
      };

      const exportCards = visibleSlips.length > 0 ? visibleSlips : staffSummaries;
      let slipRows = [];
      const cardPairs = [];

      for (let i = 0; i < exportCards.length; i += 2) {
        const left = exportCards[i];
        const right = exportCards[i + 1] || null;
        cardPairs.push({ left, right });

        const buildCardLines = (item) => {
          if (!item) {
            return Array.from({ length: 9 }, () => ["", "", ""]);
          }
          return [
            [isBn ? "নাম" : "Name", item.staffName, isBn ? "টাকা নেওয়া" : "Cash Taken"],
            [
              isBn ? "মূল বেতন" : "Basic Salary",
              item.monthlySalary > 0 ? fmtVal(item.monthlySalary, 2) : "",
              "",
            ],
            [
              isBn ? "উপস্থিতি" : "Attendance",
              fmtVal(item.totalAttendance, 2),
              item.totalCashTaken > 0 ? fmtVal(item.totalCashTaken, 2) : "",
            ],
            [
              isBn ? "অতিরিক্ত" : "Overtime",
              item.overtimeDays > 0 ? fmtVal(item.overtimeDays, 2) : "",
              "",
            ],
            [isBn ? "মোট কাজ" : "Total Work", fmtVal(item.totalWorkDays, 2), ""],
            [
              isBn ? "প্রাপ্য বেতন" : "Earned Salary",
              item.earnedSalary > 0 ? fmtVal(item.earnedSalary, 2) : "-",
              "-",
            ],
            [
              isBn ? "পূর্বের পাওনা" : "Previous Due",
              formatSlipAccounting(item.prevBalance, isBn, false),
              "",
            ],
            [
              isBn ? "অবশিষ্ট টাকা" : "Net Payable",
              formatSlipAccounting(item.remainingPayable, isBn, true),
              "",
            ],
            [isBn ? "স্বাক্ষর" : "Signature", "", ""],
          ];
        };

        const leftLines = buildCardLines(left);
        const rightLines = buildCardLines(right);
        for (let rIdx = 0; rIdx < 9; rIdx++) {
          slipRows.push([...leftLines[rIdx], "", ...rightLines[rIdx]]);
        }
        slipRows.push(["", "", "", "", "", "", ""]);
      }

      if (isBn) {
        slipRows = await batchTranslateTable(slipRows, (pct) =>
          setTranslatingProgress(Math.min(60, Math.round(pct * 0.6)))
        );
      }

      const wsSlips = XLSX.utils.aoa_to_sheet(slipRows);
      XLSX.utils.book_append_sheet(wb, wsSlips, isBn ? "বেতন স্লিপ" : "Salary Slips");

      const dayCols = Array.from({ length: daysInMonth }, (_, i) => i + 1);
      let gridRows = [
        [
          isBn ? "ক্রমিক নং" : "SL",
          isBn ? "কর্মকর্তা/কর্মচারী নাম তালিকা" : "Staff Name",
          isBn ? "মাসিক বেতন" : "Monthly Salary",
          ...dayCols.map((d) => (isBn ? toBengaliDigits(d) : String(d))),
          isBn ? "উপস্থিতি" : "Attendance",
          isBn ? "অতিরিক্ত কাজ" : "Overtime",
          isBn ? "মোট কাজ" : "Total Work",
          isBn ? "প্রাপ্য বেতন টাকা" : "Earned Salary",
          isBn ? "টাকা নেওয়া" : "Cash Taken",
          isBn ? "অবশিষ্ট টাকা" : "Net Payable",
        ],
      ];

      exportCards.forEach((item, idx) => {
        const sl = idx + 1;
        gridRows.push([
          isBn ? toBengaliDigits(sl) : sl,
          item.staffName,
          item.monthlySalary > 0 ? fmtVal(item.monthlySalary, 0) : "",
          ...dayCols.map((d) => {
            const v = item.attendanceMap?.[String(d)];
            return v !== undefined && v !== "" ? (isBn ? toBengaliDigits(v) : v) : "";
          }),
          fmtVal(item.totalAttendance, 2),
          item.overtimeDays > 0 ? fmtVal(item.overtimeDays, 2) : "",
          fmtVal(item.totalWorkDays, 2),
          fmtVal(item.earnedSalary, 2),
          fmtVal(item.totalCashTaken, 2),
          formatSlipAccounting(item.remainingPayable, isBn, true),
        ]);

        gridRows.push([
          "",
          isBn ? "টাকা নেওয়া" : "Cash Taken",
          "",
          ...dayCols.map((d) => {
            const c = item.expByDay?.[d] || 0;
            return c > 0 ? fmtVal(c, 0) : isBn ? "০" : "0";
          }),
          "",
          "",
          "",
          "",
          fmtVal(item.totalCashTaken, 0),
          "",
        ]);
      });

      if (isBn) {
        gridRows = await batchTranslateTable(gridRows, (pct) =>
          setTranslatingProgress(60 + Math.round(pct * 0.4))
        );
      }

      const wsGrid = XLSX.utils.aoa_to_sheet(gridRows);
      XLSX.utils.book_append_sheet(
        wb,
        wsGrid,
        isBn ? "মাসিক হাজিরা শিট" : "Monthly Attendance Sheet"
      );

      const langSuffix = isBn ? "_Bangla" : "";
      setTranslatingExcel(false);
      setTranslatingProgress(0);
      setExcelLangModal({ isOpen: false, format: "xlsx" });
      await new Promise((r) => setTimeout(r, 30));

      if (isPdf) {
        const pdfSummaryHeaders = isBn
          ? ["নাম", "মূল বেতন", "উপস্থিতি", "অতিরিক্ত", "মোট কাজ", "প্রাপ্য বেতন", "টাকা নেওয়া", "পূর্বের পাওনা", "অবশিষ্ট টাকা"]
          : ["Name", "Basic Salary", "Attendance", "Overtime", "Total Work", "Earned Salary", "Cash Taken", "Previous Due", "Net Payable"];
        let pdfSummaryRows = exportCards.map((item) => [
          item.staffName,
          item.monthlySalary > 0 ? fmtVal(item.monthlySalary, 2) : "-",
          fmtVal(item.totalAttendance, 2),
          item.overtimeDays > 0 ? fmtVal(item.overtimeDays, 2) : "-",
          fmtVal(item.totalWorkDays, 2),
          item.earnedSalary > 0 ? fmtVal(item.earnedSalary, 2) : "-",
          item.totalCashTaken > 0 ? fmtVal(item.totalCashTaken, 2) : "-",
          formatSlipAccounting(item.prevBalance, isBn, false),
          formatSlipAccounting(item.remainingPayable, isBn, true),
        ]);
        if (isBn) {
          pdfSummaryRows = await batchTranslateTable(pdfSummaryRows, () => {});
        }
        await exportReportToPdf({
          title: isBn ? "চৌধুরী ইঞ্জিনিয়ারিং ওয়ার্কস" : "CHOWDHURY ENGINEERING WORKS",
          subtitle: isBn
            ? `স্টাফ বেতন ও হাজিরা রিপোর্ট (${monthLabelEn})`
            : `Staff Attendance & Salary Report (${monthLabelEn})`,
          filename: `Staff_Attendance_Salary_${monthKey}${langSuffix}.pdf`,
          sheets: [
            {
              sheetTitle: isBn ? "বেতন সারসংক্ষেপ" : "Salary Slips Summary",
              headers: pdfSummaryHeaders,
              rows: pdfSummaryRows,
              summaryRows: [],
              rightAlignCols: [1, 2, 3, 4, 5, 6, 7, 8],
            },
            aoaToPdfSheet(
              gridRows,
              isBn ? "মাসিক হাজিরা শিট" : "Monthly Attendance Sheet",
              [1, 2, 3, 4, 5, 6]
            ),
          ],
          lang,
          orientation: "landscape",
        });
      } else {
        XLSX.writeFile(wb, `Staff_Attendance_Salary_${monthKey}${langSuffix}.xlsx`);
      }
    } catch (err) {
      console.error("Failed to export Staff report:", err);
      alert(`Failed to export ${isPdf ? "PDF" : "Excel"} file.`);
    } finally {
      setTranslatingExcel(false);
      setTranslatingProgress(0);
      setExcelLangModal({ isOpen: false, format: "xlsx" });
    }
  }

  const mobileAppShell = (
    <div className="sv2-mob-shell">
      {/* Sticky Compact Mobile App Header */}
      <div className="sv2-mob-topbar">
        <div className="sv2-mob-top-row">
          <div>
            <h1 className="sv2-mob-title">Staff Attendance &amp; Pay</h1>
            <div className="sv2-mob-sub">
              {monthLabelEn} | Synced with Expense Page
            </div>
          </div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Link href="/" className="sv2-mob-icon-btn" style={{ textDecoration: "none" }} title="Home">
              <HomeIcon size={13} />
            </Link>
            <button
              type="button"
              className={`sv2-mob-icon-btn ${mobileMoreOpen ? "active" : ""}`}
              onClick={() => setMobileMoreOpen((v) => !v)}
            >
              {mobileMoreOpen ? "Close" : "Menu"}
            </button>
          </div>
        </div>

        {/* Compact Month Stepper on Mobile + Quick Add Staff Button */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <div className="sv2-month-pill" style={{ flex: 1, justifyContent: "space-between" }}>
            <button
              type="button"
              className="sv2-month-nav-btn"
              onClick={() => handleMonthChange(shiftMonth(monthKey, -1))}
              title="Previous Month"
            >
              <ChevronLeftIcon size={14} />
            </button>
            <input
              type="month"
              className="sv2-month-input"
              value={monthKey}
              onChange={(e) => e.target.value && handleMonthChange(e.target.value)}
            />
            <button
              type="button"
              className="sv2-month-nav-btn"
              onClick={() => handleMonthChange(shiftMonth(monthKey, 1))}
              title="Next Month"
            >
              <ChevronRightIcon size={14} />
            </button>
          </div>
          <button
            type="button"
            className="sv2-mob-add-staff-btn"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              background: "#0f172a",
              color: "#ffffff",
              border: "1px solid #0f172a",
              borderRadius: 8,
              padding: "7px 11px",
              fontSize: "0.76rem",
              fontWeight: 700,
              cursor: "pointer",
              whiteSpace: "nowrap",
              boxShadow: "0 1px 2px rgba(15,23,42,0.12)",
              flexShrink: 0,
            }}
            onClick={() => openEditModal("")}
            title="Add New Staff"
          >
            <PlusIcon size={13} />
            <span>Add Staff</span>
          </button>
        </div>

        {/* Focused 2-Tab Mobile Switcher */}
        <div className="sv2-mob-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={mobileTab === "attendance"}
            className={`sv2-mob-tab ${mobileTab === "attendance" ? "active" : ""}`}
            onClick={() => setMobileTab("attendance")}
          >
            <ClockIcon size={14} />
            <span>Attendance Entry</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mobileTab === "accounts"}
            className={`sv2-mob-tab ${mobileTab === "accounts" ? "active" : ""}`}
            onClick={() => setMobileTab("accounts")}
          >
            <WalletIcon size={14} />
            <span>Cash Taken &amp; Pay</span>
          </button>
        </div>

        {/* Expandable Quick Tools Drawer */}
        {mobileMoreOpen && (
          <div className="sv2-mob-more-drawer">
            <button
              type="button"
              className="sv2-mini-action"
              onClick={() => {
                setMobileMoreOpen(false);
                openEditModal("");
              }}
            >
              <PlusIcon size={13} /> Add Staff
            </button>
            <button
              type="button"
              className="sv2-mini-action"
              onClick={() => {
                setMobileMoreOpen(false);
                openSetupModal(allStaffList[0] || "");
              }}
            >
              <EditIcon size={13} /> Salary / Due Setup
            </button>
            <button
              type="button"
              className="sv2-mini-action emerald"
              onClick={() => {
                setMobileMoreOpen(false);
                setExcelLangModal({ isOpen: true, format: "xlsx" });
              }}
            >
              <DownloadIcon size={13} /> Export Excel
            </button>
            <button
              type="button"
              className="sv2-mini-action"
              onClick={() => {
                setMobileMoreOpen(false);
                setExcelLangModal({ isOpen: true, format: "pdf" });
              }}
            >
              <DownloadIcon size={13} /> Export PDF
            </button>
            <Link href="/expense" className="sv2-mini-action" style={{ textDecoration: "none" }}>
              <WalletIcon size={13} /> Open Expense Page
            </Link>
          </div>
        )}
      </div>

      {rosterMsg && (
        <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#15803d", background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "8px 12px", borderRadius: 10 }}>
          {rosterMsg}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: 36, color: "#64748b", fontWeight: 600 }}>
          Loading attendance &amp; expense data...
        </div>
      ) : mobileTab === "attendance" ? (
        /* MOBILE TAB 1: HIGH-DENSITY DAILY ATTENDANCE ENTRY */
        <>
          <div className="sv2-mob-date-card">
            <div className="sv2-mob-date-nav">
              <button
                type="button"
                className="sv2-date-step-btn"
                onClick={() => setEntryDate(shiftDateStr(entryDate, -1))}
                title="Previous Day"
              >
                <ChevronLeftIcon size={14} />
              </button>
              <input
                type="date"
                className="sv2-date-input"
                value={entryDate}
                onChange={(e) => e.target.value && setEntryDate(e.target.value)}
              />
              <button
                type="button"
                className="sv2-date-step-btn"
                onClick={() => setEntryDate(shiftDateStr(entryDate, 1))}
                title="Next Day"
              >
                <ChevronRightIcon size={14} />
              </button>
              <button
                type="button"
                className="sv2-date-step-btn"
                onClick={() => setEntryDate(todayStr)}
                style={{
                  background: entryDate === todayStr ? "#0f172a" : "#f8fafc",
                  color: entryDate === todayStr ? "#ffffff" : "#334155",
                }}
              >
                Today
              </button>
            </div>

            <div className="sv2-mob-summary-line">
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <span style={{ color: "#15803d" }}>P: {rosterCounts.p}</span>
                <span style={{ color: "#b45309" }}>HD: {rosterCounts.hd}</span>
                <span style={{ color: "#dc2626" }}>A: {rosterCounts.a}</span>
                <span style={{ color: "#64748b" }}>Unmarked: {rosterCounts.unmarked}</span>
              </div>
              <button
                type="button"
                className="sv2-mini-action emerald"
                style={{ padding: "5px 9px", fontSize: "0.72rem" }}
                onClick={() => applyBulkStatusToRoster(true, "1")}
              >
                <CheckIcon size={12} /> All Unmarked Present
              </button>
            </div>

            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <div style={{ position: "relative", flex: 1 }}>
                <SearchIcon
                  size={13}
                  style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}
                />
                <input
                  type="text"
                  className="be-input"
                  style={{ paddingLeft: 28, height: 34, fontSize: "0.82rem" }}
                  placeholder="Search staff..."
                  value={rosterSearch}
                  onChange={(e) => setRosterSearch(e.target.value)}
                />
              </div>
              <select
                className="be-input"
                style={{ width: "auto", height: 34, padding: "0 8px", fontSize: "0.76rem" }}
                value={rosterFilter}
                onChange={(e) => setRosterFilter(e.target.value)}
              >
                <option value="all">All ({allStaffList.length})</option>
                <option value="unmarked">Unmarked ({rosterCounts.unmarked})</option>
                <option value="present">Present ({rosterCounts.p})</option>
                <option value="half">Half Day ({rosterCounts.hd})</option>
                <option value="absent">Absent ({rosterCounts.a})</option>
                <option value="ot">Overtime</option>
                <option value="cash">Took Cash Today</option>
              </select>
            </div>
          </div>

          <div className="sv2-mob-att-list">
            {filteredRosterStaff.length === 0 ? (
              <div style={{ textAlign: "center", padding: "28px 16px", background: "#ffffff", borderRadius: 12, border: "1px solid #e2e8f0", color: "#64748b", fontSize: "0.84rem", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                <span>No staff found for current filter.</span>
                <button
                  type="button"
                  className="st-action-btn primary"
                  style={{ padding: "7px 14px", fontSize: "0.78rem", display: "inline-flex", alignItems: "center", gap: 5 }}
                  onClick={() => openEditModal(rosterSearch.trim())}
                >
                  <PlusIcon size={13} />
                  <span>Add New Staff {rosterSearch.trim() ? `"${rosterSearch.trim()}"` : ""}</span>
                </button>
              </div>
            ) : (
              filteredRosterStaff.map((name) => {
                const row = rosterState[name] || { att: "", ot: "", hasExisting: false, dirty: false };
                const sum = summaryByName[name];
                const todayCash = Number(sum?.expByDay?.[currentDayNum] || 0);
                const monthCash = Number(sum?.totalCashTaken || 0);
                const otVal = Number(row.ot || 0);
                const isOtOpen = expandedOtStaff === name;

                const statusClass =
                  row.att === "1"
                    ? "status-1"
                    : row.att === "0.5"
                    ? "status-half"
                    : row.att === "0"
                    ? "status-0"
                    : "";

                return (
                  <div
                    key={name}
                    className={`sv2-mob-att-card ${statusClass} ${row.dirty ? "is-dirty" : ""}`}
                  >
                    <div className="sv2-mob-att-main">
                      <div className="sv2-mob-att-info">
                        <div className="sv2-mob-att-name">{name}</div>
                        <div className="sv2-mob-att-meta">
                          <span>Att: {formatNum(sum?.totalAttendance || 0, 1)}d</span>
                          {monthCash > 0 && (
                            <span style={{ color: "#6d28d9", fontWeight: 700 }}>
                              Cash: ৳{formatNum(monthCash, 0)}
                            </span>
                          )}
                          {todayCash > 0 && (
                            <span className="sv2-cash-pill today" style={{ padding: "1px 5px", fontSize: "0.66rem" }}>
                              Today: ৳{formatNum(todayCash, 0)}
                            </span>
                          )}
                          {row.dirty && (
                            <span style={{ color: "#1d4ed8", fontWeight: 800 }}>Edited</span>
                          )}
                        </div>
                      </div>

                      <div className="sv2-mob-btn-cluster">
                        <button
                          type="button"
                          className={`sv2-mob-pill ${row.att === "1" ? "active-1" : ""}`}
                          onClick={() => updateRosterRow(name, { att: "1" })}
                          title="Present"
                        >
                          P
                        </button>
                        <button
                          type="button"
                          className={`sv2-mob-pill ${row.att === "0.5" ? "active-half" : ""}`}
                          onClick={() => updateRosterRow(name, { att: "0.5" })}
                          title="Half Day"
                        >
                          HD
                        </button>
                        <button
                          type="button"
                          className={`sv2-mob-pill ${row.att === "0" ? "active-0" : ""}`}
                          onClick={() => updateRosterRow(name, { att: "0" })}
                          title="Absent"
                        >
                          A
                        </button>
                        <button
                          type="button"
                          className={`sv2-mob-ot-toggle ${otVal > 0 ? "has-ot" : ""}`}
                          onClick={() => setExpandedOtStaff(isOtOpen ? null : name)}
                          title="Toggle Overtime Hours"
                        >
                          {otVal > 0 ? `+${otVal}h` : "+OT"}
                        </button>
                      </div>
                    </div>

                    {isOtOpen && (
                      <div className="sv2-mob-ot-drawer">
                        <div className="sv2-ot-controls">
                          {["0", "1", "2", "3", "4", "8"].map((hr) => (
                            <button
                              key={hr}
                              type="button"
                              className={`sv2-ot-chip ${
                                String(Number(row.ot || 0)) === hr && (row.ot !== "" || hr === "0")
                                  ? "active"
                                  : ""
                              }`}
                              style={{ height: 32, padding: "0 8px", fontSize: "0.72rem" }}
                              onClick={() =>
                                updateRosterRow(name, {
                                  ot: hr === "0" ? "" : hr,
                                  att: row.att === "" && hr !== "0" ? "1" : row.att,
                                })
                              }
                            >
                              {hr === "0" ? "0h" : `+${hr}h`}
                            </button>
                          ))}
                          <input
                            type="number"
                            step="any"
                            min="0"
                            className="sv2-ot-input"
                            style={{ width: 56, height: 32, fontSize: "0.78rem" }}
                            placeholder="Hrs"
                            value={row.ot}
                            onChange={(e) =>
                              updateRosterRow(name, {
                                ot: e.target.value,
                                att: row.att === "" && Number(e.target.value) > 0 ? "1" : row.att,
                              })
                            }
                          />
                        </div>
                        {(row.att !== "" || row.hasExisting) && (
                          <button
                            type="button"
                            className="sv2-mini-action"
                            style={{ padding: "4px 8px", fontSize: "0.72rem" }}
                            onClick={() => updateRosterRow(name, { att: "", ot: "" })}
                          >
                            Clear Day
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {rosterCounts.dirty > 0 && (
            <div className="sv2-sticky-save-bar sv2-no-print">
              <div className="sv2-sticky-save-info">
                <strong>{rosterCounts.dirty} update{rosterCounts.dirty > 1 ? "s" : ""}</strong>
                <span style={{ fontSize: "0.72rem", color: "#cbd5e1" }}>
                  Day {currentDayNum} | P: {rosterCounts.p} | A: {rosterCounts.a}
                </span>
              </div>
              <button
                type="button"
                className="sv2-sticky-save-btn"
                disabled={rosterSaving}
                onClick={() => handleSaveRosterAll(true)}
              >
                <CheckIcon size={15} />
                <span>{rosterSaving ? "Saving..." : `Save (${rosterCounts.dirty})`}</span>
              </button>
            </div>
          )}
        </>
      ) : (
        /* MOBILE TAB 2: CASH TAKEN (FROM EXPENSE) & STAFF PAY TRACKER */
        <>
          <div className="sv2-mob-totals-strip">
            <div className="sv2-mob-total-box">
              <span className="sv2-mob-total-lbl">Earned</span>
              <span className="sv2-mob-total-val">৳{formatNum(mobileAccountTotals.earned, 0)}</span>
            </div>
            <div className="sv2-mob-total-box" style={{ borderColor: "#ddd6fe", background: "#faf5ff" }}>
              <span className="sv2-mob-total-lbl" style={{ color: "#6d28d9" }}>Cash Taken</span>
              <span className="sv2-mob-total-val" style={{ color: "#5b21b6" }}>
                ৳{formatNum(mobileAccountTotals.cash, 0)}
              </span>
            </div>
            <div className="sv2-mob-total-box">
              <span className="sv2-mob-total-lbl">Net Pay</span>
              <span
                className="sv2-mob-total-val"
                style={{ color: mobileAccountTotals.payable < 0 ? "#dc2626" : "#15803d" }}
              >
                ৳{formatSlipAccounting(mobileAccountTotals.payable, false, true)}
              </span>
            </div>
          </div>

          <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 11, padding: 10, display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", gap: 6 }}>
              <div style={{ position: "relative", flex: 1 }}>
                <SearchIcon
                  size={13}
                  style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}
                />
                <input
                  type="text"
                  className="be-input"
                  style={{ paddingLeft: 28, height: 34, fontSize: "0.82rem" }}
                  placeholder="Search staff name..."
                  value={mobileAccSearch}
                  onChange={(e) => setMobileAccSearch(e.target.value)}
                />
              </div>
              <button
                type="button"
                className="st-action-btn primary"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "0 10px",
                  height: 34,
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                }}
                onClick={() => openEditModal("")}
                title="Add New Staff"
              >
                <PlusIcon size={12} />
                <span>Add Staff</span>
              </button>
            </div>

            <div className="sv2-filter-group">
              {[
                { id: "active", label: "Active" },
                { id: "cash", label: "Took Cash" },
                { id: "due", label: "Payable / Earned" },
                { id: "all", label: `All (${allStaffList.length})` },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className={`sv2-filter-pill ${mobileAccFilter === f.id ? "active" : ""}`}
                  style={{ fontSize: "0.73rem", padding: "5px 10px" }}
                  onClick={() => setMobileAccFilter(f.id)}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filteredMobileAccounts.length === 0 ? (
              <div style={{ textAlign: "center", padding: "28px 16px", background: "#ffffff", borderRadius: 12, border: "1px solid #e2e8f0", color: "#64748b", fontSize: "0.84rem", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                <span>No staff match your filter.</span>
                <button
                  type="button"
                  className="st-action-btn primary"
                  style={{ padding: "7px 14px", fontSize: "0.78rem", display: "inline-flex", alignItems: "center", gap: 5 }}
                  onClick={() => openEditModal(mobileAccSearch.trim())}
                >
                  <PlusIcon size={13} />
                  <span>Add New Staff {mobileAccSearch.trim() ? `"${mobileAccSearch.trim()}"` : ""}</span>
                </button>
              </div>
            ) : (
              filteredMobileAccounts.map((item) => {
                const isCalOpen = expandedCalStaff === item.staffName;
                const isNeg = item.remainingPayable < 0;
                return (
                  <div key={item.staffName} className="sv2-mob-pay-card">
                    <div className="sv2-mob-pay-head">
                      <div className="sv2-staff-identity">
                        <span className="sv2-avatar">{getInitials(item.staffName)}</span>
                        <div>
                          <div className="sv2-staff-name">{item.staffName}</div>
                          <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600 }}>
                            Salary: {item.monthlySalary > 0 ? `৳${formatNum(item.monthlySalary, 0)}/mo` : "Not set"}
                          </div>
                        </div>
                      </div>
                      <span className={`sv2-mob-net-badge ${isNeg ? "adv" : "due"}`}>
                        {isNeg ? "Advance: " : "Payable: "}
                        ৳{formatSlipAccounting(item.remainingPayable, false, true)}
                      </span>
                    </div>

                    <div className="sv2-mob-pay-grid">
                      <div className="sv2-mob-pay-cell">
                        <span>Work Days</span>
                        <strong>
                          {formatNum(item.totalWorkDays, 1)}d ({formatNum(item.totalAttendance, 1)} + {formatNum(item.totalOvertimeHours, 0)}h OT)
                        </strong>
                      </div>
                      <div className="sv2-mob-pay-cell">
                        <span>Earned</span>
                        <strong>৳{formatNum(item.earnedSalary, 0)}</strong>
                      </div>
                      <div className="sv2-mob-pay-cell" style={{ background: "#faf5ff", borderColor: "#e9d5ff" }}>
                        <span style={{ color: "#6d28d9" }}>Cash Taken</span>
                        <strong style={{ color: "#5b21b6" }}>৳{formatNum(item.totalCashTaken, 0)}</strong>
                      </div>
                      <div className="sv2-mob-pay-cell">
                        <span>Prev. Due</span>
                        <strong>{item.prevBalance !== 0 ? `৳${formatSlipAccounting(item.prevBalance, false, true)}` : "—"}</strong>
                      </div>
                    </div>

                    {/* Expense Page Cash Taken Breakdown */}
                    <div className="sv2-mob-exp-box">
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: "0.72rem", fontWeight: 800, color: "#5b21b6", display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <WalletIcon size={12} /> Cash Taken From Expense ({item.matchingExpenses.length})
                        </span>
                        <Link href="/expense" className="sv2-expense-link">
                          Expense Page
                        </Link>
                      </div>
                      {item.matchingExpenses.length === 0 ? (
                        <div style={{ fontSize: "0.72rem", color: "#64748b" }}>
                          No salary/overtime payouts recorded in Expense this month.
                        </div>
                      ) : (
                        item.matchingExpenses.map((ex) => (
                          <div key={ex.id} className="sv2-mob-exp-row">
                            <span>
                              Day {ex.day_num} ({ex.category}) {ex.payment_method ? `• ${ex.payment_method}` : ""}
                              {ex.note ? ` — ${ex.note}` : ""}
                            </span>
                            <strong style={{ color: "#6d28d9", whiteSpace: "nowrap" }}>
                              ৳{formatNum(ex.amount, 0)}
                            </strong>
                          </div>
                        ))
                      )}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, flexWrap: "wrap" }}>
                      <button
                        type="button"
                        className="sv2-mini-action"
                        style={{ flex: 1, justifyContent: "center", fontSize: "0.74rem" }}
                        onClick={() => setExpandedCalStaff(isCalOpen ? null : item.staffName)}
                      >
                        <CalendarIcon size={13} />
                        <span>{isCalOpen ? "Hide 30-Day Grid" : "View / Edit 30-Day Grid"}</span>
                      </button>
                      <button
                        type="button"
                        className="sv2-mini-action"
                        style={{ fontSize: "0.74rem" }}
                        onClick={() => openSetupModal(item.staffName)}
                      >
                        <EditIcon size={13} />
                        <span>Salary / Due</span>
                      </button>
                    </div>

                    {isCalOpen && (
                      <div className="sv2-cal-days-grid" style={{ paddingTop: 6 }}>
                        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => {
                          const dStr = String(d);
                          const att = item.attendanceMap?.[dStr];
                          const ot = Number(item.overtimeMap?.[dStr] || 0);
                          const cash = Number(item.expByDay?.[d] || 0);
                          const cls =
                            att === 1 ? "att-1" : att === 0.5 ? "att-half" : att === 0 ? "att-0" : "";
                          return (
                            <button
                              key={d}
                              type="button"
                              className={`sv2-cal-day-btn ${cls}`}
                              onClick={() => openCellModal(item, d)}
                            >
                              <span className="sv2-cal-day-num">{d}</span>
                              <span className="sv2-cal-day-status">
                                {att === 1 ? "P" : att === 0.5 ? "HD" : att === 0 ? "A" : "—"}
                              </span>
                              {ot > 0 && (
                                <span style={{ fontSize: "0.58rem", color: "#1d4ed8", fontWeight: 800 }}>
                                  +{ot}h
                                </span>
                              )}
                              {cash > 0 && (
                                <span style={{ fontSize: "0.56rem", color: "#6d28d9", fontWeight: 800 }}>
                                  ৳{formatNum(cash, 0)}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );

  return (
    <main className="be-wrapper sv2-wrapper">
      {/* Top Header (Hidden on native small phone viewport to keep Mobile Attendance Entry clean) */}
      {!isMobileViewport && (
        <header className="be-header sv2-no-print">
          <div className="be-brand">
            <div className="be-title-box">
              <h1>Staff Attendance &amp; Payroll</h1>
              <p>
                {monthLabelEn} | Divisor: {salaryDivisor} Days | 8 OT Hrs = 1 Day | Synced with Expense Page
              </p>
            </div>
          </div>
          <nav className="be-nav-actions sv2-header-actions">
            <TopPageNav active="staff" />
            <Link
              href="/"
              className="be-nav-btn"
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <HomeIcon size={14} /> Home
            </Link>
          </nav>
        </header>
      )}

      {showMobileExperience ? (
        isMobileViewport ? (
          mobileAppShell
        ) : (
          <div>
            <div className="sv2-phone-preview-bar sv2-no-print">
              <SmartphoneIcon size={16} />
              <span>Phone Preview Mode (412px) — Optimized for Mobile Attendance Entry &amp; Cash Taken / Pay</span>
              <button
                type="button"
                className="st-action-btn primary"
                style={{ padding: "6px 12px", fontSize: "0.78rem" }}
                onClick={() => setPhonePreviewOnPc(false)}
              >
                <MonitorIcon size={14} />
                <span>Back to Desktop View</span>
              </button>
            </div>
            <div className="sv2-phone-frame-wrap">
              <div className="sv2-phone-frame">{mobileAppShell}</div>
            </div>
          </div>
        )
      ) : (
        <>
          {/* Top Unified Control Bar (Desktop) */}
          <section className="sv2-control-bar sv2-no-print">
            <div className="sv2-control-left">
              <div className="sv2-month-pill">
                <button
                  type="button"
                  className="sv2-month-nav-btn"
                  onClick={() => handleMonthChange(shiftMonth(monthKey, -1))}
                  title="Previous Month"
                >
                  <ChevronLeftIcon size={14} />
                </button>
                <input
                  type="month"
                  className="sv2-month-input"
                  value={monthKey}
                  onChange={(e) => e.target.value && handleMonthChange(e.target.value)}
                />
                <button
                  type="button"
                  className="sv2-month-nav-btn"
                  onClick={() => handleMonthChange(shiftMonth(monthKey, 1))}
                  title="Next Month"
                >
                  <ChevronRightIcon size={14} />
                </button>
              </div>

              <button
                type="button"
                className="st-action-btn primary"
                style={{ padding: "8px 13px", fontSize: "0.81rem" }}
                onClick={() => openEditModal("")}
              >
                <PlusIcon size={14} />
                <span>Add Staff</span>
              </button>

              <button
                type="button"
                className="st-action-btn secondary"
                style={{ padding: "8px 13px", fontSize: "0.81rem" }}
                onClick={() => openSetupModal(allStaffList[0] || "")}
              >
                <EditIcon size={14} />
                <span>Salary &amp; Prev. Due Setup</span>
              </button>
            </div>

            <div className="sv2-control-right">
              <button
                type="button"
                onClick={() => setPhonePreviewOnPc(true)}
                className="st-action-btn secondary"
                style={{ padding: "8px 13px", fontSize: "0.81rem", borderColor: "#1e40af", color: "#1e40af", background: "#eff6ff" }}
                title="Preview and use the Phone UI right here on PC"
              >
                <SmartphoneIcon size={14} />
                <span>Phone Preview</span>
              </button>
              <button
                type="button"
                onClick={() => setExcelLangModal({ isOpen: true, format: "xlsx" })}
                className="st-action-btn emerald"
                style={{ padding: "8px 13px", fontSize: "0.81rem" }}
              >
                <DownloadIcon size={14} />
                <span>Excel (.xlsx)</span>
              </button>
              <button
                type="button"
                onClick={() => setExcelLangModal({ isOpen: true, format: "pdf" })}
                className="st-action-btn"
                style={{ background: "#1e293b", color: "#fff", borderColor: "#1e293b", padding: "8px 13px", fontSize: "0.81rem" }}
              >
                <DownloadIcon size={14} />
                <span>PDF (.pdf)</span>
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="st-action-btn secondary"
                style={{ padding: "8px 13px", fontSize: "0.81rem" }}
              >
                <PrinterIcon size={14} />
                <span>Print</span>
              </button>
            </div>
          </section>

      {/* KPI Summary Strip (Synced with Attendance + Expense Page Cash Taken) */}
      <section className="sv2-kpi-grid sv2-no-print">
        <div className="sv2-kpi-card">
          <span className="sv2-kpi-label">Active Staff</span>
          <span className="sv2-kpi-value">{kpiStats.activeCount} / {allStaffList.length}</span>
          <span className="sv2-kpi-sub">Total roster headcount</span>
        </div>

        <div className="sv2-kpi-card accent-emerald">
          <span className="sv2-kpi-label">Day {currentDayNum} Attendance</span>
          <span className="sv2-kpi-value" style={{ color: "#15803d" }}>
            {kpiStats.todayPresent} P {kpiStats.todayHalf > 0 ? `/ ${kpiStats.todayHalf} HD` : ""}
          </span>
          <span className="sv2-kpi-sub">
            <span>{kpiStats.todayMarked} of {allStaffList.length} marked</span>
            <span>{kpiStats.todayAbsent} Absent</span>
          </span>
        </div>

        <div className="sv2-kpi-card accent-blue">
          <span className="sv2-kpi-label">Month Work Days</span>
          <span className="sv2-kpi-value" style={{ color: "#1e40af" }}>
            {formatNum(kpiStats.totalWorkDaysSum, 1)} d
          </span>
          <span className="sv2-kpi-sub">Includes overtime days</span>
        </div>

        <div className="sv2-kpi-card accent-amber">
          <span className="sv2-kpi-label">Total Overtime</span>
          <span className="sv2-kpi-value" style={{ color: "#b45309" }}>
            {formatNum(kpiStats.totalOtSum, 1)} hrs
          </span>
          <span className="sv2-kpi-sub">
            {formatNum(kpiStats.totalOtSum / 8, 2)} equivalent days
          </span>
        </div>

        <div className="sv2-kpi-card accent-purple">
          <span className="sv2-kpi-label">Cash Taken (Expense)</span>
          <span className="sv2-kpi-value" style={{ color: "#6d28d9" }}>
            ৳ {formatNum(kpiStats.totalCashSum, 0)}
          </span>
          <span className="sv2-kpi-sub">
            <span>{kpiStats.totalCashTxCount} payouts</span>
            <Link href="/expense" className="sv2-expense-link">
              Expense Page →
            </Link>
          </span>
        </div>

        <div className="sv2-kpi-card accent-crimson">
          <span className="sv2-kpi-label">Net Payable Balance</span>
          <span
            className="sv2-kpi-value"
            style={{ color: kpiStats.totalNetPayableSum < 0 ? "#dc2626" : "#0f172a" }}
          >
            ৳ {formatSlipAccounting(kpiStats.totalNetPayableSum, false, true)}
          </span>
          <span className="sv2-kpi-sub">Earned + Prev - Cash</span>
        </div>
      </section>

      {/* Unified Navigation Tabs */}
      <nav className="sv2-nav-bar sv2-no-print">
        <div className="sv2-tabs-scroll" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "daily"}
            className={`sv2-tab-btn ${activeTab === "daily" ? "active" : ""}`}
            onClick={() => setActiveTab("daily")}
          >
            <ClockIcon size={15} />
            <span>Daily Attendance</span>
            <span className="sv2-tab-count">Day {currentDayNum}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "matrix"}
            className={`sv2-tab-btn ${activeTab === "matrix" ? "active" : ""}`}
            onClick={() => setActiveTab("matrix")}
          >
            <CalendarIcon size={15} />
            <span>Monthly Matrix ({daysInMonth}-Day)</span>
            <span className="sv2-tab-count">{allStaffList.length}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "slips"}
            className={`sv2-tab-btn ${activeTab === "slips" ? "active" : ""}`}
            onClick={() => setActiveTab("slips")}
          >
            <ClipboardListIcon size={15} />
            <span>Salary Slips</span>
            <span className="sv2-tab-count">{visibleSlips.length}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "directory"}
            className={`sv2-tab-btn ${activeTab === "directory" ? "active" : ""}`}
            onClick={() => setActiveTab("directory")}
          >
            <UsersIcon size={15} />
            <span>Staff Directory</span>
            <span className="sv2-tab-count">{allStaffList.length}</span>
          </button>
        </div>

        {rosterMsg && (
          <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#15803d", background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "6px 12px", borderRadius: 8 }}>
            {rosterMsg}
          </div>
        )}
      </nav>

      {/* Main Content Workspace */}
      <section className="sv2-panel">
        {loading ? (
          <div style={{ textAlign: "center", padding: 48, color: "#64748b", fontWeight: 600 }}>
            Loading staff attendance and expense cash records for {monthLabelEn}...
          </div>
        ) : activeTab === "daily" ? (
          /* =================================================================
             TAB 1: MOBILE-FIRST DAILY ATTENDANCE ROSTER
          ================================================================= */
          <div>
            <div className="sv2-roster-header">
              <div className="sv2-date-row">
                <div className="sv2-date-controls">
                  <button
                    type="button"
                    className="sv2-date-step-btn"
                    onClick={() => setEntryDate(shiftDateStr(entryDate, -1))}
                    title="Previous Day"
                  >
                    <ChevronLeftIcon size={14} /> Prev
                  </button>
                  <input
                    type="date"
                    className="sv2-date-input"
                    value={entryDate}
                    onChange={(e) => e.target.value && setEntryDate(e.target.value)}
                  />
                  <button
                    type="button"
                    className="sv2-date-step-btn"
                    onClick={() => setEntryDate(shiftDateStr(entryDate, 1))}
                    title="Next Day"
                  >
                    Next <ChevronRightIcon size={14} />
                  </button>
                  <button
                    type="button"
                    className="sv2-date-step-btn"
                    onClick={() => setEntryDate(todayStr)}
                    style={{
                      background: entryDate === todayStr ? "#0f172a" : "#f8fafc",
                      color: entryDate === todayStr ? "#ffffff" : "#334155",
                    }}
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    className="sv2-date-step-btn"
                    onClick={() => setEntryDate(shiftDateStr(todayStr, -1))}
                  >
                    Yesterday
                  </button>
                </div>

                <div className="sv2-day-pills-summary">
                  <span className="sv2-stat-chip green">Present: {rosterCounts.p}</span>
                  <span className="sv2-stat-chip amber">Half: {rosterCounts.hd}</span>
                  <span className="sv2-stat-chip red">Absent: {rosterCounts.a}</span>
                  <span className="sv2-stat-chip slate">Unmarked: {rosterCounts.unmarked}</span>
                  {rosterCounts.cashTodayCount > 0 && (
                    <span className="sv2-stat-chip purple">
                      Expense Cash Today: {rosterCounts.cashTodayCount} staff
                    </span>
                  )}
                </div>
              </div>

              <div className="sv2-roster-toolbar">
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", flex: "1 1 280px" }}>
                  <div style={{ position: "relative", flex: "1 1 200px", maxWidth: 280 }}>
                    <SearchIcon
                      size={14}
                      style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}
                    />
                    <input
                      type="text"
                      className="be-input"
                      style={{ paddingLeft: 30, height: 36 }}
                      placeholder="Search staff name..."
                      value={rosterSearch}
                      onChange={(e) => setRosterSearch(e.target.value)}
                    />
                  </div>

                  <div className="sv2-filter-group">
                    {[
                      { id: "all", label: "All" },
                      { id: "unmarked", label: `Unmarked (${rosterCounts.unmarked})` },
                      { id: "present", label: "Present" },
                      { id: "half", label: "Half Day" },
                      { id: "absent", label: "Absent" },
                      { id: "ot", label: "Overtime" },
                      { id: "cash", label: "Took Cash Today" },
                    ].map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        className={`sv2-filter-pill ${rosterFilter === f.id ? "active" : ""}`}
                        onClick={() => setRosterFilter(f.id)}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="sv2-quick-actions">
                  <button
                    type="button"
                    className="sv2-mini-action emerald"
                    onClick={() => applyBulkStatusToRoster(true, "1")}
                  >
                    <CheckIcon size={13} /> Mark Unmarked Present
                  </button>
                  <button
                    type="button"
                    className="sv2-mini-action"
                    onClick={() => applyBulkStatusToRoster(false, "1")}
                  >
                    Mark All Present
                  </button>
                  <button
                    type="button"
                    className="st-action-btn primary"
                    style={{ padding: "7px 14px", fontSize: "0.8rem" }}
                    disabled={rosterSaving}
                    onClick={() => handleSaveRosterAll(true)}
                  >
                    <CheckIcon size={14} />
                    <span>
                      {rosterSaving
                        ? "Saving..."
                        : rosterCounts.dirty > 0
                        ? `Save Changes (${rosterCounts.dirty})`
                        : "Save Day"}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Mobile Cards & Desktop Roster Rows */}
            <div className="sv2-roster-list">
              {filteredRosterStaff.length === 0 ? (
                <div style={{ textAlign: "center", padding: 36, color: "#64748b" }}>
                  No staff members match the active search or filter.
                </div>
              ) : (
                filteredRosterStaff.map((name) => {
                  const row = rosterState[name] || { att: "", ot: "", hasExisting: false, dirty: false };
                  const sum = summaryByName[name];
                  const todayCash = Number(sum?.expByDay?.[currentDayNum] || 0);
                  const monthCash = Number(sum?.totalCashTaken || 0);

                  const statusClass =
                    row.att === "1"
                      ? "status-1"
                      : row.att === "0.5"
                      ? "status-half"
                      : row.att === "0"
                      ? "status-0"
                      : "";

                  return (
                    <div
                      key={name}
                      className={`sv2-roster-item ${statusClass} ${row.dirty ? "is-dirty" : ""}`}
                    >
                      {/* Col 1: Staff Info & Expense Cash Badges */}
                      <div className="sv2-staff-meta">
                        <div className="sv2-staff-identity">
                          <span className="sv2-avatar">{getInitials(name)}</span>
                          <div>
                            <div className="sv2-staff-name">{name}</div>
                            <div className="sv2-staff-sub">
                              <span>Month Att: {formatNum(sum?.totalAttendance || 0, 1)}d</span>
                              {sum?.totalOvertimeHours > 0 && (
                                <span>OT: {formatNum(sum.totalOvertimeHours, 1)}h</span>
                              )}
                              {todayCash > 0 && (
                                <span className="sv2-cash-pill today" title="Paid from Expense page on this date">
                                  Today Cash: ৳{formatNum(todayCash, 0)}
                                </span>
                              )}
                              {monthCash > 0 && (
                                <span className="sv2-cash-pill" title="Total taken from Expense page this month">
                                  Month Cash: ৳{formatNum(monthCash, 0)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Col 2: Large Touch Segmented Status Buttons */}
                      <div className="sv2-seg-group" role="group" aria-label={`Attendance for ${name}`}>
                        <button
                          type="button"
                          className={`sv2-seg-btn ${row.att === "1" ? "active-1" : ""}`}
                          onClick={() => updateRosterRow(name, { att: "1" })}
                        >
                          <CheckIcon size={13} /> Present (1)
                        </button>
                        <button
                          type="button"
                          className={`sv2-seg-btn ${row.att === "0.5" ? "active-half" : ""}`}
                          onClick={() => updateRosterRow(name, { att: "0.5" })}
                        >
                          Half (0.5)
                        </button>
                        <button
                          type="button"
                          className={`sv2-seg-btn ${row.att === "0" ? "active-0" : ""}`}
                          onClick={() => updateRosterRow(name, { att: "0" })}
                        >
                          <XIcon size={13} /> Absent (0)
                        </button>
                      </div>

                      {/* Col 3: Quick Overtime Chips + Custom Numeric Input */}
                      <div className="sv2-ot-controls">
                        <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#64748b", marginRight: 2 }}>
                          OT:
                        </span>
                        {["0", "1", "2", "3", "4"].map((hr) => {
                          const isActive =
                            hr === "0"
                              ? !row.ot || Number(row.ot) === 0
                              : String(Number(row.ot || 0)) === hr;
                          return (
                            <button
                              key={hr}
                              type="button"
                              className={`sv2-ot-chip ${isActive && (row.ot !== "" || hr !== "0") ? "active" : ""}`}
                              onClick={() =>
                                updateRosterRow(name, {
                                  ot: hr === "0" ? "" : hr,
                                  att: row.att === "" && hr !== "0" ? "1" : row.att,
                                })
                              }
                            >
                              {hr === "0" ? "0h" : `+${hr}h`}
                            </button>
                          );
                        })}
                        <input
                          type="number"
                          step="any"
                          min="0"
                          className="sv2-ot-input"
                          placeholder="Hrs"
                          value={row.ot}
                          onChange={(e) =>
                            updateRosterRow(name, {
                              ot: e.target.value,
                              att: row.att === "" && Number(e.target.value) > 0 ? "1" : row.att,
                            })
                          }
                        />
                      </div>

                      {/* Col 4: Row Status + Quick Single Save / Clear */}
                      <div className="sv2-row-actions">
                        {row.dirty ? (
                          <>
                            <span className="sv2-state-badge dirty">Modified</span>
                            <button
                              type="button"
                              className="sv2-mini-action emerald"
                              disabled={savingSingleName === name}
                              onClick={() => handleSaveSingleRosterRow(name)}
                              title="Save only this staff member now"
                            >
                              {savingSingleName === name ? "..." : "Save"}
                            </button>
                          </>
                        ) : row.hasExisting ? (
                          <span className="sv2-state-badge saved">Saved</span>
                        ) : (
                          <span className="sv2-state-badge unmarked">Not Marked</span>
                        )}

                        {(row.att !== "" || row.hasExisting) && (
                          <button
                            type="button"
                            className="sv2-mini-action"
                            style={{ padding: "5px 8px", color: "#64748b" }}
                            onClick={() => updateRosterRow(name, { att: "", ot: "" })}
                            title="Clear status for this date"
                          >
                            <XIcon size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Sticky Bottom Save Bar when edits are pending */}
            {rosterCounts.dirty > 0 && (
              <div className="sv2-sticky-save-bar sv2-no-print">
                <div className="sv2-sticky-save-info">
                  <strong>
                    {rosterCounts.dirty} staff update{rosterCounts.dirty > 1 ? "s" : ""} ready to save
                  </strong>
                  <span style={{ fontSize: "0.75rem", color: "#cbd5e1" }}>
                    Date: {entryDate} | P: {rosterCounts.p} | HD: {rosterCounts.hd} | A: {rosterCounts.a}
                  </span>
                </div>
                <button
                  type="button"
                  className="sv2-sticky-save-btn"
                  disabled={rosterSaving}
                  onClick={() => handleSaveRosterAll(true)}
                >
                  <CheckIcon size={16} />
                  <span>{rosterSaving ? "Saving..." : `Save All (${rosterCounts.dirty})`}</span>
                </button>
              </div>
            )}
          </div>
        ) : activeTab === "matrix" ? (
          /* =================================================================
             TAB 2: INTERACTIVE 30-DAY MONTHLY MATRIX + MOBILE CALENDAR CARDS
          ================================================================= */
          <div>
            <div className="sv2-matrix-toolbar sv2-no-print">
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <div style={{ position: "relative" }}>
                  <SearchIcon
                    size={14}
                    style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}
                  />
                  <input
                    type="text"
                    className="be-input"
                    style={{ width: 210, paddingLeft: 30, height: 36 }}
                    placeholder="Search staff..."
                    value={matrixSearch}
                    onChange={(e) => setMatrixSearch(e.target.value)}
                  />
                </div>

                <select
                  className="be-input"
                  style={{ width: "auto", padding: "6px 10px", height: 36 }}
                  value={matrixFilter}
                  onChange={(e) => setMatrixFilter(e.target.value)}
                >
                  <option value="all">All Staff ({allStaffList.length})</option>
                  <option value="active">Active This Month</option>
                </select>

                <label className="sv2-toggle-label">
                  <input
                    type="checkbox"
                    checked={showDailyCashRows}
                    onChange={(e) => setShowDailyCashRows(e.target.checked)}
                  />
                  <span>Show Daily Cash Taken Rows (Expense)</span>
                </label>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                {/* Grid vs Calendar Cards Toggle */}
                <div className="st-mode-tabs">
                  <button
                    type="button"
                    className={`st-mode-tab ${matrixMode === "grid" ? "active" : ""}`}
                    onClick={() => setMatrixMode("grid")}
                  >
                    30-Day Grid Table
                  </button>
                  <button
                    type="button"
                    className={`st-mode-tab ${matrixMode === "cards" ? "active" : ""}`}
                    onClick={() => setMatrixMode("cards")}
                  >
                    Calendar Cards
                  </button>
                </div>

                <button
                  type="button"
                  className="st-action-btn emerald"
                  style={{ padding: "7px 12px", fontSize: "0.79rem" }}
                  onClick={exportAttendanceMatrixDirect}
                >
                  <DownloadIcon size={14} />
                  <span>Export Matrix (.xlsx)</span>
                </button>
              </div>
            </div>

            {/* Compact Legend */}
            <div
              className="sv2-no-print"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 8,
                padding: "8px 12px",
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: 9,
                marginBottom: 12,
                fontSize: "0.75rem",
                fontWeight: 600,
                color: "#475569",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <span className="sv2-cell-badge p" style={{ width: 19, height: 19 }}>P</span> Present
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <span className="sv2-cell-badge hd" style={{ width: 19, height: 19 }}>HD</span> Half Day
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <span className="sv2-cell-badge a" style={{ width: 19, height: 19 }}>A</span> Absent
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <span className="sv2-cell-badge w" style={{ width: 19, height: 19 }}>W</span> Friday (Weekly Off)
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <span className="sv2-ot-tag" style={{ margin: 0, padding: "1px 5px" }}>+2h</span> Overtime
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <span className="sv2-cash-pill" style={{ padding: "1px 6px" }}>৳</span> Expense Cash
                </span>
              </div>
              <span style={{ color: "#1e40af", fontWeight: 700 }}>
                Tip: Click any day cell to edit attendance, overtime, or view expense payout
              </span>
            </div>

            {matrixMode === "grid" ? (
              <div className="sv2-matrix-scroll">
                <table className="sv2-matrix-table">
                  <thead>
                    <tr>
                      <th className="sticky-col">Staff Name</th>
                      {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => {
                        const dObj = new Date(yearNum, monthNum - 1, d);
                        const isFri = dObj.getDay() === 5;
                        const wName = WEEKDAYS_SHORT[dObj.getDay()];
                        const isTod = todayStr === `${monthKey}-${String(d).padStart(2, "0")}`;
                        return (
                          <th
                            key={d}
                            className={`${isFri ? "fri-col" : ""} ${isTod ? "today-col" : ""}`}
                            style={{ minWidth: 36 }}
                            title={`${monthKey}-${String(d).padStart(2, "0")} (${wName})`}
                          >
                            <div style={{ fontSize: "0.8rem", fontWeight: 800 }}>
                              {String(d).padStart(2, "0")}
                            </div>
                            <div
                              style={{
                                fontSize: "0.63rem",
                                fontWeight: 700,
                                color: isFri ? "#dc2626" : "#64748b",
                              }}
                            >
                              {wName}
                            </div>
                          </th>
                        );
                      })}
                      <th style={{ minWidth: 46, background: "#f1f5f9", color: "#15803d" }}>P</th>
                      <th style={{ minWidth: 46, background: "#f1f5f9", color: "#b45309" }}>HD</th>
                      <th style={{ minWidth: 46, background: "#f1f5f9", color: "#b91c1c" }}>A</th>
                      <th style={{ minWidth: 54, background: "#f1f5f9", color: "#1d4ed8" }}>OT</th>
                      <th style={{ minWidth: 66, background: "#e2e8f0", color: "#0f172a" }}>Work Days</th>
                      <th style={{ minWidth: 86, background: "#f1f5f9", color: "#0f172a" }}>Earned</th>
                      <th style={{ minWidth: 88, background: "#faf5ff", color: "#6d28d9" }}>Cash Taken</th>
                      <th style={{ minWidth: 92, background: "#e2e8f0", color: "#0f172a" }}>Net Payable</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMatrixStaff.length === 0 ? (
                      <tr>
                        <td colSpan={daysInMonth + 9} style={{ textAlign: "center", padding: 32, color: "#64748b" }}>
                          No staff members found matching &ldquo;{matrixSearch}&rdquo;.
                        </td>
                      </tr>
                    ) : (
                      filteredMatrixStaff.map((item, idx) => (
                        <React.Fragment key={item.staffName}>
                          <tr>
                            <td className="sticky-col">
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 6, overflow: "hidden" }}>
                                  <span style={{ color: "#94a3b8", fontSize: "0.7rem", width: 18 }}>
                                    {idx + 1}.
                                  </span>
                                  <span
                                    style={{ fontWeight: 800, color: "#0f172a", cursor: "pointer", overflow: "hidden", textOverflow: "ellipsis" }}
                                    onClick={() => openSetupModal(item.staffName)}
                                    title={`Click to set salary / balance for ${item.staffName}`}
                                  >
                                    {item.staffName}
                                  </span>
                                </div>
                                {item.monthlySalary > 0 && (
                                  <span style={{ fontSize: "0.68rem", color: "#64748b", fontWeight: 700 }}>
                                    ৳{formatNum(item.monthlySalary, 0)}
                                  </span>
                                )}
                              </div>
                            </td>

                            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => {
                              const dStr = String(d);
                              const att = item.attendanceMap?.[dStr];
                              const ot = Number(item.overtimeMap?.[dStr] || 0);
                              const dayCash = Number(item.expByDay?.[d] || 0);
                              const dObj = new Date(yearNum, monthNum - 1, d);
                              const isFri = dObj.getDay() === 5;
                              const isTod = todayStr === `${monthKey}-${String(d).padStart(2, "0")}`;

                              return (
                                <td
                                  key={d}
                                  className={`cell-interactive ${isFri ? "fri-col" : ""} ${isTod ? "today-col" : ""}`}
                                  onClick={() => openCellModal(item, d)}
                                  title={`${item.staffName} - Day ${d}${dayCash > 0 ? ` | Expense Cash: ৳${formatNum(dayCash, 0)}` : ""} (Click to edit)`}
                                >
                                  {att === 1 ? (
                                    <span className="sv2-cell-badge p">P</span>
                                  ) : att === 0.5 ? (
                                    <span className="sv2-cell-badge hd">HD</span>
                                  ) : att === 0 ? (
                                    <span className="sv2-cell-badge a">A</span>
                                  ) : isFri ? (
                                    <span className="sv2-cell-badge w">W</span>
                                  ) : (
                                    <span className="sv2-cell-badge off">—</span>
                                  )}
                                  {ot > 0 && <span className="sv2-ot-tag">+{ot}h</span>}
                                  {!showDailyCashRows && dayCash > 0 && (
                                    <span className="sv2-cash-dot">৳{formatNum(dayCash, 0)}</span>
                                  )}
                                </td>
                              );
                            })}

                            <td style={{ fontWeight: 800, color: "#15803d", background: "#f8fafc" }}>
                              {item.presentDaysCount}
                            </td>
                            <td style={{ fontWeight: 800, color: "#b45309", background: "#f8fafc" }}>
                              {item.halfDaysCount}
                            </td>
                            <td style={{ fontWeight: 800, color: "#b91c1c", background: "#f8fafc" }}>
                              {item.absentDaysCount}
                            </td>
                            <td style={{ fontWeight: 800, color: "#1d4ed8", background: "#f8fafc" }}>
                              {item.totalOvertimeHours > 0 ? `${formatNum(item.totalOvertimeHours, 1)}h` : "—"}
                            </td>
                            <td style={{ fontWeight: 900, color: "#0f172a", background: "#f1f5f9" }}>
                              {formatNum(item.totalWorkDays, 2)}
                            </td>
                            <td style={{ fontWeight: 700, color: "#0f172a" }}>
                              {item.earnedSalary > 0 ? `৳${formatNum(item.earnedSalary, 0)}` : "—"}
                            </td>
                            <td style={{ fontWeight: 800, color: "#6d28d9", background: "#faf5ff" }}>
                              {item.totalCashTaken > 0 ? `৳${formatNum(item.totalCashTaken, 0)}` : "—"}
                            </td>
                            <td
                              style={{
                                fontWeight: 900,
                                color: item.remainingPayable < 0 ? "#dc2626" : "#15803d",
                                background: "#f8fafc",
                              }}
                            >
                              ৳{formatSlipAccounting(item.remainingPayable, false, true)}
                            </td>
                          </tr>

                          {/* Optional Daily Cash Taken Row from Expense Page */}
                          {showDailyCashRows && (
                            <tr className="sv2-matrix-cash-row">
                              <td className="sticky-col">
                                Cash Taken (Expense)
                              </td>
                              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => {
                                const c = item.expByDay?.[d] || 0;
                                return (
                                  <td key={d}>
                                    {c > 0 ? formatNum(c, 0) : ""}
                                  </td>
                                );
                              })}
                              <td colSpan={6} style={{ textAlign: "right", paddingRight: 8, color: "#64748b" }}>
                                {item.matchingExpenses.length > 0
                                  ? `${item.matchingExpenses.length} expense payout(s)`
                                  : "No cash taken"}
                              </td>
                              <td style={{ fontWeight: 800 }}>
                                ৳{formatNum(item.totalCashTaken, 0)}
                              </td>
                              <td></td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))
                    )}
                  </tbody>
                  {filteredMatrixStaff.length > 0 && (
                    <tfoot>
                      <tr>
                        <td className="sticky-col">Daily Present Total</td>
                        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => {
                          const dStr = String(d);
                          let dayP = 0;
                          filteredMatrixStaff.forEach((item) => {
                            const att = item.attendanceMap?.[dStr];
                            if (att === 1) dayP += 1;
                            else if (att === 0.5) dayP += 0.5;
                          });
                          return <td key={d}>{dayP > 0 ? dayP : "—"}</td>;
                        })}
                        <td style={{ color: "#15803d" }}>
                          {filteredMatrixStaff.reduce((s, it) => s + it.presentDaysCount, 0)}
                        </td>
                        <td style={{ color: "#b45309" }}>
                          {filteredMatrixStaff.reduce((s, it) => s + it.halfDaysCount, 0)}
                        </td>
                        <td style={{ color: "#b91c1c" }}>
                          {filteredMatrixStaff.reduce((s, it) => s + it.absentDaysCount, 0)}
                        </td>
                        <td style={{ color: "#1d4ed8" }}>
                          {formatNum(filteredMatrixStaff.reduce((s, it) => s + it.totalOvertimeHours, 0), 1)}h
                        </td>
                        <td>
                          {formatNum(filteredMatrixStaff.reduce((s, it) => s + it.totalWorkDays, 0), 1)}
                        </td>
                        <td>
                          ৳{formatNum(filteredMatrixStaff.reduce((s, it) => s + it.earnedSalary, 0), 0)}
                        </td>
                        <td style={{ color: "#6d28d9" }}>
                          ৳{formatNum(filteredMatrixStaff.reduce((s, it) => s + it.totalCashTaken, 0), 0)}
                        </td>
                        <td>
                          ৳{formatSlipAccounting(
                            filteredMatrixStaff.reduce((s, it) => s + it.remainingPayable, 0),
                            false,
                            true
                          )}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            ) : (
              /* Mobile-Friendly Monthly Calendar Cards View */
              <div className="sv2-cal-cards-grid">
                {filteredMatrixStaff.map((item) => (
                  <div key={item.staffName} className="sv2-cal-card">
                    <div className="sv2-cal-card-head">
                      <div>
                        <div style={{ fontWeight: 800, fontSize: "0.96rem", color: "#0f172a" }}>
                          {item.staffName}
                        </div>
                        <div style={{ fontSize: "0.74rem", color: "#64748b", fontWeight: 600 }}>
                          Work: {formatNum(item.totalWorkDays, 1)}d | Cash: ৳{formatNum(item.totalCashTaken, 0)}
                        </div>
                      </div>
                      <span
                        style={{
                          fontWeight: 800,
                          fontSize: "0.82rem",
                          color: item.remainingPayable < 0 ? "#dc2626" : "#15803d",
                        }}
                      >
                        Net: ৳{formatSlipAccounting(item.remainingPayable, false, true)}
                      </span>
                    </div>

                    <div className="sv2-cal-days-grid">
                      {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => {
                        const dStr = String(d);
                        const att = item.attendanceMap?.[dStr];
                        const ot = Number(item.overtimeMap?.[dStr] || 0);
                        const cash = Number(item.expByDay?.[d] || 0);
                        const cls =
                          att === 1 ? "att-1" : att === 0.5 ? "att-half" : att === 0 ? "att-0" : "";
                        return (
                          <button
                            key={d}
                            type="button"
                            className={`sv2-cal-day-btn ${cls}`}
                            onClick={() => openCellModal(item, d)}
                          >
                            <span className="sv2-cal-day-num">{d}</span>
                            <span className="sv2-cal-day-status">
                              {att === 1 ? "P" : att === 0.5 ? "HD" : att === 0 ? "A" : "—"}
                            </span>
                            {ot > 0 && (
                              <span style={{ fontSize: "0.6rem", color: "#1d4ed8", fontWeight: 800 }}>
                                +{ot}h
                              </span>
                            )}
                            {cash > 0 && (
                              <span style={{ fontSize: "0.58rem", color: "#6d28d9", fontWeight: 800 }}>
                                ৳{formatNum(cash, 0)}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : activeTab === "slips" ? (
          /* =================================================================
             TAB 3: SALARY SLIPS
          ================================================================= */
          <div>
            <div
              className="sv2-no-print"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 10,
                marginBottom: 16,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <input
                  type="text"
                  className="be-input"
                  style={{ width: 230, height: 36 }}
                  placeholder="Search staff slip..."
                  value={slipSearch}
                  onChange={(e) => setSlipSearch(e.target.value)}
                />
                <select
                  className="be-input"
                  style={{ width: "auto", padding: "6px 12px", height: 36 }}
                  value={slipFilter}
                  onChange={(e) => setSlipFilter(e.target.value)}
                >
                  <option value="active">Active Staff This Month</option>
                  <option value="all">All Staff ({allStaffList.length})</option>
                </select>
              </div>
              <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 600 }}>
                Cash Taken values are automatically pulled from the Expense page.
              </span>
            </div>

            <div className="st-cards-grid">
              {visibleSlips.map((item) => (
                <div key={item.staffName} className="st-slip-card">
                  <table className="st-slip-table">
                    <tbody>
                      <tr>
                        <td className="slip-label">Name</td>
                        <td className="slip-val st-slip-staff-name">{item.staffName}</td>
                        <td className="slip-cash-col st-slip-cash-header">Cash Taken</td>
                      </tr>
                      <tr>
                        <td className="slip-label">Basic Salary</td>
                        <td className="slip-val">
                          {item.monthlySalary > 0 ? formatNum(item.monthlySalary, 2) : ""}
                        </td>
                        <td className="slip-cash-col"></td>
                      </tr>
                      <tr>
                        <td className="slip-label">Attendance</td>
                        <td className="slip-val">{formatNum(item.totalAttendance, 2)}</td>
                        <td className="slip-cash-col" style={{ color: "#6d28d9" }}>
                          {item.totalCashTaken > 0 ? formatNum(item.totalCashTaken, 2) : ""}
                        </td>
                      </tr>
                      <tr>
                        <td className="slip-label">Overtime (Days)</td>
                        <td className="slip-val">
                          {item.overtimeDays > 0 ? formatNum(item.overtimeDays, 2) : ""}
                        </td>
                        <td className="slip-cash-col"></td>
                      </tr>
                      <tr>
                        <td className="slip-label">Total Work</td>
                        <td className="slip-val">{formatNum(item.totalWorkDays, 2)}</td>
                        <td className="slip-cash-col"></td>
                      </tr>
                      <tr>
                        <td className="slip-label">Earned Salary</td>
                        <td className="slip-val">
                          {item.earnedSalary > 0 ? formatNum(item.earnedSalary, 2) : "-"}
                        </td>
                        <td className="slip-cash-col" style={{ textAlign: "center" }}>
                          -
                        </td>
                      </tr>
                      <tr>
                        <td className="slip-label">Previous Due</td>
                        <td className="slip-val">
                          {formatSlipAccounting(item.prevBalance, false, false)}
                        </td>
                        <td className="slip-cash-col"></td>
                      </tr>
                      <tr>
                        <td className="slip-label">Net Payable</td>
                        <td
                          className="slip-val"
                          style={{
                            color: item.remainingPayable < 0 ? "#dc2626" : "#15803d",
                            fontWeight: 800,
                          }}
                        >
                          {formatSlipAccounting(item.remainingPayable, false, true)}
                        </td>
                        <td className="slip-cash-col"></td>
                      </tr>
                      <tr>
                        <td className="slip-label" style={{ padding: "12px" }}>
                          Signature
                        </td>
                        <td colSpan={2} style={{ padding: "12px" }}></td>
                      </tr>
                    </tbody>
                  </table>

                  <div className="st-slip-foot st-no-print">
                    <span>
                      {item.matchingExpenses.length > 0 ? (
                        <>
                          <strong>From Expense:</strong>{" "}
                          {item.matchingExpenses
                            .map((x) => `Day ${x.day_num}: ৳${formatNum(x.amount, 0)}`)
                            .join(" | ")}
                        </>
                      ) : (
                        <span style={{ color: "#94a3b8" }}>No expense payments recorded</span>
                      )}
                    </span>
                    <div style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                      <button
                        type="button"
                        className="st-table-btn edit"
                        onClick={() => openSetupModal(item.staffName)}
                      >
                        Salary / Due
                      </button>
                      <button
                        type="button"
                        className="st-table-btn edit"
                        onClick={() => openEditModal(item.staffName)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="st-table-btn delete"
                        onClick={() => handleDeleteStaff(item.staffName)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* =================================================================
             TAB 4: STAFF DIRECTORY
          ================================================================= */
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 14,
                flexWrap: "wrap",
                gap: 10,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input
                  type="text"
                  className="be-input"
                  style={{ width: 260 }}
                  placeholder="Search staff by name..."
                  value={dirSearch}
                  onChange={(e) => setDirSearch(e.target.value)}
                />
                <span style={{ fontSize: "0.82rem", color: "#64748b", fontWeight: 600 }}>
                  Showing {filteredDirectoryStaff.length} of {allStaffList.length} staff
                </span>
              </div>
              <button
                type="button"
                className="st-action-btn primary"
                onClick={() => openEditModal("")}
              >
                <PlusIcon size={14} /> Add New Staff
              </button>
            </div>

            <div className="st-dir-table-wrap">
              <table className="st-dir-table">
                <thead>
                  <tr>
                    <th style={{ width: 45 }}>#</th>
                    <th>Staff Name</th>
                    <th>Monthly Basic Salary</th>
                    <th>Attendance ({monthLabelEn})</th>
                    <th>Overtime</th>
                    <th>Earned Salary</th>
                    <th>Cash Taken (Expense)</th>
                    <th>Prev. Balance</th>
                    <th>Net Payable</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDirectoryStaff.length === 0 ? (
                    <tr>
                      <td colSpan={10} style={{ textAlign: "center", padding: 24, color: "#64748b" }}>
                        No staff members found matching &ldquo;{dirSearch}&rdquo;.
                      </td>
                    </tr>
                  ) : (
                    filteredDirectoryStaff.map((item, idx) => (
                      <tr key={item.staffName}>
                        <td style={{ color: "#64748b", fontWeight: 700 }}>{idx + 1}</td>
                        <td style={{ fontWeight: 800 }}>
                          <span
                            onClick={() => openSetupModal(item.staffName)}
                            style={{ cursor: "pointer", color: "#991b1b" }}
                            title="Click to configure salary and previous balance"
                          >
                            {item.staffName}
                          </span>
                        </td>
                        <td style={{ fontWeight: 700 }}>
                          {item.monthlySalary > 0 ? `৳ ${formatNum(item.monthlySalary, 2)}` : "—"}
                        </td>
                        <td>{formatNum(item.totalAttendance, 2)} days</td>
                        <td>
                          {item.totalOvertimeHours > 0
                            ? `${item.totalOvertimeHours} hrs (${formatNum(item.overtimeDays, 2)} d)`
                            : "—"}
                        </td>
                        <td style={{ fontWeight: 700 }}>
                          {item.earnedSalary > 0 ? `৳ ${formatNum(item.earnedSalary, 2)}` : "—"}
                        </td>
                        <td style={{ fontWeight: 700, color: item.totalCashTaken > 0 ? "#6d28d9" : "inherit" }}>
                          {item.totalCashTaken > 0
                            ? `৳ ${formatNum(item.totalCashTaken, 2)} (${item.matchingExpenses.length})`
                            : "—"}
                        </td>
                        <td>
                          {item.prevBalance !== 0 ? `৳ ${formatSlipAccounting(item.prevBalance, false, true)}` : "—"}
                        </td>
                        <td
                          style={{
                            fontWeight: 800,
                            color: item.remainingPayable < 0 ? "#dc2626" : "#15803d",
                          }}
                        >
                          ৳ {formatSlipAccounting(item.remainingPayable, false, true)}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <div style={{ display: "inline-flex", gap: 6, justifyContent: "flex-end" }}>
                            <button
                              type="button"
                              className="st-table-btn edit"
                              onClick={() => openSetupModal(item.staffName)}
                            >
                              Salary/Due
                            </button>
                            <button
                              type="button"
                              className="st-table-btn edit"
                              onClick={() => openEditModal(item.staffName)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="st-table-btn delete"
                              onClick={() => handleDeleteStaff(item.staffName)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
      </>
      )}

      {/* CELL QUICK-EDIT MODAL (Click any day cell in Monthly Matrix) */}
      {cellModal && (
        <div
          className="st-modal-overlay"
          onClick={() => !cellSaving && setCellModal(null)}
        >
          <div className="st-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="st-modal-header">
              <div>
                <h3 className="st-modal-title">{cellModal.staffName}</h3>
                <div style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: 600 }}>
                  {monthLabelEn} - Day {String(cellModal.day).padStart(2, "0")}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCellModal(null)}
                style={{ background: "transparent", border: "none", cursor: "pointer", color: "#94a3b8", padding: 4 }}
              >
                <XIcon size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveCellModal}>
              <div className="st-modal-body">
                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "#475569", marginBottom: 6 }}>
                    Attendance Status
                  </label>
                  <div className="sv2-seg-group">
                    <button
                      type="button"
                      className={`sv2-seg-btn ${cellModal.att === "1" ? "active-1" : ""}`}
                      onClick={() => setCellModal({ ...cellModal, att: "1" })}
                    >
                      <CheckIcon size={13} /> Present (1)
                    </button>
                    <button
                      type="button"
                      className={`sv2-seg-btn ${cellModal.att === "0.5" ? "active-half" : ""}`}
                      onClick={() => setCellModal({ ...cellModal, att: "0.5" })}
                    >
                      Half (0.5)
                    </button>
                    <button
                      type="button"
                      className={`sv2-seg-btn ${cellModal.att === "0" ? "active-0" : ""}`}
                      onClick={() => setCellModal({ ...cellModal, att: "0" })}
                    >
                      <XIcon size={13} /> Absent (0)
                    </button>
                  </div>
                  <button
                    type="button"
                    className="sv2-mini-action"
                    style={{ marginTop: 8, width: "100%", justifyContent: "center" }}
                    onClick={() => setCellModal({ ...cellModal, att: "", ot: "" })}
                  >
                    Clear / Unmark This Day
                  </button>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "#475569", marginBottom: 6 }}>
                    Overtime Hours
                  </label>
                  <div className="sv2-ot-controls">
                    {["0", "1", "2", "3", "4", "8"].map((hr) => (
                      <button
                        key={hr}
                        type="button"
                        className={`sv2-ot-chip ${String(Number(cellModal.ot || 0)) === hr && cellModal.ot !== "" ? "active" : ""}`}
                        onClick={() => setCellModal({ ...cellModal, ot: hr === "0" ? "" : hr })}
                      >
                        {hr === "0" ? "0h" : `+${hr}h`}
                      </button>
                    ))}
                    <input
                      type="number"
                      step="any"
                      min="0"
                      className="sv2-ot-input"
                      placeholder="Custom"
                      value={cellModal.ot}
                      onChange={(e) => setCellModal({ ...cellModal, ot: e.target.value })}
                    />
                  </div>
                </div>

                {/* Expense Cash Taken Breakdown for this Date */}
                <div
                  style={{
                    background: "#faf5ff",
                    border: "1px solid #e9d5ff",
                    borderRadius: 10,
                    padding: "10px 12px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: "0.76rem", fontWeight: 800, color: "#5b21b6", display: "inline-flex", alignItems: "center", gap: 5 }}>
                      <WalletIcon size={14} /> Cash Taken From Expense (Day {cellModal.day})
                    </span>
                    <Link href="/expense" className="sv2-expense-link">
                      Open Expense →
                    </Link>
                  </div>
                  {cellModal.expenses && cellModal.expenses.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: "0.78rem" }}>
                      {cellModal.expenses.map((ex) => (
                        <div key={ex.id} style={{ display: "flex", justifyContent: "space-between", color: "#0f172a" }}>
                          <span>
                            {ex.category}: {ex.title || ex.note || ex.payment_method || "Payout"}
                          </span>
                          <strong style={{ color: "#6d28d9" }}>৳ {formatNum(ex.amount, 0)}</strong>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: "0.76rem", color: "#64748b" }}>
                      No cash taken on Day {cellModal.day}. Month total: ৳ {formatNum(cellModal.monthCashTotal, 0)}
                    </div>
                  )}
                </div>
              </div>

              <div className="st-modal-footer">
                <button
                  type="button"
                  className="st-action-btn secondary"
                  onClick={() => setCellModal(null)}
                  disabled={cellSaving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="st-action-btn primary"
                  disabled={cellSaving}
                >
                  <CheckIcon size={14} />
                  <span>{cellSaving ? "Saving..." : "Save Day Attendance"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SALARY & PREVIOUS BALANCE SETUP MODAL */}
      {setupModal && (
        <div
          className="st-modal-overlay"
          onClick={() => !setupSaving && setSetupModal(null)}
        >
          <div className="st-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="st-modal-header">
              <h3 className="st-modal-title">Salary &amp; Previous Balance ({monthLabelEn})</h3>
              <button
                type="button"
                onClick={() => setSetupModal(null)}
                style={{ background: "transparent", border: "none", cursor: "pointer", color: "#94a3b8", padding: 4 }}
              >
                <XIcon size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveSetupModal}>
              <div className="st-modal-body">
                <div className="be-field-group">
                  <label htmlFor="sv2-setup-staff">Staff Member</label>
                  <select
                    id="sv2-setup-staff"
                    className="be-input"
                    value={setupModal.staffName}
                    onChange={(e) => {
                      const nextName = e.target.value;
                      const prof = profiles[nextName] || { monthly_salary: 0 };
                      const rec = records[nextName] || { prev_balance: 0 };
                      setSetupModal({
                        staffName: nextName,
                        salary: prof.monthly_salary > 0 ? String(prof.monthly_salary) : "",
                        prevBalance: rec.prev_balance !== 0 && rec.prev_balance !== undefined ? String(rec.prev_balance) : "",
                      });
                    }}
                  >
                    {allStaffList.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div className="be-field-group">
                  <label htmlFor="sv2-setup-salary">Monthly Basic Salary (BDT)</label>
                  <input
                    id="sv2-setup-salary"
                    type="number"
                    step="any"
                    className="be-input"
                    placeholder="e.g. 23000"
                    value={setupModal.salary}
                    onChange={(e) => setSetupModal({ ...setupModal, salary: e.target.value })}
                  />
                </div>

                <div className="be-field-group">
                  <label htmlFor="sv2-setup-prev">Previous Balance / Due (BDT)</label>
                  <input
                    id="sv2-setup-prev"
                    type="number"
                    step="any"
                    className="be-input"
                    placeholder="Positive for due, negative for advance"
                    value={setupModal.prevBalance}
                    onChange={(e) => setSetupModal({ ...setupModal, prevBalance: e.target.value })}
                  />
                </div>
              </div>
              <div className="st-modal-footer">
                <button
                  type="button"
                  className="st-action-btn secondary"
                  onClick={() => setSetupModal(null)}
                  disabled={setupSaving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="st-action-btn blue"
                  disabled={setupSaving}
                >
                  <CheckIcon size={14} />
                  <span>{setupSaving ? "Saving..." : "Save Salary & Balance"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD / EDIT STAFF PROFILE MODAL */}
      {editModalOpen && (
        <div
          className="st-modal-overlay"
          onClick={() => !editModalBusy && setEditModalOpen(false)}
        >
          <div className="st-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="st-modal-header">
              <h3 className="st-modal-title">
                {editModalStaff.originalName ? `Edit Staff: ${editModalStaff.originalName}` : "Add New Staff"}
              </h3>
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                style={{ background: "transparent", border: "none", cursor: "pointer", color: "#94a3b8", padding: 4 }}
              >
                <XIcon size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveEditStaff}>
              <div className="st-modal-body">
                {editModalError && (
                  <div style={{ background: "#fee2e2", color: "#dc2626", padding: "8px 12px", borderRadius: 8, fontSize: "0.82rem", fontWeight: 700 }}>
                    {editModalError}
                  </div>
                )}
                <div className="be-field-group">
                  <label htmlFor="sv2-modal-staff-name">
                    Staff Name <span className="req">*</span>
                  </label>
                  <input
                    id="sv2-modal-staff-name"
                    type="text"
                    className="be-input"
                    placeholder="e.g. Ikram, Raju, Shariful..."
                    value={editModalStaff.name}
                    onChange={(e) => setEditModalStaff({ ...editModalStaff, name: e.target.value })}
                    autoFocus
                    required
                  />
                </div>
                <div className="be-field-group">
                  <label htmlFor="sv2-modal-staff-salary">Monthly Basic Salary (BDT)</label>
                  <input
                    id="sv2-modal-staff-salary"
                    type="number"
                    step="any"
                    className="be-input"
                    placeholder="e.g. 23000"
                    value={editModalStaff.salary}
                    onChange={(e) => setEditModalStaff({ ...editModalStaff, salary: e.target.value })}
                  />
                </div>
              </div>
              <div className="st-modal-footer">
                <button
                  type="button"
                  className="st-action-btn secondary"
                  onClick={() => setEditModalOpen(false)}
                  disabled={editModalBusy}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="st-action-btn primary"
                  disabled={editModalBusy}
                >
                  {editModalBusy ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EXPORT LANGUAGE MODAL (Zero Emojis) */}
      {excelLangModal.isOpen && (
        <div
          className="excel-lang-overlay"
          onClick={() => {
            if (!translatingExcel) setExcelLangModal({ isOpen: false, format: "xlsx" });
          }}
        >
          <div className="excel-lang-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ background: "#dcfce7", color: "#15803d", width: 38, height: 38, borderRadius: 10, display: "grid", placeItems: "center" }}>
                  <DownloadIcon size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800, color: "#0f172a" }}>
                    Select Download Language
                  </h3>
                  <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "#64748b" }}>
                    Staff Attendance &amp; Salary Report ({monthLabelEn})
                  </p>
                </div>
              </div>
              {!translatingExcel && (
                <button
                  type="button"
                  onClick={() => setExcelLangModal({ isOpen: false, format: "xlsx" })}
                  style={{ background: "transparent", border: "none", cursor: "pointer", color: "#94a3b8", padding: 4 }}
                >
                  <XIcon size={18} />
                </button>
              )}
            </div>

            {translatingExcel ? (
              <div style={{ padding: "16px 0", textAlign: "center" }}>
                <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#1e3a8a", marginBottom: 6 }}>
                  Preparing Report... ({translatingProgress}%)
                </div>
                <div className="excel-lang-progress-track">
                  <div className="excel-lang-progress-bar" style={{ width: `${translatingProgress}%` }} />
                </div>
              </div>
            ) : (
              <>
                <p style={{ fontSize: "0.85rem", color: "#475569", margin: "10px 0 16px" }}>
                  Choose your preferred language format for this{" "}
                  {excelLangModal.format === "pdf" ? "PDF (.pdf) document" : "Excel (.xlsx) workbook"}:
                </p>
                <div className="excel-lang-options">
                  <button
                    type="button"
                    className="excel-lang-btn bn"
                    onClick={() => executeExportExcel("bn", excelLangModal.format || "xlsx")}
                  >
                    <span style={{ fontSize: "1rem", fontWeight: 900, color: "#1e40af", marginBottom: 4 }}>BN</span>
                    <strong style={{ fontSize: "0.95rem", color: "#1e3a8a" }}>Bengali Report</strong>
                    <span className="excel-lang-badge" style={{ background: "#dbeafe", color: "#1e40af" }}>
                      {excelLangModal.format === "pdf" ? "Bengali PDF" : "Bengali Workbook"}
                    </span>
                  </button>

                  <button
                    type="button"
                    className="excel-lang-btn"
                    onClick={() => executeExportExcel("en", excelLangModal.format || "xlsx")}
                  >
                    <span style={{ fontSize: "1rem", fontWeight: 900, color: "#334155", marginBottom: 4 }}>EN</span>
                    <strong style={{ fontSize: "0.95rem", color: "#0f172a" }}>English Report</strong>
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
