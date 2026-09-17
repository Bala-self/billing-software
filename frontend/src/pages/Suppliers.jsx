/*
 * ============================================================================
 * DISABLED FOR FUTURE USE
 * This page (Suppliers / Sales Returns / Purchase Returns) is currently
 * disabled in frontend/src/App.jsx and Sidebar.jsx.
 * File is kept for future use - do not delete.
 * To re-enable: uncomment imports/routes in App.jsx and navItems in Sidebar.jsx
 * ============================================================================
 */

import { useState, useEffect, useCallback } from "react";
import Layout from "../components/Layout";
import API from "../services/api";
import { useAuth } from "../context/AuthContext";
import {
  HiOutlinePlus,
  HiOutlineSearch,
  HiOutlinePencil,
  HiOutlineTrash,
  HiOutlineX,
  HiOutlineCheckCircle,
  HiOutlineExclamation,
  HiOutlineOfficeBuilding,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineCurrencyRupee,
  HiOutlineLocationMarker,
  HiOutlineLibrary,
} from "react-icons/hi";
import { RiLoader4Line } from "react-icons/ri";

// ─── Indian States ─────────────────────────────────────────────────────────────
const INDIAN_STATES = [
  { name: "Andhra Pradesh",    code: "37" },
  { name: "Assam",             code: "18" },
  { name: "Bihar",             code: "10" },
  { name: "Chandigarh",        code: "04" },
  { name: "Chhattisgarh",      code: "22" },
  { name: "Delhi",             code: "07" },
  { name: "Goa",               code: "30" },
  { name: "Gujarat",           code: "24" },
  { name: "Haryana",           code: "06" },
  { name: "Himachal Pradesh",  code: "02" },
  { name: "Jammu and Kashmir", code: "01" },
  { name: "Jharkhand",         code: "20" },
  { name: "Karnataka",         code: "29" },
  { name: "Kerala",            code: "32" },
  { name: "Madhya Pradesh",    code: "23" },
  { name: "Maharashtra",       code: "27" },
  { name: "Odisha",            code: "21" },
  { name: "Punjab",            code: "03" },
  { name: "Rajasthan",         code: "08" },
  { name: "Tamil Nadu",        code: "33" },
  { name: "Telangana",         code: "36" },
  { name: "Uttar Pradesh",     code: "09" },
  { name: "Uttarakhand",       code: "05" },
  { name: "West Bengal",       code: "19" },
];

const BLANK_BANK = { bankName: "", accountNumber: "", ifscCode: "", branch: "" };

const INITIAL_FORM = {
  name:           "",
  contactPerson:  "",
  phone:          "",
  email:          "",
  gstin:          "",
  pan:            "",
  address: { street: "", city: "", state: "Tamil Nadu", stateCode: "33", pincode: "" },
  openingBalance: "",
  bankDetails: { ...BLANK_BANK },
};

// ─── Helpers ───────────────────────────────────────────────────────────────────
const Toast = ({ type, message, onClose }) => (
  <div className={`mb-4 flex items-center gap-2 text-xs px-4 py-3 rounded-xl border ${
    type === "success"
      ? "bg-emerald-50 border-emerald-200 text-emerald-700"
      : "bg-rose-50 border-rose-200 text-[#111111]"
  }`}>
    {type === "success"
      ? <HiOutlineCheckCircle className="shrink-0 text-base" />
      : <HiOutlineExclamation className="shrink-0 text-base" />}
    <span className="flex-1">{message}</span>
    <button onClick={onClose}><HiOutlineX className="text-base" /></button>
  </div>
);

const inputCls =
  "w-full px-3 py-2 text-xs rounded-xl bg-gray-50 border border-gray-200 outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-200 transition";
const wInputCls =
  "w-full px-3 py-2 text-xs rounded-xl bg-white border border-gray-200 outline-none focus:border-gray-400 transition";

const Field = ({ label, required, hint, children }) => (
  <div>
    <label className="block text-xs font-semibold text-gray-700 mb-1">
      {label}{required && <span className="text-gray-700 ml-0.5">*</span>}
    </label>
    {children}
    {hint && <p className="text-[10px] text-gray-400 mt-0.5">{hint}</p>}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
const Suppliers = () => {
  const { hasPermission } = useAuth();

  const [suppliers,  setSuppliers]  = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0, limit: 10 });
  const [loading,    setLoading]    = useState(true);
  const [toast,      setToast]      = useState(null);
  const [search,     setSearch]     = useState("");

  const [isModalOpen,       setIsModalOpen]       = useState(false);
  const [modalMode,         setModalMode]         = useState("create");
  const [selectedSupplierId, setSelectedSupplierId] = useState(null);
  const [formData,          setFormData]          = useState(INITIAL_FORM);
  const [saving,            setSaving]            = useState(false);
  const [formError,         setFormError]         = useState("");

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchSuppliers = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await API.get("/suppliers", { params: { page, limit: 10, ...(search && { search }) } });
      setSuppliers(res.data?.data?.suppliers   || []);
      setPagination(res.data?.data?.pagination || { page: 1, pages: 1, total: 0, limit: 10 });
    } catch (err) {
      showToast("error", err.response?.data?.message || "Failed to load suppliers.");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(() => fetchSuppliers(1), 300);
    return () => clearTimeout(t);
  }, [fetchSuppliers]);

  // ── Modal helpers ─────────────────────────────────────────────────────────
  const openCreate = () => {
    setModalMode("create");
    setSelectedSupplierId(null);
    setFormData(INITIAL_FORM);
    setFormError("");
    setIsModalOpen(true);
  };

  const openEdit = (s) => {
    setModalMode("edit");
    setSelectedSupplierId(s._id);
    setFormData({
      name:          s.name          || "",
      contactPerson: s.contactPerson || "",
      phone:         s.phone         || "",
      email:         s.email         || "",
      gstin:         s.gstin         || "",
      pan:           s.pan           || "",
      address: {
        street:    s.address?.street    || "",
        city:      s.address?.city      || "",
        state:     s.address?.state     || "Tamil Nadu",
        stateCode: s.address?.stateCode || "33",
        pincode:   s.address?.pincode   || "",
      },
      openingBalance: s.openingBalance ?? "",
      bankDetails: {
        bankName:      s.bankDetails?.bankName      || "",
        accountNumber: s.bankDetails?.accountNumber || "",
        ifscCode:      s.bankDetails?.ifscCode      || "",
        branch:        s.bankDetails?.branch        || "",
      },
    });
    setFormError("");
    setIsModalOpen(true);
  };

  const setAddr = (field, val) =>
    setFormData((p) => ({ ...p, address: { ...p.address, [field]: val } }));

  const setBank = (field, val) =>
    setFormData((p) => ({ ...p, bankDetails: { ...p.bankDetails, [field]: val } }));

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    if (!formData.name.trim()) { setFormError("Supplier / Vendor name is required."); return; }

    const payload = { ...formData, openingBalance: Number(formData.openingBalance) || 0 };

    try {
      setSaving(true);
      if (modalMode === "create") {
        await API.post("/suppliers", payload);
        showToast("success", `Supplier '${formData.name}' registered successfully.`);
      } else {
        await API.put(`/suppliers/${selectedSupplierId}`, payload);
        showToast("success", `Supplier '${formData.name}' updated.`);
      }
      setIsModalOpen(false);
      fetchSuppliers(pagination.page);
    } catch (err) {
      setFormError(err.response?.data?.message || "Failed to save supplier.");
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (id, name) => {
    if (!window.confirm(`Deactivate vendor '${name}'?`)) return;
    try {
      await API.delete(`/suppliers/${id}`);
      showToast("success", `'${name}' removed from supplier master.`);
      fetchSuppliers(pagination.page);
    } catch (err) {
      showToast("error", err.response?.data?.message || "Failed to delete supplier.");
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <Layout title="Suppliers & Vendors">

      {/* ── Page Header ───────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <HiOutlineOfficeBuilding className="text-gray-700" />
            Supplier Master
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {pagination.total} vendors · procurement contacts, GSTIN &amp; accounts payable
          </p>
        </div>
        {hasPermission("suppliers.manage") && (
          <button
            onClick={openCreate}
            className="bg-[#111111] hover:bg-black active:scale-[.98] text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-sm shadow-rose-500/30 transition-all flex items-center gap-2 self-start sm:self-auto"
          >
            <HiOutlinePlus className="text-base" />
            Add New Supplier
          </button>
        )}
      </div>

      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}

      {/* ── Search ────────────────────────────────────────────────────────── */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6">
        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
          Search Vendors
        </label>
        <div className="relative">
          <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
          <input
            type="text"
            placeholder="Name, contact person, phone, GSTIN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-xs rounded-xl bg-gray-50 border border-gray-200 outline-none focus:border-gray-400 transition"
          />
        </div>
      </div>

      {/* ── Table ─────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-400 uppercase tracking-wider font-semibold border-b border-gray-100">
              <tr>
                <th className="py-3.5 px-4">Supplier / Vendor</th>
                <th className="py-3.5 px-4">Contact Person</th>
                <th className="py-3.5 px-4">GSTIN &amp; State</th>
                <th className="py-3.5 px-4">Bank Details</th>
                <th className="py-3.5 px-4 text-right">Payable Balance</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center text-gray-400">
                    <RiLoader4Line className="text-3xl text-rose-400 animate-spin mx-auto mb-2" />
                    <p>Loading vendors...</p>
                  </td>
                </tr>
              ) : suppliers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center text-gray-400">
                    <HiOutlineOfficeBuilding className="text-4xl text-gray-200 mx-auto mb-2" />
                    <p>No suppliers found. Add your first vendor.</p>
                  </td>
                </tr>
              ) : (
                suppliers.map((s) => (
                  <tr key={s._id} className="hover:bg-gray-50/70 transition group">

                    {/* Name + phone */}
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-gray-900 group-hover:text-[#111111] transition">{s.name}</p>
                      <p className="text-[10px] text-gray-400">{s.phone || "No phone"}</p>
                    </td>

                    {/* Contact */}
                    <td className="py-3.5 px-4">
                      <p className="font-medium text-gray-800">{s.contactPerson || "—"}</p>
                      <p className="text-[10px] text-gray-400">{s.email || "No email"}</p>
                    </td>

                    {/* GSTIN + State */}
                    <td className="py-3.5 px-4">
                      <p className="font-mono text-gray-800 text-[11px] font-semibold">{s.gstin || "URP"}</p>
                      <p className="text-[10px] text-gray-400 flex items-center gap-0.5 mt-0.5">
                        <HiOutlineLocationMarker className="text-xs shrink-0" />
                        {s.address?.state || "N/A"}
                      </p>
                    </td>

                    {/* Bank */}
                    <td className="py-3.5 px-4 text-[10px] text-gray-500">
                      {s.bankDetails?.bankName ? (
                        <div className="space-y-0.5">
                          <p className="font-semibold text-gray-800 flex items-center gap-1">
                            <HiOutlineLibrary className="text-xs shrink-0" />
                            {s.bankDetails.bankName}
                          </p>
                          <p className="font-mono">A/C: {s.bankDetails.accountNumber || "—"}</p>
                          <p className="font-mono text-gray-400">IFSC: {s.bankDetails.ifscCode || "—"}</p>
                        </div>
                      ) : (
                        <span className="italic text-gray-300">Not recorded</span>
                      )}
                    </td>

                    {/* Payable Balance */}
                    <td className="py-3.5 px-4 text-right">
                      <p className={`font-black text-sm ${s.payableBalance > 0 ? "text-[#111111]" : "text-gray-400"}`}>
                        ₹{(s.payableBalance || 0).toLocaleString("en-IN")}
                      </p>
                      <p className="text-[9px] text-gray-400">
                        {s.payableBalance > 0 ? "To be paid" : "Settled"}
                      </p>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      {hasPermission("suppliers.manage") && (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(s)}
                            title="Edit supplier"
                            className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition"
                          >
                            <HiOutlinePencil className="text-sm" />
                          </button>
                          <button
                            onClick={() => handleDelete(s._id, s.name)}
                            title="Delete supplier"
                            className="p-1.5 text-gray-700 hover:bg-rose-50 rounded-lg transition"
                          >
                            <HiOutlineTrash className="text-sm" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="px-5 py-3.5 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>
              Page{" "}
              <span className="font-bold text-gray-700">{pagination.page}</span> of{" "}
              <span className="font-bold text-gray-700">{pagination.pages}</span>
              {" "}· {pagination.total} suppliers
            </span>
            <div className="flex gap-1.5">
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchSuppliers(pagination.page - 1)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition"
              >
                <HiOutlineChevronLeft /> Prev
              </button>
              <button
                disabled={pagination.page >= pagination.pages}
                onClick={() => fetchSuppliers(pagination.page + 1)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition"
              >
                Next <HiOutlineChevronRight />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* MODAL                                                                 */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl border border-gray-100 my-8">

            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                {modalMode === "create"
                  ? <HiOutlinePlus className="text-gray-700 text-lg" />
                  : <HiOutlinePencil className="text-blue-500 text-base" />}
                <div>
                  <h3 className="text-sm font-bold text-gray-900">
                    {modalMode === "create" ? "Add New Supplier / Vendor" : "Edit Supplier Profile"}
                  </h3>
                  <p className="text-[11px] text-gray-400">Company info, contact details &amp; bank account</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
              >
                <HiOutlineX />
              </button>
            </div>

            {formError && (
              <div className="mx-6 mt-4 flex items-center gap-2 bg-rose-50 border border-rose-200 text-[#111111] text-xs px-4 py-2.5 rounded-xl">
                <HiOutlineExclamation className="shrink-0" /> {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">

              {/* Company + Contact Person */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Company / Vendor Name" required>
                  <input
                    type="text" required value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. ITC Limited"
                    className={inputCls}
                  />
                </Field>
                <Field label="Contact Person">
                  <input
                    type="text" value={formData.contactPerson}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    placeholder="e.g. Suresh Sharma"
                    className={inputCls}
                  />
                </Field>
              </div>

              {/* Phone + Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Phone">
                  <input
                    type="tel" value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="9876543210"
                    className={inputCls}
                  />
                </Field>
                <Field label="Email">
                  <input
                    type="email" value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="vendor@company.com"
                    className={inputCls}
                  />
                </Field>
              </div>

              {/* GSTIN + State */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Vendor GSTIN">
                  <input
                    type="text" maxLength={15} value={formData.gstin}
                    onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                    placeholder="e.g. 27AAAAA0000A1ZT"
                    className={`${inputCls} font-mono uppercase`}
                  />
                </Field>
                <Field label="State">
                  <select
                    value={formData.address.state}
                    onChange={(e) => {
                      const found = INDIAN_STATES.find((s) => s.name === e.target.value);
                      setAddr("state",     e.target.value);
                      setAddr("stateCode", found?.code || "");
                    }}
                    className={`${inputCls} font-medium`}
                  >
                    {INDIAN_STATES.map((s) => (
                      <option key={s.code} value={s.name}>{s.name} ({s.code})</option>
                    ))}
                  </select>
                </Field>
              </div>

              {/* Address */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
                    <HiOutlineLocationMarker className="text-rose-400 text-xs" /> Street / Area
                  </label>
                  <input
                    type="text" placeholder="Street address"
                    value={formData.address.street}
                    onChange={(e) => setAddr("street", e.target.value)}
                    className={inputCls}
                  />
                </div>
                <Field label="Pincode">
                  <input
                    type="text" placeholder="600001"
                    value={formData.address.pincode}
                    onChange={(e) => setAddr("pincode", e.target.value)}
                    className={inputCls}
                  />
                </Field>
              </div>

              {/* Opening Balance */}
              <Field label="Opening Balance (₹)" hint="Amount already owed to this supplier">
                <div className="relative">
                  <HiOutlineCurrencyRupee className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                  <input
                    type="number" step="0.01" placeholder="0.00"
                    value={formData.openingBalance}
                    onChange={(e) => setFormData({ ...formData, openingBalance: e.target.value })}
                    className="w-full pl-7 pr-3 py-2 text-xs rounded-xl bg-gray-50 border border-gray-200 outline-none focus:border-gray-400 transition"
                  />
                </div>
              </Field>

              {/* Bank Details */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-3">
                <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wider flex items-center gap-1">
                  <HiOutlineLibrary className="text-rose-400" /> Bank Payout Details
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text" placeholder="Bank Name (e.g. HDFC Bank)"
                    value={formData.bankDetails.bankName}
                    onChange={(e) => setBank("bankName", e.target.value)}
                    className={wInputCls}
                  />
                  <input
                    type="text" placeholder="Account Number"
                    value={formData.bankDetails.accountNumber}
                    onChange={(e) => setBank("accountNumber", e.target.value)}
                    className={`${wInputCls} font-mono`}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text" placeholder="IFSC Code (e.g. HDFC0001234)"
                    value={formData.bankDetails.ifscCode}
                    onChange={(e) => setBank("ifscCode", e.target.value.toUpperCase())}
                    className={`${wInputCls} font-mono uppercase`}
                  />
                  <input
                    type="text" placeholder="Branch Name"
                    value={formData.bankDetails.branch}
                    onChange={(e) => setBank("branch", e.target.value)}
                    className={wInputCls}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button" onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit" disabled={saving}
                  className="bg-[#111111] hover:bg-black disabled:opacity-60 active:scale-[.98] text-white px-5 py-2.5 rounded-xl text-xs font-semibold shadow-md shadow-rose-600/20 transition-all flex items-center gap-2"
                >
                  {saving && <RiLoader4Line className="animate-spin text-sm" />}
                  {modalMode === "create" ? "Save Vendor" : "Update Vendor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Suppliers;
