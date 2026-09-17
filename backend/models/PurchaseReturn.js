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

const purchaseReturnItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  name: { type: String, required: true },
  sku: { type: String, default: "" },
  hsnCode: { type: String, default: "" },
  originalPurchaseItem: {
    type: mongoose.Schema.Types.ObjectId,
  },
  quantity: {
    type: Number,
    required: true,
    min: [0.01, "Return quantity must be greater than 0"],
  },
  unitCost: {
    type: Number,
    required: true,
    min: [0, "Cost cannot be negative"],
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

const purchaseReturnSchema = new mongoose.Schema(
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
    purchase: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Purchase",
      required: true,
    },
    purchaseNumber: {
      type: String,
      required: true,
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      required: true,
    },
    supplierSnapshot: {
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
    items: [purchaseReturnItemSchema],
    // Financials
    subtotal: { type: Number, required: true },
    totalDiscount: { type: Number, default: 0 },
    taxableAmount: { type: Number, required: true },
    totalCgst: { type: Number, default: 0 },
    totalSgst: { type: Number, default: 0 },
    totalIgst: { type: Number, default: 0 },
    totalTax: { type: Number, required: true },
    roundOff: { type: Number, default: 0 },
    refundAmount: { type: Number, required: true },
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
      enum: ["Cash", "UPI", "Bank Transfer", "Debit Note", "Original Method"],
      default: "Debit Note",
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

purchaseReturnSchema.index({ businessId: 1, returnNumber: 1 }, { unique: true });
purchaseReturnSchema.index({ businessId: 1, purchase: 1 });
purchaseReturnSchema.index({ businessId: 1, returnDate: -1 });

module.exports = mongoose.model("PurchaseReturn", purchaseReturnSchema);
