const Employee = require("../models/Employee");
const ApiError = require("../utils/apiError");
const ApiResponse = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");

/**
 * @desc    Generate next employee ID (EMP001, EMP002...)
 * @helper
 */
const generateEmployeeId = async (businessId) => {
  const count = await Employee.countDocuments({ businessId });
  return `EMP${String(count + 1).padStart(3, "0")}`;
};

/**
 * @desc    Create Employee - API 01
 * @route   POST /api/employees
 * @access  Private (employees.create)
 */
exports.createEmployee = asyncHandler(async (req, res) => {
  const {
    employeeId,
    name,
    phone,
    email,
    department,
    designation,
    joiningDate,
    salary,
    status,
  } = req.body;

  if (!name || !phone || !department || !designation) {
    throw new ApiError(400, "Please provide name, phone, department and designation.");
  }

  if (!/^[0-9]{10}$/.test(phone)) {
    throw new ApiError(400, "Phone must be exactly 10 digits.");
  }

  // Auto-generate employeeId if not provided
  let finalEmployeeId = employeeId ? employeeId.toUpperCase().trim() : await generateEmployeeId(req.businessId);

  // Check duplicate employeeId
  const existingId = await Employee.findOne({
    businessId: req.businessId,
    employeeId: finalEmployeeId,
  });
  if (existingId) {
    throw new ApiError(400, `Employee ID ${finalEmployeeId} already exists.`);
  }

  // Check duplicate email if provided
  if (email) {
    const existingEmail = await Employee.findOne({
      businessId: req.businessId,
      email: email.toLowerCase().trim(),
    });
    if (existingEmail) {
      throw new ApiError(400, `Email ${email} already exists.`);
    }
  }

  const employee = await Employee.create({
    businessId: req.businessId,
    employeeId: finalEmployeeId,
    name: name.trim(),
    phone: phone.trim(),
    email: email ? email.toLowerCase().trim() : "",
    department,
    designation: designation.trim(),
    joiningDate: joiningDate || new Date(),
    salary: salary || 0,
    status: status || "Active",
    createdBy: req.user._id,
  });

  res.status(201).json(new ApiResponse(201, employee, "Employee created successfully."));
});

/**
 * @desc    Get Employees - API 02
 * @route   GET /api/employees
 * @access  Private (employees.view)
 */
exports.getEmployees = asyncHandler(async (req, res) => {
  const { search, status, department, page = 1, limit = 50 } = req.query;
  const query = { businessId: req.businessId };

  if (status) query.status = status;
  if (department) query.department = department;

  if (search) {
    const regex = { $regex: search, $options: "i" };
    query.$or = [
      { employeeId: regex },
      { name: regex },
      { phone: regex },
      { email: regex },
      { department: regex },
      { designation: regex },
    ];
  }

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;

  const [employees, total] = await Promise.all([
    Employee.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
    Employee.countDocuments(query),
  ]);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        employees,
        pagination: {
          total,
          page: pageNum,
          pages: Math.ceil(total / limitNum),
          limit: limitNum,
        },
      },
      "Employees retrieved successfully."
    )
  );
});

/**
 * @desc    Get single employee by ID
 * @route   GET /api/employees/:id
 * @access  Private (employees.view)
 */
exports.getEmployeeById = asyncHandler(async (req, res) => {
  const employee = await Employee.findOne({
    _id: req.params.id,
    businessId: req.businessId,
  });

  if (!employee) throw new ApiError(404, "Employee not found.");

  res.status(200).json(new ApiResponse(200, employee, "Employee retrieved."));
});

/**
 * @desc    Update Employee - API 03
 * @route   PUT /api/employees/:id
 * @access  Private (employees.edit)
 */
exports.updateEmployee = asyncHandler(async (req, res) => {
  const employee = await Employee.findOne({
    _id: req.params.id,
    businessId: req.businessId,
  });

  if (!employee) throw new ApiError(404, "Employee not found.");

  // Allowed fields only (don't allow changing employeeId casually, but allow if provided and unique)
  const allowedFields = ["name", "phone", "email", "department", "designation", "salary", "status", "joiningDate"];
  const updates = {};

  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  }

  // Validate phone if being updated
  if (updates.phone && !/^[0-9]{10}$/.test(updates.phone)) {
    throw new ApiError(400, "Phone must be exactly 10 digits.");
  }

  // Check email uniqueness if email being changed
  if (updates.email && updates.email.toLowerCase() !== employee.email) {
    const existingEmail = await Employee.findOne({
      businessId: req.businessId,
      email: updates.email.toLowerCase(),
      _id: { $ne: employee._id },
    });
    if (existingEmail) {
      throw new ApiError(400, `Email ${updates.email} already exists.`);
    }
    updates.email = updates.email.toLowerCase();
  }

  // If employeeId is being updated (admin only), check uniqueness
  if (req.body.employeeId && req.body.employeeId.toUpperCase() !== employee.employeeId) {
    const existingId = await Employee.findOne({
      businessId: req.businessId,
      employeeId: req.body.employeeId.toUpperCase(),
      _id: { $ne: employee._id },
    });
    if (existingId) {
      throw new ApiError(400, `Employee ID ${req.body.employeeId} already exists.`);
    }
    updates.employeeId = req.body.employeeId.toUpperCase();
  }

  Object.assign(employee, updates);
  await employee.save();

  res.status(200).json(new ApiResponse(200, employee, "Employee updated successfully."));
});

/**
 * @desc    Delete / Deactivate Employee - API 04 (Soft delete)
 * @route   DELETE /api/employees/:id
 * @access  Private (employees.delete)
 * @note    Soft delete: status = Inactive, keeps attendance history
 */
exports.deleteEmployee = asyncHandler(async (req, res) => {
  const employee = await Employee.findOne({
    _id: req.params.id,
    businessId: req.businessId,
  });

  if (!employee) throw new ApiError(404, "Employee not found.");

  // Soft delete - set status to Inactive
  employee.status = "Inactive";
  await employee.save();

  res.status(200).json(new ApiResponse(200, employee, "Employee deactivated successfully. Attendance history preserved."));
});

/**
 * @desc    Permanent delete (hard delete) - for admin cleanup
 * @route   DELETE /api/employees/:id/permanent
 * @access  Private (employees.delete)
 */
exports.permanentDeleteEmployee = asyncHandler(async (req, res) => {
  const employee = await Employee.findOne({
    _id: req.params.id,
    businessId: req.businessId,
  });

  if (!employee) throw new ApiError(404, "Employee not found.");

  await Employee.deleteOne({ _id: employee._id });

  res.status(200).json(new ApiResponse(200, null, "Employee permanently deleted."));
});
