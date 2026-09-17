const mongoose = require("mongoose");
const Invoice = require("../models/Invoice");
const Purchase = require("../models/Purchase");
const Product = require("../models/Product");
const Customer = require("../models/Customer");
const Supplier = require("../models/Supplier");
const ApiResponse = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");

/**
 * @desc    Live dashboard KPIs & charts
 * @route   GET /api/dashboard
 * @access  Private
 */
exports.getDashboardStats = asyncHandler(async (req, res) => {
  const businessId = new mongoose.Types.ObjectId(req.businessId);

  // Time boundaries: today, start of this month, last 7 days
  const now = new Date();

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

  const startOf7DaysAgo = new Date();
  startOf7DaysAgo.setDate(startOf7DaysAgo.getDate() - 6);
  startOf7DaysAgo.setHours(0, 0, 0, 0);

  // Run the independent queries in parallel
  const [
    todaySalesAgg,
    todayPurchasesAgg,
    mtdSalesAgg,
    mtdPurchasesAgg,
    receivablesAgg,
    payablesAgg,
    stockValuationAgg,
    lowStockAlerts,
    recentInvoices,
    weeklySalesTrend,
    weeklyPurchasesTrend,
    entityCounts,
  ] = await Promise.all([
    // Today's sales (cancelled invoices excluded)
    Invoice.aggregate([
      {
        $match: {
          businessId,
          status: { $ne: "Cancelled" },
          invoiceDate: { $gte: startOfToday, $lte: endOfToday },
        },
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$grandTotal" },
          count: { $sum: 1 },
        },
      },
    ]),

    // Today's purchases
    Purchase.aggregate([
      {
        $match: {
          businessId,
          status: { $ne: "Cancelled" },
          purchaseDate: { $gte: startOfToday, $lte: endOfToday },
        },
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$grandTotal" },
          count: { $sum: 1 },
        },
      },
    ]),

    // Month-to-date sales
    Invoice.aggregate([
      {
        $match: {
          businessId,
          status: { $ne: "Cancelled" },
          invoiceDate: { $gte: startOfMonth },
        },
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$grandTotal" },
          count: { $sum: 1 },
        },
      },
    ]),

    // Month-to-date purchases
    Purchase.aggregate([
      {
        $match: {
          businessId,
          status: { $ne: "Cancelled" },
          purchaseDate: { $gte: startOfMonth },
        },
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$grandTotal" },
          count: { $sum: 1 },
        },
      },
    ]),

    // Total owed to us by customers
    Customer.aggregate([
      { $match: { businessId, isActive: true } },
      { $group: { _id: null, total: { $sum: "$outstandingBalance" } } },
    ]),

    // Total we owe to suppliers
    Supplier.aggregate([
      { $match: { businessId, isActive: true } },
      { $group: { _id: null, total: { $sum: "$payableBalance" } } },
    ]),

    // Stock valuation (at cost and at retail)
    Product.aggregate([
      { $match: { businessId, isActive: true } },
      {
        $group: {
          _id: null,
          valuationAtCost: { $sum: { $multiply: ["$stock", "$purchasePrice"] } },
          valuationAtRetail: { $sum: { $multiply: ["$stock", "$sellingPrice"] } },
          totalStockUnits: { $sum: "$stock" },
        },
      },
    ]),

    // Low / out of stock products (top 6, worst first)
    Product.find({
      businessId,
      isActive: true,
      $or: [{ status: "Low Stock" }, { status: "Out of Stock" }],
    })
      .select("name sku stock minStockAlert status sellingPrice")
      .sort({ stock: 1 })
      .limit(6),

    // Latest 5 invoices
    Invoice.find({ businessId })
      .select("invoiceNumber customerSnapshot grandTotal status paymentMethod invoiceDate dueAmount")
      .sort({ createdAt: -1 })
      .limit(5),

    // Sales per day for the last 7 days
    Invoice.aggregate([
      {
        $match: {
          businessId,
          status: { $ne: "Cancelled" },
          invoiceDate: { $gte: startOf7DaysAgo },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$invoiceDate" } },
          salesAmount: { $sum: "$grandTotal" },
          invoiceCount: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),

    // Purchases per day for the last 7 days
    Purchase.aggregate([
      {
        $match: {
          businessId,
          status: { $ne: "Cancelled" },
          purchaseDate: { $gte: startOf7DaysAgo },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$purchaseDate" } },
          purchaseAmount: { $sum: "$grandTotal" },
          orderCount: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),

    // Master entity counts
    Promise.all([
      Customer.countDocuments({ businessId, isActive: true }),
      Supplier.countDocuments({ businessId, isActive: true }),
      Product.countDocuments({ businessId, isActive: true }),
    ]),
  ]);

  const todaySales = todaySalesAgg[0]?.totalAmount || 0;
  const todayPurchases = todayPurchasesAgg[0]?.totalAmount || 0;
  const todayProfit = Number((todaySales - todayPurchases).toFixed(2));

  // Build the 7-day chart series, filling missing days with 0
  const last7DaysChart = [];
  for (let i = 6; i >= 0; i--) {
    const day = new Date();
    day.setDate(day.getDate() - i);
    const dateStr = day.toISOString().split("T")[0]; // "YYYY-MM-DD"
    const label = day.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });

    const salesEntry = weeklySalesTrend.find((item) => item._id === dateStr);
    const purchaseEntry = weeklyPurchasesTrend.find((item) => item._id === dateStr);

    last7DaysChart.push({
      date: dateStr,
      label,
      sales: salesEntry ? salesEntry.salesAmount : 0,
      purchases: purchaseEntry ? purchaseEntry.purchaseAmount : 0,
    });
  }

  res.status(200).json(
    new ApiResponse(
      200,
      {
        today: {
          sales: todaySales,
          salesCount: todaySalesAgg[0]?.count || 0,
          purchases: todayPurchases,
          netProfit: todayProfit,
        },
        monthToDate: {
          sales: mtdSalesAgg[0]?.totalAmount || 0,
          salesCount: mtdSalesAgg[0]?.count || 0,
          purchases: mtdPurchasesAgg[0]?.totalAmount || 0,
        },
        balances: {
          totalReceivables: Number((receivablesAgg[0]?.total || 0).toFixed(2)),
          totalPayables: Number((payablesAgg[0]?.total || 0).toFixed(2)),
          inventoryValuationCost: Number((stockValuationAgg[0]?.valuationAtCost || 0).toFixed(2)),
          inventoryValuationRetail: Number((stockValuationAgg[0]?.valuationAtRetail || 0).toFixed(2)),
          totalStockUnits: stockValuationAgg[0]?.totalStockUnits || 0,
        },
        counts: {
          customers: entityCounts[0],
          suppliers: entityCounts[1],
          products: entityCounts[2],
          lowStockCount: lowStockAlerts.length,
        },
        chartData: {
          sevenDaysTrend: last7DaysChart,
        },
        feeds: {
          lowStockAlerts,
          recentInvoices,
        },
      },
      "Dashboard KPIs retrieved successfully."
    )
  );
});
