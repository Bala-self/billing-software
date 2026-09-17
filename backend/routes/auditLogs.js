const express = require("express");
const router = express.Router();
const {
  getAuditLogs,
  getAuditLogById,
} = require("../controllers/auditLogController");
const { authenticate } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/permissionMiddleware");
const { PERMISSIONS } = require("../constants/permissions");

router.use(authenticate);
router.use(authorize(PERMISSIONS.AUDIT_VIEW));

router.get("/", getAuditLogs);
router.get("/:id", getAuditLogById);

module.exports = router;
