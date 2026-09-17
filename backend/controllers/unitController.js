const Unit = require("../models/Unit");
const ApiError = require("../utils/apiError");
const ApiResponse = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");

exports.getUnits = asyncHandler(async (req, res) => {
  const units = await Unit.find({ businessId: req.businessId }).sort({ name: 1 });
  res.status(200).json(new ApiResponse(200, units, "Units retrieved successfully."));
});

exports.createUnit = asyncHandler(async (req, res) => {
  const { name, shortCode } = req.body;
  if (!name || !shortCode) throw new ApiError(400, "Unit name and short code are required.");

  const unit = await Unit.create({
    businessId: req.businessId,
    name,
    shortCode,
  });

  res.status(201).json(new ApiResponse(201, unit, "Unit created successfully."));
});

exports.updateUnit = asyncHandler(async (req, res) => {
  const unit = await Unit.findOneAndUpdate(
    { _id: req.params.id, businessId: req.businessId },
    req.body,
    { new: true, runValidators: true }
  );
  if (!unit) throw new ApiError(404, "Unit not found.");
  res.status(200).json(new ApiResponse(200, unit, "Unit updated successfully."));
});

exports.deleteUnit = asyncHandler(async (req, res) => {
  const unit = await Unit.findOneAndDelete({ _id: req.params.id, businessId: req.businessId });
  if (!unit) throw new ApiError(404, "Unit not found.");
  res.status(200).json(new ApiResponse(200, null, "Unit deleted successfully."));
});
