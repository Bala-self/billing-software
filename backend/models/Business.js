const mongoose = require("mongoose");

const businessSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Business name is required"],
      trim: true,
    },
    legalName: {
      type: String,
      trim: true,
      default: "",
    },
    email: {
      type: String,
      required: [true, "Business email is required"],
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      required: [true, "Business phone is required"],
      trim: true,
    },
    address: {
      street:    { type: String, default: "" },
      city:      { type: String, default: "" },
      state:     { type: String, required: [true, "State is required for GST rules"] },
      stateCode: { type: String, default: "" }, // 2-digit Indian State Code (e.g. '33' for TN)
      pincode:   { type: String, default: "" },
      country:   { type: String, default: "India" },
    },
    taxInfo: {
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
      isGstRegistered: {
        type: Boolean,
        default: false,
      },
    },
    settings: {
      currency:               { type: String, default: "INR" },
      currencySymbol:         { type: String, default: "Rs." },
      invoicePrefix:          { type: String, default: "INV-" },
      billPrefix:             { type: String, default: "BILL-" },
      quotationPrefix:        { type: String, default: "QTN-" },
      poPrefix:               { type: String, default: "PUR-" },
      defaultGstRate:         { type: Number, default: 18 },
      autoRoundOff:           { type: Boolean, default: true },
      defaultPaymentTermsDays:{ type: Number, default: 15 },
      defaultTermsAndConditions: {
        type: String,
        default:
          "1. Goods once sold will not be taken back without original invoice.\n2. All disputes are subject to local jurisdiction only.",
      },
      defaultInvoiceNotes: {
        type: String,
        default: "Thank you for your business!",
      },
      printLayout: {
        type: String,
        enum: ["A4", "Thermal 80mm", "Thermal 58mm"],
        default: "A4",
      },
    },
    bankDetails: {
      bankName:      { type: String, default: "" },
      accountName:   { type: String, default: "" },
      accountNumber: { type: String, default: "" },
      ifscCode:      { type: String, default: "", uppercase: true, trim: true },
      branch:        { type: String, default: "" },
      upiId:         { type: String, default: "", trim: true },
    },
    logoUrl: {
      type: String,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Auto-extract state code from GSTIN first 2 digits if stateCode is omitted
businessSchema.pre("save", function (next) {
  if (this.taxInfo?.gstin && this.taxInfo.gstin.length >= 2) {
    this.taxInfo.isGstRegistered = true;
    if (!this.address.stateCode) {
      this.address.stateCode = this.taxInfo.gstin.substring(0, 2);
    }
  }
  next();
});

module.exports = mongoose.model("Business", businessSchema);
