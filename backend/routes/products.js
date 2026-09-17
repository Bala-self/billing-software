const express = require("express");
const router = express.Router();
const {
  getProducts,
  getProductById,
  getProductByBarcode,
  createProduct,
  updateProduct,
  deleteProduct,
  getLowStockAlerts,
} = require("../controllers/productController");
const { authenticate } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/permissionMiddleware");
const { PERMISSIONS } = require("../constants/permissions");

router.use(authenticate);

// Alert endpoints
router.get("/alerts/low-stock", authorize(PERMISSIONS.INVENTORY_VIEW), getLowStockAlerts);

// Fast barcode lookup - VERY IMPORTANT for POS performance, must be before /:id
router.get("/barcode/:code", authorize(PERMISSIONS.PRODUCTS_VIEW), getProductByBarcode);

router
  .route("/")
  .get(authorize(PERMISSIONS.PRODUCTS_VIEW), getProducts)
  .post(authorize(PERMISSIONS.PRODUCTS_CREATE), createProduct);

router
  .route("/:id")
  .get(authorize(PERMISSIONS.PRODUCTS_VIEW), getProductById)
  .put(authorize(PERMISSIONS.PRODUCTS_EDIT), updateProduct)
  .delete(authorize(PERMISSIONS.PRODUCTS_DELETE), deleteProduct);

module.exports = router;
