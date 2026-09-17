import { useState, useEffect, useCallback } from "react";
import Layout from "../components/Layout";
import API from "../services/api";
import { useAuth } from "../context/AuthContext";
import {
  HiOutlineCheckCircle,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineExclamation,
  HiOutlineLockClosed,
  HiOutlinePlus,
  HiOutlineUserGroup,
  HiOutlineX,
} from "react-icons/hi";

const initialUserForm = {
  name: "",
  email: "",
  password: "",
  phone: "",
  role: "Cashier",
  customPermissions: [],
};

const Users = () => {
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0, limit: 10 });
  const [rolesData, setRolesData] = useState({ roles: [], permissions: {}, roleDefaults: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Search & Role Filter
  const [search, setSearch] = useState("");
  const [selectedRole, setSelectedRole] = useState("");

  // Create/Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [formData, setFormData] = useState(initialUserForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // Password Reset Modal State
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetTargetUser, setResetTargetUser] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetting, setResetting] = useState(false);

  // Fetch Roles and Available Permissions Metadata
  const fetchRolesMetadata = async () => {
    try {
      const res = await API.get("/users/roles-permissions");
      setRolesData(res.data?.data || { roles: [], permissions: {}, roleDefaults: {} });
    } catch (err) {
      console.error("Failed to load roles metadata", err);
    }
  };

  // Fetch Users List
  const fetchUsers = useCallback(async (pageNumber = 1) => {
    try {
      setLoading(true);
      setError("");

      const params = {
        page: pageNumber,
        limit: 10,
        ...(search && { search }),
        ...(selectedRole && { role: selectedRole }),
      };

      const res = await API.get("/users", { params });
      setUsers(res.data?.data?.users || []);
      setPagination(res.data?.data?.pagination || { page: 1, pages: 1, total: 0, limit: 10 });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load staff users.");
    } finally {
      setLoading(false);
    }
  }, [search, selectedRole]);

  useEffect(() => {
    fetchRolesMetadata();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchUsers]);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setModalMode("create");
    setSelectedUserId(null);
    setFormData(initialUserForm);
    setFormError("");
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (u) => {
    setModalMode("edit");
    setSelectedUserId(u._id);
    setFormData({
      name: u.name || "",
      email: u.email || "",
      password: "",
      phone: u.phone || "",
      role: u.role || "Cashier",
      customPermissions: u.customPermissions || [],
    });
    setFormError("");
    setIsModalOpen(true);
  };

  // Toggle Custom Permission Checkbox
  const handleTogglePermission = (permKey) => {
    setFormData((prev) => {
      const exists = prev.customPermissions.includes(permKey);
      return {
        ...prev,
        customPermissions: exists
          ? prev.customPermissions.filter((p) => p !== permKey)
          : [...prev.customPermissions, permKey],
      };
    });
  };

  // Submit Create / Edit User
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!formData.name.trim()) {
      setFormError("Staff member name is required.");
      return;
    }

    if (modalMode === "create") {
      if (!formData.email.trim() || !formData.password) {
        setFormError("Email and initial password are required.");
        return;
      }
      if (formData.password.length < 6) {
        setFormError("Password must be at least 6 characters.");
        return;
      }
    }

    try {
      setSaving(true);
      if (modalMode === "create") {
        await API.post("/users", formData);
        setSuccessMessage(`Staff user '${formData.name}' created successfully.`);
      } else {
        await API.put(`/users/${selectedUserId}`, {
          name: formData.name,
          phone: formData.phone,
          role: formData.role,
          customPermissions: formData.customPermissions,
        });
        setSuccessMessage(`Staff user '${formData.name}' updated successfully.`);
      }

      setIsModalOpen(false);
      fetchUsers(pagination.page);
      setTimeout(() => setSuccessMessage(""), 5000);
    } catch (err) {
      setFormError(err.response?.data?.message || "Failed to save staff user.");
    } finally {
      setSaving(false);
    }
  };

  // Toggle Status (Activate / Deactivate)
  const handleToggleStatus = async (u) => {
    try {
      const res = await API.put(`/users/${u._id}/status`);
      setSuccessMessage(res.data?.message || "Status updated.");
      fetchUsers(pagination.page);
      setTimeout(() => setSuccessMessage(""), 4000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to change user status.");
    }
  };

  // Submit Password Reset
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      alert("New password must be at least 6 characters.");
      return;
    }

    try {
      setResetting(true);
      await API.put(`/users/${resetTargetUser._id}/reset-password`, { newPassword });
      setSuccessMessage(`Password reset successfully for ${resetTargetUser.name}.`);
      setIsResetModalOpen(false);
      setNewPassword("");
      setTimeout(() => setSuccessMessage(""), 5000);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to reset password.");
    } finally {
      setResetting(false);
    }
  };

  // Delete User
  const handleDeleteUser = async (u) => {
    if (!window.confirm(`Are you sure you want to remove staff member '${u.name}'?`)) return;

    try {
      await API.delete(`/users/${u._id}`);
      setSuccessMessage(`Staff user '${u.name}' removed.`);
      fetchUsers(pagination.page);
      setTimeout(() => setSuccessMessage(""), 4000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete user.");
    }
  };

  return (
    <Layout title="Staff & User Access">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Team & Role-Based Access</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Manage your cashiers, accountants, store managers, and access permissions ({pagination.total} staff members)
          </p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="bg-[#111111] hover:bg-black text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-sm transition flex items-center gap-2 self-start sm:self-auto"
        >
          <HiOutlinePlus className="text-base" aria-hidden="true" />
          <span>Add New Staff User</span>
        </button>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs p-3 rounded-xl flex items-center justify-between">
          <span className="flex items-center gap-2"><HiOutlineCheckCircle className="text-base" aria-hidden="true" />{successMessage}</span>
          <button onClick={() => setSuccessMessage("")} className="font-bold" aria-label="Dismiss success message"><HiOutlineX className="text-base" /></button>
        </div>
      )}
      {error && (
        <div className="mb-4 bg-rose-50 border border-rose-200 text-[#111111] text-xs p-3 rounded-xl flex items-center justify-between">
          <span className="flex items-center gap-2"><HiOutlineExclamation className="text-base" aria-hidden="true" />{error}</span>
          <button onClick={() => setError("")} className="font-bold" aria-label="Dismiss error message"><HiOutlineX className="text-base" /></button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Search Staff</label>
          <input
            type="text"
            placeholder="Search by name, email, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 border border-gray-200 outline-none focus:border-gray-400 transition"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Filter by Role</label>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 border border-gray-200 outline-none focus:border-gray-400 transition font-semibold"
          >
            <option value="">All Roles</option>
            {rolesData.roles?.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Staff Users Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-400 uppercase tracking-wider font-semibold border-b border-gray-100">
              <tr>
                <th className="py-3.5 px-4">Staff Member</th>
                <th className="py-3.5 px-4">Contact</th>
                <th className="py-3.5 px-4">Assigned Role</th>
                <th className="py-3.5 px-4">Permissions</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-gray-400">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                      <span>Loading team members...</span>
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-gray-400">
                    <HiOutlineUserGroup className="mx-auto mb-1 block text-2xl" aria-hidden="true" />
                    No staff members found.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isSelf = u._id === currentUser?.id || u._id === currentUser?._id;

                  return (
                    <tr key={u._id} className="hover:bg-gray-50/70 transition">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-800 font-black flex items-center justify-center text-xs">
                            {u.name?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 flex items-center gap-1.5">
                              {u.name}
                              {isSelf && (
                                <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-[9px] font-normal">
                                  You
                                </span>
                              )}
                            </p>
                            <p className="text-[10px] text-gray-400">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-gray-600">
                        {u.phone || "—"}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="bg-slate-100 text-slate-800 font-bold px-2 py-0.5 rounded text-[10px]">
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-gray-500">
                        <span className="text-gray-700 font-semibold">{u.effectivePermissions?.length || 0}</span> granted
                        {u.customPermissions?.length > 0 && (
                          <span className="text-[10px] text-purple-600 ml-1">
                            (+{u.customPermissions.length} custom)
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          disabled={isSelf}
                          onClick={() => handleToggleStatus(u)}
                          title={isSelf ? "Cannot deactivate yourself" : "Click to toggle active status"}
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold transition disabled:opacity-50 ${
                            u.isActive
                              ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                              : "bg-rose-50 text-[#111111] hover:bg-gray-100"
                          }`}
                        >
                          {u.isActive ? <><HiOutlineCheckCircle aria-hidden="true" />Active</> : <><HiOutlineX aria-hidden="true" />Inactive</>}
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEditModal(u)}
                            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded text-[11px] font-semibold transition"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              setResetTargetUser(u);
                              setNewPassword("");
                              setIsResetModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded text-[11px] font-semibold transition"
                          >
                            <HiOutlineLockClosed aria-hidden="true" />
                            Key
                          </button>
                          {!isSelf && (
                            <button
                              onClick={() => handleDeleteUser(u)}
                              className="bg-rose-50 hover:bg-gray-100 text-[#111111] px-2 py-1 rounded text-[11px] font-semibold transition"
                            >
                              Delete
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

        {pagination.pages > 1 && (
          <div className="p-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>
              Showing Page <b>{pagination.page}</b> of <b>{pagination.pages}</b>
            </span>
            <div className="flex gap-1.5">
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchUsers(pagination.page - 1)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition"
              >
                <HiOutlineChevronLeft aria-hidden="true" />
                Prev
              </button>
              <button
                disabled={pagination.page >= pagination.pages}
                onClick={() => fetchUsers(pagination.page + 1)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition"
              >
                Next
                <HiOutlineChevronRight aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ================= ADD / EDIT STAFF MODAL ================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-gray-100 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  {modalMode === "create" ? "Add New Staff Member" : `Edit Permissions for ${formData.name}`}
                </h3>
                <p className="text-xs text-gray-400">Configure role access, login email, and custom security rules</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 font-bold text-lg p-1" aria-label="Close staff user form"><HiOutlineX /></button>
            </div>

            {formError && (
              <div className="mb-4 flex items-center gap-2 bg-rose-50 border border-rose-200 text-[#111111] text-xs p-3 rounded-xl">
                <HiOutlineExclamation className="shrink-0 text-base" aria-hidden="true" />
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Full Name <span className="text-gray-700">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Priya Sharma"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 border border-gray-200 outline-none focus:border-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="9876543210"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 border border-gray-200 outline-none focus:border-gray-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Login Email <span className="text-gray-700">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    disabled={modalMode === "edit"}
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="priya@store.com"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 border border-gray-200 outline-none focus:border-gray-400 disabled:opacity-50"
                  />
                </div>
                {modalMode === "create" && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Initial Password <span className="text-gray-700">*</span>
                    </label>
                    <input
                      type="password"
                      required
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="••••••••"
                      className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 border border-gray-200 outline-none focus:border-gray-400"
                    />
                  </div>
                )}
              </div>

              {/* Role Selector */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Primary Role <span className="text-gray-700">*</span>
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 border border-gray-200 outline-none focus:border-gray-400 font-bold text-gray-900"
                >
                  {rolesData.roles?.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
                <p className="text-[10px] text-gray-400 mt-1">
                  Role gives automatic baseline permissions for this job title.
                </p>
              </div>

              {/* Custom Permissions Overrides */}
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-2">
                <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wider block">
                  Additional Granular Permissions
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto pt-1">
                  {Object.entries(rolesData.permissions || {}).map(([key, permVal]) => (
                    <label
                      key={key}
                      className="flex items-center gap-1.5 text-[11px] text-gray-700 cursor-pointer select-none"
                    >
                      <input
                        type="checkbox"
                        checked={
                          formData.customPermissions?.includes(permVal) ||
                          rolesData.roleDefaults?.[formData.role]?.includes(permVal)
                        }
                        disabled={rolesData.roleDefaults?.[formData.role]?.includes(permVal)}
                        onChange={() => handleTogglePermission(permVal)}
                        className="rounded text-[#111111] focus:ring-gray-300"
                      />
                      <span className="font-mono truncate" title={permVal}>
                        {permVal}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-[#111111] hover:bg-black disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-xs font-semibold shadow-md shadow-rose-600/20 transition flex items-center gap-2"
                >
                  {saving && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                  <span>{modalMode === "create" ? "Create Staff Account" : "Save Changes"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= PASSWORD RESET MODAL ================= */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-gray-100">
            <h3 className="text-base font-bold text-gray-900 mb-1">Reset Password</h3>
            <p className="text-xs text-gray-400 mb-4">Set a new login password for <b>{resetTargetUser?.name}</b></p>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <input
                type="password"
                required
                autoFocus
                placeholder="Enter new password (min 6 chars)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 border border-gray-200 outline-none focus:border-gray-400"
              />

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsResetModalOpen(false)}
                  className="px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetting}
                  className="bg-slate-900 hover:bg-black disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-sm transition"
                >
                  {resetting ? "Resetting..." : "Save Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Users;
