"use client";

/**
 * Reusable English / Bangla export language selection modal with progress indicator.
 * Used by Purchase, Work Orders, and All Entries reports for Excel & PDF exports.
 */
export default function ExportLangModal({
  isOpen,
  title = "Select Download Language",
  subtitle = "",
  format = "pdf",
  busy = false,
  progress = 0,
  onClose,
  onSelect,
}) {
  if (!isOpen) return null;
  const isPdf = format === "pdf";

  return (
    <div
      onClick={() => {
        if (!busy && onClose) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(15, 23, 42, 0.52)",
        backdropFilter: "blur(3px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#ffffff",
          borderRadius: 16,
          width: "100%",
          maxWidth: 420,
          padding: "22px 24px",
          boxShadow: "0 20px 50px rgba(15, 23, 42, 0.25)",
          border: "1px solid #e2e8f0",
        }}
      >
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
                background: isPdf ? "#fee2e2" : "#dcfce7",
                color: isPdf ? "#b91c1c" : "#15803d",
                width: 38,
                height: 38,
                borderRadius: 10,
                display: "grid",
                placeItems: "center",
                fontWeight: 800,
                fontSize: "0.75rem",
              }}
            >
              {isPdf ? "PDF" : "XLSX"}
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.02rem", fontWeight: 800, color: "#0f172a" }}>
                {title}
              </h3>
              {subtitle ? (
                <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "#64748b" }}>{subtitle}</p>
              ) : null}
            </div>
          </div>

          {!busy && onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "#94a3b8",
                fontSize: "1.1rem",
                lineHeight: 1,
                padding: 4,
              }}
            >
              ✕
            </button>
          )}
        </div>

        {busy ? (
          <div style={{ padding: "16px 0", textAlign: "center" }}>
            <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#1e3a8a", marginBottom: 6 }}>
              Preparing {isPdf ? "PDF" : "Excel"} file... ({progress}%)
            </div>
            <p style={{ fontSize: "0.8rem", color: "#64748b", margin: "0 0 12px" }}>
              Translating &amp; formatting report. Please wait...
            </p>
            <div
              style={{
                width: "100%",
                height: 8,
                background: "#e2e8f0",
                borderRadius: 999,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${Math.max(8, Math.min(100, progress))}%`,
                  height: "100%",
                  background: "linear-gradient(90deg, #2563eb, #1d4ed8)",
                  transition: "width 0.2s ease",
                }}
              />
            </div>
          </div>
        ) : (
          <>
            <p style={{ fontSize: "0.85rem", color: "#475569", margin: "10px 0 16px" }}>
              Choose your preferred language format for this {isPdf ? "PDF (.pdf) document" : "Excel (.xlsx) workbook"} export:
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <button
                type="button"
                onClick={() => onSelect && onSelect("bn")}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  padding: "14px 12px",
                  borderRadius: 12,
                  border: "1.5px solid #93c5fd",
                  background: "#eff6ff",
                  cursor: "pointer",
                  gap: 4,
                }}
              >
                <span style={{ fontSize: "1.3rem", marginBottom: 2 }}>🇧🇩</span>
                <strong style={{ fontSize: "0.95rem", color: "#1e3a8a" }}>Bangla</strong>
                <span
                  style={{
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: 999,
                    background: "#dbeafe",
                    color: "#1e40af",
                  }}
                >
                  Smart Translation
                </span>
              </button>

              <button
                type="button"
                onClick={() => onSelect && onSelect("en")}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  padding: "14px 12px",
                  borderRadius: 12,
                  border: "1.5px solid #cbd5e1",
                  background: "#f8fafc",
                  cursor: "pointer",
                  gap: 4,
                }}
              >
                <span style={{ fontSize: "1.3rem", marginBottom: 2 }}>🇬🇧</span>
                <strong style={{ fontSize: "0.95rem", color: "#0f172a" }}>English</strong>
                <span
                  style={{
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: 999,
                    background: "#f1f5f9",
                    color: "#475569",
                  }}
                >
                  Original Data
                </span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

