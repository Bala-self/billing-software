/*
 * ============================================================================
 * DISABLED FOR FUTURE USE
 * This module (Purchase Returns / Sales Returns / Suppliers) is currently
 * commented out and not mounted in backend/index.js.
 * Code is kept intact for future re-enablement.
 * To re-enable: uncomment the route in backend/index.js and frontend.
 * ============================================================================
 */

const express = require("express");
const router = express.Router();
const {
  createSalesReturn,
  getSalesReturns,
  getSalesReturnById,
  cancelSalesReturn,
} = require("../controllers/salesReturnController");
const { authenticate } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/permissionMiddleware");
const { PERMISSIONS } = require("../constants/permissions");

router.use(authenticate);

router
  .route("/")
  .get(authorize(PERMISSIONS.SALES_VIEW), getSalesReturns)
  .post(authorize(PERMISSIONS.SALES_CREATE), createSalesReturn);

router
  .route("/:id")
  .get(authorize(PERMISSIONS.SALES_VIEW), getSalesReturnById);

router
  .route("/:id/cancel")
  .put(authorize(PERMISSIONS.SALES_CANCEL), cancelSalesReturn);

module.exports = router;
