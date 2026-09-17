const Business = require("../models/Business");
const ApiError = require("../utils/apiError");
const ApiResponse = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");
const { logAudit } = require("../utils/auditLogger");

/**
 * @desc    Get Current Business Settings & Profile
 * @route   GET /api/settings
 * @access  Private (settings.manage)
 */
exports.getSettings = asyncHandler(async (req, res) => {
  const business = await Business.findById(req.businessId);
  if (!business) throw new ApiError(404, "Business account not found.");

  res.status(200).json(
    new ApiResponse(200, business, "Business settings retrieved successfully.")
  );
});

/**
 * @desc    Update Business Profile (name, address, GSTIN, PAN, logo)
 * @route   PUT /api/settings/profile
 * @access  Private (settings.manage)
 */
exports.updateBusinessProfile = asyncHandler(async (req, res) => {
  const business = await Business.findById(req.businessId);
  if (!business) throw new ApiError(404, "Business account not found.");

  const oldData = business.toObject();

  const { name, legalName, email, phone, address, taxInfo, logoUrl } = req.body;

  if (name)              business.name      = name;
  if (legalName !== undefined) business.legalName = legalName;
  if (email)             business.email     = email.toLowerCase();
  if (phone)             business.phone     = phone;
  if (logoUrl !== undefined)   business.logoUrl   = logoUrl;

  if (address) {
    business.address = {
      ...business.address.toObject(),
      ...address,
    };
  }

  if (taxInfo) {
    business.taxInfo = {
      ...business.taxInfo.toObject(),
      ...taxInfo,
      isGstRegistered: !!taxInfo.gstin,
    };
  }

  await business.save();

  await logAudit(req, {
    action: "UPDATE",
    module: "SETTINGS",
    recordId: business._id,
    recordIdentifier: business.name,
    description: `Business profile updated by ${req.user.name}.`,
    oldData: { name: oldData.name, address: oldData.address, taxInfo: oldData.taxInfo },
    newData: { name: business.name, address: business.address, taxInfo: business.taxInfo },
  });

  res.status(200).json(
    new ApiResponse(200, business, "Business profile updated successfully.")
  );
});

/**
 * @desc    Update Billing, Invoice Numbering & Printing Preferences
 * @route   PUT /api/settings/billing-preferences
 * @access  Private (settings.manage)
 */
exports.updateBillingPreferences = asyncHandler(async (req, res) => {
  const business = await Business.findById(req.businessId);
  if (!business) throw new ApiError(404, "Business account not found.");

  const { settings } = req.body;

  if (!settings || typeof settings !== "object") {
    throw new ApiError(400, "Settings object is required.");
  }

  // Validate printLayout if provided
  const validLayouts = ["A4", "Thermal 80mm", "Thermal 58mm"];
  if (settings.printLayout && !validLayouts.includes(settings.printLayout)) {
    throw new ApiError(400, `Invalid printLayout. Allowed: ${validLayouts.join(", ")}`);
  }

  const oldData = business.settings.toObject();

  business.settings = {
    ...business.settings.toObject(),
    ...settings,
  };

  await business.save();

  await logAudit(req, {
    action: "UPDATE",
    module: "SETTINGS",
    recordId: business._id,
    recordIdentifier: "Billing Preferences",
    description: `Billing preferences and numbering settings updated by ${req.user.name}.`,
    oldData,
    newData: business.settings,
  });

  res.status(200).json(
    new ApiResponse(200, business.settings, "Billing preferences updated successfully.")
  );
});

/**
 * @desc    Update Business Bank & UPI Remittance Details
 * @route   PUT /api/settings/bank-details
 * @access  Private (settings.manage)
 */
exports.updateBankDetails = asyncHandler(async (req, res) => {
  const business = await Business.findById(req.businessId);
  if (!business) throw new ApiError(404, "Business account not found.");

  const { bankDetails } = req.body;

  if (!bankDetails || typeof bankDetails !== "object") {
    throw new ApiError(400, "Bank details object is required.");
  }

  business.bankDetails = {
    ...business.bankDetails.toObject(),
    ...bankDetails,
  };

  await business.save();

  await logAudit(req, {
    action: "UPDATE",
    module: "SETTINGS",
    recordId: business._id,
    recordIdentifier: "Bank Details",
    description: `Remittance and bank payout details updated by ${req.user.name}.`,
    // Omit old data for bank details — sensitive
    newData: {
      bankName: business.bankDetails.bankName,
      branch:   business.bankDetails.branch,
      ifscCode: business.bankDetails.ifscCode,
      upiId:    business.bankDetails.upiId,
    },
  });

  res.status(200).json(
    new ApiResponse(200, business.bankDetails, "Bank details updated successfully.")
  );
});
