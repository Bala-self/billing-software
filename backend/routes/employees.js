const express = require("express");
const router = express.Router();
const {
  createEmployee,
  getEmployees,
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
  permanentDeleteEmployee,
} = require("../controllers/employeeController");
const { authenticate } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/permissionMiddleware");
const { PERMISSIONS } = require("../constants/permissions");

// All routes require authentication
router.use(authenticate);

// Create Employee - API 01
router.post("/", authorize(PERMISSIONS.EMPLOYEES_CREATE), createEmployee);

// Get Employees - API 02
router.get("/", authorize(PERMISSIONS.EMPLOYEES_VIEW), getEmployees);

// Get single employee
router.get("/:id", authorize(PERMISSIONS.EMPLOYEES_VIEW), getEmployeeById);

// Update Employee - API 03
router.put("/:id", authorize(PERMISSIONS.EMPLOYEES_EDIT), updateEmployee);

// Delete / Deactivate - API 04 (soft delete)
router.delete("/:id", authorize(PERMISSIONS.EMPLOYEES_DELETE), deleteEmployee);

// Permanent delete
router.delete("/:id/permanent", authorize(PERMISSIONS.EMPLOYEES_DELETE), permanentDeleteEmployee);

module.exports = router;
