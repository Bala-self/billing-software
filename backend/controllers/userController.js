const User = require("../models/User");
const ApiError = require("../utils/apiError");
const ApiResponse = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");
const { ROLE_PERMISSIONS, PERMISSIONS } = require("../constants/permissions");
const { logAudit } = require("../utils/auditLogger");

/**
 * @desc    Get all users in the business
 * @route   GET /api/users
 * @access  Private (users.manage)
 */
exports.getUsers = asyncHandler(async (req, res) => {
  const { search, role, isActive, page = 1, limit = 50 } = req.query;
  const query = { businessId: req.businessId };

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { phone: { $regex: search, $options: "i" } },
    ];
  }

  if (role) query.role = role;
  if (isActive !== undefined) query.isActive = isActive === "true";

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;

  const [users, total] = await Promise.all([
    User.find(query)
      .select("-password")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum),
    User.countDocuments(query),
  ]);

  // Attach effective permissions to each user for the frontend
  const usersWithPermissions = users.map((user) => ({
    ...user.toObject(),
    effectivePermissions: user.getEffectivePermissions(),
  }));

  res.status(200).json(
    new ApiResponse(
      200,
      {
        users: usersWithPermissions,
        pagination: {
          total,
          page: pageNum,
          pages: Math.ceil(total / limitNum),
          limit: limitNum,
        },
      },
      "Users retrieved successfully."
    )
  );
});

/**
 * @desc    Get single user by ID
 * @route   GET /api/users/:id
 * @access  Private (users.manage)
 */
exports.getUserById = asyncHandler(async (req, res) => {
  const user = await User.findOne({
    _id: req.params.id,
    businessId: req.businessId,
  }).select("-password");

  if (!user) throw new ApiError(404, "User not found.");

  res.status(200).json(
    new ApiResponse(
      200,
      {
        ...user.toObject(),
        effectivePermissions: user.getEffectivePermissions(),
      },
      "User retrieved."
    )
  );
});

/**
 * @desc    Create a new staff user
 * @route   POST /api/users
 * @access  Private (users.manage)
 */
exports.createUser = asyncHandler(async (req, res) => {
  const {
    name,
    email,
    password,
    phone,
    role = "Cashier",
    customPermissions = [],
  } = req.body;

  if (!name || !email || !password) {
    throw new ApiError(400, "Name, email, and password are required.");
  }

  if (password.length < 6) {
    throw new ApiError(400, "Password must be at least 6 characters.");
  }

  // Validate role
  const validRoles = ["Admin", "Manager", "Cashier", "Inventory Staff", "Accountant", "Viewer"];
  if (!validRoles.includes(role)) {
    throw new ApiError(400, `Invalid role. Allowed: ${validRoles.join(", ")}`);
  }

  // Prevent creating Super Admin through this endpoint
  if (role === "Super Admin") {
    throw new ApiError(403, "Super Admin role cannot be assigned through user management.");
  }

  // Check for duplicate email
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    throw new ApiError(400, "A user with this email already exists.");
  }

  // Validate custom permissions against known permission keys
  const allPermissionValues = Object.values(PERMISSIONS);
  const invalidPerms = customPermissions.filter((p) => !allPermissionValues.includes(p));
  if (invalidPerms.length > 0) {
    throw new ApiError(400, `Invalid permissions: ${invalidPerms.join(", ")}`);
  }

  const user = await User.create({
    name,
    email: email.toLowerCase(),
    password,
    phone: phone || "",
    role,
    businessId: req.businessId,
    customPermissions,
  });

  res.status(201).json(
    new ApiResponse(
      201,
      {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        isActive: user.isActive,
        effectivePermissions: user.getEffectivePermissions(),
      },
      "Staff user created successfully."
    )
  );
});

/**
 * @desc    Update user details, role, or permissions
 * @route   PUT /api/users/:id
 * @access  Private (users.manage)
 */
exports.updateUser = asyncHandler(async (req, res) => {
  const user = await User.findOne({
    _id: req.params.id,
    businessId: req.businessId,
  });

  if (!user) throw new ApiError(404, "User not found.");

  const { name, phone, role, customPermissions } = req.body;

  // Prevent changing to Super Admin
  if (role === "Super Admin") {
    throw new ApiError(403, "Super Admin role cannot be assigned.");
  }

  // Prevent demoting yourself if you're the only Admin
  if (user._id.toString() === req.user._id.toString() && role && role !== user.role) {
    const adminCount = await User.countDocuments({
      businessId: req.businessId,
      role: { $in: ["Admin", "Super Admin"] },
      isActive: true,
    });

    if (adminCount <= 1 && ["Admin", "Super Admin"].includes(user.role)) {
      throw new ApiError(
        400,
        "Cannot change your own role. You are the only active Admin for this business."
      );
    }
  }

  if (name) user.name = name;
  if (phone !== undefined) user.phone = phone;

  if (role) {
    const validRoles = ["Admin", "Manager", "Cashier", "Inventory Staff", "Accountant", "Viewer"];
    if (!validRoles.includes(role)) {
      throw new ApiError(400, `Invalid role. Allowed: ${validRoles.join(", ")}`);
    }
    user.role = role;
  }

  if (customPermissions && Array.isArray(customPermissions)) {
    const allPermissionValues = Object.values(PERMISSIONS);
    const invalidPerms = customPermissions.filter((p) => !allPermissionValues.includes(p));
    if (invalidPerms.length > 0) {
      throw new ApiError(400, `Invalid permissions: ${invalidPerms.join(", ")}`);
    }
    user.customPermissions = customPermissions;
  }

  await user.save();

  res.status(200).json(
    new ApiResponse(
      200,
      {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        isActive: user.isActive,
        effectivePermissions: user.getEffectivePermissions(),
      },
      "User updated successfully."
    )
  );
});

/**
 * @desc    Activate or Deactivate a user
 * @route   PUT /api/users/:id/status
 * @access  Private (users.manage)
 */
exports.toggleUserStatus = asyncHandler(async (req, res) => {
  const user = await User.findOne({
    _id: req.params.id,
    businessId: req.businessId,
  });

  if (!user) throw new ApiError(404, "User not found.");

  // Prevent deactivating yourself
  if (user._id.toString() === req.user._id.toString()) {
    throw new ApiError(400, "You cannot deactivate your own account.");
  }

  // Prevent deactivating the last Admin
  if (user.isActive && ["Admin", "Super Admin"].includes(user.role)) {
    const adminCount = await User.countDocuments({
      businessId: req.businessId,
      role: { $in: ["Admin", "Super Admin"] },
      isActive: true,
    });

    if (adminCount <= 1) {
      throw new ApiError(400, "Cannot deactivate the only active Admin.");
    }
  }

  user.isActive = !user.isActive;
  await user.save();

  const statusText = user.isActive ? "activated" : "deactivated";

  res.status(200).json(
    new ApiResponse(
      200,
      {
        id: user._id,
        name: user.name,
        isActive: user.isActive,
      },
      `User ${statusText} successfully.`
    )
  );
});

/**
 * @desc    Admin-initiated password reset for a staff user
 * @route   PUT /api/users/:id/reset-password
 * @access  Private (users.manage)
 */
exports.resetUserPassword = asyncHandler(async (req, res) => {
  const user = await User.findOne({
    _id: req.params.id,
    businessId: req.businessId,
  }).select("+password");

  if (!user) throw new ApiError(404, "User not found.");

  const { newPassword } = req.body;

  if (!newPassword || newPassword.length < 6) {
    throw new ApiError(400, "New password must be at least 6 characters.");
  }

  user.password = newPassword; // Pre-save hook will hash it
  await user.save();

  // Audit Log
  await logAudit(req, {
    action: "PASSWORD_RESET",
    module: "USER",
    recordId: user._id,
    recordIdentifier: user.email,
    description: `Password for user '${user.name}' (${user.email}) was reset by Admin ${req.user.name}.`,
  });

  res.status(200).json(
    new ApiResponse(200, null, `Password reset successfully for ${user.name}.`)
  );
});

/**
 * @desc    Delete a user (Soft delete)
 * @route   DELETE /api/users/:id
 * @access  Private (users.manage)
 */
exports.deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findOne({
    _id: req.params.id,
    businessId: req.businessId,
  });

  if (!user) throw new ApiError(404, "User not found.");

  // Prevent deleting yourself
  if (user._id.toString() === req.user._id.toString()) {
    throw new ApiError(400, "You cannot delete your own account.");
  }

  // Prevent deleting the last Admin
  if (["Admin", "Super Admin"].includes(user.role)) {
    const adminCount = await User.countDocuments({
      businessId: req.businessId,
      role: { $in: ["Admin", "Super Admin"] },
      isActive: true,
    });

    if (adminCount <= 1) {
      throw new ApiError(400, "Cannot delete the only active Admin.");
    }
  }

  user.isActive = false;
  await user.save();

  res.status(200).json(
    new ApiResponse(200, null, `User '${user.name}' deleted successfully.`)
  );
});

/**
 * @desc    Get all available roles and permissions (for frontend dropdowns)
 * @route   GET /api/users/roles-permissions
 * @access  Private (users.manage)
 */
exports.getRolesAndPermissions = asyncHandler(async (req, res) => {
  res.status(200).json(
    new ApiResponse(
      200,
      {
        roles: [
          { value: "Admin", label: "Admin / Owner" },
          { value: "Manager", label: "Manager" },
          { value: "Cashier", label: "Cashier" },
          { value: "Inventory Staff", label: "Inventory Staff" },
          { value: "Accountant", label: "Accountant" },
          { value: "Viewer", label: "Viewer (Read-Only)" },
        ],
        permissions: PERMISSIONS,
        roleDefaults: ROLE_PERMISSIONS,
      },
      "Roles and permissions retrieved."
    )
  );
});
