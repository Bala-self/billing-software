const express = require("express");
const router = express.Router();
const {
  getSettings,
  updateBusinessProfile,
  updateBillingPreferences,
  updateBankDetails,
} = require("../controllers/settingsController");
const { authenticate } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/permissionMiddleware");
const { PERMISSIONS } = require("../constants/permissions");

// All settings routes require authentication + settings.manage permission
router.use(authenticate);
router.use(authorize(PERMISSIONS.SETTINGS_MANAGE));

router.get("/",                     getSettings);
router.put("/profile",              updateBusinessProfile);
router.put("/billing-preferences",  updateBillingPreferences);
router.put("/bank-details",         updateBankDetails);

module.exports = router;
