import { useState, useEffect, useCallback } from "react";
import Layout from "../components/Layout";
import API from "../services/api";
import { HiOutlineChartBar, HiOutlineChevronLeft, HiOutlineChevronRight, HiOutlineExclamation } from "react-icons/hi";

const Sales = () => {
  const [invoices, setInvoices] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0, limit: 10 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchSales = useCallback(async (pageNumber = 1) => {
    try {
      setLoading(true);
      setError("");
      const params = {
        page: pageNumber,
        limit: 10,
        ...(search && { search }),
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
      };
      const res = await API.get("/invoices", { params });
      setInvoices(res.data?.data?.invoices || []);
      setPagination(res.data?.data?.pagination || { page: 1, pages: 1, total: 0, limit: 10 });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load sales data.");
    } finally {
      setLoading(false);
    }
  }, [search, startDate, endDate]);

  useEffect(() => {
    const timer = setTimeout(() => fetchSales(1), 300);
    return () => clearTimeout(timer);
  }, [fetchSales]);

  // These totals cover the invoices on the CURRENT PAGE only (limit 10)
  const pageRevenue = invoices.reduce((acc, inv) => acc + (inv.grandTotal || 0), 0);
  const pageTax = invoices.reduce((acc, inv) => acc + (inv.totalTax || 0), 0);

  return (
    <Layout>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-800">Sales Register</h2>
        <p className="text-xs text-gray-400 mt-0.5">Complete sales transaction history with tax and payment tracking</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-[10px] uppercase font-bold text-gray-400">Revenue (This Page)</p>
          <p className="text-xl font-black text-gray-900 mt-1">₹{pageRevenue.toLocaleString("en-IN")}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-[10px] uppercase font-bold text-gray-400">Tax (This Page)</p>
          <p className="text-xl font-black text-blue-600 mt-1">₹{pageTax.toLocaleString("en-IN")}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-[10px] uppercase font-bold text-gray-400">Transactions</p>
          <p className="text-xl font-black text-gray-900 mt-1">{pagination.total}</p>
        </div>
      </div>

      {error && <div className="mb-4 flex items-center gap-2 bg-rose-50 border border-rose-200 text-[#111111] text-xs p-3 rounded-xl"><HiOutlineExclamation className="shrink-0 text-base" aria-hidden="true" />{error}</div>}

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <input type="text" placeholder="Search Invoice, Customer..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 border border-gray-200 outline-none focus:border-gray-400 transition" />
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 border border-gray-200 outline-none focus:border-gray-400 transition" />
        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 border border-gray-200 outline-none focus:border-gray-400 transition" />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-400 uppercase tracking-wider font-semibold border-b border-gray-100">
              <tr>
                <th className="py-3.5 px-4">Invoice #</th>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4 text-right">Taxable</th>
                <th className="py-3.5 px-4 text-right">GST</th>
                <th className="py-3.5 px-4 text-right">Grand Total</th>
                <th className="py-3.5 px-4 text-center">Payment</th>
                <th className="py-3.5 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={8} className="text-center py-16 text-gray-400"><div className="flex flex-col items-center gap-2"><div className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>Loading sales...</div></td></tr>
              ) : invoices.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-16 text-gray-400"><HiOutlineChartBar className="mx-auto mb-1 block text-2xl" aria-hidden="true" />No sales records found.</td></tr>
              ) : invoices.map((inv) => (
                <tr key={inv._id} className="hover:bg-gray-50/70 transition">
                  <td className="py-3 px-4 font-bold text-gray-900 font-mono">{inv.invoiceNumber}</td>
                  <td className="py-3 px-4 font-semibold text-gray-800">{inv.customerSnapshot?.name || "Walk-in"}</td>
                  <td className="py-3 px-4 text-gray-500">{new Date(inv.invoiceDate).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}</td>
                  <td className="py-3 px-4 text-right font-medium text-gray-700">₹{inv.taxableAmount?.toFixed(2)}</td>
                  <td className="py-3 px-4 text-right font-medium text-blue-600">₹{inv.totalTax?.toFixed(2)}</td>
                  <td className="py-3 px-4 text-right font-black text-gray-900">₹{inv.grandTotal?.toFixed(2)}</td>
                  <td className="py-3 px-4 text-center text-gray-600">{inv.paymentMethod}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      inv.status === "Paid" ? "bg-emerald-50 text-emerald-600"
                      : inv.status === "Partially Paid" ? "bg-amber-100 text-amber-800"
                      : inv.status === "Cancelled" ? "bg-gray-100 text-gray-500 line-through"
                      : "bg-rose-50 text-[#111111]"
                    }`}>{inv.status}</span>
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
              <button disabled={pagination.page <= 1} onClick={() => fetchSales(pagination.page - 1)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition"><HiOutlineChevronLeft aria-hidden="true" />Prev</button>
              <button disabled={pagination.page >= pagination.pages} onClick={() => fetchSales(pagination.page + 1)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition">Next<HiOutlineChevronRight aria-hidden="true" /></button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Sales;
