/*
 * ============================================================================
 * DISABLED FOR FUTURE USE
 * This module (Purchase Returns / Sales Returns / Suppliers) is currently
 * commented out and not mounted in backend/index.js.
 * Code is kept intact for future re-enablement.
 * To re-enable: uncomment the route in backend/index.js and frontend.
 * ============================================================================
 */

const SalesReturn = require("../models/SalesReturn");
const Invoice = require("../models/Invoice");
const Product = require("../models/Product");
const Customer = require("../models/Customer");
const Business = require("../models/Business");
const StockMovement = require("../models/StockMovement");
const ApiError = require("../utils/apiError");
const ApiResponse = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");
const { calculateLineItem, calculateTotals } = require("../utils/billing");
const { getNextNumber } = require("../utils/numbering");

/**
 * @desc    Create a sales return (refund / credit note, stock goes back in)
 * @route   POST /api/sales-returns
 * @access  Private (sales.create)
 */
exports.createSalesReturn = asyncHandler(async (req, res) => {
  const { invoiceId, items, returnDate, returnReason, refundMethod = "Credit Note", notes } = req.body;

  // 1. Validation
  if (!invoiceId) throw new ApiError(400, "Original invoice ID is required.");
  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new ApiError(400, "Return must contain at least one item.");
  }
  if (!returnReason) throw new ApiError(400, "Return reason is required.");

  // 2. Fetch the original invoice, customer and business
  const invoice = await Invoice.findOne({
    _id: invoiceId,
    businessId: req.businessId,
  }).populate("customer");

  if (!invoice) throw new ApiError(404, "Original invoice not found.");
  if (invoice.status === "Cancelled") {
    throw new ApiError(400, "Cannot process return for a cancelled invoice.");
  }

  const customer = await Customer.findOne({
    _id: invoice.customer._id || invoice.customer,
    businessId: req.businessId,
  });

  if (!customer) throw new ApiError(404, "Customer not found.");

  const business = await Business.findById(req.businessId);
  if (!business) throw new ApiError(404, "Business not found.");

  // 3. How much of each product has already been returned against this invoice
  const previousReturns = await SalesReturn.find({
    businessId: req.businessId,
    invoice: invoice._id,
    status: { $in: ["Approved", "Completed"] },
  });

  const returnedQtyByProduct = {};
  for (const prev of previousReturns) {
    for (const prevItem of prev.items) {
      const productId = prevItem.product.toString();
      returnedQtyByProduct[productId] = (returnedQtyByProduct[productId] || 0) + prevItem.quantity;
    }
  }

  // 4. Process each returned item using the ORIGINAL invoice prices
  const lines = [];
  const processedItems = [];
  const productUpdates = [];

  for (const item of items) {
    if (!item.productId || !item.quantity || item.quantity <= 0) {
      throw new ApiError(400, "Each return item must have a valid productId and positive quantity.");
    }

    const originalItem = invoice.items.find(
      (original) => original.product.toString() === item.productId
    );

    if (!originalItem) {
      throw new ApiError(
        400,
        `Product ID ${item.productId} was not found in the original invoice ${invoice.invoiceNumber}.`
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
        `Originally sold: ${originalItem.quantity}, Already returned: ${alreadyReturned}, ` +
        `Maximum returnable: ${maxReturnable}.`
      );
    }

    // Same proportion of the original line discount goes back
    const originalDiscountPerUnit = originalItem.discount / originalItem.quantity;
    const discountAmount = Number((originalDiscountPerUnit * returnQuantity).toFixed(2));

    const line = calculateLineItem({
      unitPrice: originalItem.unitPrice,
      quantity: returnQuantity,
      discount: discountAmount,
      discountType: "FIXED",
      taxRate: originalItem.taxRate,
      isInterstate: invoice.isInterstate,
    });

    lines.push(line);

    processedItems.push({
      product: originalItem.product,
      name: originalItem.name,
      sku: originalItem.sku,
      hsnCode: originalItem.hsnCode,
      originalInvoiceItem: originalItem._id,
      quantity: returnQuantity,
      unitPrice: originalItem.unitPrice,
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

    const product = await Product.findOne({ _id: item.productId, businessId: req.businessId });
    if (product) {
      productUpdates.push({ product, quantity: returnQuantity });
    }
  }

  // 5. Refund totals
  const totals = calculateTotals(lines);
  const refundAmount = totals.grandTotal;

  // How the refund splits between the unpaid part and the paid part.
  // (Stored so cancellation can put it back exactly.)
  const dueReduction = Math.min(invoice.dueAmount, refundAmount);
  const paidReduction = Number((refundAmount - dueReduction).toFixed(2));

  // 6. Create the return record
  const salesReturn = await SalesReturn.create({
    businessId: req.businessId,
    returnNumber: await getNextNumber(SalesReturn, req.businessId, "returnNumber", "SR-"),
    invoice: invoice._id,
    invoiceNumber: invoice.invoiceNumber,
    customer: customer._id,
    customerSnapshot: {
      name: customer.name,
      phone: customer.phone,
      gstin: customer.gstin,
    },
    returnDate: returnDate || new Date(),
    isInterstate: invoice.isInterstate,
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

  // 7. Put the stock back and log movements
  for (const { product, quantity } of productUpdates) {
    const previousStock = product.stock;
    product.stock += quantity;
    await product.save();

    await StockMovement.create({
      businessId: req.businessId,
      productId: product._id,
      type: "SALES_RETURN",
      quantity,
      previousStock,
      newStock: product.stock,
      referenceId: salesReturn._id,
      referenceNumber: salesReturn.returnNumber,
      note: `Sales Return: ${salesReturn.returnNumber} against Invoice ${invoice.invoiceNumber}`,
      performedBy: req.user._id,
    });
  }

  // 8. Financial reversal:
  //    first reduce what the customer still owes; any excess comes out of
  //    what was already paid (that part is the actual refund).
  invoice.dueAmount = Number((invoice.dueAmount - dueReduction).toFixed(2));
  invoice.paidAmount = Number(Math.max(0, invoice.paidAmount - paidReduction).toFixed(2));
  invoice.grandTotal = Number((invoice.grandTotal - refundAmount).toFixed(2));

  if (invoice.dueAmount === 0) invoice.status = "Paid";
  else if (invoice.paidAmount > 0) invoice.status = "Partially Paid";
  else invoice.status = "Unpaid";
  await invoice.save();

  // Customer balance goes down by the refund.
  // Negative balance = advance (credit note) with the customer.
  customer.outstandingBalance = Number((customer.outstandingBalance - refundAmount).toFixed(2));
  await customer.save();

  res.status(201).json(
    new ApiResponse(201, salesReturn, "Sales return processed and refund/credit note issued.")
  );
});

/**
 * @desc    List sales returns with filters & pagination
 * @route   GET /api/sales-returns
 * @access  Private (sales.view)
 */
exports.getSalesReturns = asyncHandler(async (req, res) => {
  const { search, status, startDate, endDate, page = 1, limit = 50 } = req.query;
  const query = { businessId: req.businessId };

  if (search) {
    query.$or = [
      { returnNumber: { $regex: search, $options: "i" } },
      { invoiceNumber: { $regex: search, $options: "i" } },
      { "customerSnapshot.name": { $regex: search, $options: "i" } },
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
    SalesReturn.find(query)
      .populate("customer", "name phone")
      .populate("invoice", "invoiceNumber grandTotal status")
      .populate("createdBy", "name")
      .sort({ returnDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(limitNum),
    SalesReturn.countDocuments(query),
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
      "Sales returns retrieved successfully."
    )
  );
});

/**
 * @desc    Get single sales return by ID
 * @route   GET /api/sales-returns/:id
 * @access  Private (sales.view)
 */
exports.getSalesReturnById = asyncHandler(async (req, res) => {
  const salesReturn = await SalesReturn.findOne({
    _id: req.params.id,
    businessId: req.businessId,
  })
    .populate("customer")
    .populate("invoice")
    .populate("createdBy", "name email");

  if (!salesReturn) throw new ApiError(404, "Sales return not found.");

  res.status(200).json(new ApiResponse(200, salesReturn, "Sales return retrieved."));
});

/**
 * @desc    Cancel a sales return (reverses stock & financial adjustments)
 * @route   PUT /api/sales-returns/:id/cancel
 * @access  Private (sales.cancel)
 */
exports.cancelSalesReturn = asyncHandler(async (req, res) => {
  const salesReturn = await SalesReturn.findOne({
    _id: req.params.id,
    businessId: req.businessId,
  });

  if (!salesReturn) throw new ApiError(404, "Sales return not found.");
  if (salesReturn.status === "Cancelled") {
    throw new ApiError(400, "This return is already cancelled.");
  }

  // 1. Take the stock back out
  for (const item of salesReturn.items) {
    const product = await Product.findOne({ _id: item.product, businessId: req.businessId });
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
        referenceId: salesReturn._id,
        referenceNumber: salesReturn.returnNumber,
        note: `Cancelled Sales Return: ${salesReturn.returnNumber}`,
        performedBy: req.user._id,
      });
    }
  }

  // 2. Put the invoice amounts back (old returns have paidReduction 0,
  //    so the whole refund goes back to the due amount)
  const invoice = await Invoice.findOne({ _id: salesReturn.invoice, businessId: req.businessId });
  if (invoice) {
    invoice.paidAmount = Number((invoice.paidAmount + salesReturn.paidReduction).toFixed(2));
    invoice.dueAmount = Number(
      (invoice.dueAmount + (salesReturn.refundAmount - salesReturn.paidReduction)).toFixed(2)
    );
    invoice.grandTotal = Number((invoice.grandTotal + salesReturn.refundAmount).toFixed(2));

    if (invoice.dueAmount === 0) invoice.status = "Paid";
    else if (invoice.paidAmount > 0) invoice.status = "Partially Paid";
    else invoice.status = "Unpaid";
    await invoice.save();
  }

  // 3. Put the customer balance back
  const customer = await Customer.findOne({ _id: salesReturn.customer, businessId: req.businessId });
  if (customer) {
    customer.outstandingBalance = Number(
      (customer.outstandingBalance + salesReturn.refundAmount).toFixed(2)
    );
    await customer.save();
  }

  // 4. Mark the return as cancelled
  salesReturn.status = "Cancelled";
  await salesReturn.save();

  res.status(200).json(
    new ApiResponse(200, salesReturn, "Sales return cancelled. Stock and balances reversed.")
  );
});
