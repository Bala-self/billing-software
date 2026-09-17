const mongoose = require("mongoose");

const stockMovementSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      index: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["SALE", "PURCHASE", "SALES_RETURN", "PURCHASE_RETURN", "ADJUSTMENT"],
      required: true,
    },
    quantity: {
      type: Number,
      required: true, // Positive for stock IN, Negative for stock OUT
    },
    previousStock: {
      type: Number,
      required: true,
    },
    newStock: {
      type: Number,
      required: true,
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId, // ID of Invoice, Purchase, Return, etc.
    },
    referenceNumber: {
      type: String, // e.g. "INV-2026-0001"
    },
    note: {
      type: String,
      default: "",
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("StockMovement", stockMovementSchema);
