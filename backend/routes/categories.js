const express = require("express");
const router = express.Router();
const {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} = require("../controllers/categoryController");
const { authenticate } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/permissionMiddleware");
const { PERMISSIONS } = require("../constants/permissions");
const { cacheMiddleware, cache } = require("../utils/cache");

router.use(authenticate);

// Performance: cache stable data (categories rarely change) - 5 min TTL
router
  .route("/")
  .get(authorize(PERMISSIONS.PRODUCTS_VIEW), cacheMiddleware(300), getCategories)
  .post(authorize(PERMISSIONS.PRODUCTS_CREATE), (req, res, next) => { cache.clear(); next(); }, createCategory);

router
  .route("/:id")
  .put(authorize(PERMISSIONS.PRODUCTS_EDIT), updateCategory)
  .delete(authorize(PERMISSIONS.PRODUCTS_DELETE), deleteCategory);

module.exports = router;
