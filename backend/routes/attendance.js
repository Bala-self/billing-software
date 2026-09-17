const express = require("express");
const router = express.Router();
const {
  checkIn,
  checkOut,
  getTodayAttendance,
  createManualAttendance,
  updateAttendance,
  getEmployeeAttendanceHistory,
  getAllAttendance,
  getMonthlyReport,
  getEmployeeSummary,
  deleteAttendance,
} = require("../controllers/attendanceController");
const { authenticate } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/permissionMiddleware");
const { PERMISSIONS } = require("../constants/permissions");

// All routes require authentication
router.use(authenticate);

// Check In - API 05
router.post("/check-in", authorize(PERMISSIONS.ATTENDANCE_CREATE), checkIn);

// Check Out - API 06
router.post("/check-out", authorize(PERMISSIONS.ATTENDANCE_CREATE), checkOut);

// Today's Attendance - API 07
router.get("/today", authorize(PERMISSIONS.ATTENDANCE_VIEW), getTodayAttendance);

// Monthly Report - API 10
router.get("/report", authorize(PERMISSIONS.ATTENDANCE_REPORTS), getMonthlyReport);

// Employee Summary
router.get("/summary/:employeeId", authorize(PERMISSIONS.ATTENDANCE_VIEW), getEmployeeSummary);

// Attendance History - API 09
router.get("/employee/:employeeId", authorize(PERMISSIONS.ATTENDANCE_VIEW), getEmployeeAttendanceHistory);

// All Attendance with filters
router.get("/", authorize(PERMISSIONS.ATTENDANCE_VIEW), getAllAttendance);

// Manual Attendance - API 08
router.post("/", authorize(PERMISSIONS.ATTENDANCE_EDIT), createManualAttendance);

// Update attendance (manual correction)
router.put("/:id", authorize(PERMISSIONS.ATTENDANCE_EDIT), updateAttendance);

// Delete attendance
router.delete("/:id", authorize(PERMISSIONS.ATTENDANCE_DELETE), deleteAttendance);

module.exports = router;
