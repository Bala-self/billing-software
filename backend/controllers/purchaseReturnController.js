/*
 * ============================================================================
 * DISABLED FOR FUTURE USE
 * This module (Purchase Returns / Sales Returns / Suppliers) is currently
 * commented out and not mounted in backend/index.js.
 * Code is kept intact for future re-enablement.
 * To re-enable: uncomment the route in backend/index.js and frontend.
 * ============================================================================
 */

const PurchaseReturn = require("../models/PurchaseReturn");
const Purchase = require("../models/Purchase");
const Product = require("../models/Product");
const Supplier = require("../models/Supplier");
const StockMovement = require("../models/StockMovement");
const ApiError = require("../utils/apiError");
const ApiResponse = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");
const { calculateLineItem, calculateTotals } = require("../utils/billing");
const { getNextNumber } = require("../utils/numbering");

/**
 * @desc    Create a purchase return (debit note, stock goes back out)
 * @route   POST /api/purchase-returns
 * @access  Private (purchases.create)
 */
exports.createPurchaseReturn = asyncHandler(async (req, res) => {
  const { purchaseId, items, returnDate, returnReason, refundMethod = "Debit Note", notes } = req.body;

  // 1. Validation
  if (!purchaseId) throw new ApiError(400, "Original purchase ID is required.");
  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new ApiError(400, "Return must contain at least one item.");
  }
  if (!returnReason) throw new ApiError(400, "Return reason is required.");

  // 2. Fetch and validate the original purchase
  const purchase = await Purchase.findOne({
    _id: purchaseId,
    businessId: req.businessId,
  }).populate("supplier");

  if (!purchase) throw new ApiError(404, "Original purchase not found.");
  if (purchase.status === "Cancelled") {
    throw new ApiError(400, "Cannot process return for a cancelled purchase.");
  }
  if (purchase.status !== "Received") {
    throw new ApiError(400, "Cannot return items from a purchase that was not received.");
  }

  const supplier = await Supplier.findOne({
    _id: purchase.supplier._id || purchase.supplier,
    businessId: req.businessId,
  });

  if (!supplier) throw new ApiError(404, "Supplier not found.");

  // 3. How much of each product has already been returned against this purchase
  const previousReturns = await PurchaseReturn.find({
    businessId: req.businessId,
    purchase: purchase._id,
    status: { $in: ["Approved", "Completed"] },
  });

  const returnedQtyByProduct = {};
  for (const prev of previousReturns) {
    for (const prevItem of prev.items) {
      const productId = prevItem.product.toString();
      returnedQtyByProduct[productId] = (returnedQtyByProduct[productId] || 0) + prevItem.quantity;
    }
  }

  // 4. Process each returned item using the ORIGINAL purchase costs
  const lines = [];
  const processedItems = [];
  const productUpdates = [];

  for (const item of items) {
    if (!item.productId || !item.quantity || item.quantity <= 0) {
      throw new ApiError(400, "Each return item must have a valid productId and positive quantity.");
    }

    const originalItem = purchase.items.find(
      (original) => original.product.toString() === item.productId
    );

    if (!originalItem) {
      throw new ApiError(
        400,
        `Product ID ${item.productId} was not found in purchase ${purchase.purchaseNumber}.`
      );
    }

    // A return can never exceed (original quantity - already returned)
    const alreadyReturned = returnedQtyByProduct[item.productId] || 0;
    const maxReturnable = originalItem.quantity - alreadyReturned;
    const returnQuantity = Number(item.quantity);

    if (returnQuantity > maxReturnable) {
      throw new ApiError(
        400,
        `Cannot return ${returnQuantity} units of '${originalItem.name}'. ` +
        `Originally purchased: ${originalItem.quantity}, Already returned: ${alreadyReturned}, ` +
        `Maximum returnable: ${maxReturnable}.`
      );
    }

    // We must actually have this stock on hand to send back
    const product = await Product.findOne({ _id: item.productId, businessId: req.businessId });
    if (!product) {
      throw new ApiError(404, `Product with ID ${item.productId} not found.`);
    }

    if (product.stock < returnQuantity) {
      throw new ApiError(
        400,
        `Insufficient stock to return ${returnQuantity} units of '${product.name}'. ` +
        `Current stock: ${product.stock}. Some units may have already been sold.`
      );
    }

    // Same proportion of the original line discount goes back
    const originalDiscountPerUnit = originalItem.discount / originalItem.quantity;
    const discountAmount = Number((originalDiscountPerUnit * returnQuantity).toFixed(2));

    const line = calculateLineItem({
      unitPrice: originalItem.unitCost,
      quantity: returnQuantity,
      discount: discountAmount,
      discountType: "FIXED",
      taxRate: originalItem.taxRate,
      isInterstate: purchase.isInterstate,
    });

    lines.push(line);

    processedItems.push({
      product: originalItem.product,
      name: originalItem.name,
      sku: originalItem.sku,
      hsnCode: originalItem.hsnCode,
      originalPurchaseItem: originalItem._id,
      quantity: returnQuantity,
      unitCost: originalItem.unitCost,
      discount: discountAmount,
      taxableAmount: line.taxableAmount,
      taxRate: originalItem.taxRate,
      cgstRate: line.cgstRate,
      cgstAmount: line.cgstAmount,
      sgstRate: line.sgstRate,
      sgstAmount: line.sgstAmount,
      igstRate: line.igstRate,
      igstAmount: line.igstAmount,
      total: line.total,
    });

    productUpdates.push({ product, quantity: returnQuantity });
  }

  // 5. Refund totals
  const totals = calculateTotals(lines);
  const refundAmount = totals.grandTotal;

  // How the refund splits between the unpaid part and the paid part.
  // (Stored so cancellation can put it back exactly.)
  const dueReduction = Math.min(purchase.dueAmount, refundAmount);
  const paidReduction = Number((refundAmount - dueReduction).toFixed(2));

  // 6. Create the return record
  const purchaseReturn = await PurchaseReturn.create({
    businessId: req.businessId,
    returnNumber: await getNextNumber(PurchaseReturn, req.businessId, "returnNumber", "PR-"),
    purchase: purchase._id,
    purchaseNumber: purchase.purchaseNumber,
    supplier: supplier._id,
    supplierSnapshot: {
      name: supplier.name,
      phone: supplier.phone,
      gstin: supplier.gstin,
    },
    returnDate: returnDate || new Date(),
    isInterstate: purchase.isInterstate,
    items: processedItems,
    subtotal: totals.subtotal,
    totalDiscount: totals.totalDiscount,
    taxableAmount: totals.taxableAmount,
    totalCgst: totals.totalCgst,
    totalSgst: totals.totalSgst,
    totalIgst: totals.totalIgst,
    totalTax: totals.totalTax,
    roundOff: totals.roundOff,
    refundAmount,
    paidReduction,
    returnReason,
    refundMethod,
    status: "Completed",
    notes: notes || "",
    createdBy: req.user._id,
  });

  // 7. Reduce stock and log movements
  for (const { product, quantity } of productUpdates) {
    const previousStock = product.stock;
    product.stock -= quantity;
    await product.save();

    await StockMovement.create({
      businessId: req.businessId,
      productId: product._id,
      type: "PURCHASE_RETURN",
      quantity: -quantity,
      previousStock,
      newStock: product.stock,
      referenceId: purchaseReturn._id,
      referenceNumber: purchaseReturn.returnNumber,
      note: `Purchase Return: ${purchaseReturn.returnNumber} against ${purchase.purchaseNumber}`,
      performedBy: req.user._id,
    });
  }

  // 8. Financial reversal:
  //    first reduce what we still owe the supplier; any excess means the
  //    supplier owes us money (payable balance can go negative).
  purchase.dueAmount = Number((purchase.dueAmount - dueReduction).toFixed(2));
  purchase.paidAmount = Number(Math.max(0, purchase.paidAmount - paidReduction).toFixed(2));
  purchase.grandTotal = Number((purchase.grandTotal - refundAmount).toFixed(2));

  if (purchase.dueAmount === 0) purchase.paymentStatus = "Paid";
  else if (purchase.paidAmount > 0) purchase.paymentStatus = "Partially Paid";
  else purchase.paymentStatus = "Unpaid";
  await purchase.save();

  supplier.payableBalance = Number((supplier.payableBalance - refundAmount).toFixed(2));
  await supplier.save();

  res.status(201).json(
    new ApiResponse(201, purchaseReturn, "Purchase return processed and debit note issued.")
  );
});

/**
 * @desc    List purchase returns with filters & pagination
 * @route   GET /api/purchase-returns
 * @access  Private (purchases.view)
 */
exports.getPurchaseReturns = asyncHandler(async (req, res) => {
  const { search, status, startDate, endDate, page = 1, limit = 50 } = req.query;
  const query = { businessId: req.businessId };

  if (search) {
    query.$or = [
      { returnNumber: { $regex: search, $options: "i" } },
      { purchaseNumber: { $regex: search, $options: "i" } },
      { "supplierSnapshot.name": { $regex: search, $options: "i" } },
    ];
  }

  if (status) query.status = status;

  if (startDate || endDate) {
    query.returnDate = {};
    if (startDate) query.returnDate.$gte = new Date(startDate);
    if (endDate) query.returnDate.$lte = new Date(endDate);
  }

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;

  const [returns, total] = await Promise.all([
    PurchaseReturn.find(query)
      .populate("supplier", "name phone")
      .populate("purchase", "purchaseNumber grandTotal paymentStatus")
      .populate("createdBy", "name")
      .sort({ returnDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(limitNum),
    PurchaseReturn.countDocuments(query),
  ]);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        returns,
        pagination: {
          total,
          page: pageNum,
          pages: Math.ceil(total / limitNum),
          limit: limitNum,
        },
      },
      "Purchase returns retrieved successfully."
    )
  );
});

/**
 * @desc    Get single purchase return by ID
 * @route   GET /api/purchase-returns/:id
 * @access  Private (purchases.view)
 */
exports.getPurchaseReturnById = asyncHandler(async (req, res) => {
  const purchaseReturn = await PurchaseReturn.findOne({
    _id: req.params.id,
    businessId: req.businessId,
  })
    .populate("supplier")
    .populate("purchase")
    .populate("createdBy", "name email");

  if (!purchaseReturn) throw new ApiError(404, "Purchase return not found.");

  res.status(200).json(new ApiResponse(200, purchaseReturn, "Purchase return retrieved."));
});

/**
 * @desc    Cancel a purchase return (reverses stock & financial adjustments)
 * @route   PUT /api/purchase-returns/:id/cancel
 * @access  Private (purchases.edit)
 */
exports.cancelPurchaseReturn = asyncHandler(async (req, res) => {
  const purchaseReturn = await PurchaseReturn.findOne({
    _id: req.params.id,
    businessId: req.businessId,
  });

  if (!purchaseReturn) throw new ApiError(404, "Purchase return not found.");
  if (purchaseReturn.status === "Cancelled") {
    throw new ApiError(400, "This return is already cancelled.");
  }

  // 1. Put the stock back in
  for (const item of purchaseReturn.items) {
    const product = await Product.findOne({ _id: item.product, businessId: req.businessId });
    if (product) {
      const previousStock = product.stock;
      product.stock += item.quantity;
      await product.save();

      await StockMovement.create({
        businessId: req.businessId,
        productId: product._id,
        type: "ADJUSTMENT",
        quantity: item.quantity,
        previousStock,
        newStock: product.stock,
        referenceId: purchaseReturn._id,
        referenceNumber: purchaseReturn.returnNumber,
        note: `Cancelled Purchase Return: ${purchaseReturn.returnNumber}`,
        performedBy: req.user._id,
      });
    }
  }

  // 2. Put the purchase amounts back (old returns have paidReduction 0,
  //    so the whole refund goes back to the due amount)
  const purchase = await Purchase.findOne({ _id: purchaseReturn.purchase, businessId: req.businessId });
  if (purchase) {
    purchase.paidAmount = Number((purchase.paidAmount + purchaseReturn.paidReduction).toFixed(2));
    purchase.dueAmount = Number(
      (purchase.dueAmount + (purchaseReturn.refundAmount - purchaseReturn.paidReduction)).toFixed(2)
    );
    purchase.grandTotal = Number((purchase.grandTotal + purchaseReturn.refundAmount).toFixed(2));

    if (purchase.dueAmount === 0) purchase.paymentStatus = "Paid";
    else if (purchase.paidAmount > 0) purchase.paymentStatus = "Partially Paid";
    else purchase.paymentStatus = "Unpaid";
    await purchase.save();
  }

  // 3. Put the supplier balance back
  const supplier = await Supplier.findOne({ _id: purchaseReturn.supplier, businessId: req.businessId });
  if (supplier) {
    supplier.payableBalance = Number(
      (supplier.payableBalance + purchaseReturn.refundAmount).toFixed(2)
    );
    await supplier.save();
  }

  // 4. Mark the return as cancelled
  purchaseReturn.status = "Cancelled";
  await purchaseReturn.save();

  res.status(200).json(
    new ApiResponse(200, purchaseReturn, "Purchase return cancelled. Stock and balances reversed.")
  );
});
