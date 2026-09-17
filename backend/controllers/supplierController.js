/*
 * ============================================================================
 * DISABLED FOR FUTURE USE
 * This module (Purchase Returns / Sales Returns / Suppliers) is currently
 * commented out and not mounted in backend/index.js.
 * Code is kept intact for future re-enablement.
 * To re-enable: uncomment the route in backend/index.js and frontend.
 * ============================================================================
 */

const Supplier = require("../models/Supplier");
const ApiError = require("../utils/apiError");
const ApiResponse = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");

/**
 * @desc    Get all suppliers with search & pagination
 * @route   GET /api/suppliers
 * @access  Private (suppliers.manage)
 */
exports.getSuppliers = asyncHandler(async (req, res) => {
  const { search, page = 1, limit = 50 } = req.query;
  const query = { businessId: req.businessId, isActive: true };

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { contactPerson: { $regex: search, $options: "i" } },
      { phone: { $regex: search, $options: "i" } },
      { gstin: { $regex: search, $options: "i" } },
    ];
  }

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;

  const [suppliers, total] = await Promise.all([
    Supplier.find(query)
      .sort({ name: 1 })
      .skip(skip)
      .limit(limitNum),
    Supplier.countDocuments(query),
  ]);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        suppliers,
        pagination: {
          total,
          page: pageNum,
          pages: Math.ceil(total / limitNum),
          limit: limitNum,
        },
      },
      "Suppliers retrieved successfully."
    )
  );
});

/**
 * @desc    Get single supplier by ID
 * @route   GET /api/suppliers/:id
 * @access  Private (suppliers.manage)
 */
exports.getSupplierById = asyncHandler(async (req, res) => {
  const supplier = await Supplier.findOne({
    _id: req.params.id,
    businessId: req.businessId,
  });

  if (!supplier) throw new ApiError(404, "Supplier not found.");

  res.status(200).json(new ApiResponse(200, supplier, "Supplier retrieved."));
});

/**
 * @desc    Create new supplier
 * @route   POST /api/suppliers
 * @access  Private (suppliers.manage)
 */
exports.createSupplier = asyncHandler(async (req, res) => {
  const {
    name,
    contactPerson,
    phone,
    email,
    gstin,
    pan,
    address,
    openingBalance,
    bankDetails,
  } = req.body;

  if (!name) {
    throw new ApiError(400, "Supplier name is required.");
  }

  const initialBalance = Number(openingBalance) || 0;

  const supplier = await Supplier.create({
    businessId: req.businessId,
    name,
    contactPerson: contactPerson || "",
    phone: phone || "",
    email: email || "",
    gstin: gstin ? gstin.toUpperCase() : "",
    pan: pan ? pan.toUpperCase() : "",
    address: address || {},
    openingBalance: initialBalance,
    payableBalance: initialBalance,
    bankDetails: bankDetails || {},
  });

  res.status(201).json(new ApiResponse(201, supplier, "Supplier created successfully."));
});

/**
 * @desc    Update supplier
 * @route   PUT /api/suppliers/:id
 * @access  Private (suppliers.manage)
 */
exports.updateSupplier = asyncHandler(async (req, res) => {
  const {
    name,
    contactPerson,
    phone,
    email,
    gstin,
    pan,
    address,
    openingBalance,
    bankDetails,
  } = req.body;

  const supplier = await Supplier.findOne({
    _id: req.params.id,
    businessId: req.businessId,
  });

  if (!supplier) throw new ApiError(404, "Supplier not found.");

  // Only update fields the supplier form can edit.
  // businessId, isActive and the calculated payableBalance are never
  // taken from the client.
  const updatable = {
    name, contactPerson, phone, email,
    gstin: gstin ? gstin.toUpperCase() : gstin,
    pan: pan ? pan.toUpperCase() : pan,
    address, openingBalance, bankDetails,
  };
  for (const field of Object.keys(updatable)) {
    if (updatable[field] !== undefined) supplier[field] = updatable[field];
  }

  await supplier.save();

  res.status(200).json(new ApiResponse(200, supplier, "Supplier updated successfully."));
});

/**
 * @desc    Delete supplier (Soft delete)
 * @route   DELETE /api/suppliers/:id
 * @access  Private (suppliers.manage)
 */
exports.deleteSupplier = asyncHandler(async (req, res) => {
  const supplier = await Supplier.findOneAndUpdate(
    { _id: req.params.id, businessId: req.businessId },
    { isActive: false },
    { new: true }
  );

  if (!supplier) throw new ApiError(404, "Supplier not found.");

  res.status(200).json(new ApiResponse(200, null, "Supplier deleted successfully."));
});
