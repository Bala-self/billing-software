const Purchase = require("../models/Purchase");
const Product = require("../models/Product");
const Supplier = require("../models/Supplier");
const Business = require("../models/Business");
const StockMovement = require("../models/StockMovement");
const ApiError = require("../utils/apiError");
const ApiResponse = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");
const { calculateLineItem, calculateTotals } = require("../utils/billing");
const { getNextNumber } = require("../utils/numbering");

/**
 * @desc    Create a purchase entry (stock goes in when status = Received)
 * @route   POST /api/purchases
 * @access  Private (purchases.create)
 */
exports.createPurchase = asyncHandler(async (req, res) => {
  const {
    supplierId,
    supplierBillNumber,
    items,
    purchaseDate,
    dueDate,
    paidAmount = 0,
    paymentMethod = "Credit",
    status = "Received",
    notes,
  } = req.body;

  if (!supplierId) throw new ApiError(400, "Supplier is required.");
  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new ApiError(400, "Purchase must contain at least one item.");
  }

  // 1. Fetch business (for GST state) and supplier
  const [business, supplier] = await Promise.all([
    Business.findById(req.businessId),
    Supplier.findOne({
      _id: supplierId,
      businessId: req.businessId,
      isActive: true,
    }),
  ]);

  if (!business) throw new ApiError(404, "Business account not found.");
  if (!supplier) throw new ApiError(404, "Supplier not found or inactive.");

  // Purchases record stock cost only. GST is selected and calculated at billing time.
  const isInterstate = false;

  // 2. Check each product and calculate the line
  //    (stock is only written in step 8, after the purchase is saved)
  const lines = [];
  const productUpdates = [];
  const processedItems = [];

  for (const item of items) {
    if (
      !item.productId ||
      !item.quantity ||
      item.quantity <= 0 ||
      item.unitCost === undefined
    ) {
      throw new ApiError(
        400,
        "Each item must have a valid productId, quantity, and unitCost.",
      );
    }

    const product = await Product.findOne({
      _id: item.productId,
      businessId: req.businessId,
      isActive: true,
    });

    if (!product) {
      throw new ApiError(404, `Product with ID ${item.productId} not found.`);
    }

    const quantity = Number(item.quantity);
    const unitCost = Number(item.unitCost);
    const discountAmount = Math.min(
      Number(item.discount) || 0,
      unitCost * quantity,
    );
    const taxableAmount = unitCost * quantity - discountAmount;
    const line = {
      gross: unitCost * quantity,
      discountAmount,
      taxableAmount,
      cgstRate: 0,
      cgstAmount: 0,
      sgstRate: 0,
      sgstAmount: 0,
      igstRate: 0,
      igstAmount: 0,
      total: taxableAmount,
    };

    lines.push(line);

    processedItems.push({
      product: product._id,
      name: product.name,
      sku: product.sku,
      hsnCode: product.hsnCode,
      quantity,
      unitCost,
      discount: line.discountAmount,
      taxableAmount: line.taxableAmount,
      taxRate: 0,
      cgstRate: line.cgstRate,
      cgstAmount: line.cgstAmount,
      sgstRate: line.sgstRate,
      sgstAmount: line.sgstAmount,
      igstRate: line.igstRate,
      igstAmount: line.igstAmount,
      total: line.total,
    });

    if (status === "Received") {
      productUpdates.push({ product, quantity, unitCost });
    }
  }

  // 4. Document totals
  const totals = calculateTotals(lines);

  const initialPayment = Math.min(
    Math.max(Number(paidAmount) || 0, 0),
    totals.grandTotal,
  );
  const dueAmount = Number((totals.grandTotal - initialPayment).toFixed(2));

  let paymentStatus = "Unpaid";
  if (dueAmount === 0) paymentStatus = "Paid";
  else if (initialPayment > 0) paymentStatus = "Partially Paid";

  // 5. Save the purchase record
  const purchase = await Purchase.create({
    businessId: req.businessId,
    purchaseNumber: await getNextNumber(
      Purchase,
      req.businessId,
      "purchaseNumber",
      business.settings?.poPrefix || "PUR-",
    ),
    supplierBillNumber: supplierBillNumber || "",
    supplier: supplier._id,
    supplierSnapshot: {
      name: supplier.name,
      phone: supplier.phone,
      email: supplier.email,
      gstin: supplier.gstin,
      address: supplier.address,
    },
    purchaseDate: purchaseDate || new Date(),
    dueDate: dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    isInterstate,
    items: processedItems,
    subtotal: totals.subtotal,
    totalDiscount: totals.totalDiscount,
    taxableAmount: totals.taxableAmount,
    totalCgst: totals.totalCgst,
    totalSgst: totals.totalSgst,
    totalIgst: totals.totalIgst,
    totalTax: totals.totalTax,
    roundOff: totals.roundOff,
    grandTotal: totals.grandTotal,
    paidAmount: initialPayment,
    dueAmount,
    paymentStatus,
    status,
    paymentMethod,
    notes: notes || "",
    createdBy: req.user._id,
  });

  // 6. If stock was received, increase it, log movements, and update
  //    the latest purchase cost
  if (status === "Received") {
    for (const { product, quantity, unitCost } of productUpdates) {
      const previousStock = product.stock;
      product.stock = previousStock + quantity;
      product.purchasePrice = unitCost; // latest cost, used for stock valuation
      await product.save();

      await StockMovement.create({
        businessId: req.businessId,
        productId: product._id,
        type: "PURCHASE",
        quantity,
        previousStock,
        newStock: product.stock,
        referenceId: purchase._id,
        referenceNumber: purchase.purchaseNumber,
        note: `Inward Purchase: ${purchase.purchaseNumber}`,
        performedBy: req.user._id,
      });
    }

    // 7. Add the due amount to what we owe the supplier
    if (dueAmount > 0) {
      supplier.payableBalance = Number(
        (supplier.payableBalance + dueAmount).toFixed(2),
      );
      await supplier.save();
    }
  }

  res
    .status(201)
    .json(
      new ApiResponse(201, purchase, "Purchase entry recorded successfully."),
    );
});

/**
 * @desc    List purchases with filters & pagination
 * @route   GET /api/purchases
 * @access  Private (purchases.view)
 */
exports.getPurchases = asyncHandler(async (req, res) => {
  const {
    search,
    status,
    paymentStatus,
    startDate,
    endDate,
    page = 1,
    limit = 50,
  } = req.query;
  const query = { businessId: req.businessId };

  if (search) {
    if (typeof search === "string" && search.length > 100)
      throw new ApiError(400, "Search too long, max 100 chars");
    const safe = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    query.$or = [
      { purchaseNumber: { $regex: safe, $options: "i" } },
      { supplierBillNumber: { $regex: safe, $options: "i" } },
      { "supplierSnapshot.name": { $regex: safe, $options: "i" } },
    ];
  }

  if (status) query.status = status;
  if (paymentStatus) query.paymentStatus = paymentStatus;

  if (startDate || endDate) {
    query.purchaseDate = {};
    if (startDate) query.purchaseDate.$gte = new Date(startDate);
    if (endDate) query.purchaseDate.$lte = new Date(endDate);
  }

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;

  const [purchases, total] = await Promise.all([
    Purchase.find(query)
      .populate("supplier", "name phone email")
      .populate("createdBy", "name")
      .sort({ purchaseDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(limitNum),
    Purchase.countDocuments(query),
  ]);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        purchases,
        pagination: {
          total,
          page: pageNum,
          pages: Math.ceil(total / limitNum),
          limit: limitNum,
        },
      },
      "Purchases retrieved successfully.",
    ),
  );
});

/**
 * @desc    Get single purchase by ID
 * @route   GET /api/purchases/:id
 * @access  Private (purchases.view)
 */
exports.getPurchaseById = asyncHandler(async (req, res) => {
  const purchase = await Purchase.findOne({
    _id: req.params.id,
    businessId: req.businessId,
  })
    .populate("supplier")
    .populate("createdBy", "name email");

  if (!purchase) throw new ApiError(404, "Purchase entry not found.");

  res
    .status(200)
    .json(new ApiResponse(200, purchase, "Purchase details retrieved."));
});

/**
 * @desc    Cancel a purchase (reverses stock & supplier payable balance)
 * @route   PUT /api/purchases/:id/cancel
 * @access  Private (purchases.edit)
 */
exports.cancelPurchase = asyncHandler(async (req, res) => {
  const purchase = await Purchase.findOne({
    _id: req.params.id,
    businessId: req.businessId,
  });

  if (!purchase) throw new ApiError(404, "Purchase not found.");
  if (purchase.status === "Cancelled") {
    throw new ApiError(400, "Purchase is already cancelled.");
  }

  // 1. If stock was received, take it back out
  if (purchase.status === "Received") {
    for (const item of purchase.items) {
      const product = await Product.findOne({
        _id: item.product,
        businessId: req.businessId,
      });
      if (product) {
        const previousStock = product.stock;
        product.stock = Math.max(0, product.stock - item.quantity);
        await product.save();

        await StockMovement.create({
          businessId: req.businessId,
          productId: product._id,
          type: "ADJUSTMENT",
          quantity: -item.quantity,
          previousStock,
          newStock: product.stock,
          referenceId: purchase._id,
          referenceNumber: purchase.purchaseNumber,
          note: `Cancelled Purchase: ${purchase.purchaseNumber}`,
          performedBy: req.user._id,
        });
      }
    }

    // 2. Reduce what we owe the supplier
    if (purchase.dueAmount > 0) {
      const supplier = await Supplier.findOne({
        _id: purchase.supplier,
        businessId: req.businessId,
      });
      if (supplier) {
        supplier.payableBalance = Math.max(
          0,
          supplier.payableBalance - purchase.dueAmount,
        );
        await supplier.save();
      }
    }
  }

  purchase.status = "Cancelled";
  await purchase.save();

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        purchase,
        "Purchase cancelled and stock reversed successfully.",
      ),
    );
});
