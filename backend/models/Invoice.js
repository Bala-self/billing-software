const mongoose = require("mongoose");

const invoiceItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  name: { type: String, required: true },
  sku: { type: String, default: "" },
  hsnCode: { type: String, default: "" },
  unit: { type: String, default: "PCS" },
  quantity: {
    type: Number,
    required: true,
    min: [0.01, "Quantity must be greater than 0"],
  },
  unitPrice: {
    type: Number,
    required: true,
    min: [0, "Price cannot be negative"],
  },
  discount: {
    type: Number,
    default: 0,
    min: [0, "Discount cannot be negative"],
  },
  discountType: {
    type: String,
    enum: ["PERCENTAGE", "FIXED"],
    default: "FIXED",
  },
  taxableAmount: { type: Number, required: true },
  taxRate: { type: Number, required: true }, // GST % (e.g., 18)
  cgstRate: { type: Number, default: 0 },
  cgstAmount: { type: Number, default: 0 },
  sgstRate: { type: Number, default: 0 },
  sgstAmount: { type: Number, default: 0 },
  igstRate: { type: Number, default: 0 },
  igstAmount: { type: Number, default: 0 },
  total: { type: Number, required: true },
});

const invoiceSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      index: true,
    },
    invoiceNumber: {
      type: String,
      required: true,
      trim: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    customerSnapshot: {
      name: String,
      phone: String,
      email: String,
      gstin: String,
      billingAddress: Object,
    },
    invoiceDate: {
      type: Date,
      default: Date.now,
    },
    dueDate: {
      type: Date,
    },
    isInterstate: {
      type: Boolean,
      default: false, // True = IGST, False = CGST + SGST
    },
    items: [invoiceItemSchema],
    // Calculations
    subtotal: { type: Number, required: true }, // Sum of (qty * unitPrice)
    totalDiscount: { type: Number, default: 0 },
    taxableAmount: { type: Number, required: true },
    totalCgst: { type: Number, default: 0 },
    totalSgst: { type: Number, default: 0 },
    totalIgst: { type: Number, default: 0 },
    totalTax: { type: Number, required: true },
    roundOff: { type: Number, default: 0 },
    grandTotal: { type: Number, required: true },
    // Payment status & tracking
    paidAmount: { type: Number, default: 0 },
    dueAmount: { type: Number, required: true },
    status: {
      type: String,
      enum: ["Draft", "Unpaid", "Partially Paid", "Paid", "Cancelled"],
      default: "Unpaid",
    },
    paymentMethod: {
      type: String,
      enum: ["Cash", "UPI", "Bank Transfer", "Card", "Cheque", "Credit", "Multiple"],
      default: "Cash",
    },
    notes: { type: String, default: "" },
    termsAndConditions: { type: String, default: "" },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

// Performance: Indexes for fast lookup (guide priority)
// Invoice number unique per business, date for sorting, customer for filter, status for reports
invoiceSchema.index({ businessId: 1, invoiceNumber: 1 }, { unique: true });
invoiceSchema.index({ businessId: 1, invoiceDate: -1 });
invoiceSchema.index({ businessId: 1, customer: 1 });
invoiceSchema.index({ businessId: 1, status: 1 });
invoiceSchema.index({ businessId: 1, createdAt: -1 });
invoiceSchema.index({ businessId: 1, "customerSnapshot.name": 1 });

module.exports = mongoose.model("Invoice", invoiceSchema);
