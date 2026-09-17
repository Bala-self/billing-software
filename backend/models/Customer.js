const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, "Customer name is required"],
      trim: true,
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
    // Billing Address (Crucial for Place of Supply & GST calculation)
    billingAddress: {
      street: { type: String, default: "" },
      city: { type: String, default: "" },
      state: { type: String, required: [true, "Customer state is required for GST rules"] },
      stateCode: { type: String, default: "" }, // 2-digit code (e.g., '33' for TN, '27' for MH)
      pincode: { type: String, default: "" },
      country: { type: String, default: "India" },
    },
    // Shipping Address
    shippingAddress: {
      street: { type: String, default: "" },
      city: { type: String, default: "" },
      state: { type: String, default: "" },
      stateCode: { type: String, default: "" },
      pincode: { type: String, default: "" },
      country: { type: String, default: "India" },
    },
    // Financials & Balances
    creditLimit: {
      type: Number,
      default: 0, // 0 = unlimited or no credit allowed
    },
    openingBalance: {
      type: Number,
      default: 0, // Positive = Customer owes us; Negative = Advance payment
    },
    outstandingBalance: {
      type: Number,
      default: 0, // Automatically calculated by invoices & payments
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Performance & Data Quality: Indexes for fast search
// Guide: index fields used for searching, sorting
customerSchema.index({ businessId: 1, phone: 1 }); // fast phone lookup, not unique to allow walk-in 0000000000
customerSchema.index({ businessId: 1, name: 1 }); // fast name search
customerSchema.index({ businessId: 1, "billingAddress.city": 1 }); // city search (fix for Bangalore bug)
customerSchema.index({ businessId: 1, "billingAddress.state": 1 }); // state filter for GST
customerSchema.index({ businessId: 1, createdAt: -1 });
customerSchema.index({ businessId: 1, isActive: 1 });

// Automatically extract 2-digit state code from GSTIN if present
customerSchema.pre("save", function (next) {
  if (this.gstin && this.gstin.length >= 2) {
    this.isGstRegistered = true;
    const extractedCode = this.gstin.substring(0, 2);
    if (!this.billingAddress.stateCode) {
      this.billingAddress.stateCode = extractedCode;
    }
  }
  next();
});

module.exports = mongoose.model("Customer", customerSchema);
