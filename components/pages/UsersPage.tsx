"use client";

import { useEffect, useState, useCallback } from "react";
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
import Pagination from "../ui/Pagination";
import Modal from "../ui/Modal";

type Props = {
  selectedRooftop?: string;
  rooftops?: Rooftop[];
  onRefreshNeeded?: () => void;
};

const ROLE_OPTIONS = [
  { value: "group_admin", label: "Group Administrator", color: "bg-purple-100 text-purple-700 border-purple-200" },
  { value: "parts_controller", label: "Parts Controller", color: "bg-amber-100 text-amber-700 border-amber-200" },
  { value: "trade_partner", label: "Trade Partner", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
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

  // Pagination state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

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

  const fetchUsers = useCallback(async (targetPage = page, targetLimit = limit) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (roleFilter !== "ALL") params.set("role", roleFilter);
      if (rooftopFilter !== "ALL") params.set("rooftopId", rooftopFilter);
      if (statusFilter === "ACTIVE") params.set("isActive", "true");
      if (statusFilter === "INACTIVE") params.set("isActive", "false");
      params.set("page", targetPage.toString());
      params.set("limit", targetLimit.toString());

      const res = await backendApi.users.list(params.toString());
      const list = res?.users || [];
      setUsers(list);
      setTotal(res?.total ?? list.length);
      setTotalPages(res?.totalPages ?? Math.max(1, Math.ceil((res?.total ?? list.length) / targetLimit)));
    } catch (err: unknown) {
      console.error("Failed to load users", err);
      setUsers([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, rooftopFilter, statusFilter, page, limit]);

  useEffect(() => {
    fetchUsers(page, limit);
  }, [page, limit, roleFilter, rooftopFilter, statusFilter]);

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
        tradeAccountId: newTradeAccountId.trim() || undefined,
        rooftopId: newRooftopId.trim() || undefined,
      });
      showToast(`User ${newFullName} provisioned successfully!`);
      setShowCreateModal(false);
      setNewEmail("");
      setNewFullName("");
      setNewPassword("");
      setNewRole("trade_partner");
      setNewRooftopId("");
      setNewTradeAccountId("");
      setPage(1);
      fetchUsers(1, limit);
      if (onRefreshNeeded) onRefreshNeeded();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to provision user", true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    const userId = editingUser._id || editingUser.id;
    if (!userId) return;

    setSubmitting(true);
    try {
      await backendApi.users.update(userId, {
        fullName: editFullName.trim(),
        role: editRole,
        rooftopId: editRooftopId.trim() || undefined,
        tradeAccountId: editTradeAccountId.trim() || undefined,
        isActive: editIsActive,
        creditHold: editCreditHold,
        isOverdue: editIsOverdue,
      });
      showToast("User details and permissions updated successfully!");
      setEditingUser(null);
      fetchUsers(page, limit);
      if (onRefreshNeeded) onRefreshNeeded();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to update user", true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (user: User) => {
    const userId = user._id || user.id;
    if (!userId) return;
    const currentActive = user.isActive !== false;
    try {
      await backendApi.users.update(userId, { isActive: !currentActive });
      showToast(`User ${user.fullName || user.email} ${currentActive ? "deactivated" : "activated"}`);
      fetchUsers(page, limit);
      if (onRefreshNeeded) onRefreshNeeded();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to toggle status", true);
    }
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;
    const userId = deletingUser._id || deletingUser.id;
    if (!userId) return;

    setSubmitting(true);
    try {
      await backendApi.users.delete(userId);
      showToast(`User ${deletingUser.fullName || deletingUser.email} deleted successfully`);
      setDeletingUser(null);
      fetchUsers(page, limit);
      if (onRefreshNeeded) onRefreshNeeded();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to delete user", true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ─── Header & Primary Action ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageTitle
          eyebrow="Access Governance"
          title="User Administration & Roles"
          description="Provision new staff or trade partner credentials, grant RBAC privileges, and enforce account holds."
        />
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchUsers(page, limit)}
            className="btn-soft py-2 px-3 text-xs flex items-center gap-1.5"
            title="Reload user list"
          >
            <RotateCcw size={14} className={loading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary py-2 px-4 text-xs flex items-center gap-1.5 shadow-sm"
          >
            <Plus size={15} />
            <span>Provision User</span>
          </button>
        </div>
      </div>

      {/* ─── Feedback Toasts ─── */}
      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 text-emerald-800 text-xs border border-emerald-200 flex items-center justify-between animate-slide-up">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span className="font-semibold">{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-600 hover:text-emerald-800 p-1">
            <X size={14} />
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-50 text-rose-800 text-xs border border-rose-200 flex items-center justify-between animate-slide-up">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-rose-600 shrink-0" />
            <span className="font-semibold">{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-600 hover:text-rose-800 p-1">
            <X size={14} />
          </button>
        </div>
      )}

      {/* ─── Filter & Search Bar ─── */}
      <section className="card p-4 sm:p-5 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-3 text-slate-400" size={16} />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by name, email or trade account..."
            className="field pl-9 py-2 text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            className="field py-2 text-xs bg-white min-w-[130px]"
          >
            <option value="ALL">All Roles</option>
            {ROLE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          <select
            value={rooftopFilter}
            onChange={(e) => {
              setRooftopFilter(e.target.value);
              setPage(1);
            }}
            className="field py-2 text-xs bg-white min-w-[140px]"
          >
            <option value="ALL">All Precincts</option>
            {rooftops.map((r) => (
              <option key={r.rooftopId} value={r.rooftopId}>
                {r.name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as "ALL" | "ACTIVE" | "INACTIVE");
              setPage(1);
            }}
            className="field py-2 text-xs bg-white min-w-[110px]"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active Only</option>
            <option value="INACTIVE">Deactivated</option>
          </select>
        </div>
      </section>

      {/* ─── Users Table ─── */}
      <section className="card overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="skeleton h-14 w-full rounded-xl" />
            ))}
          </div>
        ) : users.length > 0 ? (
          <div className="p-5 space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="pb-3 font-semibold">User Details</th>
                    <th className="pb-3 font-semibold">Role Privilege</th>
                    <th className="pb-3 font-semibold">Assigned Precinct</th>
                    <th className="pb-3 font-semibold">Trade Account</th>
                    <th className="pb-3 font-semibold">Account State</th>
                    <th className="pb-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => {
                    const isActive = u.isActive !== false;
                    const roleMeta = ROLE_OPTIONS.find((r) => r.value === u.role) || {
                      label: u.role || "Trade Partner",
                      color: "bg-slate-100 text-slate-700 border-slate-200",
                    };
                    const rooftopName = rooftops.find((r) => r.rooftopId === u.rooftopId)?.name || u.rooftopId;

                    return (
                      <tr key={u._id || u.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-xs">
                              {(u.fullName || u.email || "U").charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900">{u.fullName || "Unnamed User"}</p>
                              <p className="text-[11px] text-slate-400 font-mono">{u.email}</p>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${roleMeta.color}`}>
                            {roleMeta.label}
                          </span>
                        </td>

                        <td className="py-3.5 text-slate-600">
                          {rooftopName ? (
                            <div className="flex items-center gap-1.5">
                              <Building2 size={13} className="text-slate-400" />
                              <span className="font-medium text-slate-800">{rooftopName}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Group Wide</span>
                          )}
                        </td>

                        <td className="py-3.5">
                          {u.tradeAccountId ? (
                            <span className="font-mono font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                              {u.tradeAccountId}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        <td className="py-3.5">
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

                        <td className="py-3.5 text-right">
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

            {/* ─── Pagination ─── */}
            <Pagination
              page={page}
              totalPages={totalPages}
              totalItems={total}
              pageSize={limit}
              onPageChange={(newPage) => setPage(newPage)}
              onPageSizeChange={(newSize) => {
                setLimit(newSize);
                setPage(1);
              }}
              loading={loading}
            />
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
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        maxWidth="lg"
        title={
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-red-50 text-red-600 border border-red-100">
              <UserCog size={20} />
            </div>
            <div>
              <span className="text-lg font-black text-slate-900 block">Provision New User</span>
            </div>
          </div>
        }
        subtitle="Create staff or trade partner credentials"
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
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
                className="field pl-9 text-xs sm:text-sm w-full"
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
                className="field pl-9 text-xs sm:text-sm w-full"
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
                className="field pl-9 text-xs sm:text-sm w-full"
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
                className="field text-xs sm:text-sm w-full bg-white font-medium"
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
                className="field text-xs sm:text-sm w-full bg-white font-medium"
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
              className="field text-xs sm:text-sm w-full"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="btn-soft text-xs font-bold"
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
      </Modal>

      {/* ─── EDIT USER MODAL ─── */}
      <Modal
        isOpen={!!editingUser}
        onClose={() => setEditingUser(null)}
        maxWidth="lg"
        title={
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <Edit2 size={18} />
            </div>
            <div>
              <span className="text-lg font-black text-slate-900 block">Edit User Permissions</span>
            </div>
          </div>
        }
        subtitle={editingUser ? <span className="font-mono">{editingUser.email}</span> : undefined}
      >
        {editingUser && (
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                required
                value={editFullName}
                onChange={(e) => setEditFullName(e.target.value)}
                className="field text-xs sm:text-sm w-full"
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
                  className="field text-xs sm:text-sm w-full bg-white font-medium"
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
                  className="field text-xs sm:text-sm w-full bg-white font-medium"
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
                className="field text-xs sm:text-sm w-full"
              />
            </div>

            {/* Status & Compliance Toggles */}
            <div className="pt-2 space-y-3">
              <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors">
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

              <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors">
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

            <div className="pt-3 border-t border-slate-100 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="btn-soft text-xs font-bold"
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
        )}
      </Modal>

      {/* ─── DELETE USER CONFIRMATION MODAL ─── */}
      <Modal
        isOpen={!!deletingUser}
        onClose={() => setDeletingUser(null)}
        maxWidth="md"
        showCloseButton={false}
      >
        {deletingUser && (
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100 mb-2">
              <ShieldAlert size={24} />
            </div>
            <h3 className="text-lg font-black text-slate-900">Delete User Account?</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Are you sure you want to permanently delete{" "}
              <strong className="text-slate-800">{deletingUser.fullName || deletingUser.email}</strong>{" "}
              (<span className="font-mono">{deletingUser.email}</span>)? This will remove their credentials and audit log link.
            </p>

            <div className="mt-6 flex justify-end gap-3 pt-2">
              <button
                onClick={() => setDeletingUser(null)}
                className="btn-soft text-xs font-bold"
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
        )}
      </Modal>
    </div>
  );
}
