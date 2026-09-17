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
import { HiOutlineChevronLeft, HiOutlineChevronRight, HiOutlineExclamation, HiOutlineReply } from "react-icons/hi";

const SalesReturns = () => {
  const [returns, setReturns] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0, limit: 10 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const fetchReturns = useCallback(async (pageNumber = 1) => {
    try {
      setLoading(true);
      setError("");
      const params = { page: pageNumber, limit: 10, ...(search && { search }) };
      const res = await API.get("/sales-returns", { params });
      setReturns(res.data?.data?.returns || []);
      setPagination(res.data?.data?.pagination || { page: 1, pages: 1, total: 0, limit: 10 });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load sales returns.");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => fetchReturns(1), 300);
    return () => clearTimeout(timer);
  }, [fetchReturns]);

  return (
    <Layout>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-800">Sales Returns &amp; Credit Notes</h2>
        <p className="text-xs text-gray-400 mt-0.5">Track returned items, stock reversals, and customer refunds ({pagination.total} records)</p>
      </div>

      {error && <div className="mb-4 flex items-center gap-2 bg-rose-50 border border-rose-200 text-[#111111] text-xs p-3 rounded-xl"><HiOutlineExclamation className="shrink-0 text-base" aria-hidden="true" />{error}</div>}

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6">
        <input
          type="text"
          placeholder="Search by Return No, Invoice No, Customer..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 border border-gray-200 outline-none focus:border-gray-400 transition"
        />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-400 uppercase tracking-wider font-semibold border-b border-gray-100">
              <tr>
                <th className="py-3.5 px-4">Return #</th>
                <th className="py-3.5 px-4">Original Invoice</th>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Reason</th>
                <th className="py-3.5 px-4 text-right">Refund Amount</th>
                <th className="py-3.5 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={7} className="text-center py-16 text-gray-400">Loading returns...</td></tr>
              ) : returns.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-16 text-gray-400"><HiOutlineReply className="mx-auto mb-1 block text-2xl" aria-hidden="true" />No sales returns recorded.</td></tr>
              ) : returns.map((r) => (
                <tr key={r._id} className="hover:bg-gray-50/70 transition">
                  <td className="py-3 px-4 font-bold text-gray-900 font-mono">{r.returnNumber}</td>
                  <td className="py-3 px-4 font-mono text-blue-600 font-semibold">{r.invoiceNumber}</td>
                  <td className="py-3 px-4 font-semibold text-gray-800">{r.customerSnapshot?.name || "Customer"}</td>
                  <td className="py-3 px-4 text-gray-500">{new Date(r.returnDate).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}</td>
                  <td className="py-3 px-4 text-gray-600 max-w-[200px] truncate">{r.returnReason}</td>
                  <td className="py-3 px-4 text-right font-black text-[#111111]">-₹{r.refundAmount?.toFixed(2)}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      r.status === "Completed" ? "bg-emerald-50 text-emerald-600"
                      : r.status === "Cancelled" ? "bg-gray-100 text-gray-500 line-through"
                      : "bg-amber-50 text-amber-700"
                    }`}>{r.status}</span>
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
              <button disabled={pagination.page <= 1} onClick={() => fetchReturns(pagination.page - 1)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition"><HiOutlineChevronLeft aria-hidden="true" />Prev</button>
              <button disabled={pagination.page >= pagination.pages} onClick={() => fetchReturns(pagination.page + 1)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition">Next<HiOutlineChevronRight aria-hidden="true" /></button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default SalesReturns;
