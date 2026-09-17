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
  HiOutlineUsers,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineCurrencyRupee,
  HiOutlineLocationMarker,
} from "react-icons/hi";
import { RiLoader4Line } from "react-icons/ri";

// ─── Indian States (with GST state codes) ─────────────────────────────────────
const INDIAN_STATES = [
  { name: "Andhra Pradesh",     code: "37" },
  { name: "Assam",              code: "18" },
  { name: "Bihar",              code: "10" },
  { name: "Chandigarh",         code: "04" },
  { name: "Chhattisgarh",       code: "22" },
  { name: "Delhi",              code: "07" },
  { name: "Goa",                code: "30" },
  { name: "Gujarat",            code: "24" },
  { name: "Haryana",            code: "06" },
  { name: "Himachal Pradesh",   code: "02" },
  { name: "Jammu and Kashmir",  code: "01" },
  { name: "Jharkhand",          code: "20" },
  { name: "Karnataka",          code: "29" },
  { name: "Kerala",             code: "32" },
  { name: "Madhya Pradesh",     code: "23" },
  { name: "Maharashtra",        code: "27" },
  { name: "Odisha",             code: "21" },
  { name: "Punjab",             code: "03" },
  { name: "Rajasthan",          code: "08" },
  { name: "Tamil Nadu",         code: "33" },
  { name: "Telangana",          code: "36" },
  { name: "Uttar Pradesh",      code: "09" },
  { name: "Uttarakhand",        code: "05" },
  { name: "West Bengal",        code: "19" },
];

const BLANK_ADDRESS = { street: "", city: "", state: "Tamil Nadu", stateCode: "33", pincode: "" };

const INITIAL_FORM = {
  name: "", phone: "", email: "", gstin: "", pan: "",
  billingAddress:  { ...BLANK_ADDRESS },
  sameAsBilling:   true,
  shippingAddress: { ...BLANK_ADDRESS },
  creditLimit:     "",
  openingBalance:  "",
};

// ─── Helpers ───────────────────────────────────────────────────────────────────
const balanceCls = (bal) => {
  if (bal > 0)  return "text-[#111111]";
  if (bal < 0)  return "text-emerald-600";
  return "text-gray-400";
};
const balanceLabel = (bal) => {
  if (bal > 0)  return "Due to business";
  if (bal < 0)  return "Advance Credit";
  return "Settled";
};

// ─── Reusable sub-components ───────────────────────────────────────────────────
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
const Customers = () => {
  const { hasPermission } = useAuth();

  const [customers,  setCustomers]  = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0, limit: 10 });
  const [loading,    setLoading]    = useState(true);
  const [toast,      setToast]      = useState(null);

  const [search,         setSearch]         = useState("");
  const [selectedState,  setSelectedState]  = useState("");

  const [isModalOpen,       setIsModalOpen]       = useState(false);
  const [modalMode,         setModalMode]         = useState("create");
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [formData,          setFormData]          = useState(INITIAL_FORM);
  const [saving,            setSaving]            = useState(false);
  const [formError,         setFormError]         = useState("");

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchCustomers = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = {
        page, limit: 10,
        ...(search        && { search }),
        ...(selectedState && { state: selectedState }),
      };
      const res = await API.get("/customers", { params });
      setCustomers(res.data?.data?.customers    || []);
      setPagination(res.data?.data?.pagination  || { page: 1, pages: 1, total: 0, limit: 10 });
    } catch (err) {
      showToast("error", err.response?.data?.message || "Failed to load customers.");
    } finally {
      setLoading(false);
    }
  }, [search, selectedState]);

  useEffect(() => {
    const t = setTimeout(() => fetchCustomers(1), 300);
    return () => clearTimeout(t);
  }, [fetchCustomers]);

  // ── Modal helpers ─────────────────────────────────────────────────────────
  const openCreate = () => {
    setModalMode("create");
    setSelectedCustomerId(null);
    setFormData(INITIAL_FORM);
    setFormError("");
    setIsModalOpen(true);
  };

  const openEdit = (c) => {
    setModalMode("edit");
    setSelectedCustomerId(c._id);
    setFormData({
      name:           c.name    || "",
      phone:          c.phone   || "",
      email:          c.email   || "",
      gstin:          c.gstin   || "",
      pan:            c.pan     || "",
      billingAddress: {
        street:    c.billingAddress?.street    || "",
        city:      c.billingAddress?.city      || "",
        state:     c.billingAddress?.state     || "Tamil Nadu",
        stateCode: c.billingAddress?.stateCode || "33",
        pincode:   c.billingAddress?.pincode   || "",
      },
      sameAsBilling: false,
      shippingAddress: {
        street:    c.shippingAddress?.street    || "",
        city:      c.shippingAddress?.city      || "",
        state:     c.shippingAddress?.state     || "Tamil Nadu",
        stateCode: c.shippingAddress?.stateCode || "33",
        pincode:   c.shippingAddress?.pincode   || "",
      },
      creditLimit:    c.creditLimit    ?? "",
      openingBalance: c.openingBalance ?? "",
    });
    setFormError("");
    setIsModalOpen(true);
  };

  // Auto-populate state from GSTIN prefix
  const handleGstinChange = (e) => {
    const val = e.target.value.toUpperCase();
    let state = formData.billingAddress.state;
    let code  = formData.billingAddress.stateCode;

    if (val.length >= 2) {
      const match = INDIAN_STATES.find((s) => s.code === val.substring(0, 2));
      if (match) { state = match.name; code = match.code; }
    }

    setFormData((prev) => ({
      ...prev,
      gstin: val,
      billingAddress: { ...prev.billingAddress, state, stateCode: code },
      ...(prev.sameAsBilling && {
        shippingAddress: { ...prev.shippingAddress, state, stateCode: code },
      }),
    }));
  };

  const handleBillingStateChange = (e) => {
    const stateName = e.target.value;
    const found = INDIAN_STATES.find((s) => s.name === stateName);
    const code  = found?.code || "";
    setFormData((prev) => ({
      ...prev,
      billingAddress: { ...prev.billingAddress, state: stateName, stateCode: code },
      ...(prev.sameAsBilling && {
        shippingAddress: { ...prev.shippingAddress, state: stateName, stateCode: code },
      }),
    }));
  };

  const setBillingField = (field, value) =>
    setFormData((prev) => ({ ...prev, billingAddress: { ...prev.billingAddress, [field]: value } }));

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    if (!formData.name.trim()) { setFormError("Customer name is required."); return; }

    const payload = {
      name: formData.name, phone: formData.phone, email: formData.email,
      gstin: formData.gstin, pan: formData.pan,
      billingAddress:  formData.billingAddress,
      shippingAddress: formData.sameAsBilling ? formData.billingAddress : formData.shippingAddress,
      creditLimit:    Number(formData.creditLimit)    || 0,
      openingBalance: Number(formData.openingBalance) || 0,
    };

    try {
      setSaving(true);
      if (modalMode === "create") {
        await API.post("/customers", payload);
        showToast("success", `Customer '${formData.name}' created successfully.`);
      } else {
        await API.put(`/customers/${selectedCustomerId}`, payload);
        showToast("success", `Customer '${formData.name}' updated.`);
      }
      setIsModalOpen(false);
      fetchCustomers(pagination.page);
    } catch (err) {
      setFormError(err.response?.data?.message || "Failed to save customer.");
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (id, name) => {
    if (!window.confirm(`Deactivate customer '${name}'?`)) return;
    try {
      await API.delete(`/customers/${id}`);
      showToast("success", `'${name}' removed from customer master.`);
      fetchCustomers(pagination.page);
    } catch (err) {
      showToast("error", err.response?.data?.message || "Failed to delete customer.");
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <Layout title="Customers & Accounts">

      {/* ── Page Header ───────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <HiOutlineUsers className="text-gray-700" />
            Customer Master
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {pagination.total} records · GSTIN, credit limits &amp; live receivable balances
          </p>
        </div>
        {hasPermission("customers.create") && (
          <button
            onClick={openCreate}
            className="bg-[#111111] hover:bg-black active:scale-[.98] text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-sm shadow-rose-500/30 transition-all flex items-center gap-2 self-start sm:self-auto"
          >
            <HiOutlinePlus className="text-base" />
            Add New Customer
          </button>
        )}
      </div>

      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}

      {/* ── Filters ───────────────────────────────────────────────────────── */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Search</label>
          <div className="relative">
            <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
            <input
              type="text"
              placeholder="Name, phone, email, GSTIN..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-xs rounded-xl bg-gray-50 border border-gray-200 outline-none focus:border-gray-400 transition"
            />
          </div>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
            State / Place of Supply
          </label>
          <select
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
            className={inputCls}
          >
            <option value="">All States</option>
            {INDIAN_STATES.map((s) => (
              <option key={s.code} value={s.name}>{s.name} ({s.code})</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Table ─────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-400 uppercase tracking-wider font-semibold border-b border-gray-100">
              <tr>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Contact</th>
                <th className="py-3.5 px-4">GSTIN &amp; Location</th>
                <th className="py-3.5 px-4 text-right">Credit Limit</th>
                <th className="py-3.5 px-4 text-right">Outstanding Balance</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center text-gray-400">
                    <RiLoader4Line className="text-3xl text-rose-400 animate-spin mx-auto mb-2" />
                    <p>Loading customers...</p>
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center text-gray-400">
                    <HiOutlineUsers className="text-4xl text-gray-200 mx-auto mb-2" />
                    <p>No customers found. Add your first customer.</p>
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c._id} className="hover:bg-gray-50/70 transition group">

                    {/* Customer name + B2B/B2C badge */}
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-gray-900 group-hover:text-[#111111] transition">
                        {c.name}
                      </p>
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold mt-0.5 ${
                        c.isGstRegistered
                          ? "bg-blue-50 text-blue-600"
                          : "bg-gray-100 text-gray-500"
                      }`}>
                        {c.isGstRegistered ? "B2B Registered" : "Consumer (B2C)"}
                      </span>
                    </td>

                    {/* Contact */}
                    <td className="py-3.5 px-4">
                      <p className="font-medium text-gray-900">{c.phone || "—"}</p>
                      <p className="text-[10px] text-gray-400">{c.email || "No email"}</p>
                    </td>

                    {/* GSTIN + Location */}
                    <td className="py-3.5 px-4">
                      <p className="font-mono text-gray-800 text-[11px] font-semibold">
                        {c.gstin || "URP (Unregistered)"}
                      </p>
                      <p className="text-[10px] text-gray-400 flex items-center gap-0.5 mt-0.5">
                        <HiOutlineLocationMarker className="text-xs shrink-0" />
                        {c.billingAddress?.city ? `${c.billingAddress.city}, ` : ""}
                        {c.billingAddress?.state || "N/A"}
                        {c.billingAddress?.stateCode ? ` (${c.billingAddress.stateCode})` : ""}
                      </p>
                    </td>

                    {/* Credit Limit */}
                    <td className="py-3.5 px-4 text-right text-gray-600 font-medium">
                      {c.creditLimit > 0
                        ? `₹${c.creditLimit.toLocaleString("en-IN")}`
                        : <span className="text-gray-400 italic text-[10px]">Unlimited</span>}
                    </td>

                    {/* Balance */}
                    <td className="py-3.5 px-4 text-right">
                      <p className={`font-black text-sm ${balanceCls(c.outstandingBalance)}`}>
                        ₹{Math.abs(c.outstandingBalance || 0).toLocaleString("en-IN")}
                      </p>
                      <p className="text-[9px] text-gray-400">{balanceLabel(c.outstandingBalance)}</p>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {hasPermission("customers.edit") && (
                          <button
                            onClick={() => openEdit(c)}
                            title="Edit customer"
                            className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition"
                          >
                            <HiOutlinePencil className="text-sm" />
                          </button>
                        )}
                        {hasPermission("customers.delete") && (
                          <button
                            onClick={() => handleDelete(c._id, c.name)}
                            title="Delete customer"
                            className="p-1.5 text-gray-700 hover:bg-rose-50 rounded-lg transition"
                          >
                            <HiOutlineTrash className="text-sm" />
                          </button>
                        )}
                      </div>
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
              {" "}· {pagination.total} customers
            </span>
            <div className="flex gap-1.5">
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchCustomers(pagination.page - 1)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition"
              >
                <HiOutlineChevronLeft /> Prev
              </button>
              <button
                disabled={pagination.page >= pagination.pages}
                onClick={() => fetchCustomers(pagination.page + 1)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition"
              >
                Next <HiOutlineChevronRight />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* ADD / EDIT MODAL                                                     */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl border border-gray-100 my-8">

            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                {modalMode === "create"
                  ? <HiOutlinePlus className="text-gray-700 text-lg" />
                  : <HiOutlinePencil className="text-blue-500 text-base" />}
                <div>
                  <h3 className="text-sm font-bold text-gray-900">
                    {modalMode === "create" ? "Add New Customer" : "Edit Customer Profile"}
                  </h3>
                  <p className="text-[11px] text-gray-400">Contact info, GSTIN &amp; billing address</p>
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

              {/* Row 1: Name, Phone, Email */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Field label="Customer Name" required>
                  <input
                    type="text" required value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Ramesh Kumar"
                    className={inputCls}
                  />
                </Field>
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
                    placeholder="ramesh@example.com"
                    className={inputCls}
                  />
                </Field>
              </div>

              {/* Row 2: GSTIN + PAN */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="GSTIN (15-digit)" hint="Auto-detects state from first 2 digits">
                  <input
                    type="text" maxLength={15} value={formData.gstin}
                    onChange={handleGstinChange}
                    placeholder="e.g. 33AAAAA0000A1Z5"
                    className={`${inputCls} font-mono uppercase`}
                  />
                </Field>
                <Field label="PAN Number">
                  <input
                    type="text" maxLength={10} value={formData.pan}
                    onChange={(e) => setFormData({ ...formData, pan: e.target.value.toUpperCase() })}
                    placeholder="e.g. AAAAA0000A"
                    className={`${inputCls} font-mono uppercase`}
                  />
                </Field>
              </div>

              {/* Row 3: Billing Address */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-3">
                <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wider flex items-center gap-1">
                  <HiOutlineLocationMarker className="text-rose-400" /> Billing Address
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <input
                      type="text" placeholder="Street / Landmark"
                      value={formData.billingAddress.street}
                      onChange={(e) => setBillingField("street", e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-gray-200 outline-none focus:border-gray-400 transition"
                    />
                  </div>
                  <input
                    type="text" placeholder="City"
                    value={formData.billingAddress.city}
                    onChange={(e) => setBillingField("city", e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-gray-200 outline-none focus:border-gray-400 transition"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <select
                    value={formData.billingAddress.state}
                    onChange={handleBillingStateChange}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-gray-200 outline-none focus:border-gray-400 transition font-medium"
                  >
                    {INDIAN_STATES.map((s) => (
                      <option key={s.code} value={s.name}>{s.name} (Code: {s.code})</option>
                    ))}
                  </select>
                  <input
                    type="text" placeholder="Pincode"
                    value={formData.billingAddress.pincode}
                    onChange={(e) => setBillingField("pincode", e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-gray-200 outline-none focus:border-gray-400 transition"
                  />
                </div>
                {/* Same as billing toggle */}
                <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-600 font-medium">
                  <input
                    type="checkbox"
                    checked={formData.sameAsBilling}
                    onChange={(e) => setFormData({ ...formData, sameAsBilling: e.target.checked })}
                    className="w-4 h-4 accent-rose-600"
                  />
                  Shipping address same as billing address
                </label>
              </div>

              {/* Row 4: Credit Limit + Opening Balance */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Credit Limit (₹)" hint="Set 0 for unlimited credit">
                  <div className="relative">
                    <HiOutlineCurrencyRupee className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                    <input
                      type="number" min="0" placeholder="0 = Unlimited"
                      value={formData.creditLimit}
                      onChange={(e) => setFormData({ ...formData, creditLimit: e.target.value })}
                      className="w-full pl-7 pr-3 py-2 text-xs rounded-xl bg-gray-50 border border-gray-200 outline-none focus:border-gray-400 transition"
                    />
                  </div>
                </Field>
                <Field label="Opening Balance (₹)" hint="Positive = they owe you; Negative = advance">
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
                  {modalMode === "create" ? "Save Customer" : "Update Profile"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Customers;
