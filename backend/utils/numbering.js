/**
 * Sequential document numbers, e.g. INV-2026-0007, PUR-2026-0003.
 *
 * The number restarts every year. A counter document is incremented
 * atomically so concurrent requests cannot receive the same number.
 */

const NumberSequence = require("../models/NumberSequence");

const getNextNumber = async (
  Model,
  businessId,
  numberField,
  prefix,
  options = {},
) => {
  const year = new Date().getFullYear();
  const sequence = await NumberSequence.findOneAndUpdate(
    { businessId, year, documentType: numberField, prefix },
    { $inc: { sequence: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true, ...options },
  );

  return `${prefix}${year}-${String(sequence.sequence).padStart(4, "0")}`;
};

module.exports = { getNextNumber };
