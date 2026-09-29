"use client";

import { useEffect, useState, useMemo } from "react";
import {
  UserCog,
  Search,
  Plus,
  ShieldCheck,
  ShieldAlert,
  Edit2,
  Trash2,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  Building2,
  UserCheck,
  UserX,
  Lock,
  Mail,
  User as UserIcon,
} from "lucide-react";
import { backendApi } from "../../lib/backend-api";
import { shortDate } from "../../lib/api";
import type { User, Rooftop } from "../../lib/types";
import PageTitle from "../ui/PageTitle";
import EmptyState from "../ui/EmptyState";

type Props = {
  selectedRooftop?: string;
  rooftops?: Rooftop[];
  onRefreshNeeded?: () => void;
};

const ROLE_OPTIONS = [
  { value: "admin", label: "Administrator", color: "bg-red-100 text-red-700 border-red-200" },
  { value: "group_admin", label: "Group Administrator", color: "bg-purple-100 text-purple-700 border-purple-200" },
  { value: "store_manager", label: "Store Manager", color: "bg-blue-100 text-blue-700 border-blue-200" },
  { value: "parts_controller", label: "Parts Controller", color: "bg-amber-100 text-amber-700 border-amber-200" },
  { value: "trade_partner", label: "Trade Partner", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  { value: "csuites", label: "C-Suite Executive", color: "bg-indigo-100 text-indigo-700 border-indigo-200" },
];

export default function UsersPage({
  selectedRooftop = "ROOFTOP-DANDENONG",
  rooftops = [],
  onRefreshNeeded,
}: Props) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [rooftopFilter, setRooftopFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");

  // Notifications
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form states for Create User
  const [newEmail, setNewEmail] = useState("");
  const [newFullName, setNewFullName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("trade_partner");
  const [newRooftopId, setNewRooftopId] = useState("");
  const [newTradeAccountId, setNewTradeAccountId] = useState("");

  // Form states for Edit User
  const [editFullName, setEditFullName] = useState("");
  const [editRole, setEditRole] = useState("");
  const [editRooftopId, setEditRooftopId] = useState("");
  const [editTradeAccountId, setEditTradeAccountId] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);
  const [editCreditHold, setEditCreditHold] = useState(false);
  const [editIsOverdue, setEditIsOverdue] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (roleFilter !== "ALL") params.set("role", roleFilter);
      if (rooftopFilter !== "ALL") params.set("rooftopId", rooftopFilter);
      if (statusFilter === "ACTIVE") params.set("isActive", "true");
      if (statusFilter === "INACTIVE") params.set("isActive", "false");
      params.set("limit", "100");

      const res = await backendApi.users.list(params.toString());
      setUsers(res?.users || []);
    } catch (err: unknown) {
      console.error("Failed to load users", err);
      // Fallback in case of mock mode offline
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [search, roleFilter, rooftopFilter, statusFilter]);

  const showToast = (msg: string, isError = false) => {
    if (isError) {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(null), 4500);
    } else {
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(null), 4500);
    }
  };

  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setEditFullName(user.fullName || "");
    setEditRole(user.role || "trade_partner");
    setEditRooftopId(user.rooftopId || "");
    setEditTradeAccountId(user.tradeAccountId || "");
    setEditIsActive(user.isActive !== false);
    setEditCreditHold(!!user.creditHold);
    setEditIsOverdue(!!user.isOverdue);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newFullName || !newPassword) {
      showToast("Email, Full Name, and Password are required", true);
      return;
    }
    setSubmitting(true);
    try {
      await backendApi.auth.register({
        email: newEmail.trim().toLowerCase(),
        fullName: newFullName.trim(),
        password: newPassword,
        role: newRole,
        rooftopId: newRooftopId || undefined,
        tradeAccountId: newTradeAccountId || undefined,
      });

      showToast(`User ${newEmail} created successfully`);
      setShowCreateModal(false);
      setNewEmail("");
      setNewFullName("");
      setNewPassword("");
      setNewRole("trade_partner");
      setNewRooftopId("");
      setNewTradeAccountId("");
      await fetchUsers();
      if (onRefreshNeeded) onRefreshNeeded();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to create user", true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    const userId = editingUser.id || editingUser._id;
    if (!userId) return;

    setSubmitting(true);
    try {
      await backendApi.users.update(userId, {
        fullName: editFullName.trim(),
        role: editRole,
        rooftopId: editRooftopId || undefined,
        tradeAccountId: editTradeAccountId || undefined,
        isActive: editIsActive,
        creditHold: editCreditHold,
        isOverdue: editIsOverdue,
      });

      showToast(`User ${editingUser.email} updated successfully`);
      setEditingUser(null);
      await fetchUsers();
      if (onRefreshNeeded) onRefreshNeeded();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to update user", true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (user: User) => {
    const userId = user.id || user._id;
    if (!userId) return;
    const newStatus = user.isActive === false ? true : false;
    try {
      await backendApi.users.update(userId, { isActive: newStatus });
      showToast(`User ${user.email} is now ${newStatus ? "Active" : "Deactivated"}`);
      await fetchUsers();
      if (onRefreshNeeded) onRefreshNeeded();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to change user status", true);
    }
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;
    const userId = deletingUser.id || deletingUser._id;
    if (!userId) return;

    setSubmitting(true);
    try {
      await backendApi.users.delete(userId);
      showToast(`User ${deletingUser.email} permanently removed`);
      setDeletingUser(null);
      await fetchUsers();
      if (onRefreshNeeded) onRefreshNeeded();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to delete user", true);
    } finally {
      setSubmitting(false);
    }
  };

  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => u.isActive !== false).length;
    const admins = users.filter((u) => ["admin", "group_admin", "csuites"].includes(String(u.role).toLowerCase())).length;
    const controllers = users.filter((u) => ["parts_controller", "store_manager", "controller"].includes(String(u.role).toLowerCase())).length;
    const partners = users.filter((u) => String(u.role).toLowerCase() === "trade_partner").length;
    return { total, active, admins, controllers, partners };
  }, [users]);

  const getRoleBadge = (roleStr?: string) => {
    const r = (roleStr || "trade_partner").toLowerCase();
    const opt = ROLE_OPTIONS.find((o) => o.value === r);
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
          opt?.color || "bg-slate-100 text-slate-700 border-slate-200"
        }`}
      >
        {opt?.label || roleStr || "User"}
      </span>
    );
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      <PageTitle
        eyebrow="Access Control &amp; RBAC"
        title="User Management"
        text="Admin directory: Provision users, reassign dealership precincts, manage access roles, and modify account permissions."
        action={
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary text-xs sm:text-sm flex items-center gap-2 shadow-md hover:shadow-lg"
          >
            <Plus size={16} />
            <span>Add New User</span>
          </button>
        }
      />

      {/* Feedback Toast Banner */}
      {successMsg && (
        <div className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold animate-fade-in shadow-sm">
          <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold animate-fade-in shadow-sm">
          <AlertCircle size={18} className="text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
        <div className="card p-4">
          <p className="eyebrow">Total Users</p>
          <p className="mt-1 text-2xl font-black text-slate-900">{stats.total}</p>
          <p className="text-[11px] text-slate-400 mt-1">{stats.active} active accounts</p>
        </div>
        <div className="card p-4">
          <p className="eyebrow text-purple-600">Admins &amp; Execs</p>
          <p className="mt-1 text-2xl font-black text-slate-900">{stats.admins}</p>
          <p className="text-[11px] text-purple-500 mt-1">Group &amp; System Ops</p>
        </div>
        <div className="card p-4">
          <p className="eyebrow text-blue-600">Store / Controllers</p>
          <p className="mt-1 text-2xl font-black text-slate-900">{stats.controllers}</p>
          <p className="text-[11px] text-blue-500 mt-1">Counter &amp; Picking</p>
        </div>
        <div className="card p-4">
          <p className="eyebrow text-emerald-600">Trade Partners</p>
          <p className="mt-1 text-2xl font-black text-slate-900">{stats.partners}</p>
          <p className="text-[11px] text-emerald-500 mt-1">Workshop accounts</p>
        </div>
        <div className="card p-4 col-span-2 sm:col-span-1">
          <p className="eyebrow text-slate-500">RBAC Security</p>
          <p className="mt-1 text-2xl font-black text-slate-900">v2026.3</p>
          <p className="text-[11px] text-emerald-600 font-semibold mt-1">Supabase + Mongo</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="card p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
          <input
            type="text"
            placeholder="Search by name, email, or trade account..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10 text-xs sm:text-sm w-full"
          />
        </div>

        <div className="flex flex-wrap gap-2.5 items-center">
          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="input text-xs font-semibold py-2 px-3 bg-white"
          >
            <option value="ALL">All Roles</option>
            <option value="admin">Administrators</option>
            <option value="parts_controller">Parts Controllers</option>
            <option value="trade_partner">Trade Partners</option>
          </select>

          {/* Rooftop Filter */}
          <select
            value={rooftopFilter}
            onChange={(e) => setRooftopFilter(e.target.value)}
            className="input text-xs font-semibold py-2 px-3 bg-white"
          >
            <option value="ALL">All Rooftops</option>
            {rooftops.map((r) => (
              <option key={r.rooftopId} value={r.rooftopId}>
                {r.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="input text-xs font-semibold py-2 px-3 bg-white"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active Only</option>
            <option value="INACTIVE">Deactivated Only</option>
          </select>

          <button
            onClick={fetchUsers}
            className="btn bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 px-3 text-xs"
            title="Refresh Users"
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      {/* Users Directory Table */}
      <section className="card p-0 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-8 text-center">
            <Loader2 size={32} className="animate-spin text-red-600 mx-auto mb-3" />
            <p className="text-xs font-bold text-slate-500">Loading user directory...</p>
          </div>
        ) : users.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/70 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="py-3.5 px-4 sm:px-6">User / Account</th>
                  <th className="py-3.5 px-4">Role</th>
                  <th className="py-3.5 px-4 hidden md:table-cell">Precinct Scope</th>
                  <th className="py-3.5 px-4 hidden lg:table-cell">Trade Account</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => {
                  const initials = (u.fullName || u.email || "U")
                    .split(" ")
                    .map((w) => w[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();

                  const isActive = u.isActive !== false;

                  return (
                    <tr
                      key={u._id || u.id || u.email}
                      className="hover:bg-slate-50/60 transition-colors"
                    >
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white font-black text-xs shrink-0 shadow-2xs">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 truncate">
                              {u.fullName || "Unnamed User"}
                            </p>
                            <p className="text-xs text-slate-500 truncate">{u.email}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">{getRoleBadge(u.role)}</td>

                      <td className="py-3.5 px-4 hidden md:table-cell text-slate-600 font-medium">
                        {u.rooftopId ? (
                          <div className="inline-flex items-center gap-1 text-xs">
                            <Building2 size={13} className="text-slate-400" />
                            <span>{u.rooftopId.replace("ROOFTOP-", "")}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs italic">Group Wide</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 hidden lg:table-cell text-slate-600 font-mono text-xs">
                        {u.tradeAccountId ? (
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-[11px]">
                            {u.tradeAccountId}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">—</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span>Active</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[11px] font-bold border border-slate-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                            <span>Deactivated</span>
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 sm:px-6 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEdit(u)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                            title="Edit User Role & Permissions"
                          >
                            <Edit2 size={15} />
                          </button>

                          <button
                            onClick={() => handleToggleStatus(u)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              isActive
                                ? "text-amber-600 hover:bg-amber-50"
                                : "text-emerald-600 hover:bg-emerald-50"
                            }`}
                            title={isActive ? "Deactivate User" : "Activate User"}
                          >
                            {isActive ? <UserX size={15} /> : <UserCheck size={15} />}
                          </button>

                          <button
                            onClick={() => setDeletingUser(u)}
                            className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                            title="Delete User Account"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8">
            <EmptyState
              title="No users found"
              text="No user records match your current filter criteria."
            />
          </div>
        )}
      </section>

      {/* ─── CREATE USER MODAL ─── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-scale-in">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-red-50 text-red-600 border border-red-100">
                  <UserCog size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Provision New User</h3>
                  <p className="text-xs text-slate-500">Create staff or trade partner credentials</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Full Name *
                </label>
                <div className="relative">
                  <UserIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sarah Jenkins"
                    value={newFullName}
                    onChange={(e) => setNewFullName(e.target.value)}
                    className="input pl-9 text-xs sm:text-sm w-full"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Email Address *
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="e.g. sarah@boorangroup.com.au"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="input pl-9 text-xs sm:text-sm w-full"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Initial Password *
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    required
                    placeholder="Minimum 8 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="input pl-9 text-xs sm:text-sm w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    User Role *
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="input text-xs sm:text-sm w-full bg-white font-medium"
                  >
                    {ROLE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Assigned Rooftop
                  </label>
                  <select
                    value={newRooftopId}
                    onChange={(e) => setNewRooftopId(e.target.value)}
                    className="input text-xs sm:text-sm w-full bg-white font-medium"
                  >
                    <option value="">Group Wide / None</option>
                    {rooftops.map((r) => (
                      <option key={r.rooftopId} value={r.rooftopId}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Trade Account ID (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. ACC-DANDENONG-001"
                  value={newTradeAccountId}
                  onChange={(e) => setNewTradeAccountId(e.target.value)}
                  className="input text-xs sm:text-sm w-full"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary text-xs font-bold flex items-center gap-2"
                >
                  {submitting && <Loader2 size={14} className="animate-spin" />}
                  <span>{submitting ? "Creating..." : "Create User"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── EDIT USER MODAL ─── */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-scale-in">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100">
                  <Edit2 size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Edit User Permissions</h3>
                  <p className="text-xs text-slate-500">{editingUser.email}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="input text-xs sm:text-sm w-full"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Role &amp; Privilege
                  </label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    className="input text-xs sm:text-sm w-full bg-white font-medium"
                  >
                    {ROLE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Assigned Rooftop
                  </label>
                  <select
                    value={editRooftopId}
                    onChange={(e) => setEditRooftopId(e.target.value)}
                    className="input text-xs sm:text-sm w-full bg-white font-medium"
                  >
                    <option value="">Group Wide / None</option>
                    {rooftops.map((r) => (
                      <option key={r.rooftopId} value={r.rooftopId}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Trade Account ID
                </label>
                <input
                  type="text"
                  placeholder="e.g. ACC-DANDENONG-001"
                  value={editTradeAccountId}
                  onChange={(e) => setEditTradeAccountId(e.target.value)}
                  className="input text-xs sm:text-sm w-full"
                />
              </div>

              {/* Status & Compliance Toggles */}
              <div className="pt-2 space-y-3">
                <label className="flex items-center justify-between p-3 rounded-2xl border border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100/60 transition-colors">
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">Account Active</span>
                    <span className="text-[11px] text-slate-500">Allow logging into the system</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={editIsActive}
                    onChange={(e) => setEditIsActive(e.target.checked)}
                    className="w-4 h-4 rounded text-red-600 focus:ring-red-500 border-slate-300"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-2xl border border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100/60 transition-colors">
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">Credit Hold</span>
                    <span className="text-[11px] text-slate-500">Block trade ordering per policy</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={editCreditHold}
                    onChange={(e) => setEditCreditHold(e.target.checked)}
                    className="w-4 h-4 rounded text-red-600 focus:ring-red-500 border-slate-300"
                  />
                </label>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="btn bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary text-xs font-bold flex items-center gap-2"
                >
                  {submitting && <Loader2 size={14} className="animate-spin" />}
                  <span>{submitting ? "Saving..." : "Save Changes"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── DELETE USER CONFIRMATION MODAL ─── */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-scale-in">
            <div className="p-6">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100 mb-4">
                <ShieldAlert size={26} />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Delete User Account?</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Are you sure you want to permanently delete{" "}
                <strong className="text-slate-800">{deletingUser.fullName || deletingUser.email}</strong>{" "}
                (<span className="font-mono">{deletingUser.email}</span>)? This will remove their credentials and audit log link.
              </p>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setDeletingUser(null)}
                  className="btn bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteUser}
                  disabled={submitting}
                  className="btn bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-rose-600/20"
                >
                  {submitting && <Loader2 size={14} className="animate-spin" />}
                  <span>{submitting ? "Deleting..." : "Permanently Delete"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
