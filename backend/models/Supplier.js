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

const supplierSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, "Supplier/Vendor name is required"],
      trim: true,
    },
    contactPerson: {
      type: String,
      trim: true,
      default: "",
    },
    phone: {
      type: String,
      trim: true,
      default: "",
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },
    // GST Details
    isGstRegistered: {
      type: Boolean,
      default: false,
    },
    gstin: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
    },
    pan: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
    },
    // Address
    address: {
      street: { type: String, default: "" },
      city: { type: String, default: "" },
      state: { type: String, default: "" },
      stateCode: { type: String, default: "" },
      pincode: { type: String, default: "" },
      country: { type: String, default: "India" },
    },
    // Financials
    openingBalance: {
      type: Number,
      default: 0, // Positive = We owe supplier
    },
    payableBalance: {
      type: Number,
      default: 0, // Automatically calculated by purchases & supplier payments
    },
    // Bank Details for payout references
    bankDetails: {
      bankName: { type: String, default: "" },
      accountNumber: { type: String, default: "" },
      ifscCode: { type: String, default: "" },
      branch: { type: String, default: "" },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

supplierSchema.index({ businessId: 1, name: 1 });
supplierSchema.index({ businessId: 1, phone: 1 });

supplierSchema.pre("save", function (next) {
  if (this.gstin && this.gstin.length >= 2) {
    this.isGstRegistered = true;
    if (!this.address.stateCode) {
      this.address.stateCode = this.gstin.substring(0, 2);
    }
  }
  next();
});

module.exports = mongoose.model("Supplier", supplierSchema);
