"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { COMPANY } from "@/lib/company";
import { generatePdf, extractQuotationFromPdf } from "@/lib/pdf";
import { takaInWords } from "@/lib/words";

const CO = "Chowdhury Engineering Works";
const REGARDS_PRESETS = [
  { label: "Sales Department", text: `Regards\nSales Department\n${CO}` },
  { label: "Akash Chowdhury", text: `Regards\nAkash Chowdhury\nDirector\n${CO}` },
  { label: "Arafat Chowdhury", text: `Regards\nArafat Chowdhury\nDirector\n${CO}` },
  { label: "Kabir Hossain Chowdhury", text: `Regards\nKabir Hossain Chowdhury\nChairman\n${CO}` },
];

// Local-timezone date (YYYY-MM-DD) — toISOString() would give the UTC date
const today = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

// Quotation no. = CEW-YYYYMMDD-<serial>; serial restarts at 1 every new date.
const SEQ_KEY = "cew-quote-seq";
const ymd = (dateStr) => dateStr.replace(/-/g, "");
const readSeq = () => {
  try {
    return JSON.parse(localStorage.getItem(SEQ_KEY) || "{}");
  } catch {
    return {};
  }
};
const getSeq = (key) => readSeq()[key] || 0;
const autoNo = (dateStr) => (dateStr ? `CEW-${ymd(dateStr)}-${getSeq(ymd(dateStr)) + 1}` : "");

export default function Home() {
  const [quote, setQuote] = useState({ no: "", date: "" });
  const [noEdited, setNoEdited] = useState(false);
  const [client, setClient] = useState({ name: "", company: "", phone: "", email: "", address: "", customText: "" });
  const [columns, setColumns] = useState(["SL No.", "Product Description", "Qty", "Unit", "Rate", "Sub-Total"]);
  const [rows, setRows] = useState([["1", "", "", "", "", ""]]);
  const [totalInput, setTotalInput] = useState(null); // null = auto-sum of last column
  const [nbs, setNbs] = useState([""]);
  const [regards, setRegards] = useState(REGARDS_PRESETS[1].text);
  const [busy, setBusy] = useState(false);
  const [showColManager, setShowColManager] = useState(false);
  const [editingLoadedPdfName, setEditingLoadedPdfName] = useState(null);
  const [pdfUploadLoading, setPdfUploadLoading] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // Fill today's date + next serial on load (client only, avoids hydration mismatch)
  useEffect(() => {
    const d = today();
    setQuote({ date: d, no: autoNo(d) });
  }, []);

  const autoTotal = rows.reduce((s, r) => {
    const v = parseFloat(String(r[r.length - 1] ?? "").replace(/,/g, ""));
    return s + (isNaN(v) ? 0 : v);
  }, 0);
  const total = totalInput ?? (autoTotal ? String(autoTotal) : "");

  const setC = (k) => (e) => setClient({ ...client, [k]: e.target.value });

  const addCol = () => {
    setColumns([...columns, `Column ${columns.length + 1}`]);
    setRows(rows.map((r) => [...r, ""]));
    setShowColManager(true);
  };
  const delCol = (i) => {
    if (columns.length <= 1) return;
    setColumns(columns.filter((_, x) => x !== i));
    setRows(rows.map((r) => r.filter((_, x) => x !== i)));
  };
  const addRow = () => setRows([...rows, columns.map((_, i) => (i === 0 ? String(rows.length + 1) : ""))]);
  // Renumber the first (SL) column 1..n, unless it holds non-numeric custom text
  const renumber = (list) =>
    list.every((r) => /^\d*$/.test(String(r[0] ?? "").trim()))
      ? list.map((r, i) => [String(i + 1), ...r.slice(1)])
      : list;
  const delRow = (i) => rows.length > 1 && setRows(renumber(rows.filter((_, x) => x !== i)));
  const setCell = (r, c, v) =>
    setRows(
      rows.map((row, ri) => {
        if (ri !== r) return row;
        const next = row.map((cell, ci) => (ci === c ? v : cell));
        // Auto Sub-Total = Qty x Rate when those columns exist
        const find = (n) => columns.findIndex((x) => x.trim().toLowerCase().includes(n));
        const q = find("qty");
        const rt = find("rate");
        const sub = columns.findIndex((x) => x.trim().toLowerCase().includes("sub-total") || x.trim().toLowerCase().includes("total"));
        const targetCol = sub >= 0 ? sub : columns.length - 1;

        if (q >= 0 && rt >= 0 && (c === q || c === rt) && targetCol !== c) {
          const rawQ = String(next[q] ?? "").trim().replace(/,/g, "");
          const rawRt = String(next[rt] ?? "").trim().replace(/,/g, "");
          if (rawQ === "" || rawRt === "") {
            next[targetCol] = "";
          } else {
            const a = parseFloat(rawQ);
            const b = parseFloat(rawRt);
            if (!isNaN(a) && !isNaN(b)) {
              next[targetCol] = (a * b).toFixed(2);
            }
          }
        }
        return next;
      })
    );
  const setHead = (i, v) => setColumns(columns.map((c, x) => (x === i ? v : c)));

  const [dragIdx, setDragIdx] = useState(null);
  const [overIdx, setOverIdx] = useState(null);
  const [dragColIdx, setDragColIdx] = useState(null);
  const [overColIdx, setOverColIdx] = useState(null);
  const [touchDrag, setTouchDrag] = useState(null);

  const moveRow = (from, to) => {
    if (from === to || from < 0 || to < 0 || from >= rows.length || to >= rows.length) return;
    const next = [...rows];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    setRows(renumber(next));
  };

  const moveCol = (from, to) => {
    if (from === to || from < 0 || to < 0 || from >= columns.length || to >= columns.length) return;
    const nextCols = [...columns];
    const [colItem] = nextCols.splice(from, 1);
    nextCols.splice(to, 0, colItem);
    setColumns(nextCols);

    const nextRows = rows.map((r) => {
      const rowArr = [...r];
      const [cellItem] = rowArr.splice(from, 1);
      rowArr.splice(to, 0, cellItem);
      return rowArr;
    });
    setRows(nextRows);
  };

  const handleTouchStart = (idx, type) => (e) => {
    setTouchDrag({ type, fromIdx: idx, overIdx: idx });
  };

  const handleTouchMove = (type) => (e) => {
    if (!touchDrag || touchDrag.type !== type) return;
    const touch = e.touches[0];
    if (!touch) return;
    const targetEl = document.elementFromPoint(touch.clientX, touch.clientY);
    if (!targetEl) return;
    const itemEl = targetEl.closest(`[data-drag-type="${type}"]`);
    if (itemEl && itemEl.dataset.dragIndex !== undefined) {
      const over = parseInt(itemEl.dataset.dragIndex, 10);
      if (!isNaN(over) && over !== touchDrag.overIdx) {
        setTouchDrag((prev) => (prev ? { ...prev, overIdx: over } : null));
      }
    }
  };

  const handleTouchEnd = () => {
    if (touchDrag) {
      const { type, fromIdx, overIdx } = touchDrag;
      if (fromIdx !== null && overIdx !== null && fromIdx !== overIdx) {
        if (type === "row") moveRow(fromIdx, overIdx);
        if (type === "col") moveCol(fromIdx, overIdx);
      }
      setTouchDrag(null);
    }
  };

  const fillDemo = () => {
    // Quotation no. and date stay automatic
    setClient({ name: "", company: "", phone: "", email: "", address: "", customText: "" });
    setColumns(["SL No.", "Product Description", "Qty", "Unit", "Rate", "Sub-Total"]);
    // [SL, Description, Qty, Unit, Rate, Sub-Total] \u2014 Qty is left blank to fill in;
    // Sub-Total auto-calculates once Qty is entered.
    const products = [
      ["Profile Sheet ; Brand: Korean Thickness: 0.50mm", "SFT", "72"],
      ["Profile Sheet ; Brand: Korean/ New-zealand Thickness: \u00b1 0.50mm", "SFT", "72"],
      ["Profile Sheet ; Brand: Local seal : 0.50mm", "SFT", "72"],
      ["Insulation Foam 6mm", "SFT", "7.15"],
      ["Insulation Foam 5mm", "SFT", "6.65"],
      ["Ridge Cap (Tua)", "RFT", ""],
      ["Gable Trim (Side cap)", "RFT", ""],
      ["Eave Gutter (Drain Gutter)", "RFT", ""],
      ["Screw 2\u2019\u2019 China BT", "Pcs", "3"],
      ["Screw 1\u2019\u2019 China BT", "Pcs", "2.8"],
      ["Joint screw 1\u2019\u2019 China BT", "Pcs", "2.8"],
      ["Screw 2\u2019\u2019 Taiwan Hot dip galvanized", "Pcs", "7"],
      ["Screw 1\u2019\u2019 Taiwan Hot dip galvanized", "Pcs", "6"],
      ["Joint Screw Taiwan Hot dip galvanized", "Pcs", "6"],
      ["Screw 2\u2019\u2019 Japan Hot dip galvanized", "Pcs", "10"],
      ["Gumtape", "Pc", "40"],
    ];
    setRows(products.map(([desc, unit, rate], i) => [String(i + 1), desc, "", unit, rate, ""]));
    setTotalInput(null);
    setNbs([
      "Labor charge excluded.",
      "Transportation charge excluded.",
      "Payment terms: 50% advance, 50% before delivery.",
      "Product will be delivered within five days after confirmation.",
      "Price Validity: Two days from the quotation date.",
    ]);
    setRegards(REGARDS_PRESETS[1].text);
  };

  const handleUploadPdfToEdit = async (file) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      alert("অনুগ্রহ করে একটি .pdf ফাইল সিলেক্ট করুন।");
      return;
    }
    setPdfUploadLoading(true);
    try {
      const data = await extractQuotationFromPdf(file);
      if (data.quote) {
        setQuote(data.quote);
        setNoEdited(true);
      }
      if (data.client) setClient(data.client);
      if (Array.isArray(data.columns) && data.columns.length > 0) setColumns(data.columns);
      if (Array.isArray(data.rows) && data.rows.length > 0) setRows(data.rows);
      if (data.total !== undefined && data.total !== null) setTotalInput(data.total);
      if (Array.isArray(data.nbs)) setNbs(data.nbs);
      if (data.regards) setRegards(data.regards);

      setEditingLoadedPdfName(file.name);
    } catch (err) {
      console.error("Failed to load PDF:", err);
      alert(err.message || "পিডিএফ ফাইলটি লোড করা সম্ভব হয়নি।");
    } finally {
      setPdfUploadLoading(false);
    }
  };

  const resetToNewQuotation = () => {
    setEditingLoadedPdfName(null);
    const d = today();
    setQuote({ date: d, no: autoNo(d) });
    setNoEdited(false);
    setClient({ name: "", company: "", phone: "", email: "", address: "", customText: "" });
    setColumns(["SL No.", "Product Description", "Qty", "Unit", "Rate", "Sub-Total"]);
    setRows([["1", "", "", "", "", ""]]);
    setTotalInput(null);
    setNbs([""]);
    setRegards(REGARDS_PRESETS[1].text);
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await generatePdf({ quote, client, columns, rows, total, nbs, regards });
      // If the number used is in CEW-YYYYMMDD-N format, advance the serial past N
      const m = /^CEW-(\d{8})-(\d+)$/.exec(String(quote.no).trim());
      if (m) {
        const map = readSeq();
        map[m[1]] = Math.max(map[m[1]] || 0, Number(m[2]));
        localStorage.setItem(SEQ_KEY, JSON.stringify(map));
        // If not editing an existing loaded PDF, auto-advance serial
        if (!editingLoadedPdfName && m[1] === ymd(quote.date || "") && !noEdited) {
          setNoEdited(false);
          setQuote({ date: quote.date, no: autoNo(quote.date) });
        }
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={`mx-auto max-w-5xl px-3 py-4 sm:px-6 sm:py-8 transition-all ${
        isDraggingOver ? "bg-blue-50/80 ring-4 ring-blue-400 ring-dashed rounded-3xl" : ""
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDraggingOver(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        setIsDraggingOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setIsDraggingOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) handleUploadPdfToEdit(file);
      }}
    >
      <header className="mb-5 sm:mb-8 flex flex-wrap items-center justify-between gap-3 rounded-xl sm:rounded-2xl bg-white/90 p-3.5 sm:p-5 shadow-md sm:shadow-lg shadow-indigo-100/60 ring-1 ring-slate-200 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 sm:h-16 sm:w-16 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl bg-gradient-to-br from-red-50 to-rose-100 p-1.5 sm:p-2 shadow-sm ring-1 ring-red-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/cew-icon.png" alt="CEW Logo" className="h-full w-auto object-contain" />
          </div>
          <div>
            <h1 className="bg-gradient-to-r from-red-700 via-indigo-600 to-purple-600 bg-clip-text text-xl font-bold tracking-tight text-transparent sm:text-3xl">
              Quotation Generator
            </h1>
            <p className="mt-0.5 text-[11px] text-slate-500 sm:text-sm">
              Chowdhury Engineering Works • {COMPANY.address}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 ml-auto">
          {/* Upload PDF to Edit Button */}
          <label
            className="btn btn-ghost shadow-sm ring-1 ring-blue-300 hover:ring-blue-400 bg-blue-50/90 text-blue-700 hover:bg-blue-100 transition cursor-pointer flex items-center gap-1.5"
            title="Upload previously downloaded quotation PDF to restore all data for quick editing"
          >
            <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <span className="text-xs sm:text-sm font-semibold">
              {pdfUploadLoading ? "Loading PDF…" : "Upload PDF to Edit"}
            </span>
            <input
              type="file"
              accept=".pdf"
              className="hidden"
              disabled={pdfUploadLoading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUploadPdfToEdit(file);
                e.target.value = "";
              }}
            />
          </label>

          <Link
            href="/bill-entry"
            className="btn btn-ghost shadow-sm ring-1 ring-slate-200 hover:ring-brand-300 text-slate-700 hover:text-brand-700 transition"
            title="Customer Bill Entry"
          >
            <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span className="text-xs sm:text-sm font-medium">Bill Entry</span>
          </Link>
          <Link
            href="/bill-calculator"
            className="btn btn-ghost shadow-sm ring-1 ring-slate-200 hover:ring-brand-300 text-slate-700 hover:text-brand-700 transition"
            title="Bill Calculator"
          >
            <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <span className="text-xs sm:text-sm font-medium">Bill Calculator</span>
          </Link>
          <button
            type="button"
            id="fillDemo"
            onClick={fillDemo}
            className="btn btn-ghost shadow-sm ring-1 ring-brand-200 hover:ring-brand-300"
          >
            <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className="text-xs sm:text-sm">Fill Demo Data</span>
          </button>
        </div>
      </header>

      {/* Editing Loaded Quotation Notice Banner */}
      {editingLoadedPdfName && (
        <div className="mb-4 sm:mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-gradient-to-r from-blue-50 via-sky-50 to-indigo-50 border-2 border-blue-200 p-3 sm:p-4 text-sm text-blue-950 shadow-sm animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white shadow-xs">
              ✓
            </span>
            <div>
              <p className="font-semibold text-blue-900 leading-tight">
                Editing Loaded Quotation: <span className="font-mono bg-blue-100/90 text-blue-900 px-2 py-0.5 rounded text-xs sm:text-sm">{editingLoadedPdfName}</span>
              </p>
              <p className="text-xs text-blue-700 mt-0.5">
                কোটেশনের সমস্ত ডাটা ফর্মে লোড হয়েছে। প্রয়োজনীয় পরিবর্তন করে নিচে "Download PDF" বাটনে ক্লিক করুন।
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={resetToNewQuotation}
            className="btn btn-ghost text-xs font-semibold text-rose-600 hover:text-rose-700 bg-white/90 hover:bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-lg transition shadow-xs"
            title="Clear all fields and start a fresh blank quotation"
          >
            ✕ Start New Quotation
          </button>
        </div>
      )}

      <form onSubmit={submit} className="space-y-4 sm:space-y-6" autoComplete="off">
        <section className="card">
          <h2 className="mb-3 sm:mb-4 text-base sm:text-lg font-semibold text-slate-800">Quotation Details</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="quoteNo">Quotation No (auto)</label>
              <input id="quoteNo" className="input" value={quote.no}
                onChange={(e) => {
                  const v = e.target.value;
                  setNoEdited(v !== "");
                  setQuote({ ...quote, no: v === "" ? autoNo(quote.date) : v });
                }} />
            </div>
            <div>
              <label className="label" htmlFor="date">Date</label>
              <input id="date" type="date" className="input" value={quote.date}
                onChange={(e) => {
                  const d = e.target.value;
                  setQuote({ date: d, no: noEdited || !d ? quote.no : autoNo(d) });
                }} />
            </div>
          </div>
        </section>

        <section className="card">
          <h2 className="mb-3 sm:mb-4 text-base sm:text-lg font-semibold text-slate-800">Client Information</h2>
          <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
            <div><label className="label" htmlFor="cName">Client Name</label>
              <input id="cName" className="input" value={client.name} onChange={setC("name")} /></div>
            <div><label className="label" htmlFor="cCompany">Company</label>
              <input id="cCompany" className="input" value={client.company} onChange={setC("company")} /></div>
            <div><label className="label" htmlFor="cPhone">Phone</label>
              <input id="cPhone" className="input" value={client.phone} onChange={setC("phone")} /></div>
            <div><label className="label" htmlFor="cEmail">Email</label>
              <input id="cEmail" type="email" className="input" value={client.email} onChange={setC("email")} /></div>
            <div className="sm:col-span-2"><label className="label" htmlFor="cAddress">Address</label>
              <input id="cAddress" className="input" value={client.address} onChange={setC("address")} /></div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="cCustom">
                Additional / Plain Client Text (Multiline — appears exactly as typed)
              </label>
              <textarea
                id="cCustom"
                rows={2}
                className="input resize-y"
                placeholder="e.g. Attn: Engr. Shakil Ahmed&#10;Project: Factory Shed Construction"
                value={client.customText ?? ""}
                onChange={setC("customText")}
              />
            </div>
          </div>
        </section>

        <section className="card">
          <div className="mb-3 sm:mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base sm:text-lg font-semibold text-slate-800">Items Table</h2>
            <div className="flex gap-1.5 sm:gap-2">
              <button type="button" id="addCol" onClick={addCol} className="btn btn-ghost text-xs sm:text-sm">+ Column</button>
              <button type="button" id="addRow" onClick={addRow} className="btn btn-ghost text-xs sm:text-sm">+ Row</button>
            </div>
          </div>
          <p className="hidden sm:block mb-2.5 sm:mb-3 text-[11px] sm:text-xs text-slate-500">
            Edit column titles in the header row. Use the descriptions/sizes in the cells below.
          </p>

          {/* Mobile Column & Header Manager */}
          <div className="block sm:hidden mb-3">
            <button
              type="button"
              onClick={() => setShowColManager(!showColManager)}
              className="flex w-full items-center justify-between rounded-xl border border-brand-200 bg-brand-50/70 px-3 py-2.5 text-xs font-semibold text-brand-800 transition hover:bg-brand-100 shadow-xs"
            >
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 text-brand-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Edit Columns & Headers ({columns.length} columns)</span>
              </div>
              <span className="text-[11px] font-bold text-brand-700 bg-white border border-brand-200 px-2.5 py-0.5 rounded-full shadow-xs">
                {showColManager ? "Hide ▲" : "Edit ▼"}
              </span>
            </button>

            {showColManager && (
              <div className="mt-2 space-y-2 rounded-xl border border-brand-200 bg-white p-3 shadow-md">
                <div className="pb-2 border-b border-slate-100">
                  <h3 className="text-xs font-bold text-slate-800">Column Titles & Headers</h3>
                  <p className="text-[11px] text-slate-500">Type to rename any column or tap ✕ to delete</p>
                </div>
                <div className="space-y-1.5 pt-1">
                  {columns.map((c, i) => {
                    const isDragging = dragColIdx === i || (touchDrag?.type === "col" && touchDrag.fromIdx === i);
                    const isOver = overColIdx === i || (touchDrag?.type === "col" && touchDrag.overIdx === i);
                    return (
                      <div
                        key={i}
                        data-drag-type="col"
                        data-drag-index={i}
                        onDragOver={(e) => {
                          if (dragColIdx !== null) {
                            e.preventDefault();
                            setOverColIdx(i);
                          }
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (dragColIdx !== null) moveCol(dragColIdx, i);
                          setDragColIdx(null);
                          setOverColIdx(null);
                        }}
                        className={`flex items-center gap-1.5 p-1.5 rounded-lg border transition ${
                          isDragging
                            ? "opacity-50 ring-2 ring-brand-400 bg-brand-50/50 scale-[0.99]"
                            : isOver
                            ? "border-brand-500 ring-2 ring-brand-200 bg-brand-50/30"
                            : "bg-slate-50/80 border-slate-200"
                        }`}
                      >
                        {/* Drag Handle */}
                        <button
                          type="button"
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData("text/plain", String(i));
                            setDragColIdx(i);
                          }}
                          onDragEnd={() => {
                            setDragColIdx(null);
                            setOverColIdx(null);
                          }}
                          onTouchStart={handleTouchStart(i, "col")}
                          onTouchMove={handleTouchMove("col")}
                          onTouchEnd={handleTouchEnd}
                          onTouchCancel={handleTouchEnd}
                          title="Drag up/down to reorder column"
                          className="cursor-grab active:cursor-grabbing touch-none select-none flex h-7 w-6 shrink-0 items-center justify-center rounded bg-slate-200/70 text-slate-500 hover:bg-brand-100 hover:text-brand-700 transition"
                        >
                          <span className="text-sm font-bold leading-none">⠿</span>
                        </button>

                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white border border-slate-200 text-[10px] font-extrabold text-brand-700 shadow-xs">
                          {i + 1}
                        </span>

                        <input
                          type="text"
                          value={c}
                          onChange={(e) => setHead(i, e.target.value)}
                          placeholder={`Column ${i + 1}`}
                          className="input !h-8 text-xs font-semibold !py-1 text-slate-800 flex-1 bg-white min-w-0"
                        />

                        <button
                          type="button"
                          title="Remove column"
                          disabled={columns.length <= 1}
                          onClick={() => delCol(i)}
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-500 hover:bg-red-100 disabled:opacity-30 disabled:hover:bg-red-50 font-bold transition text-xs"
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          {/* Desktop Table View (Hidden on Mobile) */}
          <div className="hidden sm:block overflow-x-auto rounded-xl ring-1 ring-slate-200">
            <table className="w-full min-w-[850px] border-collapse text-sm">
              <thead>
                <tr className="bg-brand-50">
                  <th className="w-8" />
                  {columns.map((c, i) => {
                    const name = c.toLowerCase();
                    const isDesc = name.includes("description") || name.includes("product") || name.includes("item");
                    const isSL = i === 0 || name.includes("sl");
                    const isSmall = name.includes("unit") || name.includes("qty");
                    return (
                      <th
                        key={i}
                        className={`p-1.5 ${
                          isDesc
                            ? "min-w-[320px] w-auto"
                            : isSL
                            ? "w-20 min-w-[70px]"
                            : isSmall
                            ? "w-24 min-w-[90px]"
                            : "w-32 min-w-[110px]"
                        }`}
                      >
                        <div className="flex items-center gap-1">
                          <input
                            aria-label={`Column ${i + 1} title`}
                            value={c}
                            onChange={(e) => setHead(i, e.target.value)}
                            className="input !font-semibold !text-brand-700 !text-sm"
                          />
                          <button
                            type="button"
                            title="Remove column"
                            onClick={() => delCol(i)}
                            className="rounded px-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500"
                          >
                            ✕
                          </button>
                        </div>
                      </th>
                    );
                  })}
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row, r) => (
                  <tr
                    key={r}
                    onDragOver={(e) => {
                      if (dragIdx !== null) {
                        e.preventDefault();
                        setOverIdx(r);
                      }
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (dragIdx !== null) moveRow(dragIdx, r);
                      setDragIdx(null);
                      setOverIdx(null);
                    }}
                    className={`border-t border-slate-100 transition ${dragIdx === r ? "opacity-40" : ""} ${
                      overIdx === r && dragIdx !== null && dragIdx !== r
                        ? dragIdx < r
                          ? "border-b-2 border-b-brand-500"
                          : "border-t-2 border-t-brand-500"
                        : ""
                    }`}
                  >
                    <td className="w-8 p-1.5 text-center">
                      <span
                        draggable
                        title="Drag to reorder"
                        onDragStart={(e) => {
                          e.dataTransfer.effectAllowed = "move";
                          e.dataTransfer.setData("text/plain", String(r));
                          e.dataTransfer.setDragImage(e.currentTarget.closest("tr"), 0, 0);
                          setDragIdx(r);
                        }}
                        onDragEnd={() => {
                          setDragIdx(null);
                          setOverIdx(null);
                        }}
                        className="cursor-grab select-none rounded px-1 text-lg leading-none text-slate-400 hover:bg-brand-50 hover:text-brand-600 active:cursor-grabbing"
                      >
                        ⠇
                      </span>
                    </td>
                    {columns.map((_, c) => {
                      const name = columns[c].toLowerCase();
                      const isDesc = name.includes("description") || name.includes("product") || name.includes("item");
                      const isCenter = c === 0 || name.includes("sl") || name.includes("unit");
                      const val = row[c] ?? "";
                      return (
                        <td key={c} className="p-1.5 align-middle">
                          {isDesc ? (
                            <textarea
                              rows={1}
                              aria-label={`Row ${r + 1} ${columns[c]}`}
                              className="input min-w-[300px] resize-none overflow-hidden leading-snug py-2 text-sm"
                              value={val}
                              ref={(el) => {
                                if (el) {
                                  el.style.height = "auto";
                                  el.style.height = `${Math.max(34, el.scrollHeight)}px`;
                                }
                              }}
                              onChange={(e) => {
                                e.target.style.height = "auto";
                                e.target.style.height = `${Math.max(34, e.target.scrollHeight)}px`;
                                setCell(r, c, e.target.value);
                              }}
                            />
                          ) : (
                            <input
                              aria-label={`Row ${r + 1} ${columns[c]}`}
                              className={`input ${isCenter ? "text-center" : ""} text-sm`}
                              value={val}
                              onChange={(e) => setCell(r, c, e.target.value)}
                            />
                          )}
                        </td>
                      );
                    })}
                    <td className="p-1.5">
                      <button
                        type="button"
                        title="Remove row"
                        onClick={() => delRow(r)}
                        className="rounded px-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View (Zero Horizontal Scroll!) */}
          <div className="block sm:hidden space-y-3">
            {rows.map((row, r) => {
              const findCol = (keyword) => columns.findIndex((c) => c.toLowerCase().includes(keyword));
              const slIdx = 0;
              const descIdx = findCol("description") >= 0 ? findCol("description") : (columns.length > 1 ? 1 : 0);
              const qtyIdx = findCol("qty");
              const unitIdx = findCol("unit");
              const rateIdx = findCol("rate");
              const subIdx = columns.findIndex((c) => c.toLowerCase().includes("sub-total") || c.toLowerCase().includes("total"));

              // Collect any other custom columns
              const handled = new Set([slIdx, descIdx, qtyIdx, unitIdx, rateIdx, subIdx].filter((x) => x >= 0));
              const extraCols = columns.map((_, i) => i).filter((i) => !handled.has(i));

              const isDraggingRow = dragIdx === r || (touchDrag?.type === "row" && touchDrag.fromIdx === r);
              const isOverRow = overIdx === r || (touchDrag?.type === "row" && touchDrag.overIdx === r);

              return (
                <div
                  key={r}
                  data-drag-type="row"
                  data-drag-index={r}
                  onDragOver={(e) => {
                    if (dragIdx !== null) {
                      e.preventDefault();
                      setOverIdx(r);
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (dragIdx !== null) moveRow(dragIdx, r);
                    setDragIdx(null);
                    setOverIdx(null);
                  }}
                  className={`rounded-xl border bg-white p-3 shadow-sm transition ${
                    isDraggingRow
                      ? "opacity-50 ring-2 ring-brand-400 scale-[0.99] bg-brand-50/30"
                      : isOverRow
                      ? "border-brand-500 ring-2 ring-brand-200 bg-brand-50/20"
                      : "border-slate-200 hover:shadow"
                  }`}
                >
                  {/* Top Bar: Drag handle, SL No, Up/Down reorder, Delete */}
                  <div className="mb-2 flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-1.5">
                      {/* Touch & Mouse Drag Handle */}
                      <button
                        type="button"
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData("text/plain", String(r));
                          setDragIdx(r);
                        }}
                        onDragEnd={() => {
                          setDragIdx(null);
                          setOverIdx(null);
                        }}
                        onTouchStart={handleTouchStart(r, "row")}
                        onTouchMove={handleTouchMove("row")}
                        onTouchEnd={handleTouchEnd}
                        onTouchCancel={handleTouchEnd}
                        title="Drag up/down to reorder row"
                        className="cursor-grab active:cursor-grabbing touch-none select-none flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-500 hover:bg-brand-50 hover:text-brand-600 transition"
                      >
                        <span className="text-base font-bold leading-none">⠿</span>
                      </button>
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-700">
                        {row[slIdx] || r + 1}
                      </span>
                      <span className="text-xs font-semibold text-slate-700">Item #{r + 1}</span>
                    </div>
                    <div>
                      <button
                        type="button"
                        title="Remove Row"
                        onClick={() => delRow(r)}
                        className="h-7 w-7 rounded bg-red-50 text-xs font-bold text-red-500 hover:bg-red-100 flex items-center justify-center"
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  {/* Product Description: Full Width Auto-Expanding */}
                  {descIdx >= 0 && (
                    <div className="mb-2.5">
                      <label className="label">{columns[descIdx]}</label>
                      <textarea
                        rows={1}
                        placeholder="Product Description / Details"
                        className="input resize-none overflow-hidden leading-snug text-xs !py-2"
                        value={row[descIdx] ?? ""}
                        ref={(el) => {
                          if (el) {
                            el.style.height = "auto";
                            el.style.height = `${Math.max(34, el.scrollHeight)}px`;
                          }
                        }}
                        onChange={(e) => {
                          e.target.style.height = "auto";
                          e.target.style.height = `${Math.max(34, e.target.scrollHeight)}px`;
                          setCell(r, descIdx, e.target.value);
                        }}
                      />
                    </div>
                  )}

                  {/* Quantity, Unit, Rate, Sub-Total in a neat 2x2 or 4-col Grid */}
                  <div className="grid grid-cols-2 gap-2">
                    {qtyIdx >= 0 && (
                      <div>
                        <label className="label">{columns[qtyIdx]}</label>
                        <input
                          type="text"
                          placeholder="0"
                          className="input text-xs"
                          value={row[qtyIdx] ?? ""}
                          onChange={(e) => setCell(r, qtyIdx, e.target.value)}
                        />
                      </div>
                    )}
                    {unitIdx >= 0 && (
                      <div>
                        <label className="label">{columns[unitIdx]}</label>
                        <input
                          type="text"
                          placeholder="e.g. SFT"
                          className="input text-center text-xs"
                          value={row[unitIdx] ?? ""}
                          onChange={(e) => setCell(r, unitIdx, e.target.value)}
                        />
                      </div>
                    )}
                    {rateIdx >= 0 && (
                      <div>
                        <label className="label">{columns[rateIdx]}</label>
                        <input
                          type="text"
                          placeholder="0.00"
                          className="input text-xs"
                          value={row[rateIdx] ?? ""}
                          onChange={(e) => setCell(r, rateIdx, e.target.value)}
                        />
                      </div>
                    )}
                    {subIdx >= 0 && (
                      <div>
                        <label className="label">{columns[subIdx]}</label>
                        <input
                          type="text"
                          placeholder="0.00"
                          className="input font-semibold text-brand-700 text-xs"
                          value={row[subIdx] ?? ""}
                          onChange={(e) => setCell(r, subIdx, e.target.value)}
                        />
                      </div>
                    )}
                  </div>

                  {/* Any extra custom columns */}
                  {extraCols.length > 0 && (
                    <div className="mt-2.5 border-t border-slate-100 pt-2 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-slate-500">
                          Additional Columns:
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowColManager(true)}
                          className="text-[10px] text-brand-600 hover:underline font-semibold"
                        >
                          Manage columns
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {extraCols.map((colIdx) => (
                          <div key={colIdx} className="rounded-lg bg-slate-50 p-2 border border-slate-200">
                            <div className="mb-1.5 flex items-center justify-between gap-1.5">
                              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                <span className="text-[10px] font-bold text-slate-500 bg-slate-200/80 rounded px-1.5 py-0.5 shrink-0">
                                  Col #{colIdx + 1}
                                </span>
                                <input
                                  type="text"
                                  value={columns[colIdx]}
                                  onChange={(e) => setHead(colIdx, e.target.value)}
                                  className="text-xs font-semibold text-brand-800 bg-white border border-slate-200 rounded px-1.5 py-0.5 focus:border-brand-500 focus:outline-none w-full"
                                  placeholder={`Column ${colIdx + 1}`}
                                  title="Edit column name"
                                />
                              </div>
                              <button
                                type="button"
                                title="Remove column"
                                onClick={() => delCol(colIdx)}
                                className="shrink-0 h-6 w-6 flex items-center justify-center rounded bg-red-50 text-red-500 hover:bg-red-100 font-bold text-xs"
                              >
                                ✕
                              </button>
                            </div>
                            <input
                              type="text"
                              className="input text-xs bg-white"
                              placeholder={`Enter ${columns[colIdx]}`}
                              value={row[colIdx] ?? ""}
                              onChange={(e) => setCell(r, colIdx, e.target.value)}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section className="card">
          <h2 className="mb-3 sm:mb-4 text-base sm:text-lg font-semibold text-slate-800">Total</h2>
          <label className="label" htmlFor="total">Total Amount (Taka) — auto-sums the last column, editable</label>
          <input id="total" type="number" min="0" className="input" value={total}
            onChange={(e) => setTotalInput(e.target.value)} />
          {Number(total) > 0 && (
            <p className="mt-2 rounded-lg bg-brand-50 px-3 py-2 text-xs sm:text-sm font-medium text-brand-700">
              In words: {takaInWords(total)}
            </p>
          )}
        </section>

        <section className="card">
          <div className="mb-3 sm:mb-4 flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-semibold text-slate-800">N.B</h2>
            <button type="button" id="addNb" onClick={() => setNbs([...nbs, ""])} className="btn btn-ghost text-xs sm:text-sm">+ Add N.B</button>
          </div>
          <div className="space-y-2">
            {nbs.map((n, i) => (
              <div key={i} className="flex items-center gap-1.5 sm:gap-2">
                <span className="w-5 text-xs sm:text-sm text-slate-400">{i + 1}.</span>
                <input className="input" placeholder="e.g. Payment: 50% advance" value={n}
                  onChange={(e) => setNbs(nbs.map((x, xi) => (xi === i ? e.target.value : x)))} />
                <button type="button" title="Remove" onClick={() => setNbs(nbs.length > 1 ? nbs.filter((_, xi) => xi !== i) : [""])}
                  className="rounded px-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500">✕</button>
              </div>
            ))}
          </div>
        </section>

        <section className="card">
          <h2 className="mb-3 sm:mb-4 text-base sm:text-lg font-semibold text-slate-800">Regards</h2>
          <div className="mb-2.5 sm:mb-3 flex flex-wrap gap-1.5 sm:gap-2">
            {REGARDS_PRESETS.map((p) => (
              <button key={p.label} type="button" onClick={() => setRegards(p.text)}
                className={`btn text-xs sm:text-sm ${regards === p.text ? "btn-primary" : "btn-ghost"}`}>
                {p.label}
              </button>
            ))}
            <button type="button" onClick={() => setRegards("")} className="btn btn-ghost text-xs sm:text-sm !text-slate-500">
              Clear
            </button>
          </div>
          <textarea id="regards" rows={4} className="input" value={regards} onChange={(e) => setRegards(e.target.value)} />
        </section>

        <button
          type="submit"
          id="download"
          disabled={busy}
          className="btn btn-primary w-full py-3.5 text-base shadow-lg shadow-indigo-500/20 disabled:opacity-60"
        >
          {busy ? (
            <span className="flex items-center gap-2">
              <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              <span>Generating PDF…</span>
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Download PDF</span>
            </span>
          )}
        </button>
      </form>
    </div>
  );
}
