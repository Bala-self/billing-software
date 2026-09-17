const express = require("express");
const router = express.Router();
const {
  getUnits,
  createUnit,
  updateUnit,
  deleteUnit,
} = require("../controllers/unitController");
const { authenticate } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/permissionMiddleware");
const { PERMISSIONS } = require("../constants/permissions");
const { cacheMiddleware, cache } = require("../utils/cache");

router.use(authenticate);

router
  .route("/")
  .get(authorize(PERMISSIONS.PRODUCTS_VIEW), cacheMiddleware(300), getUnits)
  .post(authorize(PERMISSIONS.PRODUCTS_CREATE), (req, res, next) => { cache.clear(); next(); }, createUnit);

router
  .route("/:id")
  .put(authorize(PERMISSIONS.PRODUCTS_EDIT), updateUnit)
  .delete(authorize(PERMISSIONS.PRODUCTS_DELETE), deleteUnit);

module.exports = router;
