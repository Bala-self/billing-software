const mongoose = require("mongoose");

const quotationItemSchema = new mongoose.Schema({
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
  taxRate: { type: Number, required: true },
  cgstRate: { type: Number, default: 0 },
  cgstAmount: { type: Number, default: 0 },
  sgstRate: { type: Number, default: 0 },
  sgstAmount: { type: Number, default: 0 },
  igstRate: { type: Number, default: 0 },
  igstAmount: { type: Number, default: 0 },
  total: { type: Number, required: true },
});

const quotationSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      index: true,
    },
    quotationNumber: {
      type: String,
      required: true,
      trim: true,
    },
    version: {
      type: Number,
      default: 1,
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
    quotationDate: {
      type: Date,
      default: Date.now,
    },
    validUntil: {
      type: Date,
      required: [true, "Quotation validity date is required"],
    },
    isInterstate: {
      type: Boolean,
      default: false,
    },
    items: [quotationItemSchema],
    // Calculations
    subtotal: { type: Number, required: true },
    totalDiscount: { type: Number, default: 0 },
    taxableAmount: { type: Number, required: true },
    totalCgst: { type: Number, default: 0 },
    totalSgst: { type: Number, default: 0 },
    totalIgst: { type: Number, default: 0 },
    totalTax: { type: Number, required: true },
    roundOff: { type: Number, default: 0 },
    grandTotal: { type: Number, required: true },
    // Status & Conversion
    status: {
      type: String,
      enum: ["Draft", "Sent", "Accepted", "Converted", "Expired", "Cancelled"],
      default: "Draft",
    },
    convertedToInvoice: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invoice",
      default: null,
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

quotationSchema.index({ businessId: 1, quotationNumber: 1 }, { unique: true });
quotationSchema.index({ businessId: 1, quotationDate: -1 });
quotationSchema.index({ businessId: 1, status: 1 });

module.exports = mongoose.model("Quotation", quotationSchema);
