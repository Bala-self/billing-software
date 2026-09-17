const Quotation = require("../models/Quotation");
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
const { generateQuotationPDF } = require("../services/pdfService");

/**
 * Calculate the items + totals for a quotation.
 * Prices come from the current product selling prices.
 */
const calculateQuotationItems = async (items, businessId, isInterstate) => {
  const lines = [];
  const processedItems = [];

  for (const item of items) {
    if (!item.productId || !item.quantity || item.quantity <= 0) {
      throw new ApiError(400, "Each item must have a valid productId and positive quantity.");
    }

    const product = await Product.findOne({
      _id: item.productId,
      businessId,
      isActive: true,
    });

    if (!product) {
      throw new ApiError(404, `Product with ID ${item.productId} not found.`);
    }

    const quantity = Number(item.quantity);
    const discount = item.discount || 0;
    const discountType = item.discountType || "FIXED";
    const taxRate = product.taxRate || 0;

    const line = calculateLineItem({
      unitPrice: product.sellingPrice,
      quantity,
      discount,
      discountType,
      taxRate,
      isInterstate,
    });

    lines.push(line);

    processedItems.push({
      product: product._id,
      name: product.name,
      sku: product.sku,
      hsnCode: product.hsnCode,
      quantity,
      unitPrice: product.sellingPrice,
      discount,
      discountType,
      taxableAmount: line.taxableAmount,
      taxRate,
      cgstRate: line.cgstRate,
      cgstAmount: line.cgstAmount,
      sgstRate: line.sgstRate,
      sgstAmount: line.sgstAmount,
      igstRate: line.igstRate,
      igstAmount: line.igstAmount,
      total: line.total,
    });
  }

  return { processedItems, ...calculateTotals(lines) };
};

/**
 * @desc    Create a new quotation
 * @route   POST /api/quotations
 * @access  Private (quotation.manage)
 */
exports.createQuotation = asyncHandler(async (req, res) => {
  const { customerId, items, quotationDate, validUntil, notes, termsAndConditions } = req.body;

  if (!customerId) throw new ApiError(400, "Customer is required.");
  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new ApiError(400, "Quotation must contain at least one item.");
  }
  if (!validUntil) throw new ApiError(400, "Quotation validity date (validUntil) is required.");

  const validUntilDate = new Date(validUntil);
  if (validUntilDate <= new Date()) {
    throw new ApiError(400, "Validity date must be in the future.");
  }

  const [business, customer] = await Promise.all([
    Business.findById(req.businessId),
    Customer.findOne({ _id: customerId, businessId: req.businessId, isActive: true }),
  ]);

  if (!business) throw new ApiError(404, "Business not found.");
  if (!customer) throw new ApiError(404, "Customer not found.");

  const businessState = (business.address.state || "").trim().toLowerCase();
  const customerState = (customer.billingAddress.state || "").trim().toLowerCase();
  const isInterstate = businessState !== customerState;

  const calc = await calculateQuotationItems(items, req.businessId, isInterstate);

  const quotation = await Quotation.create({
    businessId: req.businessId,
    quotationNumber: await getNextNumber(Quotation, req.businessId, "quotationNumber", business.settings?.quotationPrefix || "QTN-"),
    customer: customer._id,
    customerSnapshot: {
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      gstin: customer.gstin,
      billingAddress: customer.billingAddress,
    },
    quotationDate: quotationDate || new Date(),
    validUntil: validUntilDate,
    isInterstate,
    items: calc.processedItems,
    subtotal: calc.subtotal,
    totalDiscount: calc.totalDiscount,
    taxableAmount: calc.taxableAmount,
    totalCgst: calc.totalCgst,
    totalSgst: calc.totalSgst,
    totalIgst: calc.totalIgst,
    totalTax: calc.totalTax,
    roundOff: calc.roundOff,
    grandTotal: calc.grandTotal,
    status: "Draft",
    notes: notes || "",
    termsAndConditions: termsAndConditions || "",
    createdBy: req.user._id,
  });

  res.status(201).json(new ApiResponse(201, quotation, "Quotation created successfully."));
});

/**
 * @desc    List quotations with filters & pagination
 * @route   GET /api/quotations
 * @access  Private (quotation.manage)
 */
exports.getQuotations = asyncHandler(async (req, res) => {
  const { search, status, startDate, endDate, page = 1, limit = 50 } = req.query;
  const query = { businessId: req.businessId };

  if (search) {
    query.$or = [
      { quotationNumber: { $regex: search, $options: "i" } },
      { "customerSnapshot.name": { $regex: search, $options: "i" } },
    ];
  }

  if (status) query.status = status;

  if (startDate || endDate) {
    query.quotationDate = {};
    if (startDate) query.quotationDate.$gte = new Date(startDate);
    if (endDate) query.quotationDate.$lte = new Date(endDate);
  }

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;

  const [quotations, total] = await Promise.all([
    Quotation.find(query)
      .populate("customer", "name phone email")
      .populate("createdBy", "name")
      .sort({ quotationDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(limitNum),
    Quotation.countDocuments(query),
  ]);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        quotations,
        pagination: {
          total,
          page: pageNum,
          pages: Math.ceil(total / limitNum),
          limit: limitNum,
        },
      },
      "Quotations retrieved successfully."
    )
  );
});

/**
 * @desc    Get single quotation by ID
 * @route   GET /api/quotations/:id
 * @access  Private (quotation.manage)
 */
exports.getQuotationById = asyncHandler(async (req, res) => {
  const quotation = await Quotation.findOne({
    _id: req.params.id,
    businessId: req.businessId,
  })
    .populate("customer")
    .populate("createdBy", "name email")
    .populate("convertedToInvoice", "invoiceNumber status grandTotal");

  if (!quotation) throw new ApiError(404, "Quotation not found.");

  res.status(200).json(new ApiResponse(200, quotation, "Quotation retrieved."));
});

/**
 * @desc    Update a quotation (only Draft or Sent)
 * @route   PUT /api/quotations/:id
 * @access  Private (quotation.manage)
 */
exports.updateQuotation = asyncHandler(async (req, res) => {
  const quotation = await Quotation.findOne({
    _id: req.params.id,
    businessId: req.businessId,
  });

  if (!quotation) throw new ApiError(404, "Quotation not found.");

  if (!["Draft", "Sent"].includes(quotation.status)) {
    throw new ApiError(
      400,
      `Cannot edit a quotation with status '${quotation.status}'. Only Draft or Sent quotations can be edited.`
    );
  }

  const { items, validUntil, notes, termsAndConditions } = req.body;

  // Recalculate if items changed
  if (items && Array.isArray(items) && items.length > 0) {
    const business = await Business.findById(req.businessId);
    const customer = await Customer.findOne({ _id: quotation.customer, businessId: req.businessId });

    const businessState = (business.address.state || "").trim().toLowerCase();
    const customerState = (customer.billingAddress.state || "").trim().toLowerCase();
    const isInterstate = businessState !== customerState;

    const calc = await calculateQuotationItems(items, req.businessId, isInterstate);

    quotation.items = calc.processedItems;
    quotation.subtotal = calc.subtotal;
    quotation.totalDiscount = calc.totalDiscount;
    quotation.taxableAmount = calc.taxableAmount;
    quotation.totalCgst = calc.totalCgst;
    quotation.totalSgst = calc.totalSgst;
    quotation.totalIgst = calc.totalIgst;
    quotation.totalTax = calc.totalTax;
    quotation.roundOff = calc.roundOff;
    quotation.grandTotal = calc.grandTotal;
    quotation.isInterstate = isInterstate;
  }

  if (validUntil) {
    const validUntilDate = new Date(validUntil);
    if (validUntilDate <= new Date()) {
      throw new ApiError(400, "Validity date must be in the future.");
    }
    quotation.validUntil = validUntilDate;
  }

  if (notes !== undefined) quotation.notes = notes;
  if (termsAndConditions !== undefined) quotation.termsAndConditions = termsAndConditions;

  // Bump the version on every edit
  quotation.version += 1;
  await quotation.save();

  res.status(200).json(new ApiResponse(200, quotation, "Quotation updated successfully."));
});

/**
 * @desc    Mark a quotation as Sent
 * @route   PUT /api/quotations/:id/send
 * @access  Private (quotation.manage)
 */
exports.sendQuotation = asyncHandler(async (req, res) => {
  const quotation = await Quotation.findOne({
    _id: req.params.id,
    businessId: req.businessId,
  });

  if (!quotation) throw new ApiError(404, "Quotation not found.");
  if (quotation.status !== "Draft") {
    throw new ApiError(400, "Only Draft quotations can be marked as Sent.");
  }

  quotation.status = "Sent";
  await quotation.save();

  res.status(200).json(new ApiResponse(200, quotation, "Quotation marked as Sent."));
});

/**
 * @desc    Mark a quotation as Accepted by the customer
 * @route   PUT /api/quotations/:id/accept
 * @access  Private (quotation.manage)
 */
exports.acceptQuotation = asyncHandler(async (req, res) => {
  const quotation = await Quotation.findOne({
    _id: req.params.id,
    businessId: req.businessId,
  });

  if (!quotation) throw new ApiError(404, "Quotation not found.");
  if (!["Draft", "Sent"].includes(quotation.status)) {
    throw new ApiError(400, "Only Draft or Sent quotations can be accepted.");
  }

  // Expired quotations cannot be accepted
  if (new Date() > quotation.validUntil) {
    quotation.status = "Expired";
    await quotation.save();
    throw new ApiError(400, "This quotation has expired and cannot be accepted.");
  }

  quotation.status = "Accepted";
  await quotation.save();

  res.status(200).json(new ApiResponse(200, quotation, "Quotation accepted by customer."));
});

/**
 * @desc    Convert an accepted quotation to an invoice (deducts stock)
 * @route   POST /api/quotations/:id/convert
 * @access  Private (invoice.create)
 */
exports.convertToInvoice = asyncHandler(async (req, res) => {
  const quotation = await Quotation.findOne({
    _id: req.params.id,
    businessId: req.businessId,
  });

  if (!quotation) throw new ApiError(404, "Quotation not found.");
  if (quotation.status === "Converted") {
    throw new ApiError(400, "This quotation has already been converted to an invoice.");
  }
  if (!["Accepted", "Sent", "Draft"].includes(quotation.status)) {
    throw new ApiError(400, `Cannot convert a quotation with status '${quotation.status}'.`);
  }

  // Expired quotations cannot be converted
  if (new Date() > quotation.validUntil) {
    quotation.status = "Expired";
    await quotation.save();
    throw new ApiError(400, "This quotation has expired. Please create a new one.");
  }

  const { paymentMethod = "Cash", paidAmount = 0, notes } = req.body;

  const [business, customer] = await Promise.all([
    Business.findById(req.businessId),
    Customer.findOne({ _id: quotation.customer, businessId: req.businessId, isActive: true }),
  ]);

  if (!business) throw new ApiError(404, "Business not found.");
  if (!customer) throw new ApiError(404, "Customer not found or inactive.");

  // 1. Check current stock for every quoted item
  //    (stock is only written after the invoice is saved)
  const productUpdates = [];

  for (const qItem of quotation.items) {
    const product = await Product.findOne({
      _id: qItem.product,
      businessId: req.businessId,
      isActive: true,
    });

    if (!product) {
      throw new ApiError(404, `Product '${qItem.name}' no longer exists.`);
    }

    if (product.stock < qItem.quantity) {
      throw new ApiError(
        400,
        `Insufficient stock for '${product.name}'. Available: ${product.stock}, Required: ${qItem.quantity}`
      );
    }

    productUpdates.push({ product, quantity: qItem.quantity });
  }

  // 2. Payment status
  const initialPayment = Math.min(Math.max(Number(paidAmount) || 0, 0), quotation.grandTotal);
  const dueAmount = Number((quotation.grandTotal - initialPayment).toFixed(2));

  let status = "Unpaid";
  if (dueAmount === 0) status = "Paid";
  else if (initialPayment > 0) status = "Partially Paid";

  // 3. Create the invoice from the quotation's saved totals
  const invoice = await Invoice.create({
    businessId: req.businessId,
    invoiceNumber: await getNextNumber(Invoice, req.businessId, "invoiceNumber", business.settings?.invoicePrefix || "INV-"),
    customer: customer._id,
    customerSnapshot: quotation.customerSnapshot,
    invoiceDate: new Date(),
    dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
    isInterstate: quotation.isInterstate,
    items: quotation.items,
    subtotal: quotation.subtotal,
    totalDiscount: quotation.totalDiscount,
    taxableAmount: quotation.taxableAmount,
    totalCgst: quotation.totalCgst,
    totalSgst: quotation.totalSgst,
    totalIgst: quotation.totalIgst,
    totalTax: quotation.totalTax,
    roundOff: quotation.roundOff,
    grandTotal: quotation.grandTotal,
    paidAmount: initialPayment,
    dueAmount,
    status,
    paymentMethod,
    notes: notes || `Converted from Quotation ${quotation.quotationNumber}`,
    termsAndConditions: quotation.termsAndConditions,
    createdBy: req.user._id,
  });

  // 4. Reduce stock and log movements
  for (const { product, quantity } of productUpdates) {
    const previousStock = product.stock;
    product.stock = previousStock - quantity;
    await product.save();

    await StockMovement.create({
      businessId: req.businessId,
      productId: product._id,
      type: "SALE",
      quantity: -quantity,
      previousStock,
      newStock: product.stock,
      referenceId: invoice._id,
      referenceNumber: invoice.invoiceNumber,
      note: `Sale Invoice: ${invoice.invoiceNumber} (from Quotation ${quotation.quotationNumber})`,
      performedBy: req.user._id,
    });
  }

  // 5. Add the due amount to what the customer owes us
  if (dueAmount > 0) {
    customer.outstandingBalance = Number((customer.outstandingBalance + dueAmount).toFixed(2));
    await customer.save();
  }

  // 6. Link the quotation to the invoice
  quotation.status = "Converted";
  quotation.convertedToInvoice = invoice._id;
  await quotation.save();

  res.status(201).json(
    new ApiResponse(
      201,
      {
        invoice,
        quotation: {
          quotationNumber: quotation.quotationNumber,
          status: quotation.status,
        },
      },
      `Quotation ${quotation.quotationNumber} converted to Invoice ${invoice.invoiceNumber} successfully.`
    )
  );
});

/**
 * @desc    Cancel a quotation
 * @route   PUT /api/quotations/:id/cancel
 * @access  Private (quotation.manage)
 */
exports.cancelQuotation = asyncHandler(async (req, res) => {
  const quotation = await Quotation.findOne({
    _id: req.params.id,
    businessId: req.businessId,
  });

  if (!quotation) throw new ApiError(404, "Quotation not found.");
  if (quotation.status === "Converted") {
    throw new ApiError(400, "Cannot cancel a quotation that has been converted to an invoice.");
  }
  if (quotation.status === "Cancelled") {
    throw new ApiError(400, "Quotation is already cancelled.");
  }

  quotation.status = "Cancelled";
  await quotation.save();

  res.status(200).json(new ApiResponse(200, quotation, "Quotation cancelled."));
});

/**
 * @desc    Generate and stream the quotation PDF
 * @route   GET /api/quotations/:id/pdf
 * @access  Private (quotation.manage)
 */
exports.downloadQuotationPDF = asyncHandler(async (req, res) => {
  const [quotation, business] = await Promise.all([
    Quotation.findOne({ _id: req.params.id, businessId: req.businessId }).populate("customer"),
    Business.findById(req.businessId),
  ]);

  if (!quotation) throw new ApiError(404, "Quotation not found.");
  if (!business) throw new ApiError(404, "Business record not found.");

  const fileName = `Quotation-${quotation.quotationNumber}.pdf`;
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="${fileName}"`);

  generateQuotationPDF(quotation, business, res);
});
