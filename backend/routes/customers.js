const express = require("express");
const router = express.Router();
const {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} = require("../controllers/customerController");
const { authenticate } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/permissionMiddleware");
const { PERMISSIONS } = require("../constants/permissions");

router.use(authenticate);

router
  .route("/")
  .get(authorize(PERMISSIONS.CUSTOMERS_VIEW), getCustomers)
  .post(authorize(PERMISSIONS.CUSTOMERS_CREATE), createCustomer);

router
  .route("/:id")
  .get(authorize(PERMISSIONS.CUSTOMERS_VIEW), getCustomerById)
  .put(authorize(PERMISSIONS.CUSTOMERS_EDIT), updateCustomer)
  .delete(authorize(PERMISSIONS.CUSTOMERS_DELETE), deleteCustomer);

module.exports = router;
