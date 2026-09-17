const User = require("../models/User");
const Business = require("../models/Business");
const ApiError = require("../utils/apiError");
const ApiResponse = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");

/**
 * @desc    Register a new business + its owner (Admin)
 * @route   POST /api/auth/register
 * @access  Public
 */
const registerBusiness = asyncHandler(async (req, res) => {
  const {
    businessName,
    businessEmail,
    businessPhone,
    state,
    gstin,
    ownerName,
    ownerEmail,
    password,
  } = req.body;

  if (
    !businessName ||
    !businessEmail ||
    !businessPhone ||
    !state ||
    !ownerName ||
    !ownerEmail ||
    !password
  ) {
    throw new ApiError(
      400,
      "Please provide all required business and owner details.",
    );
  }

  const existingUser = await User.findOne({ email: ownerEmail.toLowerCase() });
  if (existingUser) {
    throw new ApiError(400, "User with this email already exists.");
  }

  // 1. Create the business
  const business = await Business.create({
    name: businessName,
    email: businessEmail,
    phone: businessPhone,
    address: { state },
    taxInfo: {
      gstin: gstin || "",
      isGstRegistered: !!gstin,
    },
  });

  // 2. Create the owner account (Admin role)
  const user = await User.create({
    name: ownerName,
    email: ownerEmail,
    password, // hashed by the pre-save hook
    role: "Admin",
    businessId: business._id,
  });

  // 3. Send the token the frontend will store
  const accessToken = user.generateAccessToken();

  res.status(201).json(
    new ApiResponse(
      201,
      {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          permissions: user.getEffectivePermissions(),
        },
        business: {
          id: business._id,
          name: business.name,
          state: business.address.state,
          currency: business.settings.currency,
        },
        accessToken,
      },
      "Business and owner account created successfully.",
    ),
  );
});

/**
 * @desc    Login
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, "Please provide both email and password.");
  }

  const user = await User.findOne({ email: email.toLowerCase() })
    .select("+password")
    .populate("businessId");

  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, "Invalid email or password.");
  }

  if (!user.isActive) {
    throw new ApiError(403, "Account deactivated. Contact system admin.");
  }

  user.lastLogin = new Date();
  await user.save();

  const accessToken = user.generateAccessToken();

  res.status(200).json(
    new ApiResponse(
      200,
      {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          permissions: user.getEffectivePermissions(),
        },
        business: user.businessId,
        accessToken,
      },
      "Logged in successfully.",
    ),
  );
});

/**
 * @desc    Logout
 * @route   POST /api/auth/logout
 * @access  Private
 *
 * JWTs are stateless, so there is nothing on the server to invalidate.
 * The frontend clears its stored token when it calls this.
 */
const logout = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, null, "Logged out successfully."));
});

/**
 * @desc    Current user profile & permissions
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate("businessId");

  res.status(200).json(
    new ApiResponse(
      200,
      {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          permissions: user.getEffectivePermissions(),
        },
        business: user.businessId,
      },
      "User profile retrieved.",
    ),
  );
});

module.exports = { registerBusiness, login, logout, getMe };
