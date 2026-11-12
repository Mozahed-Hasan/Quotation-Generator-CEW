"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import TopPageNav from "@/lib/TopPageNav";
import * as XLSX from "xlsx-js-style";
import { exportReportToPdf, aoaToPdfSheet } from "@/lib/pdfExport";
import {
  batchTranslateTable,
  toBengaliDigits,
  applyExcelStyles,
} from "@/lib/translator";
import {
  HomeIcon,
  CheckIcon,
  XIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DownloadIcon,
} from "@/lib/icons";

// Exact same staff list as Expense page
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

const BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];

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

export default function StaffAttendancePage() {
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [entryDate, setEntryDate] = useState(todayStr);
  const [monthKey, setMonthKey] = useState(() => todayStr.slice(0, 7));

  // Keep monthKey synced when entryDate moves to another month
  useEffect(() => {
    if (entryDate && entryDate.slice(0, 7) !== monthKey) {
      setMonthKey(entryDate.slice(0, 7));
    }
  }, [entryDate]);

  // Extra staff shared with Expense page via localStorage("cew_extra_staff")
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

  // Bottom View Mode: "slips" | "directory"
  const [bottomView, setBottomView] = useState("slips");
  const [dirSearch, setDirSearch] = useState("");

  // Edit / Add Staff Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editModalStaff, setEditModalStaff] = useState({ originalName: "", name: "", salary: "" });
  const [editModalBusy, setEditModalBusy] = useState(false);
  const [editModalError, setEditModalError] = useState("");

  // Entry Mode: "single" | "bulk"
  const [entryMode, setEntryMode] = useState("single");

  // Single Staff mode state
  const [selectedStaff, setSelectedStaff] = useState(DEFAULT_STAFF[0]);
  const [staffSearch, setStaffSearch] = useState(DEFAULT_STAFF[0]);
  const [showDropdown, setShowDropdown] = useState(false);
  const staffDropdownRef = useRef(null);
  const [attValue, setAttValue] = useState("1"); // "1" | "0.5" | "0"
  const [otHours, setOtHours] = useState("");
  const [attMsg, setAttMsg] = useState("");
  const [attBusy, setAttBusy] = useState(false);

  // Bulk Multi-Staff mode state: { [staffName]: { checked: boolean, att: "1"|"0.5"|"0", ot: string } }
  const [bulkState, setBulkState] = useState({});
  const [bulkSearch, setBulkSearch] = useState("");

  // Salary & Previous Balance form state
  const [salaryInput, setSalaryInput] = useState("");
  const [prevBalanceInput, setPrevBalanceInput] = useState("");
  const [setupMsg, setSetupMsg] = useState("");
  const [setupBusy, setSetupBusy] = useState(false);

  // View filter
  const [cardFilter, setCardFilter] = useState("active"); // "active" | "all" | "selected"

  // Excel / PDF Language Modal State
  const [excelLangModal, setExcelLangModal] = useState({ isOpen: false, format: "xlsx" });
  const [translatingExcel, setTranslatingExcel] = useState(false);
  const [translatingProgress, setTranslatingProgress] = useState(0);

  // Close staff dropdown on outside click
  useEffect(() => {
    function handleOutside(e) {
      if (staffDropdownRef.current && !staffDropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

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

    // Exclude any staff marked deleted in DB or localStorage
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
      setEditModalStaff({
        originalName: "",
        name: "",
        salary: "",
      });
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
        if (selectedStaff.toLowerCase() === oldName.toLowerCase() || !oldName) {
          selectStaffMember(newName);
        }
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
    if (
      !window.confirm(
        `Are you sure you want to delete staff member "${name}"? This will remove them from the active list.`
      )
    ) {
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
        if (selectedStaff.toLowerCase() === name.toLowerCase()) {
          const remaining = allStaffList.filter(
            (s) => s.toLowerCase() !== name.toLowerCase()
          );
          if (remaining.length > 0) {
            selectStaffMember(remaining[0]);
          }
        }
        await loadMonthData(monthKey);
      } else {
        alert(data.error || "Failed to delete staff");
      }
    } catch (err) {
      console.error(err);
      alert("Network error while deleting staff");
    }
  }

  const filteredDropdownStaff = useMemo(() => {
    const q = (staffSearch || "").trim().toLowerCase();
    if (!q || q === (selectedStaff || "").toLowerCase()) return allStaffList;
    return allStaffList.filter((s) => s.toLowerCase().includes(q));
  }, [allStaffList, staffSearch, selectedStaff]);

  // Populate single staff attendance & setup inputs
  useEffect(() => {
    if (!selectedStaff) return;
    const dayNum = String(Number(entryDate.split("-")[2] || 1));
    const rec = records[selectedStaff];
    const prof = profiles[selectedStaff];

    if (rec?.attendance && rec.attendance[dayNum] !== undefined) {
      setAttValue(String(rec.attendance[dayNum]));
    } else {
      setAttValue("1");
    }

    if (rec?.overtime && rec.overtime[dayNum] !== undefined) {
      setOtHours(String(rec.overtime[dayNum]));
    } else {
      setOtHours("");
    }

    setSalaryInput(prof?.monthly_salary ? String(prof.monthly_salary) : "");
    setPrevBalanceInput(
      rec?.prev_balance !== undefined && rec?.prev_balance !== 0
        ? String(rec.prev_balance)
        : ""
    );
  }, [selectedStaff, entryDate, profiles, records]);

  // Initialize / sync bulkState whenever entryDate, records, or allStaffList changes
  useEffect(() => {
    const dayKey = String(Number(entryDate.split("-")[2] || 1));
    const nextBulk = {};
    allStaffList.forEach((name) => {
      const rec = records[name];
      const existingAtt = rec?.attendance?.[dayKey];
      const existingOt = rec?.overtime?.[dayKey];
      const hasExisting = existingAtt !== undefined || existingOt !== undefined;
      nextBulk[name] = {
        checked: hasExisting,
        att: existingAtt !== undefined ? String(existingAtt) : "1",
        ot: existingOt !== undefined ? String(existingOt) : "",
      };
    });
    setBulkState(nextBulk);
  }, [entryDate, records, allStaffList]);

  function selectStaffMember(name) {
    setSelectedStaff(name);
    setStaffSearch(name);
    setShowDropdown(false);
  }

  async function handleSaveAttendance(e) {
    e.preventDefault();
    const staffName = (selectedStaff || staffSearch || "").trim();
    if (!staffName || !entryDate) return;

    addCustomStaffToList(staffName);
    setSelectedStaff(staffName);

    const targetMonth = entryDate.slice(0, 7);
    const dayNum = Number(entryDate.split("-")[2]);
    const parsedAtt = parseAnyNumber(attValue);
    const parsedOt = parseAnyNumber(otHours);

    setAttBusy(true);
    setAttMsg("");
    try {
      const res = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_attendance",
          staff_name: staffName,
          month_key: targetMonth,
          day: dayNum,
          attendance: parsedAtt !== null ? parsedAtt : 1,
          overtime: parsedOt !== null && parsedOt > 0 ? parsedOt : 0,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setRecords((prev) => ({
          ...prev,
          [staffName]: {
            ...(prev[staffName] || { prev_balance: 0 }),
            ...data.record,
          },
        }));
        setAttMsg(`Saved attendance for ${staffName} (Day ${dayNum})`);
        setTimeout(() => setAttMsg(""), 3000);
      }
    } catch (err) {
      console.error(err);
      setAttMsg("Failed to save attendance");
    } finally {
      setAttBusy(false);
    }
  }

  // Save Multiple Staff Attendance & Overtime at once
  async function handleSaveBulkAttendance(e) {
    e.preventDefault();
    const selectedEntries = [];
    for (const name of allStaffList) {
      const row = bulkState[name];
      if (row && row.checked) {
        const parsedAtt = parseAnyNumber(row.att);
        const parsedOt = parseAnyNumber(row.ot);
        selectedEntries.push({
          staff_name: name,
          attendance: parsedAtt !== null ? parsedAtt : 1,
          overtime: parsedOt !== null && parsedOt > 0 ? parsedOt : 0,
        });
      }
    }

    if (selectedEntries.length === 0) {
      setAttMsg("Please tick at least one staff member to save");
      return;
    }

    const targetMonth = entryDate.slice(0, 7);
    const dayNum = Number(entryDate.split("-")[2]);

    setAttBusy(true);
    setAttMsg("");
    try {
      const res = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "bulk_save_attendance",
          month_key: targetMonth,
          day: dayNum,
          entries: selectedEntries,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        await loadMonthData(targetMonth);
        setAttMsg(
          `Saved attendance for ${selectedEntries.length} staff on Day ${dayNum}`
        );
        setTimeout(() => setAttMsg(""), 3500);
      }
    } catch (err) {
      console.error(err);
      setAttMsg("Failed to save bulk attendance");
    } finally {
      setAttBusy(false);
    }
  }

  function updateBulkRow(name, patch) {
    setBulkState((prev) => ({
      ...prev,
      [name]: {
        ...(prev[name] || { checked: true, att: "1", ot: "" }),
        ...patch,
      },
    }));
  }

  function toggleAllBulk(checkedVal, defaultAtt = null) {
    setBulkState((prev) => {
      const next = { ...prev };
      filteredBulkStaff.forEach((name) => {
        const cur = next[name] || { checked: false, att: "1", ot: "" };
        next[name] = {
          ...cur,
          checked: checkedVal,
          att: defaultAtt !== null ? defaultAtt : cur.att,
        };
      });
      return next;
    });
  }

  const filteredBulkStaff = useMemo(() => {
    const q = (bulkSearch || "").trim().toLowerCase();
    if (!q) return allStaffList;
    return allStaffList.filter((s) => s.toLowerCase().includes(q));
  }, [allStaffList, bulkSearch]);

  const checkedBulkCount = useMemo(
    () => allStaffList.filter((s) => bulkState[s]?.checked).length,
    [allStaffList, bulkState]
  );

  async function handleSaveSetup(e) {
    e.preventDefault();
    const staffName = (selectedStaff || staffSearch || "").trim();
    if (!staffName) return;

    addCustomStaffToList(staffName);
    setSelectedStaff(staffName);

    const parsedSalary = parseAnyNumber(salaryInput) || 0;
    const parsedPrev = parseAnyNumber(prevBalanceInput) || 0;

    setSetupBusy(true);
    setSetupMsg("");
    try {
      const res = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_setup",
          staff_name: staffName,
          month_key: monthKey,
          monthly_salary: parsedSalary,
          prev_balance: parsedPrev,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setProfiles((prev) => ({
          ...prev,
          [staffName]: { staff_name: staffName, monthly_salary: parsedSalary },
        }));
        setRecords((prev) => ({
          ...prev,
          [staffName]: {
            ...(prev[staffName] || { attendance: {}, overtime: {} }),
            staff_name: staffName,
            month_key: monthKey,
            prev_balance: parsedPrev,
          },
        }));
        setSetupMsg(`Saved salary & previous balance for ${staffName}`);
        setTimeout(() => setSetupMsg(""), 3000);
      }
    } catch (err) {
      console.error(err);
      setSetupMsg("Failed to save settings");
    } finally {
      setSetupBusy(false);
    }
  }

  // Confirmed Rules:
  // 1. February divides by 28, all other months divide by 30
  // 2. Overtime: 8 hours = 1 day
  const monthNum = useMemo(() => Number(monthKey.split("-")[1] || 1), [monthKey]);
  const yearNum = useMemo(() => Number(monthKey.split("-")[0] || 2026), [monthKey]);
  const salaryDivisor = monthNum === 2 ? 28 : 30;
  const monthLabelEn = `${MONTHS_EN[monthNum - 1] || ""} ${yearNum}`;

  // Calculate monthly summary for each staff member
  const staffSummaries = useMemo(() => {
    return allStaffList.map((staffName) => {
      const prof = profiles[staffName] || { monthly_salary: 0 };
      const rec = records[staffName] || { attendance: {}, overtime: {}, prev_balance: 0 };

      let totalAttendance = 0;
      let totalOvertimeHours = 0;
      const recordedDays = [];

      for (const [dKey, val] of Object.entries(rec.attendance || {})) {
        const num = parseAnyNumber(val);
        if (num !== null) {
          totalAttendance += num;
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

      // Pull Cash Taken strictly from Expense page (Salary / Overtime categories)
      const matchingExpenses = monthExpenses.filter(
        (exp) =>
          String(exp.paid_to || "").trim().toLowerCase() === staffName.toLowerCase()
      );
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
        totalOvertimeHours,
        overtimeDays,
        totalWorkDays,
        earnedSalary,
        prevBalance,
        totalCashTaken,
        remainingPayable,
        recordedDays,
        matchingExpenses,
        hasActivity,
      };
    });
  }, [allStaffList, profiles, records, monthExpenses, salaryDivisor]);

  const selectedStaffSummary = useMemo(
    () => staffSummaries.find((s) => s.staffName === selectedStaff) || null,
    [staffSummaries, selectedStaff]
  );

  const visibleCards = useMemo(() => {
    if (cardFilter === "selected") {
      return staffSummaries.filter((s) => s.staffName === selectedStaff);
    }
    if (cardFilter === "active") {
      const active = staffSummaries.filter((s) => s.hasActivity);
      return active.length > 0 ? active : staffSummaries.slice(0, 6);
    }
    return staffSummaries;
  }, [staffSummaries, cardFilter, selectedStaff]);

  const filteredDirectoryStaff = useMemo(() => {
    const q = (dirSearch || "").trim().toLowerCase();
    if (!q) return staffSummaries;
    return staffSummaries.filter((s) => s.staffName.toLowerCase().includes(q));
  }, [staffSummaries, dirSearch]);

  // Execute Excel / PDF Download in English or Bangla
  async function executeExportExcel(lang = "en", format = excelLangModal.format || "xlsx") {
    const isBn = lang === "bn";
    const isPdf = format === "pdf";
    if (isBn || isPdf) {
      setTranslatingExcel(true);
      setTranslatingProgress(10);
    }

    try {
      const wb = XLSX.utils.book_new();
      const fmtVal = (v, dec = 2) => {
        const s = formatNum(v, dec);
        return isBn ? toBengaliDigits(s) : s;
      };

      // 1. Sheet 1: Individual Staff Salary Slips (Exact match with executive printed cards)
      let slipRows = [];
      const cardPairs = [];
      for (let i = 0; i < visibleCards.length; i += 2) {
        const left = visibleCards[i];
        const right = visibleCards[i + 1] || null;
        cardPairs.push({ left, right });

        const buildCardLines = (item) => {
          if (!item) return Array.from({ length: 9 }, () => ["", "", ""]);
          return [
            [
              isBn ? "নাম" : "Name",
              item.staffName,
              isBn ? "টাকা নেওয়া" : "Cash Taken",
            ],
            [
              isBn ? "বেতন" : "Basic Salary",
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
            [
              isBn ? "মোট কাজ" : "Total Work",
              fmtVal(item.totalWorkDays, 2),
              "",
            ],
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
      applySalarySlipsStyling(wsSlips, cardPairs, isBn);
      XLSX.utils.book_append_sheet(
        wb,
        wsSlips,
        isBn ? "বেতন স্লিপ" : "Salary Slips"
      );

      // 2. Sheet 2: Monthly Attendance & Cash Sheet (Screenshot 1 Layout)
      const daysCount = getDaysInMonth(monthKey);
      const dayCols = Array.from({ length: daysCount }, (_, i) => i + 1);
      let gridRows = [
        [
          isBn ? "ক্রমিক নং" : "SL",
          isBn ? "কর্মকর্তা/কর্মচারী নাম তালিকা" : "Staff Name",
          isBn ? "পদবী" : "Designation",
          isBn ? "মাসিক বেতন" : "Monthly Salary",
          isBn ? "ডিউটি সময়" : "Duty Time",
          ...dayCols.map((d) => (isBn ? toBengaliDigits(d) : String(d))),
          isBn ? "উপস্থিতি" : "Attendance",
          isBn ? "অতিরিক্ত কাজ" : "Overtime",
          isBn ? "মোট কাজ" : "Total Work",
          isBn ? "প্রাপ্য বেতন টাকা" : "Earned Salary",
          isBn ? "অবশিষ্ট টাকা" : "Net Payable",
          isBn ? "বেতন প্রদানের তাং" : "Payment Date",
          isBn ? "দস্তখত" : "Signature",
        ],
      ];

      visibleCards.forEach((item, idx) => {
        const sl = idx + 1;
        gridRows.push([
          isBn ? toBengaliDigits(sl) : sl,
          item.staffName,
          "",
          item.monthlySalary > 0 ? fmtVal(item.monthlySalary, 0) : "",
          "",
          ...dayCols.map((d) => {
            const v = item.attendanceMap?.[String(d)];
            return v !== undefined && v !== ""
              ? isBn
                ? toBengaliDigits(v)
                : v
              : "";
          }),
          fmtVal(item.totalAttendance, 2),
          item.overtimeDays > 0 ? fmtVal(item.overtimeDays, 2) : "",
          fmtVal(item.totalWorkDays, 2),
          fmtVal(item.earnedSalary, 2),
          formatSlipAccounting(item.remainingPayable, isBn, true),
          "",
          "",
        ]);

        const expByDay = {};
        item.matchingExpenses.forEach((x) => {
          const d = Number(x.day_num);
          expByDay[d] = (expByDay[d] || 0) + Number(x.amount || 0);
        });

        gridRows.push([
          "",
          isBn ? "টাকা নেওয়া" : "Cash Taken",
          "",
          "",
          "",
          ...dayCols.map((d) => {
            const c = expByDay[d] || 0;
            return c > 0 ? fmtVal(c, 0) : isBn ? "০" : "0";
          }),
          fmtVal(item.totalCashTaken, 0),
          "",
          "",
          "",
          "",
          "",
          "",
        ]);
      });

      if (isBn) {
        gridRows = await batchTranslateTable(gridRows, (pct) =>
          setTranslatingProgress(60 + Math.round(pct * 0.4))
        );
      }

      const wsGrid = XLSX.utils.aoa_to_sheet(gridRows);
      applyAttendanceGridStyling(wsGrid, gridRows, isBn, daysCount);
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
        let pdfSummaryRows = visibleCards.map((item) => [
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
          subtitle: isBn ? `স্টাফ বেতন ও হাজিরা রিপোর্ট (${monthLabelEn})` : `Staff Attendance & Salary Report (${monthLabelEn})`,
          filename: `Staff_Attendance_Salary_${monthKey}${langSuffix}.pdf`,
          sheets: [
            {
              sheetTitle: isBn ? "বেতন সারসংক্ষেপ (Slips)" : "Salary Slips Summary",
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

  function applySalarySlipsStyling(ws, cardPairs, isBn) {
    const fontName = isBn ? "Kalpurush" : "Calibri";
    const blackBorder = {
      top: { style: "thin", color: { rgb: "000000" } },
      bottom: { style: "thin", color: { rgb: "000000" } },
      left: { style: "thin", color: { rgb: "000000" } },
      right: { style: "thin", color: { rgb: "000000" } },
    };

    ws["!cols"] = [
      { wch: 16 }, // A: Card 1 Label
      { wch: 19 }, // B: Card 1 Value / Name
      { wch: 16 }, // C: Card 1 Cash Taken
      { wch: 4 },  // D: Spacer gap
      { wch: 16 }, // E: Card 2 Label
      { wch: 19 }, // F: Card 2 Value / Name
      { wch: 16 }, // G: Card 2 Cash Taken
    ];

    const rowHeights = [];
    cardPairs.forEach(() => {
      rowHeights.push({ hpt: 26 }); // Row 0: Name header
      rowHeights.push({ hpt: 20 }); // Row 1: Basic Salary
      rowHeights.push({ hpt: 20 }); // Row 2: Attendance / Cash Taken
      rowHeights.push({ hpt: 20 }); // Row 3: Overtime
      rowHeights.push({ hpt: 20 }); // Row 4: Total Work
      rowHeights.push({ hpt: 20 }); // Row 5: Earned Salary
      rowHeights.push({ hpt: 20 }); // Row 6: Previous Due
      rowHeights.push({ hpt: 22 }); // Row 7: Net Payable
      rowHeights.push({ hpt: 38 }); // Row 8: Signature
      rowHeights.push({ hpt: 16 }); // Row 9: Blank gap between cards
    });
    ws["!rows"] = rowHeights;

    ws["!pageSetup"] = {
      paperSize: 9, // A4
      orientation: "portrait",
      fitToWidth: 1,
      fitToHeight: 0,
    };
    ws["!margins"] = {
      left: 0.35,
      right: 0.35,
      top: 0.45,
      bottom: 0.45,
      header: 0.2,
      footer: 0.2,
    };

    cardPairs.forEach((pair, pIdx) => {
      const startR = pIdx * 10;
      if (pair.left) {
        styleSingleCard(ws, startR, 0, fontName, blackBorder);
      }
      if (pair.right) {
        styleSingleCard(ws, startR, 4, fontName, blackBorder);
      }
    });
  }

  function styleSingleCard(ws, startR, startC, fontName, border) {
    for (let rOffset = 0; rOffset < 9; rOffset++) {
      const R = startR + rOffset;
      for (let cOffset = 0; cOffset < 3; cOffset++) {
        const C = startC + cOffset;
        const ref = XLSX.utils.encode_cell({ r: R, c: C });
        let cell = ws[ref];
        if (!cell) {
          cell = { t: "s", v: "" };
          ws[ref] = cell;
        }

        const val = String(cell.v || "").trim();
        const s = {
          border,
          alignment: { vertical: "center" },
          font: { name: fontName, sz: 10.5, color: { rgb: "000000" } },
        };

        if (rOffset === 0) {
          // Header Row: [Label, Staff Name, Cash Taken]
          if (cOffset === 0) {
            s.font = { name: fontName, sz: 11, bold: true, color: { rgb: "000000" } };
            s.alignment = { vertical: "center", horizontal: "center" };
          } else if (cOffset === 1) {
            // RED BOLD STAFF NAME (Image 3)
            s.font = { name: fontName, sz: 14, bold: true, color: { rgb: "CC0000" } };
            s.alignment = { vertical: "center", horizontal: "center" };
          } else if (cOffset === 2) {
            s.font = { name: fontName, sz: 11, bold: true, color: { rgb: "000000" } };
            s.alignment = { vertical: "center", horizontal: "center" };
          }
        } else if (rOffset === 8) {
          // Signature Row
          if (cOffset === 0) {
            s.font = { name: fontName, sz: 11, bold: true, color: { rgb: "000000" } };
            s.alignment = { vertical: "center", horizontal: "center" };
          } else {
            s.alignment = { vertical: "center", horizontal: "center" };
          }
        } else {
          // Data Rows 1-7
          if (cOffset === 0) {
            const isNet = rOffset === 7;
            s.font = { name: fontName, sz: isNet ? 11 : 10.5, bold: isNet, color: { rgb: "000000" } };
            s.alignment = { vertical: "center", horizontal: "center" };
          } else if (cOffset === 1) {
            const isNet = rOffset === 7;
            const isNegative = val.startsWith("(") && val.endsWith(")");
            let fontColor = { rgb: "000000" };
            if (isNet) {
              fontColor = isNegative ? { rgb: "CC0000" } : { rgb: "15803D" };
            }
            s.font = { name: fontName, sz: isNet ? 11.5 : 10.5, bold: isNet, color: fontColor };
            s.alignment = { vertical: "center", horizontal: "right" };
          } else if (cOffset === 2) {
            if (rOffset === 2) {
              s.font = { name: fontName, sz: 10.5, bold: true, color: { rgb: "000000" } };
              s.alignment = { vertical: "center", horizontal: "right" };
            } else {
              s.alignment = { vertical: "center", horizontal: "center" };
            }
          }
        }

        cell.s = s;
      }
    }
  }

  function applyAttendanceGridStyling(ws, gridRows, isBn, daysCount) {
    const fontName = isBn ? "Kalpurush" : "Calibri";
    const gridBorder = {
      top: { style: "thin", color: { rgb: "4682B4" } },
      bottom: { style: "thin", color: { rgb: "4682B4" } },
      left: { style: "thin", color: { rgb: "4682B4" } },
      right: { style: "thin", color: { rgb: "4682B4" } },
    };

    const cols = [
      { wch: 5.5 }, // SL
      { wch: 22 },  // Staff Name / টাকা নেওয়া
      { wch: 13 },  // Designation
      { wch: 13 },  // Monthly Salary
      { wch: 11 },  // Duty Time
    ];
    for (let d = 1; d <= daysCount; d++) {
      cols.push({ wch: 4.5 }); // Daily attendance / cash
    }
    cols.push(
      { wch: 10 }, // Attendance
      { wch: 11 }, // Overtime
      { wch: 10 }, // Total Work
      { wch: 14 }, // Earned Salary
      { wch: 14 }, // Net Payable
      { wch: 12 }, // Payment Date
      { wch: 12 }  // Signature
    );
    ws["!cols"] = cols;

    const rowHeights = [{ hpt: 28 }];
    for (let r = 1; r < gridRows.length; r++) {
      rowHeights.push({ hpt: 20 });
    }
    ws["!rows"] = rowHeights;

    ws["!pageSetup"] = {
      paperSize: 9, // A4
      orientation: "landscape",
      fitToWidth: 1,
      fitToHeight: 0,
    };
    ws["!margins"] = {
      left: 0.3,
      right: 0.3,
      top: 0.4,
      bottom: 0.4,
      header: 0.2,
      footer: 0.2,
    };

    const range = XLSX.utils.decode_range(ws["!ref"] || "A1:A1");
    for (let R = range.s.r; R <= range.e.r; ++R) {
      const isHeader = R === 0;

      for (let C = range.s.c; C <= range.e.c; ++C) {
        const ref = XLSX.utils.encode_cell({ r: R, c: C });
        let cell = ws[ref];
        if (!cell) {
          cell = { t: "s", v: "" };
          ws[ref] = cell;
        }

        const val = String(cell.v || "").trim();
        const s = {
          border: gridBorder,
          alignment: { vertical: "center" },
          font: { name: fontName, sz: 10, color: { rgb: "000000" } },
        };

        if (isHeader) {
          // Red header font matching Image 2
          s.font = { name: fontName, sz: 10, bold: true, color: { rgb: "B91C1C" } };
          s.alignment = { vertical: "center", horizontal: "center", wrapText: true };
        } else {
          if (C === 0) {
            s.alignment = { vertical: "center", horizontal: "center" };
          } else if (C === 1) {
            if (val === "টাকা নেওয়া" || val === "Cash Taken") {
              s.font = { name: fontName, sz: 9.5, color: { rgb: "475569" } };
              s.alignment = { vertical: "center", horizontal: "center" };
            } else {
              s.font = { name: fontName, sz: 10.5, bold: true, color: { rgb: "000000" } };
              s.alignment = { vertical: "center", horizontal: "left" };
            }
          } else if (C >= 5 && C < 5 + daysCount) {
            s.alignment = { vertical: "center", horizontal: "center" };
          } else {
            if (/^[০-৯\d,.\-()]+$/.test(val) && val !== "-") {
              s.alignment = { vertical: "center", horizontal: "right" };
            } else {
              s.alignment = { vertical: "center", horizontal: "center" };
            }
          }
        }

        cell.s = s;
      }
    }
  }

  return (
    <main className="be-wrapper">
      {/* Top Header — Matches Purchase, Sales, Expense pages */}
      <header className="be-header">
        <div className="be-brand">
          <div className="be-title-box">
            <h1>Staff Attendance &amp; Salary</h1>
            <p>
              {monthLabelEn} • Salary Divisor: {salaryDivisor} Days • Overtime: 8 Hrs = 1 Day
            </p>
          </div>
        </div>
        <nav className="be-nav-actions">
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

      {/* Top 2 Entry Cards */}
      <div className="st-top-forms-grid">
        {/* CARD 1: ATTENDANCE & OVERTIME ENTRY (Single or Bulk Mode) */}
        <section className="be-card" style={{ marginBottom: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 10,
              marginBottom: 14,
            }}
          >
            <div>
              <h2 className="be-card-title" style={{ margin: 0 }}>
                1. Record Attendance &amp; Overtime
              </h2>
              <p
                style={{
                  fontSize: "0.8rem",
                  color: "var(--be-text-muted)",
                  margin: "2px 0 0",
                }}
              >
                {entryMode === "single"
                  ? "Select a staff member to mark daily attendance and overtime."
                  : "Select multiple staff members to record attendance & overtime together."}
              </p>
            </div>

            {/* Single vs Bulk Mode Switcher */}
            <div className="st-mode-tabs">
              <button
                type="button"
                className={`st-mode-tab ${entryMode === "single" ? "active" : ""}`}
                onClick={() => {
                  setEntryMode("single");
                  setAttMsg("");
                }}
              >
                Single Staff
              </button>
              <button
                type="button"
                className={`st-mode-tab ${entryMode === "bulk" ? "active" : ""}`}
                onClick={() => {
                  setEntryMode("bulk");
                  setAttMsg("");
                }}
              >
                Multiple Staff (Bulk)
              </button>
            </div>
          </div>

          {entryMode === "single" ? (
            <form onSubmit={handleSaveAttendance}>
              <div
                className="ex-form-grid"
                style={{ gridTemplateColumns: "1fr 1fr", marginBottom: 14 }}
              >
                {/* Staff Selector */}
                <div className="be-field-group" ref={staffDropdownRef}>
                  <label htmlFor="st-staff-input">
                    Select Staff <span className="req">*</span>
                  </label>
                  <div className="ex-paidto-wrap">
                    <input
                      id="st-staff-input"
                      type="text"
                      className="be-input"
                      placeholder="Select or type staff name..."
                      value={staffSearch}
                      autoComplete="off"
                      required
                      onFocus={() => setShowDropdown(true)}
                      onChange={(e) => {
                        setStaffSearch(e.target.value);
                        setSelectedStaff(e.target.value);
                        setShowDropdown(true);
                      }}
                    />
                    {showDropdown && (
                      <div className="ex-dropdown">
                        <div className="ex-dropdown-header">
                          Company Staff List ({filteredDropdownStaff.length})
                        </div>
                        {filteredDropdownStaff.length === 0 ? (
                          <div className="ex-dropdown-empty">
                            No matching staff in list. You can add them below.
                          </div>
                        ) : (
                          filteredDropdownStaff.map((st) => (
                            <div
                              key={st}
                              className={`ex-dropdown-item ${
                                (selectedStaff || "").toLowerCase() === st.toLowerCase()
                                  ? "active"
                                  : ""
                              }`}
                              onClick={() => selectStaffMember(st)}
                            >
                              <span style={{ fontWeight: 600 }}>{st}</span>
                              <span className="ex-tag-staff">Staff</span>
                            </div>
                          ))
                        )}
                        {staffSearch.trim() &&
                          !allStaffList.some(
                            (s) => s.toLowerCase() === staffSearch.trim().toLowerCase()
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
                              onClick={() => {
                                const newName = staffSearch.trim();
                                addCustomStaffToList(newName);
                                selectStaffMember(newName);
                              }}
                            >
                              <span>+ Add &ldquo;{staffSearch.trim()}&rdquo; as new Staff</span>
                              <span className="ex-tag-staff">New</span>
                            </div>
                          )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Date Picker */}
                <div className="be-field-group">
                  <label htmlFor="st-date-input">
                    Date <span className="req">*</span>
                  </label>
                  <input
                    id="st-date-input"
                    type="date"
                    className="be-input"
                    value={entryDate}
                    onChange={(e) => e.target.value && setEntryDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div
                className="ex-form-grid"
                style={{ gridTemplateColumns: "1.15fr 0.85fr", marginBottom: 16 }}
              >
                {/* Attendance Pills */}
                <div className="be-field-group">
                  <label>Attendance Status</label>
                  <div className="st-att-pills">
                    <button
                      type="button"
                      className={`st-att-pill ${attValue === "1" ? "active-1" : ""}`}
                      onClick={() => setAttValue("1")}
                    >
                      ✓ Present (1)
                    </button>
                    <button
                      type="button"
                      className={`st-att-pill ${attValue === "0.5" ? "active-half" : ""}`}
                      onClick={() => setAttValue("0.5")}
                    >
                      ½ Half Day (0.5)
                    </button>
                    <button
                      type="button"
                      className={`st-att-pill ${attValue === "0" ? "active-0" : ""}`}
                      onClick={() => setAttValue("0")}
                    >
                      ✕ Absent (0)
                    </button>
                  </div>
                </div>

                {/* Overtime Input */}
                <div className="be-field-group">
                  <label htmlFor="st-ot-input">Overtime Hours (Optional)</label>
                  <input
                    id="st-ot-input"
                    type="number"
                    step="any"
                    min="0"
                    className="be-input"
                    placeholder="e.g. 2 hours"
                    value={otHours}
                    onChange={(e) => setOtHours(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <button type="submit" className="st-action-btn primary" disabled={attBusy}>
                  <CheckIcon size={15} />
                  <span>{attBusy ? "Saving..." : "Save Attendance"}</span>
                </button>
                {attMsg && (
                  <span style={{ fontSize: "0.84rem", fontWeight: 700, color: "#15803d" }}>
                    ✓ {attMsg}
                  </span>
                )}
              </div>

              {/* Recorded days badges for selected staff */}
              {selectedStaffSummary && selectedStaffSummary.recordedDays.length > 0 && (
                <div className="st-days-strip">
                  <span
                    style={{
                      fontSize: "0.76rem",
                      fontWeight: 700,
                      color: "#475569",
                      alignSelf: "center",
                    }}
                  >
                    {selectedStaff} ({selectedStaffSummary.totalAttendance} days):
                  </span>
                  {selectedStaffSummary.recordedDays.map((d) => {
                    const cls =
                      d.att === 1 ? "att-1" : d.att === 0.5 ? "att-half" : "att-0";
                    const dateIso = `${monthKey}-${String(d.day).padStart(2, "0")}`;
                    return (
                      <button
                        key={d.day}
                        type="button"
                        className={`st-day-badge ${cls}`}
                        onClick={() => setEntryDate(dateIso)}
                        title="Click to edit this date's attendance"
                      >
                        <span>Day {d.day}:</span>
                        <span>{d.att}</span>
                        {d.ot > 0 && (
                          <span style={{ color: "#b45309" }}>(+{d.ot}h OT)</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </form>
          ) : (
            /* MULTIPLE STAFF (BULK) ATTENDANCE & OVERTIME FORM */
            <form onSubmit={handleSaveBulkAttendance}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 10,
                  marginBottom: 10,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <input
                    type="date"
                    className="be-input"
                    style={{ width: "auto", padding: "6px 10px" }}
                    value={entryDate}
                    onChange={(e) => e.target.value && setEntryDate(e.target.value)}
                    required
                  />
                  <input
                    type="text"
                    className="be-input"
                    style={{ width: 170, padding: "6px 10px" }}
                    placeholder="Search staff..."
                    value={bulkSearch}
                    onChange={(e) => setBulkSearch(e.target.value)}
                  />
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <button
                    type="button"
                    className="st-action-btn secondary"
                    style={{ padding: "5px 10px", fontSize: "0.76rem" }}
                    onClick={() => toggleAllBulk(true, "1")}
                  >
                    ✓ Select All Present
                  </button>
                  <button
                    type="button"
                    className="st-action-btn secondary"
                    style={{ padding: "5px 10px", fontSize: "0.76rem" }}
                    onClick={() => toggleAllBulk(false)}
                  >
                    Unselect All
                  </button>
                </div>
              </div>

              <div className="st-bulk-box">
                <table className="st-bulk-table">
                  <thead>
                    <tr>
                      <th style={{ width: 34 }}>
                        <input
                          type="checkbox"
                          checked={
                            filteredBulkStaff.length > 0 &&
                            filteredBulkStaff.every((s) => bulkState[s]?.checked)
                          }
                          onChange={(e) => toggleAllBulk(e.target.checked)}
                        />
                      </th>
                      <th>Staff Name</th>
                      <th>Attendance</th>
                      <th style={{ width: 110 }}>Overtime (Hrs)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBulkStaff.map((name) => {
                      const row = bulkState[name] || {
                        checked: false,
                        att: "1",
                        ot: "",
                      };
                      return (
                        <tr
                          key={name}
                          className={row.checked ? "selected-row" : ""}
                        >
                          <td>
                            <input
                              type="checkbox"
                              checked={Boolean(row.checked)}
                              onChange={(e) =>
                                updateBulkRow(name, { checked: e.target.checked })
                              }
                            />
                          </td>
                          <td
                            style={{ fontWeight: 700, cursor: "pointer" }}
                            onClick={() =>
                              updateBulkRow(name, { checked: !row.checked })
                            }
                          >
                            {name}
                          </td>
                          <td>
                            <div className="st-mini-pills">
                              <button
                                type="button"
                                className={`st-mini-pill ${
                                  row.att === "1" ? "active-1" : ""
                                }`}
                                onClick={() =>
                                  updateBulkRow(name, { checked: true, att: "1" })
                                }
                              >
                                Present (1)
                              </button>
                              <button
                                type="button"
                                className={`st-mini-pill ${
                                  row.att === "0.5" ? "active-half" : ""
                                }`}
                                onClick={() =>
                                  updateBulkRow(name, {
                                    checked: true,
                                    att: "0.5",
                                  })
                                }
                              >
                                Half (0.5)
                              </button>
                              <button
                                type="button"
                                className={`st-mini-pill ${
                                  row.att === "0" ? "active-0" : ""
                                }`}
                                onClick={() =>
                                  updateBulkRow(name, { checked: true, att: "0" })
                                }
                              >
                                Absent (0)
                              </button>
                            </div>
                          </td>
                          <td>
                            <input
                              type="number"
                              step="any"
                              min="0"
                              className="be-input"
                              style={{ padding: "4px 8px", fontSize: "0.82rem" }}
                              placeholder="OT hrs"
                              value={row.ot}
                              onChange={(e) =>
                                updateBulkRow(name, {
                                  checked: true,
                                  ot: e.target.value,
                                })
                              }
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <button type="submit" className="st-action-btn primary" disabled={attBusy}>
                  <CheckIcon size={15} />
                  <span>
                    {attBusy
                      ? "Saving..."
                      : `Save Selected Staff Attendance (${checkedBulkCount})`}
                  </span>
                </button>
                {attMsg && (
                  <span style={{ fontSize: "0.84rem", fontWeight: 700, color: "#15803d" }}>
                    ✓ {attMsg}
                  </span>
                )}
              </div>
            </form>
          )}
        </section>

        {/* CARD 2: SALARY & PREVIOUS BALANCE SETUP */}
        <section className="be-card" style={{ marginBottom: 0 }}>
          <h2 className="be-card-title" style={{ marginBottom: 2 }}>
            2. Salary &amp; Previous Balance
          </h2>
          <p
            style={{
              fontSize: "0.8rem",
              color: "var(--be-text-muted)",
              margin: "0 0 16px",
            }}
          >
            Set monthly basic salary and previous balance (due/advance) for {monthLabelEn}.
          </p>

          <form onSubmit={handleSaveSetup}>
            <div className="be-field-group" style={{ marginBottom: 14 }}>
              <label htmlFor="st-setup-staff">Selected Staff</label>
              <select
                id="st-setup-staff"
                className="be-input"
                value={selectedStaff}
                onChange={(e) => selectStaffMember(e.target.value)}
              >
                {allStaffList.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div
              className="ex-form-grid"
              style={{ gridTemplateColumns: "1fr 1fr", marginBottom: 16 }}
            >
              <div className="be-field-group">
                <label htmlFor="st-salary-input">Monthly Basic Salary (BDT)</label>
                <input
                  id="st-salary-input"
                  type="number"
                  step="any"
                  className="be-input"
                  placeholder="e.g. 23000"
                  value={salaryInput}
                  onChange={(e) => setSalaryInput(e.target.value)}
                />
              </div>

              <div className="be-field-group">
                <label htmlFor="st-prev-input">Previous Balance / Due (BDT)</label>
                <input
                  id="st-prev-input"
                  type="number"
                  step="any"
                  className="be-input"
                  placeholder="e.g. 12535.71 or -21000"
                  value={prevBalanceInput}
                  onChange={(e) => setPrevBalanceInput(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <button type="submit" className="st-action-btn blue" disabled={setupBusy}>
                <CheckIcon size={15} />
                <span>{setupBusy ? "Saving..." : "Save Salary & Balance"}</span>
              </button>
              {setupMsg && (
                <span style={{ fontSize: "0.84rem", fontWeight: 700, color: "#15803d" }}>
                  ✓ {setupMsg}
                </span>
              )}
            </div>
          </form>
        </section>
      </div>

      {/* BOTTOM CARD: MONTHLY SALARY SLIPS & STAFF DIRECTORY */}
      <section className="be-card">
        <div
          className="st-no-print"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
            marginBottom: 18,
            paddingBottom: 14,
            borderBottom: "1px solid var(--be-border)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            {/* View Switcher: Salary Slips vs Staff Directory */}
            <div className="st-mode-tabs">
              <button
                type="button"
                className={`st-mode-tab ${bottomView === "slips" ? "active" : ""}`}
                onClick={() => setBottomView("slips")}
              >
                Salary Slips ({visibleCards.length})
              </button>
              <button
                type="button"
                className={`st-mode-tab ${bottomView === "directory" ? "active" : ""}`}
                onClick={() => setBottomView("directory")}
              >
                Staff Directory ({allStaffList.length})
              </button>
            </div>

            {/* Quick Add Staff Button */}
            <button
              type="button"
              className="st-action-btn primary"
              style={{ padding: "6px 12px", fontSize: "0.8rem" }}
              onClick={() => openEditModal("")}
            >
              + Add Staff
            </button>

            {/* Month Picker (Relevant for both slips and directory calculations) */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                background: "#f8fafc",
                border: "1px solid var(--be-border)",
                borderRadius: 8,
                padding: "3px 8px",
              }}
            >
              <button
                type="button"
                onClick={() => setMonthKey(shiftMonth(monthKey, -1))}
                style={{
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  padding: "4px 6px",
                }}
                title="Previous Month"
              >
                <ChevronLeftIcon size={14} />
              </button>
              <input
                type="month"
                value={monthKey}
                onChange={(e) => e.target.value && setMonthKey(e.target.value)}
                style={{
                  border: "none",
                  background: "transparent",
                  fontWeight: 700,
                  fontSize: "0.86rem",
                  color: "#0f172a",
                  outline: "none",
                }}
              />
              <button
                type="button"
                onClick={() => setMonthKey(shiftMonth(monthKey, 1))}
                style={{
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  padding: "4px 6px",
                }}
                title="Next Month"
              >
                <ChevronRightIcon size={14} />
              </button>
            </div>

            {bottomView === "slips" && (
              <select
                className="be-input"
                style={{ width: "auto", padding: "6px 12px", height: 36 }}
                value={cardFilter}
                onChange={(e) => setCardFilter(e.target.value)}
              >
                <option value="active">Active Staff This Month</option>
                <option value="selected">Selected Staff Only ({selectedStaff})</option>
                <option value="all">All Staff ({allStaffList.length})</option>
              </select>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => setExcelLangModal({ isOpen: true, format: "xlsx" })}
              className="st-action-btn emerald"
            >
              <DownloadIcon size={15} />
              <span>Download Excel (.xlsx)</span>
            </button>
            <button
              type="button"
              onClick={() => setExcelLangModal({ isOpen: true, format: "pdf" })}
              className="st-action-btn"
              style={{ background: "#1e293b", color: "#fff", borderColor: "#1e293b" }}
            >
              <DownloadIcon size={15} />
              <span>Download PDF (.pdf)</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="st-action-btn secondary"
            >
              <span>🖨️ Print Slips</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 36, color: "var(--be-text-muted)" }}>
            Loading staff records...
          </div>
        ) : bottomView === "directory" ? (
          /* TAB 2: STAFF DIRECTORY & MANAGEMENT TABLE */
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
                <span style={{ fontSize: "0.82rem", color: "var(--be-text-muted)", fontWeight: 600 }}>
                  Showing {filteredDirectoryStaff.length} of {allStaffList.length} staff
                </span>
              </div>
              <button
                type="button"
                className="st-action-btn primary"
                onClick={() => openEditModal("")}
              >
                + Add New Staff
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
                    <th>Cash Taken (Expense)</th>
                    <th>Net Balance</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDirectoryStaff.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: "center", padding: 24, color: "var(--be-text-muted)" }}>
                        No staff members found matching &ldquo;{dirSearch}&rdquo;.
                      </td>
                    </tr>
                  ) : (
                    filteredDirectoryStaff.map((item, idx) => (
                      <tr key={item.staffName}>
                        <td style={{ color: "var(--be-text-muted)", fontWeight: 700 }}>{idx + 1}</td>
                        <td style={{ fontWeight: 800 }}>
                          <span
                            onClick={() => {
                              selectStaffMember(item.staffName);
                              setBottomView("slips");
                            }}
                            style={{ cursor: "pointer", color: "var(--be-primary, #991b1b)" }}
                            title="Click to view slip"
                          >
                            {item.staffName}
                          </span>
                        </td>
                        <td style={{ fontWeight: 700 }}>
                          {item.monthlySalary > 0 ? `৳ ${formatNum(item.monthlySalary, 2)}` : "-"}
                        </td>
                        <td>{formatNum(item.totalAttendance, 2)} days</td>
                        <td>
                          {item.totalOvertimeHours > 0
                            ? `${item.totalOvertimeHours} hrs (${formatNum(item.overtimeDays, 2)} d)`
                            : "-"}
                        </td>
                        <td style={{ fontWeight: 700, color: item.totalCashTaken > 0 ? "#7c3aed" : "inherit" }}>
                          {item.totalCashTaken > 0 ? `৳ ${formatNum(item.totalCashTaken, 2)}` : "-"}
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
                              onClick={() => openEditModal(item.staffName)}
                              title="Edit Name & Monthly Salary"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="st-table-btn delete"
                              onClick={() => handleDeleteStaff(item.staffName)}
                              title="Delete Staff"
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
        ) : (
          /* TAB 1: SALARY SLIP CARDS GRID */
          <div className="st-cards-grid">
            {visibleCards.map((item) => (
              <div
                key={item.staffName}
                className={`st-slip-card ${
                  selectedStaff === item.staffName ? "selected" : ""
                }`}
                onClick={() => selectStaffMember(item.staffName)}
                style={{ cursor: "pointer" }}
              >
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
                      <td className="slip-cash-col">
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
                          color: item.remainingPayable < 0 ? "#dc2626" : "#0f172a",
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

                {/* Footer with Expense payments + Quick Edit & Delete Actions */}
                <div className="st-slip-foot st-no-print">
                  <span>
                    {item.matchingExpenses.length > 0 ? (
                      <>
                        <strong>From Expense:</strong>{" "}
                        {item.matchingExpenses
                          .map((x) => `Day ${x.day_num}: ৳${formatNum(x.amount, 0)}`)
                          .join(" • ")}
                      </>
                    ) : (
                      <span style={{ color: "#94a3b8" }}>No expense payments</span>
                    )}
                  </span>
                  <div style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                    <button
                      type="button"
                      className="st-table-btn edit"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditModal(item.staffName);
                      }}
                      title="Edit staff name & basic salary"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="st-table-btn delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteStaff(item.staffName);
                      }}
                      title="Delete staff"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* EDIT / ADD STAFF MODAL */}
      {editModalOpen && (
        <div
          className="st-modal-overlay"
          onClick={() => {
            if (!editModalBusy) setEditModalOpen(false);
          }}
        >
          <div className="st-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="st-modal-header">
              <h3 className="st-modal-title">
                {editModalStaff.originalName
                  ? `Edit Staff: ${editModalStaff.originalName}`
                  : "Add New Staff"}
              </h3>
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "#94a3b8",
                  padding: 4,
                }}
              >
                <XIcon size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveEditStaff}>
              <div className="st-modal-body">
                {editModalError && (
                  <div
                    style={{
                      background: "#fee2e2",
                      color: "#dc2626",
                      padding: "8px 12px",
                      borderRadius: 8,
                      fontSize: "0.82rem",
                      fontWeight: 700,
                    }}
                  >
                    {editModalError}
                  </div>
                )}
                <div className="be-field-group">
                  <label htmlFor="modal-staff-name">
                    Staff Name <span className="req">*</span>
                  </label>
                  <input
                    id="modal-staff-name"
                    type="text"
                    className="be-input"
                    placeholder="e.g. Ikram, Raju, Shariful..."
                    value={editModalStaff.name}
                    onChange={(e) =>
                      setEditModalStaff({ ...editModalStaff, name: e.target.value })
                    }
                    autoFocus
                    required
                  />
                </div>
                <div className="be-field-group">
                  <label htmlFor="modal-staff-salary">Monthly Basic Salary (BDT)</label>
                  <input
                    id="modal-staff-salary"
                    type="number"
                    step="any"
                    className="be-input"
                    placeholder="e.g. 23000"
                    value={editModalStaff.salary}
                    onChange={(e) =>
                      setEditModalStaff({ ...editModalStaff, salary: e.target.value })
                    }
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

      {/* Excel / PDF Language Selection Modal — Identical to Expense / Sales / Purchase pages */}
      {excelLangModal.isOpen && (
        <div
          className="excel-lang-overlay"
          onClick={() => {
            if (!translatingExcel) setExcelLangModal({ isOpen: false, format: "xlsx" });
          }}
        >
          <div className="excel-lang-card" onClick={(e) => e.stopPropagation()}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    background: "#dcfce7",
                    color: "#15803d",
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                </div>
                <div>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: "1.05rem",
                      fontWeight: 800,
                      color: "#0f172a",
                    }}
                  >
                    Select Download Language
                  </h3>
                  <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "#64748b" }}>
                    Download Staff Attendance &amp; Salary Report ({monthLabelEn})
                  </p>
                </div>
              </div>
              {!translatingExcel && (
                <button
                  type="button"
                  onClick={() => setExcelLangModal({ isOpen: false, format: "xlsx" })}
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: "#94a3b8",
                    padding: 4,
                  }}
                >
                  <XIcon size={18} />
                </button>
              )}
            </div>

            {translatingExcel ? (
              <div style={{ padding: "16px 0", textAlign: "center" }}>
                <div
                  style={{
                    fontSize: "0.95rem",
                    fontWeight: 700,
                    color: "#1e3a8a",
                    marginBottom: 6,
                  }}
                >
                  Translating and preparing Bangla Excel file... ({translatingProgress}%)
                </div>
                <p style={{ fontSize: "0.8rem", color: "#64748b", margin: "0 0 12px" }}>
                  Translating staff names &amp; headers into Bengali. Please wait...
                </p>
                <div className="excel-lang-progress-track">
                  <div
                    className="excel-lang-progress-bar"
                    style={{ width: `${translatingProgress}%` }}
                  />
                </div>
              </div>
            ) : (
              <>
                <p style={{ fontSize: "0.85rem", color: "#475569", margin: "10px 0 16px" }}>
                  Choose your preferred language format for this {excelLangModal.format === "pdf" ? "PDF (.pdf) document" : "Excel (.xlsx) workbook"} export:
                </p>

                <div className="excel-lang-options">
                  <button
                    type="button"
                    className="excel-lang-btn bn"
                    onClick={() => executeExportExcel("bn", excelLangModal.format || "xlsx")}
                  >
                    <span style={{ fontSize: "1.3rem", marginBottom: 4 }}>🇧🇩</span>
                    <strong style={{ fontSize: "0.95rem", color: "#1e3a8a" }}>Bangla</strong>
                    <span
                      className="excel-lang-badge"
                      style={{ background: "#dbeafe", color: "#1e40af" }}
                    >
                      {excelLangModal.format === "pdf" ? "বাংলা পিডিএফ" : "বাংলা এক্সেল শিট"}
                    </span>
                  </button>

                  <button
                    type="button"
                    className="excel-lang-btn"
                    onClick={() => executeExportExcel("en", excelLangModal.format || "xlsx")}
                  >
                    <span style={{ fontSize: "1.3rem", marginBottom: 4 }}>🇬🇧</span>
                    <strong style={{ fontSize: "0.95rem", color: "#0f172a" }}>English</strong>
                    <span
                      className="excel-lang-badge"
                      style={{ background: "#f1f5f9", color: "#475569" }}
                    >
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
