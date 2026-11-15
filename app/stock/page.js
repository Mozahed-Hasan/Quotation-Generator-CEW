"use client";
import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import TopPageNav from "@/lib/TopPageNav";
import {
  HomeIcon,
  CheckIcon,
  XIcon,
  SearchIcon,
  TrashIcon,
  DownloadIcon,
  PlusIcon,
  RefreshIcon,
  BoxIcon,
  TrendingUpIcon,
  ShoppingCartIcon,
  ClipboardListIcon,
} from "@/lib/icons";

export default function StockInventoryPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState(null);
  const [movements, setMovements] = useState([]);
  const [adjustments, setAdjustments] = useState([]);

  // Material Inventory filter & search
  const [materialTab, setMaterialTab] = useState("all"); // 'all' | 'kg' | 'sft' | 'rft' | 'pcs'
  const [materialSearch, setMaterialSearch] = useState("");

  // Ledger filter & search
  const [ledgerTypeFilter, setLedgerTypeFilter] = useState("all"); // 'all' | 'purchase_in' | 'sales_out' | 'scrap'
  const [ledgerSearch, setLedgerSearch] = useState("");

  // Record Scrap / Adjustment Modal
  const [showModal, setShowModal] = useState(false);
  const [modalBusy, setModalBusy] = useState(false);
  const [modalErr, setModalErr] = useState("");
  const [modalData, setModalData] = useState({
    adjustment_date: new Date().toISOString().slice(0, 10),
    type: "scrap",
    item_name: "Metal Scrap / Cut Pieces",
    weight_kg: "",
    unit: "kg",
    rate_per_kg: "",
    notes: "",
  });

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/stock");
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setSummary(data.summary || null);
      setMovements(data.movements || []);
      setAdjustments(data.adjustments || []);
    } catch (err) {
      setError(err.message || "Failed to load stock data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Filtered Item-wise Inventory
  const filteredInventory = useMemo(() => {
    let list = summary?.itemsInventory || [];
    if (materialTab !== "all") {
      list = list.filter((i) => i.unit === materialTab);
    }
    if (materialSearch.trim()) {
      const q = materialSearch.trim().toLowerCase();
      list = list.filter(
        (i) =>
          (i.name && i.name.toLowerCase().includes(q)) ||
          (i.category && i.category.toLowerCase().includes(q)) ||
          (i.unit && i.unit.toLowerCase().includes(q))
      );
    }
    return list;
  }, [summary, materialTab, materialSearch]);

  // Filtered Movements Ledger
  const filteredMovements = useMemo(() => {
    let list = movements;
    if (ledgerTypeFilter !== "all") {
      if (ledgerTypeFilter === "scrap") {
        list = list.filter((m) => m.type === "scrap" || m.type === "wastage" || m.type.startsWith("correction"));
      } else {
        list = list.filter((m) => m.type === ledgerTypeFilter);
      }
    }
    if (ledgerSearch.trim()) {
      const q = ledgerSearch.trim().toLowerCase();
      list = list.filter(
        (m) =>
          (m.refNo && m.refNo.toLowerCase().includes(q)) ||
          (m.partyName && m.partyName.toLowerCase().includes(q)) ||
          (m.category && m.category.toLowerCase().includes(q)) ||
          (m.item_name && m.item_name.toLowerCase().includes(q)) ||
          (m.unit && m.unit.toLowerCase().includes(q)) ||
          (m.note && m.note.toLowerCase().includes(q))
      );
    }
    return list;
  }, [movements, ledgerTypeFilter, ledgerSearch]);

  async function handleSaveAdjustment(e) {
    e.preventDefault();
    setModalBusy(true);
    setModalErr("");

    const qty = parseFloat(modalData.weight_kg);
    if (isNaN(qty) || qty <= 0) {
      setModalErr("Please enter a valid quantity greater than 0");
      setModalBusy(false);
      return;
    }

    try {
      const res = await fetch("/api/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(modalData),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed to record adjustment");

      setShowModal(false);
      setModalData({
        adjustment_date: new Date().toISOString().slice(0, 10),
        type: "scrap",
        item_name: "Metal Scrap / Cut Pieces",
        weight_kg: "",
        unit: "kg",
        rate_per_kg: "",
        notes: "",
      });
      await loadData();
    } catch (err) {
      setModalErr(err.message);
    } finally {
      setModalBusy(false);
    }
  }

  async function handleDeleteAdjustment(id) {
    if (!confirm("Are you sure you want to delete this adjustment record?")) return;
    try {
      const res = await fetch(`/api/stock?id=${id}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Failed to delete");
      }
      await loadData();
    } catch (err) {
      alert("Error: " + err.message);
    }
  }

  async function exportToExcel() {
    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.utils.book_new();

      // Sheet 1: Unit Categories Summary
      const unitsAoa = [
        ["CHOWDHURY ENGINEERING WORKS"],
        ["WAREHOUSE INVENTORY SUMMARY BY UNIT"],
        [`Report Date: ${new Date().toISOString().slice(0, 10)}`],
        [],
        ["Category", "Primary Unit", "Purchased (IN)", "Sold / Consumed (OUT)", "Current Stock", "Avg Rate (BDT)", "Estimated Value (BDT)"],
      ];

      if (summary?.unitsSummary) {
        Object.values(summary.unitsSummary).forEach((u) => {
          unitsAoa.push([
            u.label,
            u.unit,
            u.purchasedQty || 0,
            u.soldQty || 0,
            u.currentStock || 0,
            (u.avgRate || 0).toFixed(2),
            (u.estimatedValue || 0).toFixed(2),
          ]);
        });
      }
      unitsAoa.push([]);
      unitsAoa.push(["Total Warehouse Stock Valuation (BDT):", "", "", "", "", "", (summary?.totalValuation || 0).toFixed(2)]);

      const wsUnits = XLSX.utils.aoa_to_sheet(unitsAoa);
      XLSX.utils.book_append_sheet(wb, wsUnits, "Units Summary");

      // Sheet 2: Item-wise Detailed Inventory
      const itemAoa = [
        ["Material / Item Name", "Category", "Unit", "Total Purchased (IN)", "Total Sold / Issued (OUT)", "Scrap / Adjustments", "Current Net Stock", "Avg Rate (BDT)", "Stock Value (BDT)", "Status"],
      ];
      (summary?.itemsInventory || []).forEach((it) => {
        itemAoa.push([
          it.name,
          it.category,
          it.unit,
          it.purchasedQty || 0,
          it.soldQty || 0,
          it.scrapQty || 0,
          it.currentStock || 0,
          (it.avgRate || 0).toFixed(2),
          (it.stockValue || 0).toFixed(2),
          it.status,
        ]);
      });
      const wsItems = XLSX.utils.aoa_to_sheet(itemAoa);
      XLSX.utils.book_append_sheet(wb, wsItems, "Materials Inventory");

      // Sheet 3: Chronological Movements Ledger
      const movAoa = [
        ["Date", "Movement Type", "Material Category", "Item Name", "Reference", "Party / Source", "Quantity IN", "Quantity OUT", "Unit", "Amount (BDT)", "Notes"],
      ];
      movements.forEach((m) => {
        movAoa.push([
          m.date ? String(m.date).slice(0, 10) : "",
          m.category || m.type,
          m.materialCategory || "",
          m.item_name || "",
          m.refNo || "",
          m.partyName || "",
          m.quantityIn || 0,
          m.quantityOut || 0,
          m.unit || "pcs",
          m.amount || 0,
          m.note || "",
        ]);
      });
      const wsMov = XLSX.utils.aoa_to_sheet(movAoa);
      XLSX.utils.book_append_sheet(wb, wsMov, "Stock Ledger");

      XLSX.writeFile(wb, `CEW_Warehouse_MultiUnit_Inventory_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (err) {
      alert("Failed to export Excel: " + err.message);
    }
  }

  const fmt = (n) =>
    Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtQty = (n) =>
    Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 2 });

  const uSummary = summary?.unitsSummary || {};

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Top Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100"
              title="Dashboard"
            >
              <HomeIcon size={16} />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <BoxIcon size={20} className="text-amber-600" />
                <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  Stock &amp; Inventory Management
                </h1>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700 border border-slate-200">
                  Multi-Unit Warehouse
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                Automated inventory breakdown by Unit (KG, SFT, RFT, PCS) linked to Purchases and Sales
              </p>
            </div>
          </div>

          <TopPageNav active="stock" />
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 space-y-6">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={loadData}
              className="inline-flex items-center gap-1 font-semibold text-red-800 hover:underline"
            >
              <RefreshIcon size={14} /> Retry
            </button>
          </div>
        )}

        {/* Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Warehouse Floor Inventory</h2>
            <p className="text-xs text-slate-500">
              Multi-unit tracking for Metal Sheets (KG), Roofing &amp; Insulation (SFT), Gutters (RFT) &amp; Hardware (PCS)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-amber-700 transition"
            >
              <PlusIcon size={15} /> Record Scrap / Adjustment
            </button>
            <button
              onClick={exportToExcel}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
            >
              <DownloadIcon size={15} /> Export Multi-Unit Excel
            </button>
            <button
              onClick={loadData}
              className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition"
              title="Refresh Data"
            >
              <RefreshIcon size={15} />
            </button>
          </div>
        </div>

        {/* 5 Category KPI Cards Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {/* Card 1: Steel & Metal (KG / Tons) */}
          <div
            onClick={() => setMaterialTab("kg")}
            className={`cursor-pointer rounded-xl border p-4 shadow-sm relative overflow-hidden transition hover:shadow-md ${
              materialTab === "kg" ? "border-amber-500 ring-2 ring-amber-100 bg-amber-50/20" : "border-slate-200 bg-white"
            }`}
          >
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500">
              <span>Steel &amp; Metal (KG)</span>
              <BoxIcon size={16} className="text-amber-600" />
            </div>
            <div className="mt-2 text-xl font-black text-slate-900 tracking-tight">
              {loading ? "..." : `${(uSummary.kg?.currentStockTons || 0).toFixed(2)} Tons`}
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
              <span>{fmtQty(uSummary.kg?.currentStock)} KG Net</span>
              <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">
                Weight Unit
              </span>
            </div>
            <div className="absolute inset-x-0 bottom-0 h-1 bg-amber-500" />
          </div>

          {/* Card 2: Roofing & Panels (SFT) */}
          <div
            onClick={() => setMaterialTab("sft")}
            className={`cursor-pointer rounded-xl border p-4 shadow-sm relative overflow-hidden transition hover:shadow-md ${
              materialTab === "sft" ? "border-blue-500 ring-2 ring-blue-100 bg-blue-50/20" : "border-slate-200 bg-white"
            }`}
          >
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500">
              <span>Roofing &amp; Panels</span>
              <span className="text-xs font-bold text-blue-600">SFT</span>
            </div>
            <div className="mt-2 text-xl font-black text-slate-900 tracking-tight">
              {loading ? "..." : `${fmtQty(uSummary.sft?.currentStock)} SFT`}
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
              <span>Profile &amp; Insulation</span>
              <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200">
                Area Unit
              </span>
            </div>
            <div className="absolute inset-x-0 bottom-0 h-1 bg-blue-500" />
          </div>

          {/* Card 3: Flashing & Gutters (RFT) */}
          <div
            onClick={() => setMaterialTab("rft")}
            className={`cursor-pointer rounded-xl border p-4 shadow-sm relative overflow-hidden transition hover:shadow-md ${
              materialTab === "rft" ? "border-indigo-500 ring-2 ring-indigo-100 bg-indigo-50/20" : "border-slate-200 bg-white"
            }`}
          >
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500">
              <span>Flashing &amp; Gutters</span>
              <span className="text-xs font-bold text-indigo-600">RFT</span>
            </div>
            <div className="mt-2 text-xl font-black text-slate-900 tracking-tight">
              {loading ? "..." : `${fmtQty(uSummary.rft?.currentStock)} RFT`}
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
              <span>Tua, Drains &amp; Caps</span>
              <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700 border border-indigo-200">
                Length Unit
              </span>
            </div>
            <div className="absolute inset-x-0 bottom-0 h-1 bg-indigo-500" />
          </div>

          {/* Card 4: Hardware & Accessories (PCS) */}
          <div
            onClick={() => setMaterialTab("pcs")}
            className={`cursor-pointer rounded-xl border p-4 shadow-sm relative overflow-hidden transition hover:shadow-md ${
              materialTab === "pcs" ? "border-emerald-500 ring-2 ring-emerald-100 bg-emerald-50/20" : "border-slate-200 bg-white"
            }`}
          >
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500">
              <span>Hardware &amp; Pieces</span>
              <span className="text-xs font-bold text-emerald-600">PCS</span>
            </div>
            <div className="mt-2 text-xl font-black text-slate-900 tracking-tight">
              {loading ? "..." : `${fmtQty(uSummary.pcs?.currentStock)} PCS`}
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
              <span>Caps, Screws &amp; Accessories</span>
              <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                Count Unit
              </span>
            </div>
            <div className="absolute inset-x-0 bottom-0 h-1 bg-emerald-500" />
          </div>

          {/* Card 5: Total Inventory Valuation */}
          <div
            onClick={() => setMaterialTab("all")}
            className="cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm relative overflow-hidden transition hover:shadow-md"
          >
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500">
              <span>Total Valuation</span>
              <span className="text-xs font-bold text-emerald-700">BDT</span>
            </div>
            <div className="mt-2 text-xl font-black text-emerald-700 tracking-tight">
              {loading ? "..." : `৳ ${fmt(summary?.totalValuation || summary?.estimatedStockValue)}`}
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
              <span>Estimated Asset Value</span>
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-700 border border-slate-200">
                All Units
              </span>
            </div>
            <div className="absolute inset-x-0 bottom-0 h-1 bg-emerald-600" />
          </div>
        </div>

        {/* SECTION 1: Item-wise Raw Material Inventory Table */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-200 bg-slate-50/50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                  Raw Material Item-wise Inventory Breakdown
                </h3>
                <p className="text-xs text-slate-500">
                  Individual stock tracking by material name and distinct unit (KG, SFT, RFT, PCS)
                </p>
              </div>

              {/* Filter Tabs & Search */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs font-semibold">
                  <button
                    onClick={() => setMaterialTab("all")}
                    className={`rounded-md px-2.5 py-1 transition ${
                      materialTab === "all" ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    All ({summary?.itemsInventory?.length || 0})
                  </button>
                  <button
                    onClick={() => setMaterialTab("kg")}
                    className={`rounded-md px-2.5 py-1 transition ${
                      materialTab === "kg" ? "bg-amber-600 text-white" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Steel &amp; Metal (KG)
                  </button>
                  <button
                    onClick={() => setMaterialTab("sft")}
                    className={`rounded-md px-2.5 py-1 transition ${
                      materialTab === "sft" ? "bg-blue-600 text-white" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Roofing (SFT)
                  </button>
                  <button
                    onClick={() => setMaterialTab("rft")}
                    className={`rounded-md px-2.5 py-1 transition ${
                      materialTab === "rft" ? "bg-indigo-600 text-white" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Gutters (RFT)
                  </button>
                  <button
                    onClick={() => setMaterialTab("pcs")}
                    className={`rounded-md px-2.5 py-1 transition ${
                      materialTab === "pcs" ? "bg-emerald-600 text-white" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Hardware (PCS)
                  </button>
                </div>

                <div className="relative">
                  <SearchIcon size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={materialSearch}
                    onChange={(e) => setMaterialSearch(e.target.value)}
                    placeholder="Search material..."
                    className="h-8 rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:border-slate-400 focus:outline-none"
                  />
                  {materialSearch && (
                    <button
                      onClick={() => setMaterialSearch("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <XIcon size={12} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Material / Item Name</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-3 py-3 text-center">Unit</th>
                  <th className="px-4 py-3 text-right">Total In (Purchased)</th>
                  <th className="px-4 py-3 text-right">Total Out (Sold / Used)</th>
                  <th className="px-4 py-3 text-right">Current Stock</th>
                  <th className="px-4 py-3 text-right">Avg Rate (BDT)</th>
                  <th className="px-4 py-3 text-right">Estimated Value</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredInventory.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-slate-400 italic">
                      No raw materials found matching the selected filter.
                    </td>
                  </tr>
                ) : (
                  filteredInventory.map((item, idx) => {
                    const isPositive = item.currentStock > 0;
                    return (
                      <tr key={`${item.name}-${item.unit}-${idx}`} className="hover:bg-slate-50/75 transition">
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {item.name}
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {item.category}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-slate-700 border border-slate-200">
                            {item.unit}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-slate-900">
                          {fmtQty(item.purchasedQty)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-slate-600">
                          {fmtQty(item.soldQty)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold">
                          <span className={isPositive ? "text-emerald-700" : "text-red-700"}>
                            {fmtQty(item.currentStock)} {item.unit}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-slate-600">
                          ৳ {fmt(item.avgRate)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                          ৳ {fmt(item.stockValue)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              item.status === "In Stock"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : item.status === "Low Stock"
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : "bg-red-50 text-red-700 border border-red-200"
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* SECTION 2: Chronological Stock Movements Ledger */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-200 bg-slate-50/50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                  Stock Movements Ledger
                </h3>
                <p className="text-xs text-slate-500">
                  Chronological trail of Purchases IN, Fabricated Sales OUT, Scrap, and Adjustments
                </p>
              </div>

              {/* Filter Tabs & Search */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs font-semibold">
                  <button
                    onClick={() => setLedgerTypeFilter("all")}
                    className={`rounded-md px-2.5 py-1 transition ${
                      ledgerTypeFilter === "all" ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    All ({movements.length})
                  </button>
                  <button
                    onClick={() => setLedgerTypeFilter("purchase_in")}
                    className={`rounded-md px-2.5 py-1 transition ${
                      ledgerTypeFilter === "purchase_in" ? "bg-red-700 text-white" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Purchases IN
                  </button>
                  <button
                    onClick={() => setLedgerTypeFilter("sales_out")}
                    className={`rounded-md px-2.5 py-1 transition ${
                      ledgerTypeFilter === "sales_out" ? "bg-blue-700 text-white" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Sales OUT
                  </button>
                  <button
                    onClick={() => setLedgerTypeFilter("scrap")}
                    className={`rounded-md px-2.5 py-1 transition ${
                      ledgerTypeFilter === "scrap" ? "bg-slate-700 text-white" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Scrap / Adjustments
                  </button>
                </div>

                <div className="relative">
                  <SearchIcon size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={ledgerSearch}
                    onChange={(e) => setLedgerSearch(e.target.value)}
                    placeholder="Search ledger..."
                    className="h-8 rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:border-slate-400 focus:outline-none"
                  />
                  {ledgerSearch && (
                    <button
                      onClick={() => setLedgerSearch("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <XIcon size={12} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Movement Type</th>
                  <th className="px-4 py-3">Item / Description</th>
                  <th className="px-4 py-3">Reference</th>
                  <th className="px-4 py-3">Party / Source</th>
                  <th className="px-4 py-3 text-right">Stock IN</th>
                  <th className="px-4 py-3 text-right">Stock OUT</th>
                  <th className="px-3 py-3 text-center">Unit</th>
                  <th className="px-4 py-3 text-right">Amount (BDT)</th>
                  <th className="px-4 py-3">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredMovements.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-slate-400 italic">
                      No stock movements found.
                    </td>
                  </tr>
                ) : (
                  filteredMovements.map((m) => {
                    const isPurchase = m.type === "purchase_in";
                    const isSale = m.type === "sales_out";
                    const isScrap = m.type === "scrap" || m.type === "wastage";

                    return (
                      <tr key={m.uid} className="hover:bg-slate-50/75 transition">
                        <td className="px-4 py-3 whitespace-nowrap text-slate-600 font-mono">
                          {m.date ? String(m.date).slice(0, 10) : "—"}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              isPurchase
                                ? "bg-red-50 text-red-700 border border-red-200"
                                : isSale
                                ? "bg-blue-50 text-blue-700 border border-blue-200"
                                : isScrap
                                ? "bg-slate-100 text-slate-700 border border-slate-200"
                                : "bg-purple-50 text-purple-700 border border-purple-200"
                            }`}
                          >
                            {m.category || m.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {m.item_name || "—"}
                        </td>
                        <td className="px-4 py-3 font-mono font-semibold text-slate-800 whitespace-nowrap">
                          {m.refNo}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {m.partyName}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-red-700">
                          {m.quantityIn > 0 ? `+ ${fmtQty(m.quantityIn)}` : "—"}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-blue-700">
                          {m.quantityOut > 0 ? `− ${fmtQty(m.quantityOut)}` : "—"}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-slate-700 border border-slate-200">
                            {m.unit || "pcs"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-slate-900">
                          {m.amount > 0 ? `৳ ${fmt(m.amount)}` : "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-500 max-w-xs truncate">
                          {m.note || "—"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* SECTION 3: Recent Scrap & Floor Adjustments */}
        {adjustments.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 tracking-tight mb-3">
              Recorded Scrap &amp; Manual Stock Adjustments
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">Description / Material</th>
                    <th className="px-3 py-2 text-right">Quantity</th>
                    <th className="px-3 py-2 text-center">Unit</th>
                    <th className="px-3 py-2 text-right">Rate / Unit</th>
                    <th className="px-3 py-2">Notes</th>
                    <th className="px-3 py-2 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {adjustments.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2 text-slate-600 font-mono">
                        {a.adjustment_date ? String(a.adjustment_date).slice(0, 10) : ""}
                      </td>
                      <td className="px-3 py-2">
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700">
                          {a.type}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-semibold text-slate-900">{a.item_name}</td>
                      <td className="px-3 py-2 text-right font-mono font-bold text-slate-900">
                        {fmtQty(a.weight_kg)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-slate-700">
                          {a.unit || "kg"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-slate-600">
                        {a.rate_per_kg ? `৳ ${fmt(a.rate_per_kg)}` : "—"}
                      </td>
                      <td className="px-3 py-2 text-slate-500">{a.notes || "—"}</td>
                      <td className="px-3 py-2 text-center">
                        <button
                          onClick={() => handleDeleteAdjustment(a.id)}
                          className="text-slate-400 hover:text-red-600 transition"
                          title="Delete adjustment"
                        >
                          <TrashIcon size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Record Scrap / Adjustment Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Record Material Adjustment / Scrap</h3>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <XIcon size={18} />
              </button>
            </div>

            {modalErr && (
              <div className="mt-3 rounded-lg bg-red-50 p-2.5 text-xs text-red-700 border border-red-200">
                {modalErr}
              </div>
            )}

            <form onSubmit={handleSaveAdjustment} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Adjustment Type</label>
                <select
                  value={modalData.type}
                  onChange={(e) => setModalData({ ...modalData, type: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-slate-400 focus:outline-none"
                >
                  <option value="scrap">Metal Scrap / Damaged Material</option>
                  <option value="wastage">Fabrication Wastage / Offcuts</option>
                  <option value="correction_add">Stock Count Correction (Add Stock)</option>
                  <option value="correction_sub">Stock Count Correction (Deduct Stock)</option>
                  <option value="initial_stock">Initial Stock Balance</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Date</label>
                <input
                  type="date"
                  value={modalData.adjustment_date}
                  onChange={(e) => setModalData({ ...modalData, adjustment_date: e.target.value })}
                  required
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-slate-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Material / Item Description</label>
                <input
                  type="text"
                  value={modalData.item_name}
                  onChange={(e) => setModalData({ ...modalData, item_name: e.target.value })}
                  placeholder="e.g. MS Angle Scrap, Profile Offcuts, Tua Wastage"
                  required
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-slate-400 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Quantity</label>
                  <input
                    type="number"
                    step="any"
                    min="0.01"
                    value={modalData.weight_kg}
                    onChange={(e) => setModalData({ ...modalData, weight_kg: e.target.value })}
                    placeholder="e.g. 50"
                    required
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-slate-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Unit</label>
                  <select
                    value={modalData.unit}
                    onChange={(e) => setModalData({ ...modalData, unit: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-slate-400 focus:outline-none"
                  >
                    <option value="kg">KG (Kilograms)</option>
                    <option value="sft">SFT (Square Feet)</option>
                    <option value="rft">RFT (Running Feet)</option>
                    <option value="pcs">PCS (Pieces)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Rate per Unit (Optional BDT)</label>
                <input
                  type="number"
                  step="any"
                  value={modalData.rate_per_kg}
                  onChange={(e) => setModalData({ ...modalData, rate_per_kg: e.target.value })}
                  placeholder="e.g. 45"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-slate-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notes / Floor Reference</label>
                <textarea
                  rows={2}
                  value={modalData.notes}
                  onChange={(e) => setModalData({ ...modalData, notes: e.target.value })}
                  placeholder="e.g. Cut pieces from Main Gate job, bent profile sheet scrap"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-slate-400 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalBusy}
                  className="rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 transition disabled:opacity-50"
                >
                  {modalBusy ? "Saving..." : "Save Adjustment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
