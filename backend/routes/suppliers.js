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
  getSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
} = require("../controllers/supplierController");
const { authenticate } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/permissionMiddleware");
const { PERMISSIONS } = require("../constants/permissions");

router.use(authenticate);

router
  .route("/")
  .get(authorize(PERMISSIONS.SUPPLIERS_MANAGE), getSuppliers)
  .post(authorize(PERMISSIONS.SUPPLIERS_MANAGE), createSupplier);

router
  .route("/:id")
  .get(authorize(PERMISSIONS.SUPPLIERS_MANAGE), getSupplierById)
  .put(authorize(PERMISSIONS.SUPPLIERS_MANAGE), updateSupplier)
  .delete(authorize(PERMISSIONS.SUPPLIERS_MANAGE), deleteSupplier);

module.exports = router;
