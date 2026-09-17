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
  HiOutlineCube,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineTag,
  HiOutlineCurrencyRupee,
} from "react-icons/hi";
import { RiLoader4Line } from "react-icons/ri";

// ─── Constants ─────────────────────────────────────────────────────────────────
const INITIAL_FORM = {
  name: "",
  sku: "",
  barcode: "",
  category: "",
  brand: "",
  unit: "",
  hsnCode: "",
  purchasePrice: "",
  sellingPrice: "",
  mrp: "",
  taxRate: 0,
  isTaxInclusive: false,
  stock: "",
  minStockAlert: 5,
  description: "",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const statusCls = (status) => {
  switch (status) {
    case "In Stock":
      return "bg-emerald-50 text-emerald-700 border border-emerald-200";
    case "Low Stock":
      return "bg-amber-50  text-amber-700  border border-amber-200";
    default:
      return "bg-rose-50   text-gray-800   border border-rose-200";
  }
};

// ─── Toast component ──────────────────────────────────────────────────────────
const Toast = ({ type, message, onClose }) => (
  <div
    className={`mb-4 flex items-center justify-between gap-3 text-xs px-4 py-3 rounded-xl border ${
      type === "success"
        ? "bg-emerald-50 border-emerald-200 text-emerald-700"
        : "bg-rose-50 border-rose-200 text-[#111111]"
    }`}
  >
    <div className="flex items-center gap-2">
      {type === "success" ? (
        <HiOutlineCheckCircle className="text-base shrink-0" />
      ) : (
        <HiOutlineExclamation className="text-base shrink-0" />
      )}
      <span>{message}</span>
    </div>
    <button onClick={onClose} className="shrink-0">
      <HiOutlineX className="text-base" />
    </button>
  </div>
);

// ─── Field wrapper ────────────────────────────────────────────────────────────
const Field = ({ label, required, children }) => (
  <div>
    <label className="block text-xs font-semibold text-gray-700 mb-1">
      {label}
      {required && <span className="text-gray-700 ml-0.5">*</span>}
    </label>
    {children}
  </div>
);

const inputCls =
  "w-full px-3 py-2 text-xs rounded-xl bg-gray-50 border border-gray-200 outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-200 transition";

// ─────────────────────────────────────────────────────────────────────────────
const Products = () => {
  const { hasPermission } = useAuth();

  // ── Data state ────────────────────────────────────────────────────────────
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    pages: 1,
    total: 0,
    limit: 10,
  });
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [units, setUnits] = useState([]);

  // ── Toast state ───────────────────────────────────────────────────────────
  const [toast, setToast] = useState(null); // { type: 'success'|'error', message }
  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // ── Filter state ──────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");

  // ── Modal state ───────────────────────────────────────────────────────────
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // ── Fetch catalog metadata ────────────────────────────────────────────────
  const fetchMetadata = async () => {
    try {
      const [catRes, brandRes, unitRes] = await Promise.all([
        API.get("/categories"),
        API.get("/brands"),
        API.get("/units"),
      ]);
      setCategories(catRes.data?.data || []);
      setBrands(brandRes.data?.data || []);
      setUnits(unitRes.data?.data || []);
    } catch (err) {
      console.error("Metadata fetch failed:", err.message);
    }
  };

  // ── Fetch products (debounced via useEffect) ──────────────────────────────
  const fetchProducts = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const params = {
          page,
          limit: 10,
          ...(search && { search }),
          ...(selectedCategory && { category: selectedCategory }),
          ...(selectedBrand && { brand: selectedBrand }),
          ...(selectedStatus && { status: selectedStatus }),
        };
        const res = await API.get("/products", { params });
        setProducts(res.data?.data?.products || []);
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
          err.response?.data?.message || "Failed to load products.",
        );
      } finally {
        setLoading(false);
      }
    },
    [search, selectedCategory, selectedBrand, selectedStatus],
  );

  useEffect(() => {
    fetchMetadata();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => fetchProducts(1), 300);
    return () => clearTimeout(t);
  }, [fetchProducts]);

  // ── Modal helpers ─────────────────────────────────────────────────────────
  const openCreate = () => {
    setModalMode("create");
    setSelectedProductId(null);
    setFormData(INITIAL_FORM);
    setFormError("");
    setIsModalOpen(true);
  };

  const openEdit = (p) => {
    setModalMode("edit");
    setSelectedProductId(p._id);
    setFormData({
      name: p.name || "",
      sku: p.sku || "",
      barcode: p.barcode || "",
      category: p.category?._id || p.category || "",
      brand: p.brand?._id || p.brand || "",
      unit: p.unit?._id || p.unit || "",
      hsnCode: p.hsnCode || "",
      purchasePrice: p.purchasePrice ?? "",
      sellingPrice: p.sellingPrice ?? "",
      mrp: p.mrp ?? "",
      taxRate: 0,
      isTaxInclusive: !!p.isTaxInclusive,
      stock: p.stock ?? "",
      minStockAlert: p.minStockAlert ?? 5,
      description: p.description || "",
    });
    setFormError("");
    setIsModalOpen(true);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // ── Save product ──────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!formData.name.trim() || formData.sellingPrice === "") {
      setFormError("Product name and selling price are required.");
      return;
    }

    const payload = {
      ...formData,
      purchasePrice: Number(formData.purchasePrice) || 0,
      sellingPrice: Number(formData.sellingPrice),
      mrp: Number(formData.mrp) || Number(formData.sellingPrice),
      taxRate: 0,
      stock: Number(formData.stock) || 0,
      minStockAlert: Number(formData.minStockAlert) || 5,
      category: formData.category || undefined,
      brand: formData.brand || undefined,
      unit: formData.unit || undefined,
    };

    try {
      setSaving(true);
      if (modalMode === "create") {
        await API.post("/products", payload);
        showToast("success", `Product '${formData.name}' added to catalog.`);
      } else {
        await API.put(`/products/${selectedProductId}`, payload);
        showToast(
          "success",
          `Product '${formData.name}' updated successfully.`,
        );
      }
      setIsModalOpen(false);
      fetchProducts(pagination.page);
    } catch (err) {
      setFormError(
        err.response?.data?.message || "Failed to save. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  // ── Soft delete ───────────────────────────────────────────────────────────
  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete '${name}'? This will deactivate the product.`))
      return;
    try {
      await API.delete(`/products/${id}`);
      showToast("success", `'${name}' removed from catalog.`);
      fetchProducts(pagination.page);
    } catch (err) {
      showToast(
        "error",
        err.response?.data?.message || "Failed to delete product.",
      );
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <Layout title="Products & Inventory">
      {/* ── Page Header ───────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <HiOutlineCube className="text-gray-700" />
            Product Catalog
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {pagination.total} items · Manage inventory and pricing &amp; stock
            alerts
          </p>
        </div>
        {hasPermission("products.create") && (
          <button
            onClick={openCreate}
            className="bg-[#111111] hover:bg-black active:scale-[.98] text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-sm shadow-rose-500/30 transition-all flex items-center gap-2 self-start sm:self-auto"
          >
            <HiOutlinePlus className="text-base" />
            Add New Product
          </button>
        )}
      </div>

      {/* ── Toasts ────────────────────────────────────────────────────────── */}
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      {/* ── Filter / Search Bar ───────────────────────────────────────────── */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Search */}
        <div className="relative">
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
            Search
          </label>
          <div className="relative">
            <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
            <input
              type="text"
              placeholder="Name, SKU, Barcode, HSN..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-xs rounded-xl bg-gray-50 border border-gray-200 outline-none focus:border-gray-400 transition"
            />
          </div>
        </div>

        {/* Category */}
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
            Category
          </label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className={inputCls}
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Brand */}
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
            Brand
          </label>
          <select
            value={selectedBrand}
            onChange={(e) => setSelectedBrand(e.target.value)}
            className={inputCls}
          >
            <option value="">All Brands</option>
            {brands.map((b) => (
              <option key={b._id} value={b._id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        {/* Status */}
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
            Stock Status
          </label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className={inputCls}
          >
            <option value="">All Stock Levels</option>
            <option value="In Stock">In Stock</option>
            <option value="Low Stock">Low Stock</option>
            <option value="Out of Stock">Out of Stock</option>
          </select>
        </div>
      </div>

      {/* ── Products Table ────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-400 uppercase tracking-wider font-semibold border-b border-gray-100">
              <tr>
                <th className="py-3.5 px-4">Item &amp; SKU</th>
                <th className="py-3.5 px-4">Category / Brand</th>
                <th className="py-3.5 px-4">HSN</th>
                <th className="py-3.5 px-4 text-right">Cost Price</th>
                <th className="py-3.5 px-4 text-right">Selling Price</th>
                <th className="py-3.5 px-4 text-center">Stock</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-20 text-center text-gray-400">
                    <RiLoader4Line className="text-3xl text-rose-400 animate-spin mx-auto mb-2" />
                    <p>Loading product inventory...</p>
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-20 text-center text-gray-400">
                    <HiOutlineCube className="text-4xl text-gray-200 mx-auto mb-2" />
                    <p>No products found. Add your first product to start.</p>
                  </td>
                </tr>
              ) : (
                products.map((p) => (
                  <tr
                    key={p._id}
                    className="hover:bg-gray-50/70 transition group"
                  >
                    {/* Name + SKU */}
                    <td className="py-3 px-4">
                      <p className="font-bold text-gray-900 group-hover:text-[#111111] transition">
                        {p.name}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        SKU:{" "}
                        <span className="font-mono text-gray-600">
                          {p.sku || "—"}
                        </span>
                        {p.barcode && (
                          <span className="ml-2">Bar: {p.barcode}</span>
                        )}
                      </p>
                    </td>

                    {/* Category / Brand */}
                    <td className="py-3 px-4">
                      <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-[10px] font-medium">
                        {p.category?.name || "General"}
                      </span>
                      {p.brand?.name && (
                        <span className="text-gray-400 text-[10px] ml-1.5">
                          ({p.brand.name})
                        </span>
                      )}
                    </td>

                    {/* HSN */}
                    <td className="py-3 px-4 font-mono text-gray-500 text-[11px]">
                      {p.hsnCode || "—"}
                    </td>

                    {/* Cost */}
                    <td className="py-3 px-4 text-right text-gray-500">
                      ₹{(p.purchasePrice ?? 0).toFixed(2)}
                    </td>

                    {/* Selling */}
                    <td className="py-3 px-4 text-right font-bold text-gray-900">
                      ₹{(p.sellingPrice ?? 0).toFixed(2)}
                    </td>

                    {/* Stock */}
                    <td className="py-3 px-4 text-center font-bold text-gray-800">
                      {p.stock}
                      <span className="text-[10px] text-gray-400 font-normal ml-0.5">
                        {p.unit?.shortCode || "PCS"}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${statusCls(p.status)}`}
                      >
                        {p.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {hasPermission("products.edit") && (
                          <button
                            onClick={() => openEdit(p)}
                            title="Edit product"
                            className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition"
                          >
                            <HiOutlinePencil className="text-sm" />
                          </button>
                        )}
                        {hasPermission("products.delete") && (
                          <button
                            onClick={() => handleDelete(p._id, p.name)}
                            title="Delete product"
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

        {/* ── Pagination ─────────────────────────────────────────────────── */}
        {pagination.pages > 1 && (
          <div className="px-5 py-3.5 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>
              Page{" "}
              <span className="font-bold text-gray-700">{pagination.page}</span>{" "}
              of{" "}
              <span className="font-bold text-gray-700">
                {pagination.pages}
              </span>{" "}
              · {pagination.total} total products
            </span>
            <div className="flex gap-1.5">
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchProducts(pagination.page - 1)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition"
              >
                <HiOutlineChevronLeft /> Prev
              </button>
              <button
                disabled={pagination.page >= pagination.pages}
                onClick={() => fetchProducts(pagination.page + 1)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition"
              >
                Next <HiOutlineChevronRight />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ADD / EDIT MODAL                                                   */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl border border-gray-100 my-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                {modalMode === "create" ? (
                  <HiOutlinePlus className="text-gray-700 text-lg" />
                ) : (
                  <HiOutlinePencil className="text-blue-500 text-base" />
                )}
                <div>
                  <h3 className="text-sm font-bold text-gray-900">
                    {modalMode === "create"
                      ? "Add New Product"
                      : "Edit Product Details"}
                  </h3>
                  <p className="text-[11px] text-gray-400">
                    Fill in pricing and inventory rules
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
              >
                <HiOutlineX className="text-base" />
              </button>
            </div>

            {/* Form Error */}
            {formError && (
              <div className="mx-6 mt-4 flex items-center gap-2 bg-rose-50 border border-rose-200 text-[#111111] text-xs px-4 py-2.5 rounded-xl">
                <HiOutlineExclamation className="shrink-0" />
                {formError}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
              {/* Row 1: Name + SKU */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Product Name" required>
                  <input
                    type="text"
                    required
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="e.g. Amul Butter 500g"
                    className={inputCls}
                  />
                </Field>
                <Field label="SKU (auto-generated if blank)">
                  <input
                    type="text"
                    name="sku"
                    value={formData.sku}
                    onChange={handleChange}
                    placeholder="e.g. SKU-AMB500"
                    className={`${inputCls} uppercase`}
                  />
                </Field>
              </div>

              {/* Row 2: Barcode + HSN */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Barcode / EAN">
                  <input
                    type="text"
                    name="barcode"
                    value={formData.barcode}
                    onChange={handleChange}
                    placeholder="e.g. 8901030882556"
                    className={inputCls}
                  />
                </Field>
                <Field label="HSN / SAC Code">
                  <input
                    type="text"
                    name="hsnCode"
                    value={formData.hsnCode}
                    onChange={handleChange}
                    placeholder="e.g. 0405"
                    className={inputCls}
                  />
                </Field>
              </div>

              {/* Row 3: Category, Brand, Unit */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label="Category">
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className={inputCls}
                  >
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Brand">
                  <select
                    name="brand"
                    value={formData.brand}
                    onChange={handleChange}
                    className={inputCls}
                  >
                    <option value="">Select Brand</option>
                    {brands.map((b) => (
                      <option key={b._id} value={b._id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Unit of Measurement">
                  <select
                    name="unit"
                    value={formData.unit}
                    onChange={handleChange}
                    className={inputCls}
                  >
                    <option value="">Select Unit</option>
                    {units.map((u) => (
                      <option key={u._id} value={u._id}>
                        {u.name} ({u.shortCode})
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              {/* Row 5: Pricing */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                <Field label="Purchase Cost (₹)">
                  <div className="relative">
                    <HiOutlineCurrencyRupee className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      name="purchasePrice"
                      value={formData.purchasePrice}
                      onChange={handleChange}
                      placeholder="0.00"
                      className="w-full pl-7 pr-3 py-2 text-xs rounded-xl bg-white border border-gray-200 outline-none focus:border-gray-400 transition"
                    />
                  </div>
                </Field>
                <Field label="Selling Price (₹)" required>
                  <div className="relative">
                    <HiOutlineCurrencyRupee className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      name="sellingPrice"
                      value={formData.sellingPrice}
                      onChange={handleChange}
                      placeholder="0.00"
                      className="w-full pl-7 pr-3 py-2 text-xs rounded-xl bg-white border border-gray-200 outline-none focus:border-gray-400 transition font-bold text-gray-900"
                    />
                  </div>
                </Field>
                <Field label="MRP (₹)">
                  <div className="relative">
                    <HiOutlineCurrencyRupee className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      name="mrp"
                      value={formData.mrp}
                      onChange={handleChange}
                      placeholder="0.00"
                      className="w-full pl-7 pr-3 py-2 text-xs rounded-xl bg-white border border-gray-200 outline-none focus:border-gray-400 transition"
                    />
                  </div>
                </Field>
              </div>

              {/* Row 6: Stock */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field
                  label={
                    modalMode === "create"
                      ? "Opening Stock Quantity"
                      : "Current Stock Quantity"
                  }
                >
                  <input
                    type="number"
                    min="0"
                    name="stock"
                    value={formData.stock}
                    onChange={handleChange}
                    placeholder="0"
                    className={inputCls}
                  />
                </Field>
                <Field label="Low Stock Alert Threshold">
                  <div className="relative">
                    <HiOutlineTag className="absolute left-2.5 top-1/2 -translate-y-1/2 text-amber-400 text-sm" />
                    <input
                      type="number"
                      min="0"
                      name="minStockAlert"
                      value={formData.minStockAlert}
                      onChange={handleChange}
                      placeholder="5"
                      className="w-full pl-7 pr-3 py-2 text-xs rounded-xl bg-gray-50 border border-gray-200 outline-none focus:border-gray-400 transition"
                    />
                  </div>
                </Field>
              </div>

              {/* Modal Actions */}
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
                  {modalMode === "create"
                    ? "Save to Catalog"
                    : "Update Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Products;
