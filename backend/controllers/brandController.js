const Brand = require("../models/Brand");
const ApiError = require("../utils/apiError");
const ApiResponse = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");

exports.getBrands = asyncHandler(async (req, res) => {
  const brands = await Brand.find({ businessId: req.businessId }).sort({ name: 1 });
  res.status(200).json(new ApiResponse(200, brands, "Brands retrieved successfully."));
});

exports.createBrand = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  if (!name) throw new ApiError(400, "Brand name is required.");

  const brand = await Brand.create({
    businessId: req.businessId,
    name,
    description,
  });

  res.status(201).json(new ApiResponse(201, brand, "Brand created successfully."));
});

exports.updateBrand = asyncHandler(async (req, res) => {
  const brand = await Brand.findOneAndUpdate(
    { _id: req.params.id, businessId: req.businessId },
    req.body,
    { new: true, runValidators: true }
  );
  if (!brand) throw new ApiError(404, "Brand not found.");
  res.status(200).json(new ApiResponse(200, brand, "Brand updated successfully."));
});

exports.deleteBrand = asyncHandler(async (req, res) => {
  const brand = await Brand.findOneAndDelete({ _id: req.params.id, businessId: req.businessId });
  if (!brand) throw new ApiError(404, "Brand not found.");
  res.status(200).json(new ApiResponse(200, null, "Brand deleted successfully."));
});
