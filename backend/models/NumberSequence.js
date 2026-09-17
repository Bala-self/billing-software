const mongoose = require("mongoose");

const numberSequenceSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: true,
    },
    year: { type: Number, required: true },
    documentType: { type: String, required: true },
    prefix: { type: String, required: true },
    sequence: { type: Number, default: 0 },
  },
  { timestamps: true },
);

numberSequenceSchema.index(
  { businessId: 1, year: 1, documentType: 1, prefix: 1 },
  { unique: true },
);

module.exports = mongoose.model("NumberSequence", numberSequenceSchema);
