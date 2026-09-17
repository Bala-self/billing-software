/*
 * ============================================================================
 * DISABLED FOR FUTURE USE
 * This module (Purchase Returns / Sales Returns / Suppliers) is currently
 * commented out and not mounted in backend/index.js.
 * Code is kept intact for future re-enablement.
 * To re-enable: uncomment the route in backend/index.js and frontend.
 * ============================================================================
 */

const mongoose = require("mongoose");

const returnItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  name: { type: String, required: true },
  sku: { type: String, default: "" },
  hsnCode: { type: String, default: "" },
  originalInvoiceItem: {
    type: mongoose.Schema.Types.ObjectId, // Reference to the specific item in the original invoice
  },
  quantity: {
    type: Number,
    required: true,
    min: [0.01, "Return quantity must be greater than 0"],
  },
  unitPrice: {
    type: Number,
    required: true,
    min: [0, "Price cannot be negative"],
  },
  discount: {
    type: Number,
    default: 0,
  },
  taxableAmount: { type: Number, required: true },
  taxRate: { type: Number, required: true },
  cgstRate: { type: Number, default: 0 },
  cgstAmount: { type: Number, default: 0 },
  sgstRate: { type: Number, default: 0 },
  sgstAmount: { type: Number, default: 0 },
  igstRate: { type: Number, default: 0 },
  igstAmount: { type: Number, default: 0 },
  total: { type: Number, required: true },
});

const salesReturnSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      index: true,
    },
    returnNumber: {
      type: String,
      required: true,
      trim: true,
    },
    invoice: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invoice",
      required: true,
    },
    invoiceNumber: {
      type: String,
      required: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    customerSnapshot: {
      name: String,
      phone: String,
      gstin: String,
    },
    returnDate: {
      type: Date,
      default: Date.now,
    },
    isInterstate: {
      type: Boolean,
      default: false,
    },
    items: [returnItemSchema],
    // Financials (Mirror of original invoice calculation)
    subtotal: { type: Number, required: true },
    totalDiscount: { type: Number, default: 0 },
    taxableAmount: { type: Number, required: true },
    totalCgst: { type: Number, default: 0 },
    totalSgst: { type: Number, default: 0 },
    totalIgst: { type: Number, default: 0 },
    totalTax: { type: Number, required: true },
    roundOff: { type: Number, default: 0 },
    refundAmount: { type: Number, required: true }, // Grand total of return
    paidReduction: {
      type: Number,
      default: 0, // Part of the refund that came out of the amount already paid (rest on cancellation)
    },
    // Return handling
    returnReason: {
      type: String,
      required: [true, "Return reason is required"],
      trim: true,
    },
    refundMethod: {
      type: String,
      enum: ["Cash", "UPI", "Bank Transfer", "Credit Note", "Original Method"],
      default: "Credit Note",
    },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Completed", "Cancelled"],
      default: "Completed",
    },
    notes: { type: String, default: "" },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

salesReturnSchema.index({ businessId: 1, returnNumber: 1 }, { unique: true });
salesReturnSchema.index({ businessId: 1, invoice: 1 });
salesReturnSchema.index({ businessId: 1, returnDate: -1 });

module.exports = mongoose.model("SalesReturn", salesReturnSchema);
