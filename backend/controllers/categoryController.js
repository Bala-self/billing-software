const Category = require("../models/Category");
const ApiError = require("../utils/apiError");
const ApiResponse = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");

exports.getCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find({ businessId: req.businessId }).sort({ name: 1 });
  res.status(200).json(new ApiResponse(200, categories, "Categories retrieved successfully."));
});

exports.createCategory = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  if (!name) throw new ApiError(400, "Category name is required.");

  const category = await Category.create({
    businessId: req.businessId,
    name,
    description,
  });

  res.status(201).json(new ApiResponse(201, category, "Category created successfully."));
});

exports.updateCategory = asyncHandler(async (req, res) => {
  const category = await Category.findOneAndUpdate(
    { _id: req.params.id, businessId: req.businessId },
    req.body,
    { new: true, runValidators: true }
  );
  if (!category) throw new ApiError(404, "Category not found.");
  res.status(200).json(new ApiResponse(200, category, "Category updated successfully."));
});

exports.deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findOneAndDelete({ _id: req.params.id, businessId: req.businessId });
  if (!category) throw new ApiError(404, "Category not found.");
  res.status(200).json(new ApiResponse(200, null, "Category deleted successfully."));
});
