const express = require("express");
const router = express.Router();
const {
  createQuotation,
  getQuotations,
  getQuotationById,
  updateQuotation,
  sendQuotation,
  acceptQuotation,
  convertToInvoice,
  cancelQuotation,
  downloadQuotationPDF,
} = require("../controllers/quotationController");
const { authenticate } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/permissionMiddleware");
const { PERMISSIONS } = require("../constants/permissions");

router.use(authenticate);

router
  .route("/")
  .get(authorize(PERMISSIONS.QUOTATION_MANAGE), getQuotations)
  .post(authorize(PERMISSIONS.QUOTATION_MANAGE), createQuotation);

router
  .route("/:id")
  .get(authorize(PERMISSIONS.QUOTATION_MANAGE), getQuotationById)
  .put(authorize(PERMISSIONS.QUOTATION_MANAGE), updateQuotation);

router.put("/:id/send",    authorize(PERMISSIONS.QUOTATION_MANAGE), sendQuotation);
router.put("/:id/accept",  authorize(PERMISSIONS.QUOTATION_MANAGE), acceptQuotation);
router.post("/:id/convert", authorize(PERMISSIONS.INVOICE_CREATE), convertToInvoice);
router.put("/:id/cancel",  authorize(PERMISSIONS.QUOTATION_MANAGE), cancelQuotation);
router.get("/:id/pdf",     authorize(PERMISSIONS.QUOTATION_MANAGE), downloadQuotationPDF);

module.exports = router;
