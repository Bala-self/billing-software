const express = require("express");
const router = express.Router();
const {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  toggleUserStatus,
  resetUserPassword,
  deleteUser,
  getRolesAndPermissions,
} = require("../controllers/userController");
const { authenticate } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/permissionMiddleware");
const { PERMISSIONS } = require("../constants/permissions");

// All user management routes require authentication + users.manage permission
router.use(authenticate);
router.use(authorize(PERMISSIONS.USERS_MANAGE));

// Roles & permissions reference data (for frontend UI)
router.get("/roles-permissions", getRolesAndPermissions);

// User CRUD
router
  .route("/")
  .get(getUsers)
  .post(createUser);

router
  .route("/:id")
  .get(getUserById)
  .put(updateUser)
  .delete(deleteUser);

// Status toggle (activate/deactivate)
router.put("/:id/status", toggleUserStatus);

// Password reset
router.put("/:id/reset-password", resetUserPassword);

module.exports = router;
