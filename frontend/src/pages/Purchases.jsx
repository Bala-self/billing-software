import { useState, useEffect, useCallback } from "react";
import Layout from "../components/Layout";
import API from "../services/api";
import { useAuth } from "../context/AuthContext";
import {
  HiOutlinePlus,
  HiOutlineSearch,
  HiOutlineX,
  HiOutlineCheckCircle,
  HiOutlineExclamation,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineOfficeBuilding,
  HiOutlineShoppingBag,
  HiOutlineTrash,
  HiOutlineBan,
  HiOutlineCurrencyRupee,
} from "react-icons/hi";
import { RiLoader4Line } from "react-icons/ri";

// ─── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n) => (n ?? 0).toFixed(2);
const fmtDate = (d) =>
  new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const INWARD_CLS = {
  Received: "bg-emerald-50 text-emerald-600 border border-emerald-100",
  Ordered: "bg-amber-50 text-amber-700 border border-amber-100",
  Cancelled: "bg-gray-100 text-gray-400 line-through border border-gray-200",
};
const PAY_CLS = {
  Paid: "bg-emerald-50 text-emerald-600 border border-emerald-100",
  "Partially Paid": "bg-amber-100 text-amber-800 border border-amber-200",
  Unpaid: "bg-rose-50 text-[#111111] border border-rose-100",
};

const Toast = ({ type, message, onClose }) => (
  <div
    className={`mb-4 flex items-center gap-2 text-xs px-4 py-3 rounded-xl border ${
      type === "success"
        ? "bg-emerald-50 border-emerald-200 text-emerald-700"
        : "bg-rose-50 border-rose-200 text-[#111111]"
    }`}
  >
    {type === "success" ? (
      <HiOutlineCheckCircle className="shrink-0 text-base" />
    ) : (
      <HiOutlineExclamation className="shrink-0 text-base" />
    )}
    <span className="flex-1">{message}</span>
    <button onClick={onClose}>
      <HiOutlineX className="text-base" />
    </button>
  </div>
);

const inputCls =
  "w-full px-3 py-2 text-xs rounded-xl bg-gray-50 border border-gray-200 outline-none focus:border-gray-400 transition";

const BLANK_ITEM = { productId: "", quantity: 1, unitCost: "", discount: 0 };

// ─────────────────────────────────────────────────────────────────────────────
const Purchases = () => {
  const { hasPermission } = useAuth();

  const [purchases, setPurchases] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    pages: 1,
    total: 0,
    limit: 10,
  });
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Filters
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");

  // Create modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [loadingModal, setLoadingModal] = useState(false);

  // Form state
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [supplierBillNumber, setSupplierBillNumber] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [paymentMethod, setPaymentMethod] = useState("Credit");
  const [paidAmount, setPaidAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [purchaseItems, setPurchaseItems] = useState([{ ...BLANK_ITEM }]);

  // View modal
  const [viewPurchase, setViewPurchase] = useState(null);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  };

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchPurchases = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const params = {
          page,
          limit: 10,
          ...(search && { search }),
          ...(status && { status }),
          ...(paymentStatus && { paymentStatus }),
        };
        const res = await API.get("/purchases", { params });
        setPurchases(res.data?.data?.purchases || []);
        setPagination(
          res.data?.data?.pagination || {
            page: 1,
            pages: 1,
            total: 0,
            limit: 10,
          },
        );
      } catch (err) {
        showToast(
          "error",
          err.response?.data?.message || "Failed to load purchases.",
        );
      } finally {
        setLoading(false);
      }
    },
    [search, status, paymentStatus],
  );

  useEffect(() => {
    const t = setTimeout(() => fetchPurchases(1), 300);
    return () => clearTimeout(t);
  }, [fetchPurchases]);

  // ── Open Create Modal ─────────────────────────────────────────────────────
  const handleOpenCreateModal = async () => {
    setLoadingModal(true);
    try {
      const [supRes, prodRes] = await Promise.all([
        API.get("/suppliers", { params: { limit: 200 } }),
        API.get("/products", { params: { limit: 200 } }),
      ]);
      setSuppliers(supRes.data?.data?.suppliers || []);
      setCatalog(prodRes.data?.data?.products || []);
      setSelectedSupplierId("");
      setSupplierBillNumber("");
      setPurchaseDate(new Date().toISOString().split("T")[0]);
      setPaymentMethod("Credit");
      setPaidAmount("");
      setNotes("");
      setPurchaseItems([{ ...BLANK_ITEM }]);
      setFormError("");
      setIsModalOpen(true);
    } catch {
      showToast(
        "error",
        "Failed to load suppliers/products for purchase entry.",
      );
    } finally {
      setLoadingModal(false);
    }
  };

  // ── Item row helpers ──────────────────────────────────────────────────────
  const addRow = () => setPurchaseItems((p) => [...p, { ...BLANK_ITEM }]);
  const removeRow = (idx) =>
    setPurchaseItems((p) => p.filter((_, i) => i !== idx));

  const setRowField = (idx, field, val) => {
    setPurchaseItems((prev) => {
      const u = [...prev];
      u[idx] = { ...u[idx], [field]: val };
      return u;
    });
  };

  const handleProductSelect = (idx, prodId) => {
    const matched = catalog.find((p) => p._id === prodId);
    setPurchaseItems((prev) => {
      const u = [...prev];
      u[idx] = {
        ...u[idx],
        productId: prodId,
        unitCost: matched?.purchasePrice || "",
      };
      return u;
    });
  };

  // ── Live total for modal ──────────────────────────────────────────────────
  const modalTotal = purchaseItems.reduce((sum, item) => {
    const line = (Number(item.unitCost) || 0) * (Number(item.quantity) || 0);
    const disc = Number(item.discount) || 0;
    return sum + Math.max(0, line - disc);
  }, 0);

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleCreatePurchase = async (e) => {
    e.preventDefault();
    setFormError("");
    if (!selectedSupplierId) {
      setFormError("Please select a supplier / vendor.");
      return;
    }

    const validItems = purchaseItems.filter(
      (i) => i.productId && Number(i.quantity) > 0 && i.unitCost !== "",
    );
    if (validItems.length === 0) {
      setFormError("Add at least one complete product line item.");
      return;
    }

    const payload = {
      supplierId: selectedSupplierId,
      supplierBillNumber,
      purchaseDate,
      items: validItems.map((i) => ({
        productId: i.productId,
        quantity: Number(i.quantity),
        unitCost: Number(i.unitCost),
        discount: Number(i.discount) || 0,
      })),
      paidAmount: paymentMethod === "Credit" ? 0 : Number(paidAmount) || 0,
      paymentMethod,
      notes,
    };

    try {
      setSaving(true);
      await API.post("/purchases", payload);
      showToast(
        "success",
        "Purchase recorded. Stock incremented and supplier payable updated.",
      );
      setIsModalOpen(false);
      fetchPurchases(1);
    } catch (err) {
      setFormError(
        err.response?.data?.message || "Failed to create purchase order.",
      );
    } finally {
      setSaving(false);
    }
  };

  // ── Cancel Purchase ───────────────────────────────────────────────────────
  const handleCancelPurchase = async (p) => {
    if (
      !window.confirm(
        `Cancel purchase '${p.purchaseNumber}'? This will deduct the received stock and reverse the supplier payable.`,
      )
    )
      return;

    try {
      await API.put(`/purchases/${p._id}/cancel`);
      showToast(
        "success",
        `Purchase ${p.purchaseNumber} cancelled successfully.`,
      );
      fetchPurchases(pagination.page);
      if (viewPurchase?._id === p._id) setViewPurchase(null);
    } catch (err) {
      showToast(
        "error",
        err.response?.data?.message || "Failed to cancel purchase.",
      );
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <Layout title="Purchases & Inward Inventory">
      {/* ── Page Header ───────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <HiOutlineShoppingBag className="text-gray-700" /> Purchase Orders
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {pagination.total} orders · record procurement, auto-increment
            stock, track payables
          </p>
        </div>
        {hasPermission("purchases.create") && (
          <button
            onClick={handleOpenCreateModal}
            disabled={loadingModal}
            className="bg-[#111111] hover:bg-black active:scale-[.98] disabled:opacity-60 text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-sm shadow-rose-500/30 transition-all flex items-center gap-2 self-start sm:self-auto"
          >
            {loadingModal ? (
              <RiLoader4Line className="animate-spin text-base" />
            ) : (
              <HiOutlinePlus className="text-base" />
            )}
            New Purchase Entry
          </button>
        )}
      </div>

      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      {/* ── Filters ───────────────────────────────────────────────────────── */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
            Search
          </label>
          <div className="relative">
            <HiOutlineSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
            <input
              type="text"
              placeholder="PO number, vendor bill, supplier..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-xs rounded-xl bg-gray-50 border border-gray-200 outline-none focus:border-gray-400 transition"
            />
          </div>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
            Inward Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className={inputCls}
          >
            <option value="">All Statuses</option>
            <option value="Received">Received</option>
            <option value="Ordered">Ordered</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
            Payment Status
          </label>
          <select
            value={paymentStatus}
            onChange={(e) => setPaymentStatus(e.target.value)}
            className={inputCls}
          >
            <option value="">All Payment States</option>
            <option value="Paid">Paid</option>
            <option value="Partially Paid">Partially Paid</option>
            <option value="Unpaid">Unpaid</option>
          </select>
        </div>
      </div>

      {/* ── Table ─────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-400 uppercase tracking-wider font-semibold border-b border-gray-100">
              <tr>
                <th className="py-3.5 px-4">PO Number</th>
                <th className="py-3.5 px-4">Supplier</th>
                <th className="py-3.5 px-4">Vendor Bill #</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4 text-right">Grand Total</th>
                <th className="py-3.5 px-4 text-right">Payable Due</th>
                <th className="py-3.5 px-4 text-center">Inward</th>
                <th className="py-3.5 px-4 text-center">Payment</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-20 text-center">
                    <RiLoader4Line className="text-3xl text-rose-400 animate-spin mx-auto mb-2" />
                    <p className="text-xs text-gray-400">
                      Loading purchase records...
                    </p>
                  </td>
                </tr>
              ) : purchases.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-20 text-center">
                    <HiOutlineShoppingBag className="text-5xl text-gray-100 mx-auto mb-3" />
                    <p className="text-xs text-gray-400">
                      No purchase orders recorded yet.
                    </p>
                  </td>
                </tr>
              ) : (
                purchases.map((p) => (
                  <tr
                    key={p._id}
                    className="hover:bg-gray-50/70 transition group"
                  >
                    <td className="py-3 px-4 font-bold text-gray-900 font-mono group-hover:text-[#111111] transition">
                      {p.purchaseNumber}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-gray-800">
                        {p.supplierSnapshot?.name || "Supplier"}
                      </p>
                      <p className="text-[10px] text-gray-400">
                        {p.supplierSnapshot?.phone || ""}
                      </p>
                    </td>
                    <td className="py-3 px-4 font-mono text-gray-500">
                      {p.supplierBillNumber || "—"}
                    </td>
                    <td className="py-3 px-4 text-gray-500 text-[11px]">
                      {fmtDate(p.purchaseDate)}
                    </td>
                    <td className="py-3 px-4 text-right font-black text-gray-900">
                      ₹{fmt(p.grandTotal)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold">
                      <span
                        className={
                          p.dueAmount > 0 ? "text-[#111111]" : "text-gray-400"
                        }
                      >
                        ₹{fmt(p.dueAmount)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${INWARD_CLS[p.status] || "bg-gray-100 text-gray-500"}`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${PAY_CLS[p.paymentStatus] || "bg-gray-100 text-gray-500"}`}
                      >
                        {p.paymentStatus}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setViewPurchase(p)}
                          className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-[11px] font-semibold transition"
                        >
                          View
                        </button>
                        {hasPermission("purchases.edit") &&
                          p.status !== "Cancelled" && (
                            <button
                              onClick={() => handleCancelPurchase(p)}
                              className="px-2.5 py-1 bg-rose-50 hover:bg-gray-100 text-[#111111] rounded-lg text-[11px] font-semibold transition flex items-center gap-1"
                            >
                              <HiOutlineBan className="text-xs" /> Cancel
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
              <span className="font-bold text-gray-700">{pagination.page}</span>{" "}
              of{" "}
              <span className="font-bold text-gray-700">
                {pagination.pages}
              </span>
            </span>
            <div className="flex gap-1.5">
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchPurchases(pagination.page - 1)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition"
              >
                <HiOutlineChevronLeft /> Prev
              </button>
              <button
                disabled={pagination.page >= pagination.pages}
                onClick={() => fetchPurchases(pagination.page + 1)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition"
              >
                Next <HiOutlineChevronRight />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* CREATE PURCHASE MODAL                                                 */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl border border-gray-100 my-8">
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <HiOutlineShoppingBag className="text-gray-700 text-lg" />
                <div>
                  <h3 className="text-sm font-bold text-gray-900">
                    Record Inward Purchase
                  </h3>
                  <p className="text-[11px] text-gray-400">
                    Add received products to increment stock &amp; log payable
                  </p>
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

            <form
              onSubmit={handleCreatePurchase}
              className="px-6 py-5 space-y-5"
            >
              {/* Supplier + Vendor Bill + Date */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
                    <HiOutlineOfficeBuilding className="text-rose-400 text-xs" />
                    Supplier / Vendor <span className="text-gray-700">*</span>
                  </label>
                  <select
                    required
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    className={`${inputCls} font-medium`}
                  >
                    <option value="">— Select Vendor —</option>
                    {suppliers.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.name} {s.gstin ? `[${s.gstin.slice(0, 2)}]` : ""} ·{" "}
                        {s.address?.state || "Local"}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Vendor Bill No
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. VEND-9482"
                    value={supplierBillNumber}
                    onChange={(e) => setSupplierBillNumber(e.target.value)}
                    className={inputCls}
                  />
                </div>
              </div>

              {/* Line Items */}
              <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                    Purchase Items
                  </span>
                  <button
                    type="button"
                    onClick={addRow}
                    className="flex items-center gap-1 bg-white hover:bg-rose-50 border border-gray-200 hover:border-rose-300 text-gray-700 hover:text-[#111111] px-3 py-1 rounded-lg text-xs font-semibold transition"
                  >
                    <HiOutlinePlus className="text-xs" /> Add Row
                  </button>
                </div>

                <div className="space-y-2">
                  {purchaseItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-12 gap-2 items-center bg-white p-2.5 rounded-xl border border-gray-200"
                    >
                      {/* Product select — 5 cols */}
                      <div className="col-span-5">
                        <select
                          required
                          value={item.productId}
                          onChange={(e) =>
                            handleProductSelect(idx, e.target.value)
                          }
                          className="w-full px-2 py-1.5 text-xs rounded-lg bg-gray-50 border border-gray-200 outline-none focus:border-gray-400"
                        >
                          <option value="">Select Product</option>
                          {catalog.map((p) => (
                            <option key={p._id} value={p._id}>
                              {p.name} (Stock: {p.stock})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Qty — 2 cols */}
                      <div className="col-span-2">
                        <input
                          type="number"
                          min="1"
                          required
                          placeholder="Qty"
                          value={item.quantity}
                          onChange={(e) =>
                            setRowField(idx, "quantity", e.target.value)
                          }
                          className="w-full px-2 py-1.5 text-xs rounded-lg border border-gray-200 text-center font-bold outline-none focus:border-gray-400"
                        />
                      </div>

                      {/* Unit Cost — 3 cols */}
                      <div className="col-span-3 relative">
                        <HiOutlineCurrencyRupee className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          required
                          placeholder="Unit Cost"
                          value={item.unitCost}
                          onChange={(e) =>
                            setRowField(idx, "unitCost", e.target.value)
                          }
                          className="w-full pl-5 pr-2 py-1.5 text-xs rounded-lg border border-gray-200 text-right font-medium outline-none focus:border-gray-400"
                        />
                      </div>

                      {/* Remove — 2 cols */}
                      <div className="col-span-2 flex justify-center">
                        {purchaseItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeRow(idx)}
                            className="p-1.5 text-gray-300 hover:text-gray-700 hover:bg-rose-50 rounded-lg transition"
                          >
                            <HiOutlineTrash className="text-sm" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Running total */}
                <div className="flex justify-end text-xs text-gray-500 pt-1 border-t border-gray-100">
                  <span>
                    Estimated Purchase Total:{" "}
                    <span className="font-black text-gray-900">
                      ₹{fmt(modalTotal)}
                    </span>
                  </span>
                </div>
              </div>

              {/* Payment Method + Paid Amount */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className={inputCls}
                  >
                    <option value="Credit">Credit (Pay Later)</option>
                    <option value="Bank Transfer">Bank Transfer / NEFT</option>
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
                {paymentMethod !== "Credit" && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Paid Amount (₹)
                    </label>
                    <div className="relative">
                      <HiOutlineCurrencyRupee className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={paidAmount}
                        onChange={(e) => setPaidAmount(e.target.value)}
                        className="w-full pl-7 pr-3 py-2 text-xs rounded-xl bg-gray-50 border border-gray-200 outline-none focus:border-gray-400 transition"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Notes (optional)
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Partial delivery, batch numbers..."
                  className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 border border-gray-200 outline-none focus:border-gray-400 transition resize-none"
                />
              </div>

              {/* Actions */}
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
                  className="bg-[#111111] hover:bg-black disabled:opacity-60 active:scale-[.98] text-white px-5 py-2.5 rounded-xl text-xs font-semibold shadow-md shadow-rose-600/20 transition-all flex items-center gap-2"
                >
                  {saving && <RiLoader4Line className="animate-spin text-sm" />}
                  Save Inward Purchase
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* VIEW PURCHASE MODAL                                                   */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {viewPurchase && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-gray-100 my-8">
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
              <div>
                <h3 className="text-sm font-bold text-gray-900">
                  Purchase Order {viewPurchase.purchaseNumber}
                </h3>
                <p className="text-[11px] text-gray-400">
                  Vendor:{" "}
                  <span className="font-semibold text-gray-700">
                    {viewPurchase.supplierSnapshot?.name}
                  </span>
                  {viewPurchase.supplierBillNumber &&
                    ` · Bill: ${viewPurchase.supplierBillNumber}`}
                </p>
              </div>
              <button
                onClick={() => setViewPurchase(null)}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
              >
                <HiOutlineX />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* Status chips */}
              <div className="flex gap-2 flex-wrap">
                <span
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${INWARD_CLS[viewPurchase.status] || ""}`}
                >
                  {viewPurchase.status}
                </span>
                <span
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${PAY_CLS[viewPurchase.paymentStatus] || ""}`}
                >
                  {viewPurchase.paymentStatus}
                </span>
                <span className="bg-gray-100 text-gray-600 border border-gray-200 px-2.5 py-1 rounded-full text-[10px] font-bold">
                  {viewPurchase.paymentMethod}
                </span>
              </div>

              {/* Line Items */}
              <div className="border border-gray-100 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 text-gray-400 uppercase tracking-wider font-semibold border-b border-gray-100">
                    <tr>
                      <th className="py-2.5 px-4">Item</th>
                      <th className="py-2.5 px-3 text-right">Unit Cost</th>
                      <th className="py-2.5 px-3 text-center">Qty</th>
                      <th className="py-2.5 px-4 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {(viewPurchase.items || []).map((item, i) => (
                      <tr key={i} className="hover:bg-gray-50/50">
                        <td className="py-2.5 px-4 font-semibold text-gray-800">
                          {item.name}
                        </td>
                        <td className="py-2.5 px-3 text-right text-gray-600">
                          ₹{fmt(item.unitCost)}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold">
                          {item.quantity}
                        </td>
                        <td className="py-2.5 px-4 text-right font-black text-gray-900">
                          ₹{fmt(item.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="flex justify-end">
                <div className="w-64 bg-gray-50 border border-gray-100 rounded-2xl p-4 text-xs space-y-1.5 text-gray-600">
                  <div className="flex justify-between font-black text-gray-900 text-sm">
                    <span>Grand Total</span>
                    <span>₹{fmt(viewPurchase.grandTotal)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-600">
                    <span>Paid Amount</span>
                    <span className="font-semibold">
                      ₹{fmt(viewPurchase.paidAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold text-[#111111]">
                    <span>Due Payable</span>
                    <span>₹{fmt(viewPurchase.dueAmount)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end px-6 py-4 border-t border-gray-100">
              <button
                onClick={() => setViewPurchase(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Purchases;
