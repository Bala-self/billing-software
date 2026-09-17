const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    userName: {
      type: String,
      required: true,
    },
    userRole: {
      type: String,
      required: true,
    },
    action: {
      type: String,
      enum: [
        "CREATE",
        "UPDATE",
        "DELETE",
        "CANCEL",
        "STATUS_CHANGE",
        "LOGIN",
        "LOGOUT",
        "PASSWORD_RESET",
        "STOCK_ADJUSTMENT",
        "EXPORT",
      ],
      required: true,
    },
    module: {
      type: String,
      enum: [
        "AUTH",
        "INVOICE",
        "SALES_RETURN",
        "PURCHASE",
        "PURCHASE_RETURN",
        "QUOTATION",
        "PRODUCT",
        "CUSTOMER",
        "SUPPLIER",
        "PAYMENT",
        "EXPENSE",
        "USER",
        "SETTINGS",
      ],
      required: true,
      index: true,
    },
    recordId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    recordIdentifier: {
      type: String, // e.g., "INV-2026-0001", "SKU-PROD-10", "bala@store.com"
      default: "",
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    oldData: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    newData: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    ipAddress: {
      type: String,
      default: "",
    },
    userAgent: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // Audit logs are immutable (no updatedAt)
  }
);

// Compound indexes for fast audit search and timeline queries
auditLogSchema.index({ businessId: 1, createdAt: -1 });
auditLogSchema.index({ businessId: 1, module: 1, createdAt: -1 });
auditLogSchema.index({ businessId: 1, recordId: 1 });
auditLogSchema.index({ businessId: 1, user: 1, createdAt: -1 });

module.exports = mongoose.model("AuditLog", auditLogSchema);
