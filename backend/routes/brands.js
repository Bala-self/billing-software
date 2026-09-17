const express = require("express");
const router = express.Router();
const {
  getBrands,
  createBrand,
  updateBrand,
  deleteBrand,
} = require("../controllers/brandController");
const { authenticate } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/permissionMiddleware");
const { PERMISSIONS } = require("../constants/permissions");
const { cacheMiddleware, cache } = require("../utils/cache");

router.use(authenticate);

router
  .route("/")
  .get(authorize(PERMISSIONS.PRODUCTS_VIEW), cacheMiddleware(300), getBrands)
  .post(authorize(PERMISSIONS.PRODUCTS_CREATE), (req, res, next) => { cache.clear(); next(); }, createBrand);

router
  .route("/:id")
  .put(authorize(PERMISSIONS.PRODUCTS_EDIT), updateBrand)
  .delete(authorize(PERMISSIONS.PRODUCTS_DELETE), deleteBrand);

module.exports = router;
