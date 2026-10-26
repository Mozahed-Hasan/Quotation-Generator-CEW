"use client";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CrownIcon, StarIcon, CheckIcon, XIcon, TrashIcon } from "@/lib/icons";
import { PERMISSION_PAGES, ACTION_LABELS } from "@/lib/auth";

export default function AdminPanelPage() {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [ownerUsername, setOwnerUsername] = useState("admin");
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [search, setSearch] = useState("");

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPassModal, setShowPassModal] = useState(false);

  // Form states
  const emptyForm = () => ({
    username: "",
    password: "",
    role: "moderator",
    permissions: {
      all_entries: ["view"],
      quotation: ["view"],
      calculator: ["view", "add"],
      bill_entry: ["view", "add"],
      expenses: ["view", "add"],
    },
  });

  const [addForm, setAddForm] = useState(emptyForm());
  const [editTarget, setEditTarget] = useState(null);
  const [newPassword, setNewPassword] = useState("");

  async function loadData() {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/users", { cache: "no-store" });
      if (res.status === 401 || res.status === 403) {
        router.replace("/?denied=1");
        return;
      }
      const data = await res.json();
      if (res.ok) {
        setUsers(data.users || []);
        setOwnerUsername(data.owner || "admin");
        setCurrentUser(data.me || null);
      } else {
        setErrMsg(data.error || "Failed to load user list");
      }
    } catch (e) {
      setErrMsg(e.message || "Network error loading users");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/");
  }

  // Permission toggler helper
  function togglePermission(formState, setFormState, pageKey, action) {
    setFormState((prev) => {
      const curPerms = { ...(prev.permissions || {}) };
      const curList = curPerms[pageKey] ? [...curPerms[pageKey]] : [];
      let updated;
      if (curList.includes(action)) {
        // If removing 'view', remove all actions for that page
        if (action === "view") {
          updated = [];
        } else {
          updated = curList.filter((a) => a !== action);
        }
      } else {
        // Adding an action automatically ensures 'view' is included
        updated = Array.from(new Set([...curList, action, "view"]));
      }
      return {
        ...prev,
        permissions: { ...curPerms, [pageKey]: updated },
      };
    });
  }

  function grantFullPermissions(setFormState) {
    const full = {};
    PERMISSION_PAGES.forEach((p) => {
      full[p.key] = [...p.actions];
    });
    setFormState((prev) => ({ ...prev, permissions: full }));
  }

  function clearAllPermissions(setFormState) {
    const empty = {};
    PERMISSION_PAGES.forEach((p) => {
      empty[p.key] = [];
    });
    setFormState((prev) => ({ ...prev, permissions: empty }));
  }

  // Create User
  async function handleCreateUser(e) {
    e.preventDefault();
    setErrMsg("");
    setSuccessMsg("");
    setBusy(true);

    try {
      const payload = {
        username: addForm.username.trim(),
        password: addForm.password,
        role: addForm.role,
        permissions: addForm.role === "admin" ? {} : addForm.permissions,
      };

      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrMsg(data.error || "Failed to create user");
      } else {
        setSuccessMsg(`User "${payload.username}" created successfully as ${payload.role}!`);
        setShowAddModal(false);
        setAddForm(emptyForm());
        await loadData();
      }
    } catch (err) {
      setErrMsg(err.message || "Failed to create user");
    } finally {
      setBusy(false);
    }
  }

  // Update User Permissions / Role
  async function handleSaveEdit(e) {
    e.preventDefault();
    if (!editTarget) return;
    setErrMsg("");
    setSuccessMsg("");
    setBusy(true);

    try {
      const payload = {
        id: editTarget.id,
        role: editTarget.role,
        permissions: editTarget.role === "admin" ? {} : editTarget.permissions,
      };

      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrMsg(data.error || "Failed to update permissions");
      } else {
        setSuccessMsg(`Permissions updated for "${editTarget.username}".`);
        setShowEditModal(false);
        setEditTarget(null);
        await loadData();
      }
    } catch (err) {
      setErrMsg(err.message || "Failed to update user");
    } finally {
      setBusy(false);
    }
  }

  // Change Password
  async function handleChangePassword(e) {
    e.preventDefault();
    if (!editTarget) return;
    setErrMsg("");
    setSuccessMsg("");
    setBusy(true);

    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editTarget.id, password: newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrMsg(data.error || "Failed to change password");
      } else {
        setSuccessMsg(`Password changed for "${editTarget.username}".`);
        setShowPassModal(false);
        setNewPassword("");
        setEditTarget(null);
      }
    } catch (err) {
      setErrMsg(err.message || "Failed to change password");
    } finally {
      setBusy(false);
    }
  }

  // Toggle Active
  async function handleToggleActive(u) {
    const nextState = !u.is_active;
    const actionLabel = nextState ? "activate" : "disable";
    if (!confirm(`Are you sure you want to ${actionLabel} user "${u.username}"?`)) return;

    try {
      setBusy(true);
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: u.id, is_active: nextState }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to update status");
      } else {
        setSuccessMsg(`User "${u.username}" is now ${nextState ? "active" : "disabled"}.`);
        await loadData();
      }
    } catch (err) {
      alert(err.message || "Failed to update user status");
    } finally {
      setBusy(false);
    }
  }

  // Delete User
  async function handleDeleteUser(u) {
    if (
      !confirm(
        `Are you sure you want to PERMANENTLY delete user "${u.username}"?\n\nThis will remove their account immediately.`
      )
    ) {
      return;
    }

    try {
      setBusy(true);
      const res = await fetch(`/api/admin/users?id=${u.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to delete user");
      } else {
        setSuccessMsg(`User "${u.username}" has been deleted.`);
        await loadData();
      }
    } catch (err) {
      alert(err.message || "Failed to delete user");
    } finally {
      setBusy(false);
    }
  }

  // KPI Calculations
  const stats = useMemo(() => {
    const totalDb = users.length;
    const admins = users.filter((u) => u.role === "admin").length + 1; // +1 for owner
    const moderators = users.filter((u) => u.role === "moderator").length;
    const active = users.filter((u) => u.is_active).length + 1;
    return { total: totalDb + 1, admins, moderators, active };
  }, [users]);

  // Filtered users list
  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.trim().toLowerCase();
    return users.filter(
      (u) =>
        u.username.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q) ||
        (u.created_by && u.created_by.toLowerCase().includes(q))
    );
  }, [users, search]);

  return (
    <main className="be-wrapper">
      {/* Top Header Navbar */}
      <header className="be-header">
        <div className="be-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/cew-icon.png" alt="CEW" className="be-logo" />
          <div className="be-title-box">
            <h1>Admin Control Panel</h1>
            <p>Chowdhury Engineering Works • User Access &amp; Permissions Manager</p>
          </div>
        </div>

        <nav className="be-nav-actions">
          <Link href="/" className="be-nav-btn" title="Back to Home Dashboard">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12l9-9 9 9M5 10v10a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V10" />
            </svg>
            Home Dashboard
          </Link>

          <button type="button" onClick={handleLogout} className="be-nav-btn logout" title="Sign out">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Log Out
          </button>
        </nav>
      </header>

      {/* KPI Stats */}
      <section className="be-stats-grid">
        <div className="be-stat-card">
          <span className="label">Total Accounts</span>
          <span className="val">{stats.total}</span>
        </div>
        <div className="be-stat-card due">
          <span className="label">System Admins</span>
          <span className="val">{stats.admins}</span>
        </div>
        <div className="be-stat-card">
          <span className="label">Moderators</span>
          <span className="val">{stats.moderators}</span>
        </div>
        <div className="be-stat-card paid">
          <span className="label">Active Accounts</span>
          <span className="val">{stats.active}</span>
        </div>
      </section>

      {/* Alerts */}
      {errMsg && (
        <div style={{ background: "#fee2e2", color: "#b91c1c", padding: "12px 16px", borderRadius: "10px", marginBottom: "16px", fontSize: "0.88rem", fontWeight: 600 }}>
          {errMsg}
        </div>
      )}
      {successMsg && (
        <div style={{ background: "#ecfdf5", color: "#065f46", padding: "12px 16px", borderRadius: "10px", marginBottom: "16px", fontSize: "0.88rem", fontWeight: 600 }}>
          {successMsg}
        </div>
      )}

      {/* Main Users Table Section */}
      <section className="be-card">
        <div className="be-card-header">
          <div>
            <h2 className="be-card-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--be-primary)" }}>
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              Registered Users &amp; Roles
            </h2>
            <span style={{ fontSize: "0.82rem", color: "var(--be-text-muted)" }}>
              Manage access levels, granted permissions, and credentials
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <input
              type="text"
              className="be-input"
              placeholder="Search user..."
              style={{ width: 190 }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <button
              type="button"
              onClick={() => {
                setAddForm(emptyForm());
                setShowAddModal(true);
              }}
              className="be-btn be-btn-primary"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                borderRadius: 8,
                fontWeight: 700,
                fontSize: "0.84rem",
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add New User
            </button>
          </div>
        </div>

        {/* Users Table */}
        <div className="be-ledger-table-wrap">
          <table className="be-ledger-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Status</th>
                <th>Granted Permissions</th>
                <th>Created</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {/* Row 1: Root Owner Admin */}
              <tr style={{ background: "#fdfefe" }}>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#fee2e2", color: "#991b1b", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800 }}>
                      <CrownIcon size={18} />
                    </div>
                    <div>
                      <strong style={{ fontSize: "0.92rem", color: "#1e293b" }}>{ownerUsername}</strong>
                      <div style={{ fontSize: "0.72rem", color: "var(--be-text-muted)" }}>System Root Owner</div>
                    </div>
                  </div>
                </td>
                <td>
                  <span className="admin-badge owner">Owner Admin</span>
                </td>
                <td>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.8rem", fontWeight: 700, color: "#065f46" }}>
                    <span className="admin-status-dot active"></span> Active
                  </span>
                </td>
                <td>
                  <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--be-primary)", display: "inline-flex", alignItems: "center", gap: 5 }}>
                    <StarIcon size={13} /> Full System Access (All Pages + Admin Panel)
                  </span>
                </td>
                <td style={{ fontSize: "0.8rem", color: "var(--be-text-muted)" }}>
                  Configured in .env
                </td>
                <td style={{ textAlign: "right" }}>
                  <span style={{ fontSize: "0.76rem", color: "var(--be-text-muted)", fontStyle: "italic" }}>
                    Root Account
                  </span>
                </td>
              </tr>

              {/* Dynamic Users from Database */}
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "28px", color: "var(--be-text-muted)" }}>
                    Loading users...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "28px", color: "var(--be-text-muted)" }}>
                    {users.length === 0 ? "No additional admins or moderators added yet. Click 'Add New User' to add one." : "No users match your search."}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isSelf = currentUser && currentUser.id === u.id;
                  const perms = u.permissions || {};

                  return (
                    <tr key={u.id} style={{ opacity: u.is_active ? 1 : 0.65 }}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ width: 34, height: 34, borderRadius: "50%", background: u.role === "admin" ? "#fee2e2" : "#eff6ff", color: u.role === "admin" ? "#991b1b" : "#1d4ed8", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "0.85rem" }}>
                            {u.username.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <strong style={{ fontSize: "0.92rem", color: "#1e293b" }}>{u.username}</strong>
                            {isSelf && <span style={{ marginLeft: 6, fontSize: "0.7rem", color: "#2563eb", fontWeight: 700 }}>(You)</span>}
                            <div style={{ fontSize: "0.72rem", color: "var(--be-text-muted)" }}>
                              by {u.created_by || "admin"}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span className={`admin-badge ${u.role}`}>
                          {u.role === "admin" ? "Admin" : "Moderator"}
                        </span>
                      </td>

                      <td>
                        <button
                          type="button"
                          onClick={() => handleToggleActive(u)}
                          disabled={isSelf || busy}
                          style={{
                            background: "transparent",
                            border: "none",
                            cursor: isSelf ? "default" : "pointer",
                            padding: 0,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            fontSize: "0.8rem",
                            fontWeight: 700,
                            color: u.is_active ? "#065f46" : "#64748b",
                          }}
                          title={isSelf ? "You cannot disable yourself" : "Click to toggle active status"}
                        >
                          <span className={`admin-status-dot ${u.is_active ? "active" : "inactive"}`}></span>
                          {u.is_active ? "Active" : "Disabled"}
                        </button>
                      </td>

                      <td>
                        {u.role === "admin" ? (
                          <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--be-primary)", display: "inline-flex", alignItems: "center", gap: 5 }}>
                            <StarIcon size={12} /> Full System Access (All Pages)
                          </span>
                        ) : Object.keys(perms).length === 0 ? (
                          <span style={{ fontSize: "0.78rem", color: "#dc2626", fontWeight: 600 }}>
                            No permissions granted
                          </span>
                        ) : (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 3, maxWidth: 360 }}>
                            {PERMISSION_PAGES.map((p) => {
                              const acts = perms[p.key] || [];
                              if (acts.length === 0) return null;
                              return (
                                <span key={p.key} className="perm-pill">
                                  <strong>{p.label.split(" ")[0]}:</strong>{" "}
                                  {acts.map((a) => (a === "add" ? "add" : a)).join(", ")}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </td>

                      <td style={{ fontSize: "0.78rem", color: "var(--be-text-muted)", whiteSpace: "nowrap" }}>
                        {u.created_at ? new Date(u.created_at).toLocaleDateString() : "-"}
                      </td>

                      <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                        <div style={{ display: "inline-flex", gap: 6 }}>
                          <button
                            type="button"
                            onClick={() => {
                              let perms = u.permissions || {};
                              if (typeof perms === "string") {
                                try { perms = JSON.parse(perms); } catch (e) { perms = {}; }
                              }
                              setEditTarget({ ...u, permissions: perms });
                              setShowEditModal(true);
                            }}
                            className="be-nav-btn"
                            style={{ padding: "4px 8px", fontSize: "0.76rem" }}
                            title="Edit Permissions & Role"
                          >
                            Permissions
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setEditTarget(u);
                              setNewPassword("");
                              setShowPassModal(true);
                            }}
                            className="be-nav-btn"
                            style={{ padding: "4px 8px", fontSize: "0.76rem" }}
                            title="Change Password"
                          >
                            Password
                          </button>

                          {!isSelf && (
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(u)}
                              disabled={busy}
                              className="be-del-row-btn"
                              style={{ padding: "5px 7px", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                              title="Delete User"
                            >
                              <TrashIcon size={13} />
                            </button>
                          )}
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

      {/* =========================================================================
          MODAL: ADD NEW USER
          ========================================================================= */}
      {showAddModal && (
        <div className="admin-modal-overlay" onClick={() => !busy && setShowAddModal(false)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3 className="admin-modal-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--be-primary)" }}>
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Add New User (Admin / Moderator)
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="be-del-row-btn"
                style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                title="Close"
              >
                <XIcon size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateUser}>
              <div className="admin-modal-body">
                {/* Account Credentials */}
                <div className="be-grid-2" style={{ marginBottom: 16 }}>
                  <div className="be-field-group">
                    <label>
                      Username <span className="req">*</span>
                    </label>
                    <input
                      type="text"
                      className="be-input"
                      placeholder="e.g. jamil, accountant"
                      value={addForm.username}
                      onChange={(e) => setAddForm({ ...addForm, username: e.target.value })}
                      required
                      autoFocus
                    />
                    <span style={{ fontSize: "0.72rem", color: "var(--be-text-muted)" }}>Letters, numbers, . _ - only</span>
                  </div>

                  <div className="be-field-group">
                    <label>
                      Password <span className="req">*</span>
                    </label>
                    <input
                      type="password"
                      className="be-input"
                      placeholder="Min 6 characters"
                      value={addForm.password}
                      onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                      required
                    />
                    <span style={{ fontSize: "0.72rem", color: "var(--be-text-muted)" }}>At least 6 characters</span>
                  </div>
                </div>

                {/* Role Toggle */}
                <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "#334155", display: "block", marginBottom: 6 }}>
                  Account Role &amp; Access Level
                </label>
                <div className="admin-role-toggle">
                  <div
                    className={`admin-role-card ${addForm.role === "moderator" ? "selected" : ""}`}
                    onClick={() => setAddForm({ ...addForm, role: "moderator" })}
                  >
                    <h4>
                      Moderator
                      {addForm.role === "moderator" && <span><CheckIcon size={12} /></span>}
                    </h4>
                    <p>Custom permissions. Select exactly which pages and actions this user can perform.</p>
                  </div>

                  <div
                    className={`admin-role-card ${addForm.role === "admin" ? "selected" : ""}`}
                    onClick={() => setAddForm({ ...addForm, role: "admin" })}
                  >
                    <h4>
                      Administrator
                      {addForm.role === "admin" && <span><CheckIcon size={12} /></span>}
                    </h4>
                    <p>Full unrestricted access. Can view/add/delete on all pages and access the Admin Panel.</p>
                  </div>
                </div>

                {/* Permissions matrix for Moderator */}
                {addForm.role === "moderator" && (
                  <div style={{ marginTop: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#334155" }}>
                        Configure Moderator Permissions
                      </span>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          type="button"
                          className="be-nav-btn"
                          style={{ padding: "3px 8px", fontSize: "0.74rem" }}
                          onClick={() => grantFullPermissions(setAddForm)}
                        >
                          Select All
                        </button>
                        <button
                          type="button"
                          className="be-nav-btn"
                          style={{ padding: "3px 8px", fontSize: "0.74rem" }}
                          onClick={() => clearAllPermissions(setAddForm)}
                        >
                          Clear All
                        </button>
                      </div>
                    </div>

                    <div className="perm-matrix">
                      {PERMISSION_PAGES.map((p) => {
                        const curList = addForm.permissions[p.key] || [];
                        const isViewChecked = curList.includes("view");

                        return (
                          <div key={p.key} className="perm-row">
                            <div className="perm-page-name">{p.label}</div>
                            <div className="perm-actions-group">
                              {p.actions.map((act) => {
                                const isChecked = curList.includes(act);
                                return (
                                  <label key={act} className="perm-check-label">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => togglePermission(addForm, setAddForm, p.key, act)}
                                    />
                                    <span>{ACTION_LABELS[act] || act}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <span style={{ fontSize: "0.74rem", color: "var(--be-text-muted)", fontStyle: "italic" }}>
                      * Selecting &quot;Add / Edit&quot; or &quot;Delete&quot; automatically includes &quot;View&quot; permission.
                    </span>
                  </div>
                )}
              </div>

              <div className="admin-modal-footer">
                <button type="button" onClick={() => setShowAddModal(false)} className="be-btn be-btn-secondary" disabled={busy}>
                  Cancel
                </button>
                <button type="submit" className="be-btn be-btn-primary" disabled={busy}>
                  {busy ? "Creating Account..." : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: EDIT USER PERMISSIONS & ROLE
          ========================================================================= */}
      {showEditModal && editTarget && (
        <div className="admin-modal-overlay" onClick={() => !busy && setShowEditModal(false)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3 className="admin-modal-title">
                Edit Permissions: {editTarget.username}
              </h3>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="be-del-row-btn"
                style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                title="Close"
              >
                <XIcon size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit}>
              <div className="admin-modal-body">
                {/* Role Toggle */}
                <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "#334155", display: "block", marginBottom: 6 }}>
                  Role
                </label>
                <div className="admin-role-toggle">
                  <div
                    className={`admin-role-card ${editTarget.role === "moderator" ? "selected" : ""}`}
                    onClick={() => setEditTarget({ ...editTarget, role: "moderator" })}
                  >
                    <h4>
                      Moderator
                      {editTarget.role === "moderator" && <span><CheckIcon size={12} /></span>}
                    </h4>
                    <p>Customize page and action permissions for this user.</p>
                  </div>

                  <div
                    className={`admin-role-card ${editTarget.role === "admin" ? "selected" : ""}`}
                    onClick={() => setEditTarget({ ...editTarget, role: "admin" })}
                  >
                    <h4>
                      Administrator
                      {editTarget.role === "admin" && <span><CheckIcon size={12} /></span>}
                    </h4>
                    <p>Full unrestricted access to all pages and Admin Panel.</p>
                  </div>
                </div>

                {/* Permissions Matrix for Moderator */}
                {editTarget.role === "moderator" && (
                  <div style={{ marginTop: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#334155" }}>
                        Page Permissions
                      </span>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          type="button"
                          className="be-nav-btn"
                          style={{ padding: "3px 8px", fontSize: "0.74rem" }}
                          onClick={() => grantFullPermissions(setEditTarget)}
                        >
                          Select All
                        </button>
                        <button
                          type="button"
                          className="be-nav-btn"
                          style={{ padding: "3px 8px", fontSize: "0.74rem" }}
                          onClick={() => clearAllPermissions(setEditTarget)}
                        >
                          Clear All
                        </button>
                      </div>
                    </div>

                    <div className="perm-matrix">
                      {PERMISSION_PAGES.map((p) => {
                        const curList = editTarget.permissions[p.key] || [];

                        return (
                          <div key={p.key} className="perm-row">
                            <div className="perm-page-name">{p.label}</div>
                            <div className="perm-actions-group">
                              {p.actions.map((act) => {
                                const isChecked = curList.includes(act);
                                return (
                                  <label key={act} className="perm-check-label">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => togglePermission(editTarget, setEditTarget, p.key, act)}
                                    />
                                    <span>{ACTION_LABELS[act] || act}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="admin-modal-footer">
                <button type="button" onClick={() => setShowEditModal(false)} className="be-btn be-btn-secondary" disabled={busy}>
                  Cancel
                </button>
                <button type="submit" className="be-btn be-btn-primary" disabled={busy}>
                  {busy ? "Saving Changes..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: RESET PASSWORD
          ========================================================================= */}
      {showPassModal && editTarget && (
        <div className="admin-modal-overlay" onClick={() => !busy && setShowPassModal(false)}>
          <div className="admin-modal" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h3 className="admin-modal-title">
                Change Password: {editTarget.username}
              </h3>
              <button
                type="button"
                onClick={() => setShowPassModal(false)}
                className="be-del-row-btn"
                style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                title="Close"
              >
                <XIcon size={16} />
              </button>
            </div>

            <form onSubmit={handleChangePassword}>
              <div className="admin-modal-body">
                <div className="be-field-group">
                  <label>
                    New Password <span className="req">*</span>
                  </label>
                  <input
                    type="password"
                    className="be-input"
                    placeholder="Enter new password (min 6 chars)..."
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    autoFocus
                  />
                  <span style={{ fontSize: "0.72rem", color: "var(--be-text-muted)" }}>
                    Must be at least 6 characters
                  </span>
                </div>
              </div>

              <div className="admin-modal-footer">
                <button type="button" onClick={() => setShowPassModal(false)} className="be-btn be-btn-secondary" disabled={busy}>
                  Cancel
                </button>
                <button type="submit" className="be-btn be-btn-primary" disabled={busy}>
                  {busy ? "Updating..." : "Update Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
