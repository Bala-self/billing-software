const mongoose = require("mongoose");

const purchaseItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  name: { type: String, required: true },
  sku: { type: String, default: "" },
  hsnCode: { type: String, default: "" },
  quantity: {
    type: Number,
    required: true,
    min: [0.01, "Quantity must be greater than 0"],
  },
  unitCost: {
    type: Number,
    required: true,
    min: [0, "Purchase cost cannot be negative"],
  },
  discount: {
    type: Number,
    default: 0,
    min: [0, "Discount cannot be negative"],
  },
  taxableAmount: { type: Number, required: true },
  taxRate: { type: Number, required: true }, // GST %
  cgstRate: { type: Number, default: 0 },
  cgstAmount: { type: Number, default: 0 },
  sgstRate: { type: Number, default: 0 },
  sgstAmount: { type: Number, default: 0 },
  igstRate: { type: Number, default: 0 },
  igstAmount: { type: Number, default: 0 },
  total: { type: Number, required: true },
});

const purchaseSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      index: true,
    },
    purchaseNumber: {
      type: String,
      required: true,
      trim: true,
    },
    supplierBillNumber: {
      type: String, // Vendor's invoice number
      trim: true,
      default: "",
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      required: true,
    },
    supplierSnapshot: {
      name: String,
      phone: String,
      email: String,
      gstin: String,
      address: Object,
    },
    purchaseDate: {
      type: Date,
      default: Date.now,
    },
    dueDate: {
      type: Date,
    },
    isInterstate: {
      type: Boolean,
      default: false,
    },
    items: [purchaseItemSchema],
    // Financials
    subtotal: { type: Number, required: true },
    totalDiscount: { type: Number, default: 0 },
    taxableAmount: { type: Number, required: true },
    totalCgst: { type: Number, default: 0 },
    totalSgst: { type: Number, default: 0 },
    totalIgst: { type: Number, default: 0 },
    totalTax: { type: Number, required: true },
    roundOff: { type: Number, default: 0 },
    grandTotal: { type: Number, required: true },
    // Payment tracking
    paidAmount: { type: Number, default: 0 },
    dueAmount: { type: Number, required: true },
    paymentStatus: {
      type: String,
      enum: ["Paid", "Unpaid", "Partially Paid"],
      default: "Unpaid",
    },
    status: {
      type: String,
      enum: ["Received", "Ordered", "Cancelled"],
      default: "Received",
    },
    paymentMethod: {
      type: String,
      enum: ["Cash", "UPI", "Bank Transfer", "Cheque", "Credit"],
      default: "Credit",
    },
    notes: { type: String, default: "" },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

purchaseSchema.index({ businessId: 1, purchaseNumber: 1 }, { unique: true });
purchaseSchema.index({ businessId: 1, purchaseDate: -1 });

module.exports = mongoose.model("Purchase", purchaseSchema);
