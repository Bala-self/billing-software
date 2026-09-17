const mongoose = require("mongoose");
const Invoice = require("../models/Invoice");
const SalesReturn = require("../models/SalesReturn");
const Purchase = require("../models/Purchase");
const Product = require("../models/Product");
const Customer = require("../models/Customer");
const Supplier = require("../models/Supplier");
const ApiResponse = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");

// Helper: Build Date Range Filter
const buildDateRange = (startDate, endDate, dateField = "createdAt") => {
  const filter = {};
  if (startDate || endDate) {
    filter[dateField] = {};
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      filter[dateField].$gte = start;
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filter[dateField].$lte = end;
    }
  }
  return filter;
};

/**
 * @desc    Comprehensive Sales Report
 * @route   GET /api/reports/sales
 * @access  Private (reports.sales)
 */
exports.getSalesReport = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const businessId = new mongoose.Types.ObjectId(req.businessId);
  const dateFilter = buildDateRange(startDate, endDate, "invoiceDate");

  const [salesSummary, salesByPaymentMethod, topProducts, topCustomers] = await Promise.all([
    // 1. Overall Sales Totals (excluding cancelled)
    Invoice.aggregate([
      {
        $match: {
          businessId,
          status: { $ne: "Cancelled" },
          ...dateFilter,
        },
      },
      {
        $group: {
          _id: null,
          totalInvoices: { $sum: 1 },
          totalSalesAmount: { $sum: "$grandTotal" },
          totalTaxableAmount: { $sum: "$taxableAmount" },
          totalTaxCollected: { $sum: "$totalTax" },
          totalCgst: { $sum: "$totalCgst" },
          totalSgst: { $sum: "$totalSgst" },
          totalIgst: { $sum: "$totalIgst" },
          totalDiscount: { $sum: "$totalDiscount" },
          totalPaid: { $sum: "$paidAmount" },
          totalDue: { $sum: "$dueAmount" },
        },
      },
    ]),

    // 2. Sales by Payment Method
    Invoice.aggregate([
      {
        $match: {
          businessId,
          status: { $ne: "Cancelled" },
          ...dateFilter,
        },
      },
      {
        $group: {
          _id: "$paymentMethod",
          count: { $sum: 1 },
          totalAmount: { $sum: "$grandTotal" },
        },
      },
      { $sort: { totalAmount: -1 } },
    ]),

    // 3. Top 10 Selling Products
    Invoice.aggregate([
      {
        $match: {
          businessId,
          status: { $ne: "Cancelled" },
          ...dateFilter,
        },
      },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.product",
          name: { $first: "$items.name" },
          sku: { $first: "$items.sku" },
          totalQuantity: { $sum: "$items.quantity" },
          totalRevenue: { $sum: "$items.total" },
        },
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 10 },
    ]),

    // 4. Top 10 Customers by Revenue
    Invoice.aggregate([
      {
        $match: {
          businessId,
          status: { $ne: "Cancelled" },
          ...dateFilter,
        },
      },
      {
        $group: {
          _id: "$customer",
          name: { $first: "$customerSnapshot.name" },
          phone: { $first: "$customerSnapshot.phone" },
          invoiceCount: { $sum: 1 },
          totalSpent: { $sum: "$grandTotal" },
        },
      },
      { $sort: { totalSpent: -1 } },
      { $limit: 10 },
    ]),
  ]);

  const summary = salesSummary[0] || {
    totalInvoices: 0,
    totalSalesAmount: 0,
    totalTaxableAmount: 0,
    totalTaxCollected: 0,
    totalCgst: 0,
    totalSgst: 0,
    totalIgst: 0,
    totalDiscount: 0,
    totalPaid: 0,
    totalDue: 0,
  };

  res.status(200).json(
    new ApiResponse(
      200,
      {
        summary,
        salesByPaymentMethod,
        topProducts,
        topCustomers,
      },
      "Sales report generated successfully."
    )
  );
});

/**
 * @desc    Comprehensive Purchase Report
 * @route   GET /api/reports/purchases
 * @access  Private (reports.purchases)
 */
exports.getPurchaseReport = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const businessId = new mongoose.Types.ObjectId(req.businessId);
  const dateFilter = buildDateRange(startDate, endDate, "purchaseDate");

  const [purchaseSummary, topSuppliers] = await Promise.all([
    Purchase.aggregate([
      {
        $match: {
          businessId,
          status: { $ne: "Cancelled" },
          ...dateFilter,
        },
      },
      {
        $group: {
          _id: null,
          totalPurchases: { $sum: 1 },
          totalPurchaseAmount: { $sum: "$grandTotal" },
          totalTaxableAmount: { $sum: "$taxableAmount" },
          totalTaxPaid: { $sum: "$totalTax" },
          totalCgst: { $sum: "$totalCgst" },
          totalSgst: { $sum: "$totalSgst" },
          totalIgst: { $sum: "$totalIgst" },
          totalDiscount: { $sum: "$totalDiscount" },
          totalPaid: { $sum: "$paidAmount" },
          totalDue: { $sum: "$dueAmount" },
        },
      },
    ]),

    Purchase.aggregate([
      {
        $match: {
          businessId,
          status: { $ne: "Cancelled" },
          ...dateFilter,
        },
      },
      {
        $group: {
          _id: "$supplier",
          name: { $first: "$supplierSnapshot.name" },
          phone: { $first: "$supplierSnapshot.phone" },
          orderCount: { $sum: 1 },
          totalAmount: { $sum: "$grandTotal" },
        },
      },
      { $sort: { totalAmount: -1 } },
      { $limit: 10 },
    ]),
  ]);

  const summary = purchaseSummary[0] || {
    totalPurchases: 0,
    totalPurchaseAmount: 0,
    totalTaxableAmount: 0,
    totalTaxPaid: 0,
    totalCgst: 0,
    totalSgst: 0,
    totalIgst: 0,
    totalDiscount: 0,
    totalPaid: 0,
    totalDue: 0,
  };

  res.status(200).json(
    new ApiResponse(
      200,
      {
        summary,
        topSuppliers,
      },
      "Purchase report generated successfully."
    )
  );
});

/**
 * @desc    Profit & Loss (P&L) Statement
 * @route   GET /api/reports/profit-loss
 * @access  Private (reports.financial)
 */
exports.getProfitLossReport = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const businessId = new mongoose.Types.ObjectId(req.businessId);

  const invoiceDateFilter = buildDateRange(startDate, endDate, "invoiceDate");
  const returnDateFilter  = buildDateRange(startDate, endDate, "returnDate");

  const [salesAgg, salesReturnsAgg, cogsAgg] = await Promise.all([
    // 1. Gross Sales Revenue
    Invoice.aggregate([
      { $match: { businessId, status: { $ne: "Cancelled" }, ...invoiceDateFilter } },
      { $group: { _id: null, total: { $sum: "$grandTotal" }, taxable: { $sum: "$taxableAmount" } } },
    ]),

    // 2. Sales Returns
    SalesReturn.aggregate([
      { $match: { businessId, status: { $ne: "Cancelled" }, ...returnDateFilter } },
      { $group: { _id: null, total: { $sum: "$refundAmount" } } },
    ]),

    // 3. Cost of Goods Sold (COGS) = Sold Qty × purchasePrice per product
    Invoice.aggregate([
      { $match: { businessId, status: { $ne: "Cancelled" }, ...invoiceDateFilter } },
      { $unwind: "$items" },
      {
        $lookup: {
          from: "products",
          localField: "items.product",
          foreignField: "_id",
          as: "productDoc",
        },
      },
      { $unwind: { path: "$productDoc", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: null,
          totalCogs: {
            $sum: {
              $multiply: ["$items.quantity", { $ifNull: ["$productDoc.purchasePrice", 0] }],
            },
          },
        },
      },
    ]),
  ]);

  const grossSales   = salesAgg[0]?.total || 0;
  const salesReturns = salesReturnsAgg[0]?.total || 0;
  const netRevenue   = Number((grossSales - salesReturns).toFixed(2));

  // There is no expense-tracking module in this app yet, so net profit is
  // currently gross profit (sales - returns - COGS).
  const cogs              = Number((cogsAgg[0]?.totalCogs || 0).toFixed(2));
  const grossProfit       = Number((netRevenue - cogs).toFixed(2));
  const grossProfitMargin = netRevenue > 0
    ? Number(((grossProfit / netRevenue) * 100).toFixed(2))
    : 0;

  const netProfit       = grossProfit;
  const netProfitMargin = grossProfitMargin;

  res.status(200).json(
    new ApiResponse(
      200,
      {
        revenue: {
          grossSales,
          salesReturns,
          netRevenue,
        },
        costOfGoodsSold: cogs,
        grossProfit,
        grossProfitMarginPercent: grossProfitMargin,
        netProfit,
        netProfitMarginPercent: netProfitMargin,
      },
      "Profit & Loss statement generated successfully."
    )
  );
});

/**
 * @desc    Indian GST Report (GSTR-1 & GSTR-3B Tax Liability & ITC)
 * @route   GET /api/reports/gst
 * @access  Private (reports.gst)
 */
exports.getGstReport = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const businessId = new mongoose.Types.ObjectId(req.businessId);

  const invoiceDateFilter  = buildDateRange(startDate, endDate, "invoiceDate");
  const purchaseDateFilter = buildDateRange(startDate, endDate, "purchaseDate");

  const [b2bSales, b2cSales, hsnSummary, outputTaxAgg, inputTaxAgg] = await Promise.all([
    // 1. GSTR-1: B2B Sales (Customer has registered GSTIN)
    Invoice.aggregate([
      {
        $match: {
          businessId,
          status: { $ne: "Cancelled" },
          "customerSnapshot.gstin": { $exists: true, $ne: "" },
          ...invoiceDateFilter,
        },
      },
      {
        $group: {
          _id: "$customerSnapshot.gstin",
          customerName: { $first: "$customerSnapshot.name" },
          invoiceCount: { $sum: 1 },
          taxableAmount: { $sum: "$taxableAmount" },
          cgst: { $sum: "$totalCgst" },
          sgst: { $sum: "$totalSgst" },
          igst: { $sum: "$totalIgst" },
          totalTax: { $sum: "$totalTax" },
          invoiceValue: { $sum: "$grandTotal" },
        },
      },
      { $sort: { taxableAmount: -1 } },
    ]),

    // 2. GSTR-1: B2C Sales (Unregistered consumers)
    Invoice.aggregate([
      {
        $match: {
          businessId,
          status: { $ne: "Cancelled" },
          $or: [
            { "customerSnapshot.gstin": { $exists: false } },
            { "customerSnapshot.gstin": "" },
          ],
          ...invoiceDateFilter,
        },
      },
      {
        $group: {
          _id: "$isInterstate",
          type: { $first: { $cond: ["$isInterstate", "B2C Inter-state", "B2C Intra-state"] } },
          invoiceCount: { $sum: 1 },
          taxableAmount: { $sum: "$taxableAmount" },
          cgst: { $sum: "$totalCgst" },
          sgst: { $sum: "$totalSgst" },
          igst: { $sum: "$totalIgst" },
          totalTax: { $sum: "$totalTax" },
          totalValue: { $sum: "$grandTotal" },
        },
      },
    ]),

    // 3. GSTR-1: HSN Code Wise Summary
    Invoice.aggregate([
      {
        $match: {
          businessId,
          status: { $ne: "Cancelled" },
          ...invoiceDateFilter,
        },
      },
      { $unwind: "$items" },
      {
        $group: {
          _id: { $ifNull: ["$items.hsnCode", "N/A"] },
          totalQuantity: { $sum: "$items.quantity" },
          taxableAmount: { $sum: "$items.taxableAmount" },
          cgst: { $sum: "$items.cgstAmount" },
          sgst: { $sum: "$items.sgstAmount" },
          igst: { $sum: "$items.igstAmount" },
          totalTax: {
            $sum: { $add: ["$items.cgstAmount", "$items.sgstAmount", "$items.igstAmount"] },
          },
          totalValue: { $sum: "$items.total" },
        },
      },
      { $sort: { taxableAmount: -1 } },
    ]),

    // 4. GSTR-3B: Total Output Tax Liability (Sales)
    Invoice.aggregate([
      {
        $match: {
          businessId,
          status: { $ne: "Cancelled" },
          ...invoiceDateFilter,
        },
      },
      {
        $group: {
          _id: null,
          taxableValue: { $sum: "$taxableAmount" },
          cgst: { $sum: "$totalCgst" },
          sgst: { $sum: "$totalSgst" },
          igst: { $sum: "$totalIgst" },
          totalOutputTax: { $sum: "$totalTax" },
        },
      },
    ]),

    // 5. GSTR-3B: Eligible Input Tax Credit (ITC from Purchases)
    Purchase.aggregate([
      {
        $match: {
          businessId,
          status: { $ne: "Cancelled" },
          ...purchaseDateFilter,
        },
      },
      {
        $group: {
          _id: null,
          taxableValue: { $sum: "$taxableAmount" },
          cgst: { $sum: "$totalCgst" },
          sgst: { $sum: "$totalSgst" },
          igst: { $sum: "$totalIgst" },
          totalInputTaxCredit: { $sum: "$totalTax" },
        },
      },
    ]),
  ]);

  const outputTax = outputTaxAgg[0] || {
    taxableValue: 0, cgst: 0, sgst: 0, igst: 0, totalOutputTax: 0,
  };
  const inputTaxCredit = inputTaxAgg[0] || {
    taxableValue: 0, cgst: 0, sgst: 0, igst: 0, totalInputTaxCredit: 0,
  };

  // Net GST Payable = Output Liability − Input ITC
  const netPayableCgst    = Number((outputTax.cgst - inputTaxCredit.cgst).toFixed(2));
  const netPayableSgst    = Number((outputTax.sgst - inputTaxCredit.sgst).toFixed(2));
  const netPayableIgst    = Number((outputTax.igst - inputTaxCredit.igst).toFixed(2));
  const netTotalGstPayable = Number((outputTax.totalOutputTax - inputTaxCredit.totalInputTaxCredit).toFixed(2));

  res.status(200).json(
    new ApiResponse(
      200,
      {
        gstr1: {
          b2bSupplies: b2bSales,
          b2cSupplies: b2cSales,
          hsnSummary,
        },
        gstr3b: {
          outputTaxLiability: outputTax,
          eligibleInputTaxCredit: inputTaxCredit,
          netTaxSettlement: {
            netCgst: netPayableCgst,
            netSgst: netPayableSgst,
            netIgst: netPayableIgst,
            netTotalGstPayable,
            status: netTotalGstPayable >= 0 ? "TAX_PAYABLE" : "INPUT_TAX_CREDIT_AVAILABLE",
          },
        },
      },
      "GST reports generated successfully."
    )
  );
});

/**
 * @desc    Inventory Valuation & Stock Status Report
 * @route   GET /api/reports/inventory
 * @access  Private (reports.inventory)
 */
exports.getInventoryReport = asyncHandler(async (req, res) => {
  const businessId = new mongoose.Types.ObjectId(req.businessId);

  const [valuationAgg, categoryBreakdown, stockStatusCounts] = await Promise.all([
    // 1. Overall Stock Value
    Product.aggregate([
      { $match: { businessId, isActive: true } },
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          totalUnitsInStock: { $sum: "$stock" },
          totalValuationAtCost: {
            $sum: { $multiply: ["$stock", "$purchasePrice"] },
          },
          totalValuationAtRetail: {
            $sum: { $multiply: ["$stock", "$sellingPrice"] },
          },
        },
      },
    ]),

    // 2. Valuation by Category
    Product.aggregate([
      { $match: { businessId, isActive: true } },
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "catDoc",
        },
      },
      { $unwind: { path: "$catDoc", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: "$category",
          categoryName: { $first: { $ifNull: ["$catDoc.name", "Uncategorized"] } },
          productCount: { $sum: 1 },
          stockQuantity: { $sum: "$stock" },
          stockValueCost:   { $sum: { $multiply: ["$stock", "$purchasePrice"] } },
          stockValueRetail: { $sum: { $multiply: ["$stock", "$sellingPrice"] } },
        },
      },
      { $sort: { stockValueCost: -1 } },
    ]),

    // 3. Counts by Stock Status
    Product.aggregate([
      { $match: { businessId, isActive: true } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  const valuation = valuationAgg[0] || {
    totalProducts: 0,
    totalUnitsInStock: 0,
    totalValuationAtCost: 0,
    totalValuationAtRetail: 0,
  };

  const potentialProfit = Number(
    (valuation.totalValuationAtRetail - valuation.totalValuationAtCost).toFixed(2)
  );

  res.status(200).json(
    new ApiResponse(
      200,
      {
        valuation: {
          ...valuation,
          potentialGrossProfit: potentialProfit,
        },
        categoryBreakdown,
        stockStatusCounts,
      },
      "Inventory report generated successfully."
    )
  );
});

/**
 * @desc    Outstanding Balances & Aging Summary
 * @route   GET /api/reports/outstanding
 * @access  Private (reports.financial)
 */
exports.getOutstandingReport = asyncHandler(async (req, res) => {
  const businessId = new mongoose.Types.ObjectId(req.businessId);

  const [customerReceivables, supplierPayables] = await Promise.all([
    // Top Customer Receivables
    Customer.find({ businessId, isActive: true, outstandingBalance: { $gt: 0 } })
      .select("name phone email gstin outstandingBalance creditLimit")
      .sort({ outstandingBalance: -1 })
      .limit(50),

    // Top Supplier Payables
    Supplier.find({ businessId, isActive: true, payableBalance: { $gt: 0 } })
      .select("name phone email gstin payableBalance")
      .sort({ payableBalance: -1 })
      .limit(50),
  ]);

  const totalReceivables = customerReceivables.reduce((acc, c) => acc + c.outstandingBalance, 0);
  const totalPayables    = supplierPayables.reduce((acc, s) => acc + s.payableBalance, 0);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        summary: {
          totalCustomerReceivables: Number(totalReceivables.toFixed(2)),
          totalSupplierPayables:    Number(totalPayables.toFixed(2)),
          netPosition:              Number((totalReceivables - totalPayables).toFixed(2)), // +ve = more owed to you
        },
        customerReceivables,
        supplierPayables,
      },
      "Outstanding balances report retrieved."
    )
  );
});
