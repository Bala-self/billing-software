const mongoose = require("mongoose");

const unitSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, "Unit name is required (e.g. Pieces, Kilograms)"],
      trim: true,
    },
    shortCode: {
      type: String,
      required: [true, "Unit short code is required (e.g. PCS, KG, BOX)"],
      trim: true,
      uppercase: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Unique short code per business
unitSchema.index({ businessId: 1, shortCode: 1 }, { unique: true });

module.exports = mongoose.model("Unit", unitSchema);
