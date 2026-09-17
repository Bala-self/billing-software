const express = require("express");
const router = express.Router();
const {
  getSalesReport,
  getPurchaseReport,
  getProfitLossReport,
  getGstReport,
  getInventoryReport,
  getOutstandingReport,
} = require("../controllers/reportController");
const { authenticate } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/permissionMiddleware");
const { PERMISSIONS } = require("../constants/permissions");

router.use(authenticate);

router.get("/sales", authorize(PERMISSIONS.REPORTS_SALES), getSalesReport);
router.get("/purchases", authorize(PERMISSIONS.REPORTS_PURCHASES), getPurchaseReport);
router.get("/profit-loss", authorize(PERMISSIONS.REPORTS_FINANCIAL), getProfitLossReport);
router.get("/gst", authorize(PERMISSIONS.REPORTS_GST), getGstReport);
router.get("/inventory", authorize(PERMISSIONS.REPORTS_INVENTORY), getInventoryReport);
router.get("/outstanding", authorize(PERMISSIONS.REPORTS_FINANCIAL), getOutstandingReport);

module.exports = router;
