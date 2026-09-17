import { useState, useEffect, useCallback } from "react";
import Layout from "../components/Layout";
import API from "../services/api";
import {
  HiOutlinePlus,
  HiOutlineSearch,
  HiOutlineX,
  HiOutlineDocumentText,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlinePrinter,
  HiOutlineBan,
  HiOutlineEye,
  HiOutlineTrash,
  HiOutlineMinus,
} from "react-icons/hi";
import { RiLoader4Line } from "react-icons/ri";

const fmt = (n) => (n ?? 0).toFixed(2);
const fmtN = (n) => (n ?? 0).toLocaleString("en-IN");
const fmtDate = (d) =>
  new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const STATUS_CLS = {
  Paid: "bg-green-50 text-green-700 border border-green-200",
  "Partially Paid": "bg-amber-50 text-amber-700 border border-amber-200",
  Unpaid: "bg-red-50 text-red-600 border border-red-200",
  Cancelled: "bg-gray-100 text-gray-500 border border-gray-200",
};

const Invoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    pages: 1,
    total: 0,
    limit: 10,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [viewInvoice, setViewInvoice] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);

  // Create Invoice - inside invoice page (separate from billing)
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [cart, setCart] = useState([]);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const fetchInvoices = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const params = {
          page,
          limit: 10,
          ...(search && { search }),
          ...(status && { status }),
        };
        const res = await API.get("/invoices", { params });
        setInvoices(res.data?.data?.invoices || []);
        setPagination(
          res.data?.data?.pagination || {
            page: 1,
            pages: 1,
            total: 0,
            limit: 10,
          },
        );
      } catch {
      } finally {
        setLoading(false);
      }
    },
    [search, status],
  );

  useEffect(() => {
    const t = setTimeout(() => fetchInvoices(1), 300);
    return () => clearTimeout(t);
  }, [fetchInvoices]);

  // Fetch customers and products for create invoice
  useEffect(() => {
    if (!isCreateOpen) return;
    API.get("/customers", { params: { limit: 100 } })
      .then((r) => setCustomers(r.data?.data?.customers || []))
      .catch(() => {});
  }, [isCreateOpen, customerSearch]);

  useEffect(() => {
    if (!isCreateOpen || !productSearch.trim()) {
      setProducts([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await API.get("/products", {
          params: { search: productSearch.trim(), limit: 8 },
        });
        setProducts(res.data?.data?.products || []);
      } catch {}
    }, 250);
    return () => clearTimeout(t);
  }, [productSearch, isCreateOpen]);

  const addToCart = (prod) => {
    setCart((prev) => {
      const idx = prev.findIndex((i) => i.product._id === prod._id);
      if (idx > -1) {
        const upd = [...prev];
        upd[idx] = { ...upd[idx], quantity: upd[idx].quantity + 1 };
        return upd;
      }
      return [
        ...prev,
        {
          product: prod,
          quantity: 1,
          unitPrice: prod.sellingPrice,
          taxRate: prod.taxRate,
        },
      ];
    });
    setProductSearch("");
    setProducts([]);
  };

  const calc = (() => {
    let subtotal = 0,
      cgst = 0,
      sgst = 0,
      tax = 0;
    cart.forEach((item) => {
      const gross = item.unitPrice * item.quantity;
      const rate = item.taxRate || 0;
      const c = (gross * rate) / 200;
      const s = (gross * rate) / 200;
      subtotal += gross;
      cgst += c;
      sgst += s;
      tax += c + s;
    });
    return {
      subtotal,
      cgst,
      sgst,
      tax,
      grandTotal: Math.round(subtotal + tax),
      count: cart.length,
    };
  })();

  const handleCreateInvoice = async () => {
    setCreateError("");
    if (!selectedCustomer) {
      setCreateError("Select customer");
      return;
    }
    if (cart.length === 0) {
      setCreateError("Add at least one product");
      return;
    }
    try {
      setCreating(true);
      const payload = {
        customerId: selectedCustomer._id,
        items: cart.map((i) => ({
          productId: i.product._id,
          quantity: i.quantity,
        })),
        paidAmount: calc.grandTotal,
        paymentMethod: "Cash",
        notes: "Created from Invoice page - Tamil Nadu GST",
      };
      const res = await API.post("/invoices", payload);
      setIsCreateOpen(false);
      setCart([]);
      setSelectedCustomer(null);
      fetchInvoices(1);
    } catch (err) {
      setCreateError(err.response?.data?.message || "Failed to create invoice");
    } finally {
      setCreating(false);
    }
  };

  const handleCancel = async (inv) => {
    if (!window.confirm(`Cancel ${inv.invoiceNumber}?`)) return;
    try {
      setCancellingId(inv._id);
      await API.put(`/invoices/${inv._id}/cancel`);
      fetchInvoices(pagination.page);
      if (viewInvoice?._id === inv._id) setViewInvoice(null);
    } catch {
    } finally {
      setCancellingId(null);
    }
  };

  const handlePrintPdf = async (invoiceId) => {
    const printWindow = window.open("about:blank", "_blank");
    try {
      const response = await API.get(`/invoices/${invoiceId}/pdf`, {
        responseType: "blob",
      });
      const pdfUrl = URL.createObjectURL(response.data);
      if (printWindow) {
        printWindow.location.href = pdfUrl;
        printWindow.focus();
      } else {
        const link = document.createElement("a");
        link.href = pdfUrl;
        link.download = "invoice.pdf";
        link.click();
      }
      window.setTimeout(() => URL.revokeObjectURL(pdfUrl), 60000);
    } catch (err) {
      printWindow?.close();
      setCreateError(
        err.response?.data?.message || "Unable to generate invoice PDF",
      );
    }
  };

  const inputCls =
    "w-full px-3 py-2.5 text-[12px] rounded-xl bg-white border border-gray-200 outline-none focus:border-gray-400";

  return (
    <Layout>
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-[22px] font-bold text-[#111]">Invoices</h1>
          <p className="text-[13px] text-gray-500 mt-1">
            {pagination.total} GST invoices • Separate from BILL- history •
            Tamil Nadu CGST+SGST plan
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsCreateOpen(true)}
            className="bg-[#111] hover:bg-black text-white px-4 py-2.5 rounded-xl text-[12px] font-bold flex items-center gap-2"
          >
            <HiOutlinePlus /> Create Invoice
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
            Search Invoices
          </label>
          <div className="relative">
            <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="INV- number, customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2.5 text-[12px] rounded-xl border border-gray-200 outline-none focus:border-gray-400"
            />
          </div>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
            Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className={inputCls}
          >
            <option value="">All Status</option>
            <option>Paid</option>
            <option>Partially Paid</option>
            <option>Unpaid</option>
            <option>Cancelled</option>
          </select>
        </div>
        <div className="flex items-end">
          <div className="bg-[#f9fafb] border border-gray-200 rounded-xl px-4 py-2.5 text-[11px] text-gray-600">
            <span className="font-bold text-[#111]">INV-</span> invoices
            separate from <span className="font-bold">BILL-</span> POS history
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[12px]">
            <thead className="bg-[#f9fafb] text-gray-500 uppercase text-[10px] border-b">
              <tr>
                <th className="py-3 px-4">Invoice No (INV-)</th>
                <th className="px-3">Customer</th>
                <th className="px-3">Date</th>
                <th className="px-3 text-right">Taxable</th>
                <th className="px-3 text-right">GST (CGST+SGST)</th>
                <th className="px-3 text-right">Total</th>
                <th className="px-3 text-center">Status</th>
                <th className="px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-20 text-center text-gray-400">
                    <RiLoader4Line className="animate-spin mx-auto text-xl mb-2" />
                    Loading invoices...
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-20 text-center text-gray-400">
                    <HiOutlineDocumentText className="mx-auto text-3xl mb-2" />
                    No invoices • Create invoice inside this page
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv._id} className="hover:bg-gray-50">
                    <td className="py-3 px-4 font-mono font-bold text-[#111]">
                      {inv.invoiceNumber}
                    </td>
                    <td className="px-3">
                      <p className="font-semibold">
                        {inv.customerSnapshot?.name || "Walk-in"}
                      </p>
                      <p className="text-[10px] text-gray-400">
                        {inv.customerSnapshot?.phone || ""}
                      </p>
                    </td>
                    <td className="px-3 text-gray-600">
                      {fmtDate(inv.invoiceDate)}
                    </td>
                    <td className="px-3 text-right">
                      ₹{fmt(inv.taxableAmount)}
                    </td>
                    <td className="px-3 text-right">
                      <div className="text-[11px]">
                        <div>CGST ₹{fmt(inv.totalCgst)}</div>
                        <div>SGST ₹{fmt(inv.totalSgst)}</div>
                      </div>
                      <div className="font-bold">₹{fmt(inv.totalTax)}</div>
                    </td>
                    <td className="px-3 text-right font-bold text-[#111]">
                      ₹{fmtN(inv.grandTotal)}
                    </td>
                    <td className="px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_CLS[inv.status]}`}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => setViewInvoice(inv)}
                          className="p-2 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg"
                        >
                          <HiOutlineEye />
                        </button>
                        <button
                          onClick={() => handlePrintPdf(inv._id)}
                          className="p-2 bg-[#111] text-white hover:bg-black rounded-lg"
                          title="Print invoice"
                        >
                          <HiOutlinePrinter />
                        </button>
                        {inv.status !== "Cancelled" && (
                          <button
                            disabled={cancellingId === inv._id}
                            onClick={() => handleCancel(inv)}
                            className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg"
                          >
                            <HiOutlineBan />
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
        {pagination.pages > 1 && (
          <div className="p-3 border-t flex justify-between items-center text-[11px] text-gray-500">
            <span>
              Page {pagination.page} of {pagination.pages} • {pagination.total}{" "}
              invoices (INV- separate from BILL-)
            </span>
            <div className="flex gap-1.5">
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchInvoices(pagination.page - 1)}
                className="px-3 py-1.5 rounded-lg border disabled:opacity-40 hover:bg-gray-50 flex items-center gap-1"
              >
                <HiOutlineChevronLeft />
                Prev
              </button>
              <button
                disabled={pagination.page >= pagination.pages}
                onClick={() => fetchInvoices(pagination.page + 1)}
                className="px-3 py-1.5 rounded-lg border disabled:opacity-40 hover:bg-gray-50 flex items-center gap-1"
              >
                Next
                <HiOutlineChevronRight />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create Invoice Modal - Inside Invoice Page */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl border my-8">
            <div className="flex justify-between items-center px-6 py-4 border-b">
              <div>
                <h3 className="text-[14px] font-bold">
                  Create Invoice - Inside Invoice Page
                </h3>
                <p className="text-[11px] text-gray-500">
                  INV- invoices separate from BILL- POS history • Tamil Nadu GST
                </p>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <HiOutlineX />
              </button>
            </div>
            {createError && (
              <div className="mx-6 mt-4 bg-red-50 border border-red-200 text-red-600 text-[11px] px-3 py-2 rounded-xl">
                {createError}
              </div>
            )}
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">
                  Select Customer *
                </label>
                <select
                  value={selectedCustomer?._id || ""}
                  onChange={(e) => {
                    const c = customers.find((x) => x._id === e.target.value);
                    setSelectedCustomer(c);
                  }}
                  className={inputCls}
                >
                  <option value="">-- Choose Customer --</option>
                  {customers.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name} • {c.phone}
                    </option>
                  ))}
                </select>
                {selectedCustomer && (
                  <p className="text-[11px] text-gray-500 mt-1">
                    {selectedCustomer.name} • {selectedCustomer.phone} •{" "}
                    {selectedCustomer.billingAddress?.state || "Tamil Nadu"}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">
                  Search Products *
                </label>
                <div className="relative">
                  <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search product name / SKU..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-2.5 text-[12px] rounded-xl border border-gray-200 outline-none focus:border-gray-400"
                  />
                </div>
                {products.length > 0 && (
                  <div className="mt-2 border border-gray-200 rounded-xl max-h-[160px] overflow-y-auto divide-y divide-gray-50">
                    {products.map((p) => (
                      <button
                        key={p._id}
                        onClick={() => addToCart(p)}
                        className="w-full text-left px-3 py-2 hover:bg-gray-50 flex justify-between items-center text-[12px]"
                      >
                        <div>
                          <p className="font-semibold">{p.name}</p>
                          <p className="text-[10px] text-gray-400">
                            {p.sku} • {p.taxRate}% GST • Stock {p.stock}
                          </p>
                        </div>
                        <span className="font-bold">
                          ₹{fmt(p.sellingPrice)}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="bg-[#f9fafb] px-4 py-2 text-[11px] font-bold text-gray-600 flex justify-between">
                  <span>Items ({cart.length}) - Tamil Nadu CGST+SGST</span>
                  <span>
                    ₹{fmt(calc.subtotal)} + ₹{fmt(calc.tax)} GST = ₹
                    {fmtN(calc.grandTotal)}
                  </span>
                </div>
                <div className="divide-y divide-gray-50 max-h-[200px] overflow-y-auto">
                  {cart.length === 0 ? (
                    <div className="py-8 text-center text-gray-400 text-[11px]">
                      No items - search and add
                    </div>
                  ) : (
                    cart.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between px-4 py-2 text-[12px]"
                      >
                        <div>
                          <p className="font-medium">{item.product.name}</p>
                          <p className="text-[10px] text-gray-400">
                            {item.taxRate}% GST
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                            <button
                              onClick={() =>
                                setCart((prev) => {
                                  const u = [...prev];
                                  if (u[idx].quantity > 1) u[idx].quantity--;
                                  return u;
                                })
                              }
                              className="w-6 h-6 flex items-center justify-center hover:bg-gray-50"
                            >
                              <HiOutlineMinus className="text-[10px]" />
                            </button>
                            <span className="w-8 h-6 flex items-center justify-center font-bold border-x text-[11px]">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() =>
                                setCart((prev) => {
                                  const u = [...prev];
                                  u[idx].quantity++;
                                  return u;
                                })
                              }
                              className="w-6 h-6 flex items-center justify-center hover:bg-gray-50"
                            >
                              <HiOutlinePlus className="text-[10px]" />
                            </button>
                          </div>
                          <span className="font-bold w-[70px] text-right">
                            ₹{fmt(item.unitPrice * item.quantity)}
                          </span>
                          <button
                            onClick={() =>
                              setCart((prev) =>
                                prev.filter((_, i) => i !== idx),
                              )
                            }
                            className="p-1 hover:bg-red-50 text-red-500 rounded"
                          >
                            <HiOutlineTrash />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                {cart.length > 0 && (
                  <div className="bg-[#111] text-white p-3 text-[11px] space-y-1">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>₹{fmt(calc.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-gray-300">
                      <span>CGST</span>
                      <span>₹{fmt(calc.cgst)}</span>
                    </div>
                    <div className="flex justify-between text-gray-300">
                      <span>SGST</span>
                      <span>₹{fmt(calc.sgst)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-[13px] pt-1 border-t border-gray-700">
                      <span>Total (INV-)</span>
                      <span>₹{fmtN(calc.grandTotal)}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <button
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2.5 text-[12px] border border-gray-200 rounded-xl hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateInvoice}
                  disabled={creating || cart.length === 0}
                  className="bg-[#111] hover:bg-black disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-[12px] font-bold flex items-center gap-2"
                >
                  {creating && <RiLoader4Line className="animate-spin" />}Create
                  Invoice (INV-)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {viewInvoice && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl border my-8">
            <div className="flex justify-between items-center px-6 py-4 border-b">
              <div>
                <h3 className="text-[14px] font-bold">
                  Invoice {viewInvoice.invoiceNumber}
                </h3>
                <p className="text-[11px] text-gray-500">
                  {fmtDate(viewInvoice.invoiceDate)} •{" "}
                  {viewInvoice.isInterstate ? "IGST" : "CGST+SGST Tamil Nadu"} •
                  Separate from BILL-
                </p>
              </div>
              <button
                onClick={() => setViewInvoice(null)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <HiOutlineX />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 bg-[#f9fafb] border p-4 rounded-xl text-[12px]">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">
                    Customer
                  </p>
                  <p className="font-bold">
                    {viewInvoice.customerSnapshot?.name}
                  </p>
                  <p className="text-gray-500">
                    {viewInvoice.customerSnapshot?.phone}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">
                    Tax Plan
                  </p>
                  <p className="font-bold">Tamil Nadu Intra-State</p>
                  <p className="text-[11px]">
                    CGST ₹{fmt(viewInvoice.totalCgst)} + SGST ₹
                    {fmt(viewInvoice.totalSgst)} = ₹{fmt(viewInvoice.totalTax)}
                  </p>
                </div>
              </div>
              <div className="border rounded-xl overflow-hidden">
                <table className="w-full text-left text-[12px]">
                  <thead className="bg-[#f9fafb] text-gray-500 uppercase text-[10px] border-b">
                    <tr>
                      <th className="py-2 px-4">Item</th>
                      <th className="px-3 text-right">Rate</th>
                      <th className="px-3 text-center">Qty</th>
                      <th className="px-4 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {(viewInvoice.items || []).map((it, i) => (
                      <tr key={i}>
                        <td className="py-2 px-4">{it.name}</td>
                        <td className="px-3 text-right">
                          ₹{fmt(it.unitPrice)}
                        </td>
                        <td className="px-3 text-center">{it.quantity}</td>
                        <td className="px-4 text-right font-bold">
                          ₹{fmt(it.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end">
                <div className="w-64 bg-[#f9fafb] border rounded-xl p-4 text-[12px] space-y-1">
                  <div className="flex justify-between">
                    <span>CGST</span>
                    <span>₹{fmt(viewInvoice.totalCgst)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>SGST</span>
                    <span>₹{fmt(viewInvoice.totalSgst)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-[#111] pt-2 border-t">
                    <span>Total</span>
                    <span>₹{fmtN(viewInvoice.grandTotal)}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              <button
                onClick={() => handlePrintPdf(viewInvoice._id)}
                className="bg-[#111] text-white px-4 py-2.5 rounded-xl text-[12px] font-bold"
              >
                Print PDF
              </button>
              <button
                onClick={() => setViewInvoice(null)}
                className="px-4 py-2.5 border rounded-xl text-[12px]"
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

export default Invoices;
