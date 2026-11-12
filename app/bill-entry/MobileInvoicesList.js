"use client";
import { useState } from "react";

export default function MobileInvoicesList({
  filteredBills,
  mobileVisibleCount,
  setMobileVisibleCount,
  mobileSentinelRef,
  expandedBillId,
  setExpandedBillId,
  setSelectedBillForModal,
  filteredTableTotals,
  isFilterActive,
  fmt,
}) {
  const [summaryCollapsed, setSummaryCollapsed] = useState(false);

  return (
    <div className="be-mobile-invoices-list">
      {filteredBills.length === 0 ? (
        <div className="be-mobile-inv-empty">
          No recorded bills found. Fill the form above and click &quot;Save &amp; Record Bill&quot;.
        </div>
      ) : (
        <>
          {filteredBills.slice(0, mobileVisibleCount).map((b, idx) => {
            const totalBill = Number(b.total_bill || 0);
            const payment = Number(b.client_payment || 0);
            const dueThisBill = Number(b.dueThisBill || 0);
            const advanceThisBill = Number(b.advanceThisBill || 0);
            const dueReceived = Number(b.dueReceived || 0);
            const invoicePayment = Math.max(0, payment - dueReceived - advanceThisBill);
            const rBal = b.runningBalance !== undefined ? Number(b.runningBalance) : Number(b.due_advance || 0);
            const isExpanded = expandedBillId === b.id;
            const items = Array.isArray(b.items) ? b.items : [];

            return (
              <div
                key={`m-${b.id}`}
                className="be-mobile-inv-card"
                onClick={() => setSelectedBillForModal(b)}
              >
                <div className="be-mobile-inv-top">
                  <div className="be-mobile-inv-id">
                    <span className="be-mobile-inv-sl">#{idx + 1}</span>
                    <span className="be-mobile-inv-billno">Bill #{b.bill_no || "—"}</span>
                    {b.is_opening_balance && (
                      <span className="be-mobile-inv-opening">Opening</span>
                    )}
                  </div>
                  <span className="be-mobile-inv-date">{b.bill_date || "—"}</span>
                </div>

                <div className="be-mobile-inv-customer">
                  <div className="be-mobile-inv-cname">{b.customer_name || "—"}</div>
                  <div className="be-mobile-inv-cmeta">
                    {b.customer_id && <span className="be-mobile-inv-cid">{b.customer_id}</span>}
                    {b.customer_mobile && <span>{b.customer_mobile}</span>}
                  </div>
                </div>

                <div className="be-mobile-inv-metrics">
                  <div>
                    <small>Total</small>
                    <strong>৳ {fmt(totalBill)}</strong>
                  </div>
                  <div>
                    <small>Paid</small>
                    <strong style={{ color: invoicePayment >= 0.005 ? "#059669" : "#64748b" }}>
                      {invoicePayment >= 0.005 ? `৳ ${fmt(invoicePayment)}` : "—"}
                    </strong>
                  </div>
                  <div>
                    <small>{dueReceived >= 0.005 ? "Due Rcvd" : dueThisBill >= 0.005 ? "Due" : "Adv"}</small>
                    <strong
                      style={{
                        color:
                          dueReceived >= 0.005
                            ? "#2563eb"
                            : dueThisBill >= 0.005
                              ? "#dc2626"
                              : advanceThisBill >= 0.005
                                ? "#059669"
                                : "#64748b",
                      }}
                    >
                      {dueReceived >= 0.005
                        ? `৳ ${fmt(dueReceived)}`
                        : dueThisBill >= 0.005
                          ? `৳ ${fmt(dueThisBill)}`
                          : advanceThisBill >= 0.005
                            ? `৳ ${fmt(advanceThisBill)}`
                            : "—"}
                    </strong>
                  </div>
                  <div>
                    <small>Balance</small>
                    <strong
                      style={{
                        color: rBal > 0.005 ? "#dc2626" : rBal < -0.005 ? "#059669" : "#475569",
                      }}
                    >
                      {rBal > 0.005
                        ? `Due ৳ ${fmt(rBal)}`
                        : rBal < -0.005
                          ? `Adv ৳ ${fmt(Math.abs(rBal))}`
                          : "Settled"}
                    </strong>
                  </div>
                </div>

                <div className="be-mobile-inv-footer">
                  <button
                    type="button"
                    className="be-mobile-inv-expand-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedBillId((prev) => (prev === b.id ? null : b.id));
                    }}
                  >
                    {isExpanded ? "Hide Items ▲" : `Items (${items.length}) ▼`}
                  </button>
                  <span className="be-mobile-inv-tap">Tap for Details / Edit →</span>
                </div>

                {isExpanded && (
                  <div
                    className="be-mobile-inv-expanded"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {items.length > 0 ? (
                      <div className="be-mobile-inv-items">
                        {items.map((it, iIdx) => (
                          <div key={iIdx} className="be-mobile-inv-item-row">
                            <div>
                              <strong>{it.item_name || it.description || "Item"}</strong>
                              <small>
                                {it.qty || it.quantity || 0} {it.unit || ""} × ৳ {fmt(it.rate || 0)}
                              </small>
                            </div>
                            <span>৳ {fmt(it.subtotal || 0)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: "0.76rem", color: "#64748b" }}>
                        Direct Payment / Settlement Entry
                      </div>
                    )}
                    {b.note && (
                      <div className="be-mobile-inv-note">Note: &quot;{b.note}&quot;</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {filteredBills.length > mobileVisibleCount && (
            <div className="be-mobile-load-more-row" ref={mobileSentinelRef}>
              <button
                type="button"
                className="be-mobile-load-more-btn"
                onClick={() => setMobileVisibleCount((c) => c + 24)}
              >
                Show 24 More ({filteredBills.length - mobileVisibleCount} left)
              </button>
              <button
                type="button"
                className="be-mobile-load-all-btn"
                onClick={() => setMobileVisibleCount(filteredBills.length)}
              >
                Show All
              </button>
            </div>
          )}

          {/* Compact Collapsible Sticky Bottom Overall / Filtered Total Bar */}
          <div className={`be-mobile-inv-summary be-mobile-inv-summary-sticky ${summaryCollapsed ? "collapsed" : ""}`}>
            <div className="be-mobile-inv-summary-top">
              <span>{isFilterActive ? "Filtered Total" : "Overall Total"}</span>
              <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                <span className="be-mobile-inv-count">
                  {Math.min(mobileVisibleCount, filteredBills.length)}/{filteredTableTotals.count}
                </span>
                <button
                  type="button"
                  className="be-mobile-summary-toggle-btn"
                  aria-label={summaryCollapsed ? "Expand Totals" : "Collapse Totals"}
                  onClick={() => setSummaryCollapsed((v) => !v)}
                >
                  {summaryCollapsed ? "Totals ▲" : "Hide ▼"}
                </button>
              </div>
            </div>

            {!summaryCollapsed && (
              <div className="be-mobile-inv-summary-grid">
                <div>
                  <small>Total Bill</small>
                  <strong>৳ {fmt(filteredTableTotals.totalBill)}</strong>
                </div>
                <div>
                  <small>Cash in Hand</small>
                  <strong style={{ color: "#059669" }}>
                    ৳ {fmt(filteredTableTotals.totalClientPayment)}
                  </strong>
                </div>
                <div>
                  <small>Overall Due</small>
                  <strong style={{ color: "#dc2626" }}>
                    ৳ {fmt(filteredTableTotals.totalDueBalance)}
                  </strong>
                </div>
                <div>
                  <small>Overall Adv</small>
                  <strong style={{ color: "#059669" }}>
                    ৳ {fmt(filteredTableTotals.totalAdvBalance)}
                  </strong>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

