/**
 * Permission Middleware - Simple for 1 year MERN dev
 *
 * For Sandbox Demo: bypass if ALLOW_DEMO_BYPASS=true and memory DB
 * For Production: real permission check based on user role and permissions
 */

const ApiError = require("../utils/apiError");

const authorize = (...requiredPermissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, "Not authenticated"));
    }

    // Admin and Super Admin have all permissions
    if (req.user.role === "Super Admin" || req.user.role === "Admin") {
      return next();
    }

    // Check if user has required permission
    const userPermissions = req.user.getEffectivePermissions
      ? req.user.getEffectivePermissions()
      : [];
    const hasPermission = requiredPermissions.some((perm) =>
      userPermissions.includes(perm),
    );

    if (!hasPermission) {
      return next(
        new ApiError(
          403,
          `Access denied. Need: ${requiredPermissions.join(" or ")}`,
        ),
      );
    }

    next();
  };
};

module.exports = { authorize };
