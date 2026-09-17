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
  createPurchaseReturn,
  getPurchaseReturns,
  getPurchaseReturnById,
  cancelPurchaseReturn,
} = require("../controllers/purchaseReturnController");
const { authenticate } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/permissionMiddleware");
const { PERMISSIONS } = require("../constants/permissions");

router.use(authenticate);

router
  .route("/")
  .get(authorize(PERMISSIONS.PURCHASES_VIEW), getPurchaseReturns)
  .post(authorize(PERMISSIONS.PURCHASES_CREATE), createPurchaseReturn);

router
  .route("/:id")
  .get(authorize(PERMISSIONS.PURCHASES_VIEW), getPurchaseReturnById);

router
  .route("/:id/cancel")
  .put(authorize(PERMISSIONS.PURCHASES_EDIT), cancelPurchaseReturn);

module.exports = router;
