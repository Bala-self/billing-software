const express = require("express");
const router = express.Router();
const {
  createPurchase,
  getPurchases,
  getPurchaseById,
  cancelPurchase,
} = require("../controllers/purchaseController");
const { authenticate } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/permissionMiddleware");
const { PERMISSIONS } = require("../constants/permissions");

router.use(authenticate);

router
  .route("/")
  .get(authorize(PERMISSIONS.PURCHASES_VIEW), getPurchases)
  .post(authorize(PERMISSIONS.PURCHASES_CREATE), createPurchase);

router
  .route("/:id")
  .get(authorize(PERMISSIONS.PURCHASES_VIEW), getPurchaseById);

router
  .route("/:id/cancel")
  .put(authorize(PERMISSIONS.PURCHASES_EDIT), cancelPurchase);

module.exports = router;
