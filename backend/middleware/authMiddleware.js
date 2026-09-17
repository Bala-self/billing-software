/**
 * Auth Middleware - Simple for 1 year MERN dev
 *
 * For Sandbox Demo (per user request "pass security on in this place only"):
 * - If ALLOW_DEMO_BYPASS=true and MONGO_URI is memory (in-memory DB) and NODE_ENV != production
 * - Then auto-auth as Admin without JWT check
 *
 * For Production:
 * - Real JWT verification
 * - Password hashing with bcrypt
 * - Token from Authorization header
 */

const jwt = require("jsonwebtoken");
const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/apiError");

const authenticate = asyncHandler(async (req, res, next) => {
  let token = null;

  // Get token from Authorization header: Bearer <token>
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    throw new ApiError(401, "Not authenticated, please login");
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");
    if (!user) throw new ApiError(401, "User not found");

    req.user = user;
    req.businessId = user.businessId;
    next();
  } catch (err) {
    if (err.name === "JsonWebTokenError")
      throw new ApiError(401, "Invalid token");
    if (err.name === "TokenExpiredError")
      throw new ApiError(401, "Token expired");
    throw err;
  }
});

module.exports = { authenticate };
