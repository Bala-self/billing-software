const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: [true, "Business reference is required"],
      index: true,
    },
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
    },
    sku: {
      type: String,
      trim: true,
      uppercase: true,
    },
    barcode: {
      type: String,
      trim: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
    },
    brand: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Brand",
    },
    unit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Unit",
    },
    hsnCode: {
      type: String,
      trim: true,
      default: "",
    },
    // Pricing
    purchasePrice: {
      type: Number,
      required: [true, "Purchase price is required"],
      min: [0, "Purchase price cannot be negative"],
      default: 0,
    },
    sellingPrice: {
      type: Number,
      required: [true, "Selling price is required"],
      min: [0, "Selling price cannot be negative"],
    },
    mrp: {
      type: Number,
      min: [0, "MRP cannot be negative"],
      default: 0,
    },
    // Tax & GST
    taxRate: {
      type: Number,
      enum: [0, 0.1, 0.25, 3, 5, 12, 18, 28],
      default: 0,
    },
    isTaxInclusive: {
      type: Boolean,
      default: false,
    },
    // Stock & Inventory
    stock: {
      type: Number,
      default: 0,
    },
    minStockAlert: {
      type: Number,
      default: 5,
    },
    status: {
      type: String,
      enum: ["In Stock", "Low Stock", "Out of Stock"],
      default: "In Stock",
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

// Compound unique indexes scoped to each business.
//
// These use PARTIAL indexes on purpose. A "sparse" compound index does not
// do what most people expect: MongoDB still indexes a document as soon as
// ANY indexed field exists, storing missing fields as null. Because every
// product has a businessId, all barcode-less products would be indexed as
// { businessId, barcode: null } and the second one would fail with a
// duplicate key error. A partial index only enforces uniqueness on products
// that actually have a real value.
//
// ($gt: "" means "any non-empty string" — it also skips null and missing
// values, which is exactly what we want.)
// Performance: Indexes for fast search (VERY IMPORTANT for billing POS)
// Guide: index fields used for searching, sorting, uniqueness
productSchema.index(
  { businessId: 1, sku: 1 },
  {
    unique: true,
    partialFilterExpression: { sku: { $exists: true, $gt: "" } },
  },
);
productSchema.index(
  { businessId: 1, barcode: 1 },
  {
    unique: true,
    partialFilterExpression: { barcode: { $exists: true, $gt: "" } },
  },
);
// Fast name search for POS
productSchema.index({ businessId: 1, name: 1 });
// Text index for better search (optional, for future)
productSchema.index({ businessId: 1, status: 1 });
productSchema.index({ businessId: 1, category: 1 });
productSchema.index({ businessId: 1, createdAt: -1 });

// Automatically compute Stock Status before saving
productSchema.pre("save", function (next) {
  if (this.stock <= 0) {
    this.status = "Out of Stock";
  } else if (this.stock <= this.minStockAlert) {
    this.status = "Low Stock";
  } else {
    this.status = "In Stock";
  }
  next();
});

module.exports = mongoose.model("Product", productSchema);
