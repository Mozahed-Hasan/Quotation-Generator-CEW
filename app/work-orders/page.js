"use client";
import React, { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import TopPageNav from "@/lib/TopPageNav";
import * as XLSX from "xlsx-js-style";
import {
  HomeIcon,
  CheckIcon,
  XIcon,
  SearchIcon,
  EditIcon,
  TrashIcon,
  DownloadIcon,
  ClipboardListIcon,
  TruckIcon,
  ClockIcon,
  RefreshIcon,
} from "@/lib/icons";

const STATUS_OPTIONS = [
  { key: "Pending", label: "Pending", color: "#b45309", bg: "#fef3c7" },
  { key: "In Production", label: "In Production", color: "#1d4ed8", bg: "#dbeafe" },
  { key: "Ready", label: "Ready", color: "#6d28d9", bg: "#ede9fe" },
  { key: "Delivered", label: "Delivered", color: "#15803d", bg: "#dcfce7" },
];

const PRIORITY_OPTIONS = [
  { key: "Normal", label: "Normal" },
  { key: "High", label: "High" },
  { key: "Urgent", label: "Urgent" },
];

function fmt(n) {
  const num = Number(n || 0);
  return num.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function WorkOrdersPage() {
  const [workOrders, setWorkOrders] = useState([]);
  const [counts, setCounts] = useState({
    total_count: 0,
    pending_count: 0,
    in_production_count: 0,
    ready_count: 0,
    delivered_count: 0,
  });
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [modalBusy, setModalBusy] = useState(false);
  const [modalErr, setModalErr] = useState("");

  // Print modal
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [printOrder, setPrintOrder] = useState(null);
  const [printMode, setPrintMode] = useState("factory"); // "factory" | "office"

  // Load orders
  async function loadWorkOrders() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());

      const res = await fetch(`/api/work-orders?${params.toString()}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (data.ok) {
        setWorkOrders(data.workOrders || []);
        if (data.counts) setCounts(data.counts);
      }
    } catch (err) {
      console.error("Failed to load work orders:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadWorkOrders();
  }, [statusFilter]);

  // Handle live search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      loadWorkOrders();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Filtered by priority locally
  const filteredOrders = useMemo(() => {
    if (priorityFilter === "all") return workOrders;
    return workOrders.filter(
      (o) => (o.priority || "Normal").toLowerCase() === priorityFilter.toLowerCase()
    );
  }, [workOrders, priorityFilter]);

  // Quick Status Change
  async function handleQuickStatusChange(orderId, newStatus) {
    try {
      const res = await fetch("/api/work-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_status",
          id: orderId,
          status: newStatus,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setWorkOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
        );
        // Reload counts
        loadWorkOrders();
      } else {
        alert(data.error || "Failed to update status");
      }
    } catch (err) {
      console.error("Status update error:", err);
      alert("Network error updating status");
    }
  }

  // Delete
  async function handleDelete(order) {
    if (
      !window.confirm(
        `Are you sure you want to delete Work Order #${order.work_order_no}?`
      )
    ) {
      return;
    }
    try {
      const res = await fetch(`/api/work-orders?id=${order.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.ok) {
        setWorkOrders((prev) => prev.filter((o) => o.id !== order.id));
        loadWorkOrders();
      } else {
        alert(data.error || "Failed to delete work order");
      }
    } catch (err) {
      console.error("Delete error:", err);
      alert("Network error deleting work order");
    }
  }

  // Open Edit / Create Modal
  function openCreateModal() {
    setEditingOrder({
      id: null,
      work_order_no: "",
      bill_no: "",
      order_date: todayStr(),
      target_delivery_date: "",
      customer_name: "",
      customer_mobile: "",
      customer_address: "",
      site_location: "",
      priority: "Normal",
      status: "Pending",
      production_notes: "",
      total_amount: "",
      advance_paid: "",
      due_amount: "",
      items: [
        { name: "", quantity: 1, unit: "pcs", specs: "", note: "" },
      ],
    });
    setModalErr("");
    setEditModalOpen(true);
  }

  function openEditModal(order) {
    const rawItems = Array.isArray(order.items) ? order.items : [];
    setEditingOrder({
      ...order,
      items:
        rawItems.length > 0
          ? rawItems.map((it) => ({
              name: it.name || it.item_name || "",
              quantity: it.quantity || 1,
              unit: it.unit || "pcs",
              specs: it.specs || it.dimensions || "",
              note: it.note || "",
            }))
          : [{ name: "", quantity: 1, unit: "pcs", specs: "", note: "" }],
    });
    setModalErr("");
    setEditModalOpen(true);
  }

  // Save Modal
  async function handleSaveOrder(e) {
    e.preventDefault();
    if (!editingOrder.customer_name.trim()) {
      setModalErr("Customer name is required");
      return;
    }

    setModalBusy(true);
    setModalErr("");
    try {
      const isNew = !editingOrder.id;
      const payload = {
        action: isNew ? "create" : "update",
        ...editingOrder,
      };

      const res = await fetch("/api/work-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.ok) {
        setEditModalOpen(false);
        await loadWorkOrders();
      } else {
        setModalErr(data.error || "Failed to save work order");
      }
    } catch (err) {
      console.error("Save error:", err);
      setModalErr("Network error while saving work order");
    } finally {
      setModalBusy(false);
    }
  }

  // Modal item helpers
  function updateItem(idx, field, val) {
    setEditingOrder((prev) => {
      const nextItems = [...prev.items];
      nextItems[idx] = { ...nextItems[idx], [field]: val };
      return { ...prev, items: nextItems };
    });
  }

  function addItem() {
    setEditingOrder((prev) => ({
      ...prev,
      items: [...prev.items, { name: "", quantity: 1, unit: "pcs", specs: "", note: "" }],
    }));
  }

  function removeItem(idx) {
    setEditingOrder((prev) => {
      const next = prev.items.filter((_, i) => i !== idx);
      return {
        ...prev,
        items: next.length > 0 ? next : [{ name: "", quantity: 1, unit: "pcs", specs: "", note: "" }],
      };
    });
  }

  // Print Open
  function openPrint(order, mode = "factory") {
    setPrintOrder(order);
    setPrintMode(mode);
    setPrintModalOpen(true);
  }

  // Excel Export
  function exportToExcel() {
    try {
      const rows = [
        [
          "WO Number",
          "Order Date",
          "Target Delivery",
          "Customer Name",
          "Mobile",
          "Site Location",
          "Items Breakdown",
          "Production Notes",
          "Priority",
          "Status",
          "Total Bill",
          "Advance",
          "Due",
        ],
      ];

      filteredOrders.forEach((o) => {
        const itemsStr = Array.isArray(o.items)
          ? o.items
              .map((it) => `${it.name || "Item"} (${it.quantity || 1} ${it.unit || "pcs"}${it.specs ? ` - ${it.specs}` : ""})`)
              .join("; ")
          : "";

        rows.push([
          o.work_order_no,
          o.order_date || "",
          o.target_delivery_date || "",
          o.customer_name || "",
          o.customer_mobile || "",
          o.site_location || "",
          itemsStr,
          o.production_notes || "",
          o.priority || "Normal",
          o.status || "Pending",
          Number(o.total_amount || 0),
          Number(o.advance_paid || 0),
          Number(o.due_amount || 0),
        ]);
      });

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(rows);

      ws["!cols"] = [
        { wch: 15 },
        { wch: 12 },
        { wch: 15 },
        { wch: 22 },
        { wch: 14 },
        { wch: 20 },
        { wch: 35 },
        { wch: 28 },
        { wch: 10 },
        { wch: 14 },
        { wch: 14 },
        { wch: 12 },
        { wch: 12 },
      ];

      XLSX.utils.book_append_sheet(wb, ws, "Work Orders");
      XLSX.writeFile(wb, `Work_Orders_${todayStr()}.xlsx`);
    } catch (err) {
      console.error("Excel export error:", err);
      alert("Failed to export Excel file");
    }
  }

  return (
    <main className="be-wrapper">
      {/* Top Header */}
      <header className="be-header">
        <div className="be-brand">
          <div className="be-title-box">
            <h1>Work Orders &amp; Production</h1>
            <p>
              Factory order tracking, fabrication specifications, delivery schedules, and slips
            </p>
          </div>
        </div>
        <nav className="be-nav-actions">
          <TopPageNav active="work-orders" />
          <Link href="/" className="be-icon-btn" title="Back to Home Dashboard">
            <HomeIcon size={16} />
            <span style={{ fontSize: "0.82rem", fontWeight: 700 }}>Home</span>
          </Link>
        </nav>
      </header>

      {/* KPI Cards Strip */}
      <section className="wo-stats-grid">
        <div
          className={`wo-stat-card ${statusFilter === "all" ? "active" : ""}`}
          onClick={() => setStatusFilter("all")}
        >
          <div className="wo-stat-header">
            <span className="wo-stat-label">Total Work Orders</span>
            <ClipboardListIcon size={18} color="#2563eb" />
          </div>
          <div className="wo-stat-val">{counts.total_count}</div>
          <span className="wo-stat-sub">All active jobs</span>
        </div>

        <div
          className={`wo-stat-card ${statusFilter === "Pending" ? "active" : ""}`}
          onClick={() => setStatusFilter("Pending")}
        >
          <div className="wo-stat-header">
            <span className="wo-stat-label" style={{ color: "#b45309" }}>Pending</span>
            <ClockIcon size={18} color="#b45309" />
          </div>
          <div className="wo-stat-val" style={{ color: "#b45309" }}>
            {counts.pending_count}
          </div>
          <span className="wo-stat-sub">Waiting for production</span>
        </div>

        <div
          className={`wo-stat-card ${statusFilter === "In Production" ? "active" : ""}`}
          onClick={() => setStatusFilter("In Production")}
        >
          <div className="wo-stat-header">
            <span className="wo-stat-label" style={{ color: "#1d4ed8" }}>In Production</span>
            <RefreshIcon size={18} color="#1d4ed8" />
          </div>
          <div className="wo-stat-val" style={{ color: "#1d4ed8" }}>
            {counts.in_production_count}
          </div>
          <span className="wo-stat-sub">Fabrication in progress</span>
        </div>

        <div
          className={`wo-stat-card ${statusFilter === "Ready" ? "active" : ""}`}
          onClick={() => setStatusFilter("Ready")}
        >
          <div className="wo-stat-header">
            <span className="wo-stat-label" style={{ color: "#6d28d9" }}>Ready</span>
            <CheckIcon size={18} color="#6d28d9" />
          </div>
          <div className="wo-stat-val" style={{ color: "#6d28d9" }}>
            {counts.ready_count}
          </div>
          <span className="wo-stat-sub">Awaiting delivery</span>
        </div>

        <div
          className={`wo-stat-card ${statusFilter === "Delivered" ? "active" : ""}`}
          onClick={() => setStatusFilter("Delivered")}
        >
          <div className="wo-stat-header">
            <span className="wo-stat-label" style={{ color: "#15803d" }}>Delivered</span>
            <TruckIcon size={18} color="#15803d" />
          </div>
          <div className="wo-stat-val" style={{ color: "#15803d" }}>
            {counts.delivered_count}
          </div>
          <span className="wo-stat-sub">Completed &amp; shipped</span>
        </div>
      </section>

      {/* Main Content Card */}
      <section className="be-card" style={{ padding: "18px 20px" }}>
        {/* Filter and Actions Bar */}
        <div className="wo-filter-bar">
          {/* Status Tabs */}
          <div style={{ display: "inline-flex", gap: 4, background: "#f8fafc", padding: 3, borderRadius: 10, border: "1px solid #e2e8f0" }}>
            {["all", "Pending", "In Production", "Ready", "Delivered"].map((st) => (
              <button
                key={st}
                type="button"
                className={`wo-tab-btn ${statusFilter === st ? "active" : ""}`}
                onClick={() => setStatusFilter(st)}
              >
                {st === "all" ? "All Orders" : st}
              </button>
            ))}
          </div>

          {/* Search & Priority Controls */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div style={{ position: "relative", width: 230 }}>
              <input
                type="text"
                className="be-input"
                style={{ paddingLeft: 32, fontSize: "0.82rem" }}
                placeholder="Search orders, customer, site..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }}>
                <SearchIcon size={14} />
              </span>
            </div>

            <select
              className="be-input"
              style={{ width: "auto", fontSize: "0.82rem" }}
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
            >
              <option value="all">All Priorities</option>
              <option value="Normal">Normal</option>
              <option value="High">High</option>
              <option value="Urgent">Urgent Only</option>
            </select>

            <button
              type="button"
              className="wo-btn"
              onClick={exportToExcel}
              title="Download Excel Report"
            >
              <DownloadIcon size={14} />
              <span>Export</span>
            </button>

            <button
              type="button"
              className="wo-btn primary"
              onClick={openCreateModal}
            >
              <span>+ New Work Order</span>
            </button>
          </div>
        </div>

        {/* Work Orders Table */}
        <div className="wo-table-wrap">
          <table className="wo-table">
            <thead>
              <tr>
                <th style={{ width: 110 }}>WO Number</th>
                <th style={{ width: 100 }}>Order Date</th>
                <th>Customer &amp; Site</th>
                <th>Items &amp; Fabrication Specs</th>
                <th style={{ width: 120 }}>Target Delivery</th>
                <th style={{ width: 90 }}>Priority</th>
                <th style={{ width: 140 }}>Production Status</th>
                <th style={{ width: 120, textAlign: "right" }}>Balance</th>
                <th style={{ width: 140, textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: "center", padding: 32, color: "#64748b" }}>
                    Loading work orders...
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: "center", padding: 36, color: "#64748b" }}>
                    <div style={{ fontSize: "1rem", fontWeight: 700, marginBottom: 4 }}>
                      No Work Orders Found
                    </div>
                    <p style={{ margin: 0, fontSize: "0.84rem" }}>
                      Create a work order or check &ldquo;Add to Work Order List&rdquo; when recording sales invoices.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const rawItems = Array.isArray(order.items) ? order.items : [];
                  const isUrgent = (order.priority || "").toLowerCase() === "urgent";
                  const isHigh = (order.priority || "").toLowerCase() === "high";

                  // Check delivery date status
                  const isOverdue =
                    order.target_delivery_date &&
                    order.status !== "Delivered" &&
                    order.target_delivery_date < todayStr();

                  const isToday =
                    order.target_delivery_date &&
                    order.status !== "Delivered" &&
                    order.target_delivery_date === todayStr();

                  return (
                    <tr key={order.id}>
                      {/* 1. WO Number */}
                      <td>
                        <div style={{ fontWeight: 800, color: "#0f172a" }}>
                          {order.work_order_no}
                        </div>
                        {order.bill_no && (
                          <div style={{ fontSize: "0.72rem", color: "#64748b" }}>
                            Ref Bill: #{order.bill_no}
                          </div>
                        )}
                      </td>

                      {/* 2. Order Date */}
                      <td style={{ fontSize: "0.82rem", color: "#475569", fontWeight: 600 }}>
                        {order.order_date}
                      </td>

                      {/* 3. Customer & Site */}
                      <td>
                        <div style={{ fontWeight: 800, color: "#1e3a8a" }}>
                          {order.customer_name}
                        </div>
                        {order.customer_mobile && (
                          <div style={{ fontSize: "0.76rem", color: "#475569", display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                            </svg>
                            <span>{order.customer_mobile}</span>
                          </div>
                        )}
                        {order.site_location && (
                          <div style={{ fontSize: "0.76rem", color: "#0369a1", fontWeight: 600, display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                              <circle cx="12" cy="10" r="3" />
                            </svg>
                            <span>{order.site_location}</span>
                          </div>
                        )}
                      </td>

                      {/* 4. Items & Specs */}
                      <td>
                        <div className="wo-items-snippet">
                          {rawItems.length === 0 ? (
                            <span style={{ color: "#94a3b8" }}>No item details</span>
                          ) : (
                            rawItems.map((it, idx) => (
                              <span key={idx} className="wo-item-tag">
                                <b>{it.name || "Item"}</b>: {it.quantity || 1} {it.unit || "pcs"}
                                {it.specs ? ` (${it.specs})` : ""}
                              </span>
                            ))
                          )}
                          {order.production_notes && (
                            <div style={{ fontSize: "0.75rem", color: "#475569", marginTop: 4, fontWeight: 600 }}>
                              Note: {order.production_notes}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 5. Target Delivery */}
                      <td>
                        {order.target_delivery_date ? (
                          <div>
                            <div style={{ fontWeight: 700, fontSize: "0.82rem" }}>
                              {order.target_delivery_date}
                            </div>
                            {isOverdue && (
                              <span className="wo-badge-overdue">
                                Overdue
                              </span>
                            )}
                            {isToday && (
                              <span className="wo-badge-due-today">
                                Due Today
                              </span>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: "#94a3b8", fontSize: "0.8rem" }}>Not set</span>
                        )}
                      </td>

                      {/* 6. Priority */}
                      <td>
                        <span
                          className={`wo-priority-badge ${
                            isUrgent ? "urgent" : isHigh ? "high" : "normal"
                          }`}
                        >
                          {order.priority || "Normal"}
                        </span>
                      </td>

                      {/* 7. Production Status */}
                      <td>
                        <select
                          className="wo-status-select"
                          value={order.status || "Pending"}
                          onChange={(e) => handleQuickStatusChange(order.id, e.target.value)}
                          style={{
                            color:
                              order.status === "Delivered"
                                ? "#15803d"
                                : order.status === "Ready"
                                ? "#6d28d9"
                                : order.status === "In Production"
                                ? "#1d4ed8"
                                : "#b45309",
                            borderColor:
                              order.status === "Delivered"
                                ? "#86efac"
                                : order.status === "Ready"
                                ? "#c4b5fd"
                                : order.status === "In Production"
                                ? "#93c5fd"
                                : "#fde68a",
                            background:
                              order.status === "Delivered"
                                ? "#f0fdf4"
                                : order.status === "Ready"
                                ? "#f5f3ff"
                                : order.status === "In Production"
                                ? "#eff6ff"
                                : "#fffbeb",
                          }}
                        >
                          <option value="Pending">Pending</option>
                          <option value="In Production">In Production</option>
                          <option value="Ready">Ready</option>
                          <option value="Delivered">Delivered</option>
                        </select>
                      </td>

                      {/* 8. Balance / Financials */}
                      <td style={{ textAlign: "right" }}>
                        <div style={{ fontWeight: 700, fontSize: "0.82rem" }}>
                          Tk. {fmt(order.total_amount)}
                        </div>
                        {Number(order.due_amount) > 0 ? (
                          <div style={{ fontSize: "0.74rem", color: "#dc2626", fontWeight: 700 }}>
                            Due: Tk. {fmt(order.due_amount)}
                          </div>
                        ) : (
                          <div style={{ fontSize: "0.74rem", color: "#15803d", fontWeight: 700 }}>
                            Paid: Tk. {fmt(order.advance_paid)}
                          </div>
                        )}
                      </td>

                      {/* 9. Actions */}
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: 4, justifyContent: "flex-end", flexWrap: "wrap" }}>
                          <button
                            type="button"
                            className="wo-btn factory"
                            onClick={() => openPrint(order, "factory")}
                            title="Print Factory Production Slip"
                            style={{ padding: "4px 8px", fontSize: "0.74rem" }}
                          >
                            Factory Slip
                          </button>

                          <button
                            type="button"
                            className="wo-btn"
                            onClick={() => openPrint(order, "office")}
                            title="Print Office Slip"
                            style={{ padding: "4px 8px", fontSize: "0.74rem" }}
                          >
                            Office Slip
                          </button>

                          <button
                            type="button"
                            className="wo-btn"
                            onClick={() => openEditModal(order)}
                            title="Edit Work Order"
                            style={{ padding: "4px 6px" }}
                          >
                            <EditIcon size={13} />
                          </button>

                          <button
                            type="button"
                            className="wo-btn"
                            onClick={() => handleDelete(order)}
                            title="Delete"
                            style={{ padding: "4px 6px", color: "#dc2626" }}
                          >
                            <TrashIcon size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* CREATE / EDIT WORK ORDER MODAL */}
      {editModalOpen && editingOrder && (
        <div className="wo-modal-overlay">
          <div className="wo-modal-card">
            <div className="wo-modal-header">
              <h2 style={{ fontSize: "1.05rem", fontWeight: 800, margin: 0, color: "#0f172a" }}>
                {editingOrder.id ? `Edit Work Order #${editingOrder.work_order_no}` : "New Factory Work Order"}
              </h2>
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                style={{ background: "transparent", border: "none", cursor: "pointer", color: "#64748b" }}
              >
                <XIcon size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveOrder} style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
              <div className="wo-modal-body">
                {modalErr && (
                  <div style={{ background: "#fee2e2", color: "#b91c1c", padding: "8px 12px", borderRadius: 8, fontSize: "0.82rem", fontWeight: 700, marginBottom: 14 }}>
                    {modalErr}
                  </div>
                )}

                {/* Row 1: Order Date & Target Delivery */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
                  <div className="be-field-group">
                    <label>Order Date</label>
                    <input
                      type="date"
                      className="be-input"
                      value={editingOrder.order_date || ""}
                      onChange={(e) => setEditingOrder({ ...editingOrder, order_date: e.target.value })}
                    />
                  </div>

                  <div className="be-field-group">
                    <label>Target Delivery Date</label>
                    <input
                      type="date"
                      className="be-input"
                      value={editingOrder.target_delivery_date || ""}
                      onChange={(e) => setEditingOrder({ ...editingOrder, target_delivery_date: e.target.value })}
                    />
                  </div>

                  <div className="be-field-group">
                    <label>Priority</label>
                    <select
                      className="be-input"
                      value={editingOrder.priority || "Normal"}
                      onChange={(e) => setEditingOrder({ ...editingOrder, priority: e.target.value })}
                    >
                      <option value="Normal">Normal</option>
                      <option value="High">High</option>
                      <option value="Urgent">Urgent</option>
                    </select>
                  </div>
                </div>

                {/* Row 2: Customer Name, Mobile, Site Location */}
                <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1.2fr", gap: 12, marginBottom: 12 }}>
                  <div className="be-field-group">
                    <label>Customer Name *</label>
                    <input
                      type="text"
                      className="be-input"
                      value={editingOrder.customer_name || ""}
                      onChange={(e) => setEditingOrder({ ...editingOrder, customer_name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="be-field-group">
                    <label>Mobile Number</label>
                    <input
                      type="text"
                      className="be-input"
                      value={editingOrder.customer_mobile || ""}
                      onChange={(e) => setEditingOrder({ ...editingOrder, customer_mobile: e.target.value })}
                    />
                  </div>

                  <div className="be-field-group">
                    <label>Site / Delivery Location</label>
                    <input
                      type="text"
                      className="be-input"
                      placeholder="e.g. Factory, Project Site"
                      value={editingOrder.site_location || ""}
                      onChange={(e) => setEditingOrder({ ...editingOrder, site_location: e.target.value })}
                    />
                  </div>
                </div>

                {/* Items & Fabrication Specifications */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                    <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "#1e3a8a" }}>
                      Work Order Items &amp; Cutting / Bending Specifications
                    </label>
                    <button
                      type="button"
                      onClick={addItem}
                      style={{
                        background: "#eff6ff",
                        color: "#1d4ed8",
                        border: "1px solid #bfdbfe",
                        borderRadius: 6,
                        padding: "3px 8px",
                        fontSize: "0.76rem",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      + Add Item
                    </button>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {editingOrder.items.map((it, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1.4fr 80px 80px 1.8fr 30px",
                          gap: 6,
                          alignItems: "center",
                          background: "#f8fafc",
                          padding: "6px 10px",
                          borderRadius: 8,
                          border: "1px solid #e2e8f0",
                        }}
                      >
                        <input
                          type="text"
                          className="be-input"
                          style={{ padding: "4px 8px", fontSize: "0.82rem" }}
                          placeholder="Item name (e.g. Design Sheet)"
                          value={it.name}
                          onChange={(e) => updateItem(idx, "name", e.target.value)}
                        />
                        <input
                          type="number"
                          step="any"
                          className="be-input"
                          style={{ padding: "4px 8px", fontSize: "0.82rem" }}
                          placeholder="Qty"
                          value={it.quantity}
                          onChange={(e) => updateItem(idx, "quantity", e.target.value)}
                        />
                        <input
                          type="text"
                          className="be-input"
                          style={{ padding: "4px 8px", fontSize: "0.82rem" }}
                          placeholder="Unit (pcs)"
                          value={it.unit}
                          onChange={(e) => updateItem(idx, "unit", e.target.value)}
                        />
                        <input
                          type="text"
                          className="be-input"
                          style={{ padding: "4px 8px", fontSize: "0.82rem" }}
                          placeholder="Specs (e.g. 0.40mm Blue, 10ft cutting, double bend)"
                          value={it.specs}
                          onChange={(e) => updateItem(idx, "specs", e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "#dc2626",
                            cursor: "pointer",
                            fontWeight: 700,
                            padding: 2,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                          title="Remove item"
                        >
                          <XIcon size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Production Notes */}
                <div className="be-field-group" style={{ marginBottom: 12 }}>
                  <label>Production / Factory Special Instructions</label>
                  <textarea
                    rows={2}
                    className="be-input"
                    placeholder="Specific manufacturing guidelines for master/workers..."
                    value={editingOrder.production_notes || ""}
                    onChange={(e) => setEditingOrder({ ...editingOrder, production_notes: e.target.value })}
                  />
                </div>

                {/* Status & Financials */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
                  <div className="be-field-group">
                    <label>Status</label>
                    <select
                      className="be-input"
                      value={editingOrder.status || "Pending"}
                      onChange={(e) => setEditingOrder({ ...editingOrder, status: e.target.value })}
                    >
                      <option value="Pending">Pending</option>
                      <option value="In Production">In Production</option>
                      <option value="Ready">Ready</option>
                      <option value="Delivered">Delivered</option>
                    </select>
                  </div>

                  <div className="be-field-group">
                    <label>Total Bill (BDT)</label>
                    <input
                      type="number"
                      step="any"
                      className="be-input"
                      value={editingOrder.total_amount || ""}
                      onChange={(e) => setEditingOrder({ ...editingOrder, total_amount: e.target.value })}
                    />
                  </div>

                  <div className="be-field-group">
                    <label>Advance Received</label>
                    <input
                      type="number"
                      step="any"
                      className="be-input"
                      value={editingOrder.advance_paid || ""}
                      onChange={(e) => setEditingOrder({ ...editingOrder, advance_paid: e.target.value })}
                    />
                  </div>

                  <div className="be-field-group">
                    <label>Due Amount</label>
                    <input
                      type="number"
                      step="any"
                      className="be-input"
                      value={editingOrder.due_amount || ""}
                      onChange={(e) => setEditingOrder({ ...editingOrder, due_amount: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="wo-modal-footer">
                <button
                  type="button"
                  className="wo-btn"
                  onClick={() => setEditModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="wo-btn primary"
                  disabled={modalBusy}
                >
                  <CheckIcon size={14} />
                  <span>{modalBusy ? "Saving..." : "Save Work Order"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINT SLIP MODAL (FACTORY / OFFICE) */}
      {printModalOpen && printOrder && (
        <div className="wo-modal-overlay">
          <div className="wo-modal-card" style={{ maxWidth: 780 }}>
            <div className="wo-modal-header no-print">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <h2 style={{ fontSize: "1.05rem", fontWeight: 800, margin: 0 }}>
                  {printMode === "factory" ? "Factory Production Slip" : "Office & Commercial Slip"}
                </h2>
                <div style={{ display: "inline-flex", background: "#e2e8f0", padding: 2, borderRadius: 6 }}>
                  <button
                    type="button"
                    onClick={() => setPrintMode("factory")}
                    style={{
                      padding: "3px 8px",
                      border: "none",
                      background: printMode === "factory" ? "#ffffff" : "transparent",
                      fontWeight: 700,
                      fontSize: "0.75rem",
                      borderRadius: 4,
                      cursor: "pointer",
                    }}
                  >
                    Factory Slip
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrintMode("office")}
                    style={{
                      padding: "3px 8px",
                      border: "none",
                      background: printMode === "office" ? "#ffffff" : "transparent",
                      fontWeight: 700,
                      fontSize: "0.75rem",
                      borderRadius: 4,
                      cursor: "pointer",
                    }}
                  >
                    Office Slip
                  </button>
                </div>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  className="wo-btn primary"
                  onClick={() => window.print()}
                >
                  Print Slip
                </button>
                <button
                  type="button"
                  onClick={() => setPrintModalOpen(false)}
                  style={{ background: "transparent", border: "none", cursor: "pointer" }}
                >
                  <XIcon size={18} />
                </button>
              </div>
            </div>

            {/* PRINT AREA (A4 / SLIP) */}
            <div className="wo-modal-body wo-print-area" style={{ background: "#ffffff", padding: 24 }}>
              {/* Slip Header */}
              <div style={{ borderBottom: "2px solid #0f172a", paddingBottom: 12, marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <h1 style={{ margin: 0, fontSize: "1.45rem", fontWeight: 900, color: "#0f172a", textTransform: "uppercase", letterSpacing: 0.5 }}>
                    WORK ORDER SLIP
                  </h1>
                  <div style={{ fontSize: "0.85rem", fontWeight: 700, color: printMode === "factory" ? "#b45309" : "#1e40af", marginTop: 2 }}>
                    {printMode === "factory" ? "FACTORY PRODUCTION & FABRICATION COPY" : "OFFICIAL COMMERCIAL & BILLING COPY"}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "1.1rem", fontWeight: 900, color: "#991b1b" }}>
                    {printOrder.work_order_no}
                  </div>
                  {printOrder.bill_no && (
                    <div style={{ fontSize: "0.8rem", color: "#475569", fontWeight: 600 }}>
                      Bill Ref: #{printOrder.bill_no}
                    </div>
                  )}
                  <div style={{ fontSize: "0.8rem", color: "#475569" }}>
                    Date: <b>{printOrder.order_date}</b>
                  </div>
                </div>
              </div>

              {/* Order Meta Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 14, marginBottom: 16, background: "#f8fafc", padding: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}>
                <div>
                  <div style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "#64748b", fontWeight: 700 }}>
                    Customer Details
                  </div>
                  <div style={{ fontSize: "1rem", fontWeight: 800, color: "#0f172a", marginTop: 2 }}>
                    {printOrder.customer_name}
                  </div>
                  {printOrder.customer_mobile && (
                    <div style={{ fontSize: "0.84rem", color: "#334155", fontWeight: 600 }}>
                      Mobile: {printOrder.customer_mobile}
                    </div>
                  )}
                  {printOrder.customer_address && (
                    <div style={{ fontSize: "0.8rem", color: "#64748b" }}>
                      Address: {printOrder.customer_address}
                    </div>
                  )}
                </div>

                <div>
                  <div style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "#64748b", fontWeight: 700 }}>
                    Delivery &amp; Schedule
                  </div>
                  <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "#0f172a", marginTop: 2 }}>
                    Target Delivery: <span style={{ color: "#b45309" }}>{printOrder.target_delivery_date || "Not Specified"}</span>
                  </div>
                  {printOrder.site_location && (
                    <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#1e40af", marginTop: 2 }}>
                      Site / Location: {printOrder.site_location}
                    </div>
                  )}
                  <div style={{ fontSize: "0.82rem", color: "#334155", marginTop: 2 }}>
                    Priority: <b>{printOrder.priority || "Normal"}</b> • Status: <b>{printOrder.status || "Pending"}</b>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 16, fontSize: "0.86rem" }}>
                <thead>
                  <tr style={{ background: "#0f172a", color: "#ffffff" }}>
                    <th style={{ padding: "8px 10px", width: 40, textAlign: "center", border: "1px solid #0f172a" }}>#</th>
                    <th style={{ padding: "8px 10px", textAlign: "left", border: "1px solid #0f172a" }}>Item Description</th>
                    <th style={{ padding: "8px 10px", width: 90, textAlign: "center", border: "1px solid #0f172a" }}>Quantity</th>
                    <th style={{ padding: "8px 10px", textAlign: "left", border: "1px solid #0f172a" }}>
                      Cutting / Bending / Fabrication Specs
                    </th>
                    {printMode === "office" && (
                      <th style={{ padding: "8px 10px", width: 110, textAlign: "right", border: "1px solid #0f172a" }}>Subtotal</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {(Array.isArray(printOrder.items) ? printOrder.items : []).map((it, idx) => (
                    <tr key={idx} style={{ borderBottom: "1px solid #cbd5e1" }}>
                      <td style={{ padding: "8px 10px", textAlign: "center", border: "1px solid #cbd5e1", fontWeight: 700 }}>
                        {idx + 1}
                      </td>
                      <td style={{ padding: "8px 10px", border: "1px solid #cbd5e1", fontWeight: 800 }}>
                        {it.name || "Item"}
                      </td>
                      <td style={{ padding: "8px 10px", textAlign: "center", border: "1px solid #cbd5e1", fontWeight: 800, fontSize: "0.95rem" }}>
                        {it.quantity || 1} {it.unit || "pcs"}
                      </td>
                      <td style={{ padding: "8px 10px", border: "1px solid #cbd5e1" }}>
                        {it.specs ? (
                          <span style={{ fontWeight: 700, color: "#0f172a" }}>{it.specs}</span>
                        ) : (
                          <span style={{ color: "#94a3b8" }}>-</span>
                        )}
                        {it.note && (
                          <div style={{ fontSize: "0.78rem", color: "#64748b" }}>Note: {it.note}</div>
                        )}
                      </td>
                      {printMode === "office" && (
                        <td style={{ padding: "8px 10px", textAlign: "right", border: "1px solid #cbd5e1", fontWeight: 700 }}>
                          Tk. {fmt(it.subtotal || (Number(it.quantity || 1) * Number(it.rate || 0)))}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Production Notes / Instructions */}
              {printOrder.production_notes && (
                <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 6, padding: "10px 14px", marginBottom: 16 }}>
                  <div style={{ fontSize: "0.76rem", fontWeight: 800, color: "#334155", textTransform: "uppercase" }}>
                    Special Production Instructions:
                  </div>
                  <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "#0f172a", marginTop: 3 }}>
                    {printOrder.production_notes}
                  </div>
                </div>
              )}

              {/* Office Financial Summary (Only in Office Mode) */}
              {printMode === "office" && (
                <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
                  <div style={{ width: 260, background: "#f8fafc", padding: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: "0.82rem", color: "#475569" }}>Total Bill:</span>
                      <span style={{ fontWeight: 800, fontSize: "0.9rem" }}>Tk. {fmt(printOrder.total_amount)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: "0.82rem", color: "#059669" }}>Advance Paid:</span>
                      <span style={{ fontWeight: 800, color: "#059669" }}>Tk. {fmt(printOrder.advance_paid)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #cbd5e1", paddingTop: 4 }}>
                      <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "#dc2626" }}>Net Due:</span>
                      <span style={{ fontWeight: 900, color: "#dc2626", fontSize: "0.95rem" }}>Tk. {fmt(printOrder.due_amount)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Signatures Footer */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20, marginTop: 40, paddingTop: 10 }}>
                <div style={{ borderTop: "1px dashed #64748b", textAlign: "center", paddingTop: 6, fontSize: "0.78rem", fontWeight: 700, color: "#334155" }}>
                  Prepared By
                </div>
                <div style={{ borderTop: "1px dashed #64748b", textAlign: "center", paddingTop: 6, fontSize: "0.78rem", fontWeight: 700, color: "#334155" }}>
                  Workshop / Production Manager
                </div>
                <div style={{ borderTop: "1px dashed #64748b", textAlign: "center", paddingTop: 6, fontSize: "0.78rem", fontWeight: 700, color: "#334155" }}>
                  Delivered / Received By
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
