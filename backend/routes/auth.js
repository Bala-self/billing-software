const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const {
  registerBusiness,
  login,
  logout,
  getMe,
} = require("../controllers/authController");
const { authenticate } = require("../middleware/authMiddleware");

// Stricter rate limiter for auth routes - prevent brute force
// 10 login attempts per 15 min per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many login attempts, try after 15 minutes",
  },
});

// Public routes with strict limiter
router.post("/register", authLimiter, registerBusiness);
router.post("/login", authLimiter, login);

// Protected routes (require a valid token)
router.post("/logout", authenticate, logout);
router.get("/me", authenticate, getMe);

module.exports = router;
