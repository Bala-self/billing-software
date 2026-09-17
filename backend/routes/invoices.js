const express = require("express");
const router = express.Router();
const {
  createInvoice,
  getInvoices,
  getInvoiceById,
  cancelInvoice,
  downloadInvoicePDF,
} = require("../controllers/invoiceController");
const { authenticate } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/permissionMiddleware");
const { PERMISSIONS } = require("../constants/permissions");

router.use(authenticate);

router
  .route("/")
  .get(authorize(PERMISSIONS.INVOICE_VIEW), getInvoices)
  .post(authorize(PERMISSIONS.INVOICE_CREATE), createInvoice);

router
  .route("/:id")
  .get(authorize(PERMISSIONS.INVOICE_VIEW), getInvoiceById);

router
  .route("/:id/cancel")
  .put(authorize(PERMISSIONS.INVOICE_CANCEL), cancelInvoice);

router.get("/:id/pdf", authorize(PERMISSIONS.INVOICE_VIEW), downloadInvoicePDF);

module.exports = router;
