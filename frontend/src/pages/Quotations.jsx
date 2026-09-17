import { useState, useEffect, useCallback } from "react";
import Layout from "../components/Layout";
import API from "../services/api";
import { useAuth } from "../context/AuthContext";
import {
  HiOutlineCheckCircle,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineClipboardList,
  HiOutlineExclamation,
  HiOutlinePrinter,
  HiOutlineX,
} from "react-icons/hi";

const Quotations = () => {
  const { hasPermission } = useAuth();

  const [quotations, setQuotations] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0, limit: 10 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [viewQuotation, setViewQuotation] = useState(null);

  const fetchQuotations = useCallback(async (pageNumber = 1) => {
    try {
      setLoading(true);
      setError("");
      const params = {
        page: pageNumber,
        limit: 10,
        ...(search && { search }),
        ...(status && { status }),
      };
      const res = await API.get("/quotations", { params });
      setQuotations(res.data?.data?.quotations || []);
      setPagination(res.data?.data?.pagination || { page: 1, pages: 1, total: 0, limit: 10 });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load quotations.");
    } finally {
      setLoading(false);
    }
  }, [search, status]);

  useEffect(() => {
    const timer = setTimeout(() => fetchQuotations(1), 300);
    return () => clearTimeout(timer);
  }, [fetchQuotations]);

  const handleCancel = async (q) => {
    if (!window.confirm(`Cancel quotation ${q.quotationNumber}?`)) return;
    try {
      await API.put(`/quotations/${q._id}/cancel`);
      setSuccessMessage(`Quotation ${q.quotationNumber} cancelled.`);
      fetchQuotations(pagination.page);
      setTimeout(() => setSuccessMessage(""), 4000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to cancel.");
    }
  };

  const handleConvert = async (q) => {
    if (!window.confirm(`Convert ${q.quotationNumber} to a Tax Invoice? This will deduct stock and create a billing record.`)) return;
    try {
      const res = await API.post(`/quotations/${q._id}/convert`, { paymentMethod: "Credit", paidAmount: 0 });
      setSuccessMessage(`Converted to Invoice ${res.data?.data?.invoice?.invoiceNumber}!`);
      fetchQuotations(pagination.page);
      setTimeout(() => setSuccessMessage(""), 6000);
    } catch (err) {
      setError(err.response?.data?.message || "Conversion failed.");
    }
  };

  const statusColor = (s) => {
    switch (s) {
      case "Draft": return "bg-gray-100 text-gray-600";
      case "Sent": return "bg-blue-50 text-blue-600";
      case "Accepted": return "bg-emerald-50 text-emerald-600";
      case "Converted": return "bg-purple-50 text-purple-700";
      case "Expired": return "bg-amber-100 text-amber-800";
      case "Cancelled": return "bg-rose-50 text-[#111111] line-through";
      default: return "bg-gray-100 text-gray-600";
    }
  };

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Quotations &amp; Estimates</h2>
          <p className="text-xs text-gray-400 mt-0.5">Pre-sales estimates that can be converted to invoices ({pagination.total} records)</p>
        </div>
      </div>

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

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Search</label>
          <input type="text" placeholder="Quotation No, Customer..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 border border-gray-200 outline-none focus:border-gray-400 transition" />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 border border-gray-200 outline-none focus:border-gray-400 transition">
            <option value="">All Statuses</option>
            {["Draft", "Sent", "Accepted", "Converted", "Expired", "Cancelled"].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-400 uppercase tracking-wider font-semibold border-b border-gray-100">
              <tr>
                <th className="py-3.5 px-4">Quotation #</th>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Valid Until</th>
                <th className="py-3.5 px-4 text-right">Est. Total</th>
                <th className="py-3.5 px-4 text-center">Version</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={8} className="text-center py-16 text-gray-400"><div className="flex flex-col items-center gap-2"><div className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>Loading...</div></td></tr>
              ) : quotations.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-16 text-gray-400"><HiOutlineClipboardList className="mx-auto mb-1 block text-2xl" aria-hidden="true" />No quotations found.</td></tr>
              ) : quotations.map((q) => (
                <tr key={q._id} className="hover:bg-gray-50/70 transition">
                  <td className="py-3 px-4 font-bold text-gray-900 font-mono">{q.quotationNumber}</td>
                  <td className="py-3 px-4 font-semibold text-gray-800">{q.customerSnapshot?.name || "Customer"}</td>
                  <td className="py-3 px-4 text-gray-500">{new Date(q.quotationDate).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}</td>
                  <td className="py-3 px-4 text-gray-500">{new Date(q.validUntil).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}</td>
                  <td className="py-3 px-4 text-right font-black text-gray-900">₹{q.grandTotal?.toFixed(2)}</td>
                  <td className="py-3 px-4 text-center text-gray-500">v{q.version}</td>
                  <td className="py-3 px-4 text-center"><span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${statusColor(q.status)}`}>{q.status}</span></td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button onClick={() => setViewQuotation(q)} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded text-[11px] font-semibold transition">View</button>
                      <a href={`${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/quotations/${q._id}/pdf`} target="_blank" rel="noreferrer" className="bg-slate-800 hover:bg-black text-white px-2 py-1 rounded text-[11px] font-semibold transition">PDF</a>
                      {["Draft", "Sent", "Accepted"].includes(q.status) && hasPermission("invoice.create") && (
                        <button onClick={() => handleConvert(q)} className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-[11px] font-semibold transition">Convert</button>
                      )}
                      {["Draft", "Sent"].includes(q.status) && (
                        <button onClick={() => handleCancel(q)} className="bg-rose-50 hover:bg-gray-100 text-[#111111] px-2 py-1 rounded text-[11px] font-semibold transition">Cancel</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pagination.pages > 1 && (
          <div className="p-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>Page <b>{pagination.page}</b> of <b>{pagination.pages}</b></span>
            <div className="flex gap-1.5">
              <button disabled={pagination.page <= 1} onClick={() => fetchQuotations(pagination.page - 1)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition"><HiOutlineChevronLeft aria-hidden="true" />Prev</button>
              <button disabled={pagination.page >= pagination.pages} onClick={() => fetchQuotations(pagination.page + 1)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition">Next<HiOutlineChevronRight aria-hidden="true" /></button>
            </div>
          </div>
        )}
      </div>

      {viewQuotation && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-gray-100 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-4">
              <div>
                <h3 className="text-base font-bold text-gray-900">Quotation {viewQuotation.quotationNumber}</h3>
                <p className="text-xs text-gray-400">v{viewQuotation.version} • {viewQuotation.status} • Valid until {new Date(viewQuotation.validUntil).toLocaleDateString("en-IN")}</p>
              </div>
              <button onClick={() => setViewQuotation(null)} className="text-gray-400 hover:text-gray-600 font-bold text-lg p-1" aria-label="Close quotation details"><HiOutlineX /></button>
            </div>
            <div className="border border-gray-100 rounded-2xl overflow-hidden mb-4">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-gray-400 uppercase tracking-wider font-semibold border-b border-gray-100">
                  <tr><th className="py-2.5 px-3">Item</th><th className="py-2.5 px-3 text-center">Qty</th><th className="py-2.5 px-3 text-right">Rate</th><th className="py-2.5 px-3 text-center">GST%</th><th className="py-2.5 px-3 text-right">Total</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {viewQuotation.items?.map((item, i) => (
                    <tr key={i}><td className="py-2.5 px-3 font-semibold text-gray-800">{item.name}</td><td className="py-2.5 px-3 text-center font-bold">{item.quantity}</td><td className="py-2.5 px-3 text-right text-gray-600">₹{item.unitPrice.toFixed(2)}</td><td className="py-2.5 px-3 text-center text-blue-600 font-bold">{item.taxRate}%</td><td className="py-2.5 px-3 text-right font-black text-gray-900">₹{item.total.toFixed(2)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end">
              <div className="w-56 bg-gray-50 p-3 rounded-2xl border border-gray-100 text-xs space-y-1">
                <div className="flex justify-between font-black text-gray-900 text-sm"><span>Estimated Total:</span><span>₹{viewQuotation.grandTotal?.toFixed(2)}</span></div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 mt-4">
              <a href={`${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/quotations/${viewQuotation._id}/pdf`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 bg-slate-900 hover:bg-black text-white px-4 py-2 rounded-xl text-xs font-bold transition"><HiOutlinePrinter className="text-base" aria-hidden="true" />Print PDF</a>
              <button onClick={() => setViewQuotation(null)} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-xl text-xs font-semibold transition">Close</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Quotations;
