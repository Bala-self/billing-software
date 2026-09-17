import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import API from "../services/api";
import { useAuth } from "../context/AuthContext";
import {
  HiOutlineCurrencyRupee,
  HiOutlineShoppingBag,
  HiOutlineTrendingUp,
  HiOutlineTrendingDown,
  HiOutlineRefresh,
  HiOutlinePlus,
  HiOutlineArrowRight,
  HiOutlineExclamation,
  HiOutlineCheckCircle,
  HiOutlineCube,
} from "react-icons/hi";
import { RiBarChartGroupedLine } from "react-icons/ri";

const fmt = (n) =>
  (n ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

const statusBadge = (s) => {
  switch (s) {
    case "Paid":
      return "bg-green-50 text-green-700 border border-green-200";
    case "Partially Paid":
      return "bg-amber-50 text-amber-700 border border-amber-200";
    case "Cancelled":
      return "bg-gray-100 text-gray-500 border border-gray-200";
    default:
      return "bg-red-50 text-red-600 border border-red-200";
  }
};

const KpiCard = ({ label, value, sub, icon: Icon }) => (
  <div className="bg-white rounded-xl p-5 border border-gray-200">
    <div className="flex items-center justify-between mb-3">
      <span className="text-[12px] font-medium text-gray-500">{label}</span>
      <span className="w-8 h-8 rounded-lg bg-[#111111] flex items-center justify-center">
        <Icon className="text-white text-[14px]" />
      </span>
    </div>
    <p className="text-[22px] font-bold text-[#111111]">₹{fmt(value)}</p>
    <p className="text-[11px] text-gray-400 mt-1">{sub}</p>
  </div>
);

const Home = () => {
  const { user, business } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await API.get("/dashboard");
      setData(res.data?.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading && !data) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  const {
    today = {},
    monthToDate = {},
    balances = {},
    counts = {},
    chartData = {},
    feeds = {},
  } = data || {};
  const sevenDays = chartData.sevenDaysTrend || [];
  const maxVal = Math.max(
    ...sevenDays.map((d) => Math.max(d.sales, d.purchases)),
    1,
  );

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-[22px] font-bold text-[#111111]">Dashboard</h1>
        <p className="text-[13px] text-gray-500 mt-1">
          {business?.name} · Good{" "}
          {new Date().getHours() < 12 ? "morning" : "afternoon"},{" "}
          {user?.name?.split(" ")[0]}
        </p>
      </div>

      {error && (
        <div className="mb-5 bg-red-50 border border-red-200 text-red-600 text-[12px] px-4 py-3 rounded-xl flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchData} className="underline font-semibold">
            Retry
          </button>
        </div>
      )}

      <div className="flex gap-3 mb-6">
        <Link
          to="/billing"
          className="bg-[#111111] hover:bg-black text-white px-4 py-2.5 rounded-xl text-[13px] font-semibold flex items-center gap-2"
        >
          <HiOutlinePlus /> New Bill
        </Link>
        <button
          onClick={fetchData}
          className="bg-white border border-gray-200 px-3 py-2.5 rounded-xl hover:bg-gray-50"
        >
          <HiOutlineRefresh className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <KpiCard
          label="Today's Sales"
          value={today.sales}
          sub={`${today.salesCount || 0} orders`}
          icon={HiOutlineCurrencyRupee}
        />
        <KpiCard
          label="Today's Purchases"
          value={today.purchases}
          sub="Inventory inward"
          icon={HiOutlineShoppingBag}
        />
        <KpiCard
          label="Today's Net Profit"
          value={today.netProfit}
          sub="Sales − Purchases"
          icon={
            today.netProfit >= 0 ? HiOutlineTrendingUp : HiOutlineTrendingDown
          }
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          {
            label: "Customer Receivables",
            amount: balances.totalReceivables,
            meta: `${counts.customers || 0} customers`,
            to: "/customers",
          },
          {
            label: "Stock Value",
            amount: balances.inventoryValuationRetail,
            meta: `Cost ₹${fmt(balances.inventoryValuationCost)}`,
            to: "/products",
          },
          {
            label: "MTD Sales",
            amount: monthToDate.sales,
            meta: `Purchases ₹${fmt(monthToDate.purchases)}`,
            to: "/sales",
          },
        ].map((card) => (
          <div
            key={card.label}
            className="bg-white rounded-xl p-5 border border-gray-200"
          >
            <div className="flex justify-between mb-3">
              <span className="text-[12px] text-gray-500">{card.label}</span>
              <Link
                to={card.to}
                className="text-[11px] font-semibold text-[#111111] flex items-center gap-1"
              >
                View <HiOutlineArrowRight />
              </Link>
            </div>
            <p className="text-[20px] font-bold text-[#111111]">
              ₹{fmt(card.amount)}
            </p>
            <p className="text-[11px] text-gray-400 mt-1">{card.meta}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <div className="flex justify-between mb-4">
          <h3 className="text-[13px] font-semibold flex items-center gap-2">
            <RiBarChartGroupedLine /> 7-Day Trend
          </h3>
          <div className="flex gap-3 text-[11px] text-gray-500">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-[#111111] rounded-sm" />
              Sales
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-gray-300 rounded-sm" />
              Purchases
            </span>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-2 items-end h-28 border-b border-gray-100 pb-2">
          {sevenDays.map((day) => {
            const sh = Math.max(Math.round((day.sales / maxVal) * 100), 4);
            const ph = Math.max(Math.round((day.purchases / maxVal) * 100), 4);
            return (
              <div
                key={day.date}
                className="flex flex-col items-center gap-1 h-full justify-end"
              >
                <div className="flex items-end gap-1 h-full">
                  <div
                    style={{ height: `${sh}%` }}
                    className="w-3 bg-[#111111] rounded-t"
                  />
                  <div
                    style={{ height: `${ph}%` }}
                    className="w-3 bg-gray-300 rounded-t"
                  />
                </div>
                <span className="text-[10px] text-gray-400">
                  {new Date(day.date).toLocaleDateString("en-IN", {
                    weekday: "short",
                  })}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 items-start lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden min-w-0">
          <div className="flex justify-between px-5 py-3.5 border-b border-gray-100">
            <h3 className="text-[13px] font-semibold">Recent Invoices</h3>
            <Link
              to="/invoices"
              className="text-[11px] font-semibold text-[#111111]"
            >
              View All
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[12px]">
              <thead className="bg-[#f9fafb] text-gray-500 uppercase text-[10px] border-b">
                <tr>
                  <th className="py-2.5 px-5">Invoice</th>
                  <th className="px-3">Customer</th>
                  <th className="px-3">Date</th>
                  <th className="px-3 text-right">Amount</th>
                  <th className="px-5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(feeds.recentInvoices || []).length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-10 text-center text-gray-400 text-[12px]"
                    >
                      No invoices yet
                    </td>
                  </tr>
                ) : (
                  feeds.recentInvoices.map((inv) => (
                    <tr key={inv._id} className="hover:bg-gray-50">
                      <td className="py-3 px-5 font-mono font-semibold">
                        {inv.invoiceNumber}
                      </td>
                      <td className="px-3">
                        {inv.customerSnapshot?.name || "Walk-in"}
                      </td>
                      <td className="px-3 text-gray-400">
                        {new Date(inv.invoiceDate).toLocaleDateString("en-IN", {
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                      <td className="px-3 text-right font-semibold">
                        ₹{fmt(inv.grandTotal)}
                      </td>
                      <td className="px-5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${statusBadge(inv.status)}`}
                        >
                          {inv.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col min-w-0">
          <div className="flex justify-between px-5 py-3.5 border-b border-gray-100">
            <h3 className="text-[13px] font-semibold flex items-center gap-2">
              <HiOutlineCube /> Stock Alerts
            </h3>
            <span className="bg-gray-100 text-gray-600 text-[10px] px-2 py-0.5 rounded-full">
              {(feeds.lowStockAlerts || []).length} items
            </span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {(feeds.lowStockAlerts || []).length === 0 ? (
              <div className="py-10 text-center">
                <HiOutlineCheckCircle className="text-2xl text-green-400 mx-auto mb-2" />
                <p className="text-[11px] text-gray-400">All well-stocked</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {feeds.lowStockAlerts.map((prod) => (
                  <div
                    key={prod._id}
                    className="px-5 py-3 flex justify-between"
                  >
                    <div>
                      <p className="text-[12px] font-semibold truncate">
                        {prod.name}
                      </p>
                      <p className="text-[10px] text-gray-400">
                        SKU {prod.sku || "N/A"}
                      </p>
                    </div>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded ${prod.stock <= 0 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}
                    >
                      {prod.stock <= 0 ? "Out" : `${prod.stock} left`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Home;
