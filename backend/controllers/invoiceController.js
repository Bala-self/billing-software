/**
 * Invoice Controller - Simple for 1 year MERN dev
 *
 * GST Logic (Tamil Nadu):
 * - If business state == customer state: CGST + SGST (each half of tax rate)
 * - If different state: IGST (full tax rate)
 *
 * Flow to create invoice:
 * 1. Get business and customer
 * 2. Check if interstate
 * 3. For each item: check product exists and stock enough, calculate tax
 * 4. Calculate totals
 * 5. Save invoice
 * 6. Reduce stock and create StockMovement
 * 7. Update customer outstanding balance if not fully paid
 */

const Invoice = require("../models/Invoice");
const Product = require("../models/Product");
const mongoose = require("mongoose");
const Customer = require("../models/Customer");
const Business = require("../models/Business");
const StockMovement = require("../models/StockMovement");
const ApiError = require("../utils/apiError");
const ApiResponse = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");
const { calculateLineItem, calculateTotals } = require("../utils/billing");
const { getNextNumber } = require("../utils/numbering");

// Create invoice
exports.createInvoice = asyncHandler(async (req, res) => {
  const {
    customerId,
    items,
    invoiceDate,
    dueDate,
    paymentMethod = "Cash",
    paidAmount = 0,
    taxRate,
    notes,
  } = req.body;

  // Basic validation
  if (!customerId) throw new ApiError(400, "Customer is required");
  if (!items || items.length === 0)
    throw new ApiError(400, "Add at least one product");

  // Get business (for GST state) and customer
  const business = await Business.findById(req.businessId);
  const customer = await Customer.findOne({
    _id: customerId,
    businessId: req.businessId,
    isActive: true,
  });

  if (!business) throw new ApiError(404, "Business not found");
  if (!customer) throw new ApiError(404, "Customer not found");

  const billTaxRate = [0, 5, 12, 18, 28].includes(Number(taxRate))
    ? Number(taxRate)
    : Number(business.settings?.defaultGstRate) || 0;

  // Check interstate: if business state != customer state -> IGST else CGST+SGST
  const businessState = (business.address.state || "").toLowerCase();
  const customerState = (customer.billingAddress.state || "").toLowerCase();
  const isInterstate = businessState !== customerState;

  // Process each item
  const lines = []; // for totals calculation
  const processedItems = []; // for saving in invoice
  const productUpdates = new Map(); // aggregate repeated product lines

  for (const item of items) {
    if (!item.productId || !item.quantity || item.quantity <= 0) {
      throw new ApiError(400, "Each item needs productId and qty > 0");
    }
    if (item.quantity > 10000) {
      throw new ApiError(400, "Quantity too large, max 10000 per item");
    }

    // Find product
    const product = await Product.findOne({
      _id: item.productId,
      businessId: req.businessId,
      isActive: true,
    });
    if (!product)
      throw new ApiError(404, `Product ${item.productId} not found`);

    // Check stock
    if (product.stock < item.quantity) {
      throw new ApiError(
        400,
        `Insufficient stock for '${product.name}'. Available: ${product.stock}, Requested: ${item.quantity}`,
      );
    }

    // Calculate tax for this line
    const line = calculateLineItem({
      unitPrice: product.sellingPrice,
      quantity: Number(item.quantity),
      discount: item.discount || 0,
      discountType: item.discountType || "FIXED",
      taxRate: billTaxRate,
      isInterstate,
    });

    lines.push(line);

    processedItems.push({
      product: product._id,
      name: product.name,
      sku: product.sku,
      hsnCode: product.hsnCode,
      quantity: Number(item.quantity),
      unitPrice: product.sellingPrice,
      discount: item.discount || 0,
      discountType: item.discountType || "FIXED",
      taxableAmount: line.taxableAmount,
      taxRate: billTaxRate,
      cgstRate: line.cgstRate,
      cgstAmount: line.cgstAmount,
      sgstRate: line.sgstRate,
      sgstAmount: line.sgstAmount,
      igstRate: line.igstRate,
      igstAmount: line.igstAmount,
      total: line.total,
    });

    const quantity = Number(item.quantity);
    const existingUpdate = productUpdates.get(product._id.toString());
    if (existingUpdate) existingUpdate.quantity += quantity;
    else productUpdates.set(product._id.toString(), { product, quantity });
  }

  for (const { product, quantity } of productUpdates.values()) {
    if (product.stock < quantity) {
      throw new ApiError(
        400,
        `Insufficient stock for '${product.name}'. Available: ${product.stock}, Requested: ${quantity}`,
      );
    }
  }

  // Calculate totals from lines
  const totals = calculateTotals(lines);

  // Payment status
  const pay = Math.min(Math.max(Number(paidAmount) || 0, 0), totals.grandTotal);
  if (!customer.isGstRegistered && pay < totals.grandTotal) {
    throw new ApiError(400, "Unregistered customers must pay the full bill.");
  }
  if (!customer.isGstRegistered && paymentMethod === "Credit") {
    throw new ApiError(
      400,
      "Credit payment is available only for registered customers.",
    );
  }
  const due = Number((totals.grandTotal - pay).toFixed(2));
  let status = "Unpaid";
  if (due === 0) status = "Paid";
  else if (pay > 0) status = "Partially Paid";

  const invoiceNumber = await getNextNumber(
    Invoice,
    req.businessId,
    "invoiceNumber",
    business.settings?.invoicePrefix || "INV-",
  );

  const invoiceDocuments = await Invoice.create([
    {
      businessId: req.businessId,
      invoiceNumber,
      customer: customer._id,
      customerSnapshot: {
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        gstin: customer.gstin,
        billingAddress: customer.billingAddress,
      },
      invoiceDate: invoiceDate || new Date(),
      dueDate: dueDate || new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days later
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
      paidAmount: pay,
      dueAmount: due,
      status,
      paymentMethod,
      notes: notes || "",
      createdBy: req.user._id,
    },
  ]);
  const invoice = invoiceDocuments[0];

  for (const { product, quantity } of productUpdates.values()) {
    const updatedProduct = await Product.findOneAndUpdate(
      {
        _id: product._id,
        businessId: req.businessId,
        isActive: true,
        stock: { $gte: quantity },
      },
      [
        { $set: { stock: { $subtract: ["$stock", quantity] } } },
        {
          $set: {
            status: {
              $switch: {
                branches: [
                  { case: { $lte: ["$stock", 0] }, then: "Out of Stock" },
                  {
                    case: { $lte: ["$stock", "$minStockAlert"] },
                    then: "Low Stock",
                  },
                ],
                default: "In Stock",
              },
            },
          },
        },
      ],
      { new: true },
    );

    if (!updatedProduct) {
      throw new ApiError(400, `Insufficient stock for '${product.name}'`);
    }

    const prevStock = updatedProduct.stock + quantity;

    await StockMovement.create([
      {
        businessId: req.businessId,
        productId: product._id,
        type: "SALE",
        quantity: -quantity,
        previousStock: prevStock,
        newStock: updatedProduct.stock,
        referenceId: invoice._id,
        referenceNumber: invoice.invoiceNumber,
        note: `Sale: ${invoice.invoiceNumber}`,
        performedBy: req.user._id,
      },
    ]);
  }

  if (due > 0) {
    const customerForUpdate = await Customer.findOne({
      _id: customer._id,
      businessId: req.businessId,
      isActive: true,
    });
    customerForUpdate.outstandingBalance = Number(
      (customerForUpdate.outstandingBalance + due).toFixed(2),
    );
    await customerForUpdate.save();
  }

  res.status(201).json(new ApiResponse(201, invoice, "Invoice created"));
});

// List invoices with search and filters
exports.getInvoices = asyncHandler(async (req, res) => {
  const {
    search,
    status,
    startDate,
    endDate,
    page = 1,
    limit = 50,
  } = req.query;
  const query = { businessId: req.businessId };

  // Search by invoice number or customer name/phone - with length limit + regex escape
  if (search) {
    if (typeof search === "string" && search.length > 100)
      throw new ApiError(400, "Search too long, max 100 chars");
    const safe = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    query.$or = [
      { invoiceNumber: { $regex: safe, $options: "i" } },
      { "customerSnapshot.name": { $regex: safe, $options: "i" } },
      { "customerSnapshot.phone": { $regex: safe, $options: "i" } },
    ];
  }

  if (status) query.status = status;

  // Date filter
  if (startDate || endDate) {
    query.invoiceDate = {};
    if (startDate) query.invoiceDate.$gte = new Date(startDate);
    if (endDate) query.invoiceDate.$lte = new Date(endDate);
  }

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;

  const [invoices, total] = await Promise.all([
    Invoice.find(query)
      .populate("customer", "name phone")
      .sort({ invoiceDate: -1 })
      .skip(skip)
      .limit(limitNum),
    Invoice.countDocuments(query),
  ]);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        invoices,
        pagination: {
          total,
          page: pageNum,
          pages: Math.ceil(total / limitNum),
          limit: limitNum,
        },
      },
      "Invoices list",
    ),
  );
});

// Get single invoice
exports.getInvoiceById = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findOne({
    _id: req.params.id,
    businessId: req.businessId,
  }).populate("customer");
  if (!invoice) throw new ApiError(404, "Invoice not found");
  res.status(200).json(new ApiResponse(200, invoice, "Invoice found"));
});

// Cancel invoice - restore stock and customer balance
exports.cancelInvoice = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findOne({
    _id: req.params.id,
    businessId: req.businessId,
  });
  if (!invoice) throw new ApiError(404, "Invoice not found");
  if (invoice.status === "Cancelled")
    throw new ApiError(400, "Already cancelled");

  // Restore stock for each item
  for (const item of invoice.items) {
    const product = await Product.findOne({
      _id: item.product,
      businessId: req.businessId,
    });
    if (product) {
      const prev = product.stock;
      product.stock += item.quantity;
      await product.save();

      await StockMovement.create({
        businessId: req.businessId,
        productId: product._id,
        type: "ADJUSTMENT",
        quantity: item.quantity,
        previousStock: prev,
        newStock: product.stock,
        referenceId: invoice._id,
        referenceNumber: invoice.invoiceNumber,
        note: `Cancelled: ${invoice.invoiceNumber}`,
        performedBy: req.user._id,
      });
    }
  }

  // Remove due amount from customer balance
  if (invoice.dueAmount > 0) {
    const customer = await Customer.findOne({
      _id: invoice.customer,
      businessId: req.businessId,
    });
    if (customer) {
      customer.outstandingBalance = Math.max(
        0,
        customer.outstandingBalance - invoice.dueAmount,
      );
      await customer.save();
    }
  }

  invoice.status = "Cancelled";
  await invoice.save();

  res
    .status(200)
    .json(new ApiResponse(200, invoice, "Invoice cancelled, stock restored"));
});

// Download PDF
exports.downloadInvoicePDF = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findOne({
    _id: req.params.id,
    businessId: req.businessId,
  }).populate("customer");
  const business = await Business.findById(req.businessId);
  if (!invoice) throw new ApiError(404, "Invoice not found");
  if (!business) throw new ApiError(404, "Business not found");

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `inline; filename="Invoice-${invoice.invoiceNumber}.pdf"`,
  );

  const { generateInvoicePDF } = require("../services/pdfService");
  generateInvoicePDF(invoice, business, res);
});
