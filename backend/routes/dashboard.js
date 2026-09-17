const express = require("express");
const router = express.Router();
const { getDashboardStats } = require("../controllers/dashboardController");
const { authenticate } = require("../middleware/authMiddleware");

// All authenticated business staff can access their live dashboard
router.use(authenticate);

router.get("/", getDashboardStats);

module.exports = router;
