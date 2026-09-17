const Employee = require("../models/Employee");
const Attendance = require("../models/Attendance");
const ApiError = require("../utils/apiError");
const ApiResponse = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");

/**
 * Helper: Get today's midnight date
 */
const getTodayMidnight = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Helper: Find employee by employeeId (EMP001) or _id
 */
const findEmployee = async (businessId, identifier) => {
  let employee = null;
  
  // Try by employeeId first (e.g., EMP001)
  if (typeof identifier === "string") {
    employee = await Employee.findOne({
      businessId,
      employeeId: identifier.toUpperCase().trim(),
    });
  }
  
  // Try by _id if not found and looks like ObjectId
  if (!employee && identifier.match(/^[0-9a-fA-F]{24}$/)) {
    employee = await Employee.findOne({
      _id: identifier,
      businessId,
    });
  }
  
  return employee;
};

/**
 * @desc    Check In - API 05
 * @route   POST /api/attendance/check-in
 * @access  Private (attendance.create)
 * 
 * Request: { "employeeId": "EMP001" }
 * Server generates date and checkIn time (don't trust frontend)
 */
exports.checkIn = asyncHandler(async (req, res) => {
  const { employeeId } = req.body;

  if (!employeeId) {
    throw new ApiError(400, "Employee ID is required.");
  }

  const employee = await findEmployee(req.businessId, employeeId);
  if (!employee) {
    throw new ApiError(404, `Employee ${employeeId} not found.`);
  }

  if (employee.status === "Inactive") {
    throw new ApiError(400, `Employee ${employee.employeeId} is inactive and cannot check in.`);
  }

  const today = getTodayMidnight();

  // Check if already checked in today
  const existing = await Attendance.findOne({
    businessId: req.businessId,
    employee: employee._id,
    date: today,
  });

  if (existing && existing.checkIn) {
    throw new ApiError(400, `Employee ${employee.employeeId} already checked in today at ${existing.checkIn.toLocaleTimeString()}.`);
  }

  const now = new Date();

  let attendance;
  if (existing) {
    // Update existing record (was created as Absent/Leave, now checking in)
    existing.checkIn = now;
    existing.status = "Present";
    existing.remarks = "";
    await existing.save();
    attendance = existing;
  } else {
    // Create new attendance
    attendance = await Attendance.create({
      businessId: req.businessId,
      employee: employee._id,
      employeeId: employee.employeeId,
      date: today,
      checkIn: now,
      status: "Present",
      createdBy: req.user._id,
      isManual: false,
    });
  }

  await attendance.populate("employee", "employeeId name department designation");

  res.status(201).json(new ApiResponse(201, attendance, `Check-in successful for ${employee.name} at ${now.toLocaleTimeString()}.`));
});

/**
 * @desc    Check Out - API 06
 * @route   POST /api/attendance/check-out
 * @access  Private (attendance.create)
 */
exports.checkOut = asyncHandler(async (req, res) => {
  const { employeeId } = req.body;

  if (!employeeId) {
    throw new ApiError(400, "Employee ID is required.");
  }

  const employee = await findEmployee(req.businessId, employeeId);
  if (!employee) {
    throw new ApiError(404, `Employee ${employeeId} not found.`);
  }

  const today = getTodayMidnight();

  const attendance = await Attendance.findOne({
    businessId: req.businessId,
    employee: employee._id,
    date: today,
  });

  if (!attendance) {
    throw new ApiError(400, `Employee ${employee.employeeId} has not checked in today. Cannot check out without check-in.`);
  }

  if (!attendance.checkIn) {
    throw new ApiError(400, `Employee ${employee.employeeId} has not checked in today.`);
  }

  if (attendance.checkOut) {
    throw new ApiError(400, `Employee ${employee.employeeId} already checked out today at ${attendance.checkOut.toLocaleTimeString()}.`);
  }

  const now = new Date();

  if (now <= attendance.checkIn) {
    throw new ApiError(400, "Check-out time must be after check-in time.");
  }

  attendance.checkOut = now;
  await attendance.save();

  await attendance.populate("employee", "employeeId name department designation");

  res.status(200).json(
    new ApiResponse(
      200,
      attendance,
      `Check-out successful for ${employee.name} at ${now.toLocaleTimeString()}. Working hours: ${attendance.workingHoursFormatted}`
    )
  );
});

/**
 * @desc    Today's Attendance - API 07
 * @route   GET /api/attendance/today
 * @access  Private (attendance.view)
 */
exports.getTodayAttendance = asyncHandler(async (req, res) => {
  const today = getTodayMidnight();

  // Get all active employees
  const employees = await Employee.find({
    businessId: req.businessId,
    status: "Active",
  }).sort({ employeeId: 1 });

  // Get today's attendance
  const todayAttendance = await Attendance.find({
    businessId: req.businessId,
    date: today,
  }).populate("employee", "employeeId name department designation phone");

  // Map attendance by employee _id
  const attendanceMap = {};
  todayAttendance.forEach((att) => {
    attendanceMap[att.employee._id.toString()] = att;
  });

  // Build response: all active employees with their today's status
  const result = employees.map((emp) => {
    const att = attendanceMap[emp._id.toString()];
    if (att) {
      return {
        employee: {
          _id: emp._id,
          employeeId: emp.employeeId,
          name: emp.name,
          department: emp.department,
          designation: emp.designation,
          phone: emp.phone,
        },
        attendance: att,
        status: att.status,
        checkIn: att.checkIn,
        checkOut: att.checkOut,
        workingHours: att.workingHoursFormatted,
      };
    } else {
      // No attendance today = Absent
      return {
        employee: {
          _id: emp._id,
          employeeId: emp.employeeId,
          name: emp.name,
          department: emp.department,
          designation: emp.designation,
          phone: emp.phone,
        },
        attendance: null,
        status: "Absent",
        checkIn: null,
        checkOut: null,
        workingHours: "",
      };
    }
  });

  // Summary counts
  const summary = {
    totalEmployees: employees.length,
    present: result.filter((r) => r.status === "Present").length,
    absent: result.filter((r) => r.status === "Absent").length,
    halfDay: result.filter((r) => r.status === "Half Day").length,
    leave: result.filter((r) => r.status === "Leave").length,
  };

  res.status(200).json(
    new ApiResponse(
      200,
      {
        date: today,
        summary,
        attendance: result,
      },
      "Today's attendance retrieved."
    )
  );
});

/**
 * @desc    Manual Attendance - API 08 (Admin can create/edit)
 * @route   POST /api/attendance
 * @access  Private (attendance.edit)
 */
exports.createManualAttendance = asyncHandler(async (req, res) => {
  const { employeeId, date, checkIn, checkOut, status, remarks } = req.body;

  if (!employeeId || !date) {
    throw new ApiError(400, "Employee ID and date are required.");
  }

  const employee = await findEmployee(req.businessId, employeeId);
  if (!employee) {
    throw new ApiError(404, `Employee ${employeeId} not found.`);
  }

  // Normalize date to midnight
  const attendanceDate = new Date(date);
  attendanceDate.setHours(0, 0, 0, 0);

  if (isNaN(attendanceDate.getTime())) {
    throw new ApiError(400, "Invalid date format.");
  }

  // Validate status
  const validStatuses = ["Present", "Absent", "Half Day", "Leave"];
  if (status && !validStatuses.includes(status)) {
    throw new ApiError(400, `Invalid status. Must be one of: ${validStatuses.join(", ")}`);
  }

  // Check if attendance already exists for this employee+date
  let attendance = await Attendance.findOne({
    businessId: req.businessId,
    employee: employee._id,
    date: attendanceDate,
  });

  // Parse checkIn/checkOut if provided as time strings or ISO
  let checkInDate = null;
  let checkOutDate = null;

  if (checkIn) {
    checkInDate = new Date(checkIn);
    // If only time provided (e.g., "09:02"), combine with attendance date
    if (typeof checkIn === "string" && checkIn.match(/^\d{1,2}:\d{2}/)) {
      const [hours, minutes] = checkIn.split(":").map(Number);
      checkInDate = new Date(attendanceDate);
      checkInDate.setHours(hours, minutes, 0, 0);
    }
  }

  if (checkOut) {
    checkOutDate = new Date(checkOut);
    if (typeof checkOut === "string" && checkOut.match(/^\d{1,2}:\d{2}/)) {
      const [hours, minutes] = checkOut.split(":").map(Number);
      checkOutDate = new Date(attendanceDate);
      checkOutDate.setHours(hours, minutes, 0, 0);
    }
  }

  if (checkInDate && checkOutDate && checkOutDate <= checkInDate) {
    throw new ApiError(400, "Check-out must be after check-in.");
  }

  if (attendance) {
    // Update existing
    if (checkInDate) attendance.checkIn = checkInDate;
    if (checkOutDate) attendance.checkOut = checkOutDate;
    if (status) attendance.status = status;
    if (remarks !== undefined) attendance.remarks = remarks;
    attendance.isManual = true;
    await attendance.save();
  } else {
    // Create new
    attendance = await Attendance.create({
      businessId: req.businessId,
      employee: employee._id,
      employeeId: employee.employeeId,
      date: attendanceDate,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      status: status || "Present",
      remarks: remarks || "Manual entry",
      createdBy: req.user._id,
      isManual: true,
    });
  }

  await attendance.populate("employee", "employeeId name department designation");

  res.status(201).json(new ApiResponse(201, attendance, "Manual attendance saved."));
});

/**
 * @desc    Update attendance (manual correction)
 * @route   PUT /api/attendance/:id
 * @access  Private (attendance.edit)
 */
exports.updateAttendance = asyncHandler(async (req, res) => {
  const attendance = await Attendance.findOne({
    _id: req.params.id,
    businessId: req.businessId,
  });

  if (!attendance) throw new ApiError(404, "Attendance record not found.");

  const { checkIn, checkOut, status, remarks } = req.body;

  const validStatuses = ["Present", "Absent", "Half Day", "Leave"];
  if (status && !validStatuses.includes(status)) {
    throw new ApiError(400, `Invalid status. Must be one of: ${validStatuses.join(", ")}`);
  }

  if (checkIn !== undefined) {
    if (checkIn === null || checkIn === "") {
      attendance.checkIn = null;
    } else {
      let d = new Date(checkIn);
      if (typeof checkIn === "string" && checkIn.match(/^\d{1,2}:\d{2}/)) {
        const [h, m] = checkIn.split(":").map(Number);
        d = new Date(attendance.date);
        d.setHours(h, m, 0, 0);
      }
      attendance.checkIn = d;
    }
  }

  if (checkOut !== undefined) {
    if (checkOut === null || checkOut === "") {
      attendance.checkOut = null;
    } else {
      let d = new Date(checkOut);
      if (typeof checkOut === "string" && checkOut.match(/^\d{1,2}:\d{2}/)) {
        const [h, m] = checkOut.split(":").map(Number);
        d = new Date(attendance.date);
        d.setHours(h, m, 0, 0);
      }
      attendance.checkOut = d;
    }
  }

  if (attendance.checkIn && attendance.checkOut && attendance.checkOut <= attendance.checkIn) {
    throw new ApiError(400, "Check-out must be after check-in.");
  }

  if (status) attendance.status = status;
  if (remarks !== undefined) attendance.remarks = remarks;
  attendance.isManual = true;

  await attendance.save();
  await attendance.populate("employee", "employeeId name department designation");

  res.status(200).json(new ApiResponse(200, attendance, "Attendance updated."));
});

/**
 * @desc    Attendance History - API 09
 * @route   GET /api/attendance/employee/:employeeId
 * @access  Private (attendance.view)
 */
exports.getEmployeeAttendanceHistory = asyncHandler(async (req, res) => {
  const { employeeId } = req.params;
  const { fromDate, toDate, status, page = 1, limit = 31 } = req.query;

  const employee = await findEmployee(req.businessId, employeeId);
  if (!employee) throw new ApiError(404, `Employee ${employeeId} not found.`);

  const query = {
    businessId: req.businessId,
    employee: employee._id,
  };

  if (fromDate || toDate) {
    query.date = {};
    if (fromDate) {
      const from = new Date(fromDate);
      from.setHours(0, 0, 0, 0);
      query.date.$gte = from;
    }
    if (toDate) {
      const to = new Date(toDate);
      to.setHours(23, 59, 59, 999);
      query.date.$lte = to;
    }
  }

  if (status) query.status = status;

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;

  const [attendance, total] = await Promise.all([
    Attendance.find(query).sort({ date: -1 }).skip(skip).limit(limitNum).populate("employee", "employeeId name department"),
    Attendance.countDocuments(query),
  ]);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        employee: {
          _id: employee._id,
          employeeId: employee.employeeId,
          name: employee.name,
          department: employee.department,
          designation: employee.designation,
        },
        attendance,
        pagination: {
          total,
          page: pageNum,
          pages: Math.ceil(total / limitNum),
          limit: limitNum,
        },
      },
      "Attendance history retrieved."
    )
  );
});

/**
 * @desc    All Attendance with filters
 * @route   GET /api/attendance
 * @access  Private (attendance.view)
 */
exports.getAllAttendance = asyncHandler(async (req, res) => {
  const { search, status, fromDate, toDate, employeeId, page = 1, limit = 50 } = req.query;
  const query = { businessId: req.businessId };

  if (status) query.status = status;

  if (employeeId) {
    const emp = await findEmployee(req.businessId, employeeId);
    if (emp) query.employee = emp._id;
  }

  if (fromDate || toDate) {
    query.date = {};
    if (fromDate) {
      const from = new Date(fromDate);
      from.setHours(0, 0, 0, 0);
      query.date.$gte = from;
    }
    if (toDate) {
      const to = new Date(toDate);
      to.setHours(23, 59, 59, 999);
      query.date.$lte = to;
    }
  }

  if (search) {
    // Search by employeeId field
    query.employeeId = { $regex: search, $options: "i" };
  }

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;

  const [attendance, total] = await Promise.all([
    Attendance.find(query)
      .populate("employee", "employeeId name department designation")
      .sort({ date: -1 })
      .skip(skip)
      .limit(limitNum),
    Attendance.countDocuments(query),
  ]);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        attendance,
        pagination: {
          total,
          page: pageNum,
          pages: Math.ceil(total / limitNum),
          limit: limitNum,
        },
      },
      "Attendance records retrieved."
    )
  );
});

/**
 * @desc    Monthly Attendance Report - API 10
 * @route   GET /api/attendance/report
 * @access  Private (attendance.reports)
 * 
 * Query: ?month=9&year=2026&department=Sales
 */
exports.getMonthlyReport = asyncHandler(async (req, res) => {
  const { month, year, department } = req.query;

  if (!month || !year) {
    throw new ApiError(400, "Month and year are required. Example: ?month=9&year=2026");
  }

  const monthNum = parseInt(month, 10);
  const yearNum = parseInt(year, 10);

  if (monthNum < 1 || monthNum > 12) throw new ApiError(400, "Month must be 1-12");
  if (yearNum < 2000 || yearNum > 2100) throw new ApiError(400, "Invalid year");

  const startDate = new Date(yearNum, monthNum - 1, 1);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(yearNum, monthNum, 0); // last day of month
  endDate.setHours(23, 59, 59, 999);

  // Get employees
  const empQuery = { businessId: req.businessId, status: "Active" };
  if (department) empQuery.department = department;

  const employees = await Employee.find(empQuery).sort({ employeeId: 1 });

  // Get all attendance for month
  const attendanceRecords = await Attendance.find({
    businessId: req.businessId,
    date: { $gte: startDate, $lte: endDate },
  });

  // Group by employee
  const report = employees.map((emp) => {
    const empAttendance = attendanceRecords.filter(
      (att) => att.employee.toString() === emp._id.toString()
    );

    const present = empAttendance.filter((a) => a.status === "Present").length;
    const absent = empAttendance.filter((a) => a.status === "Absent").length;
    const halfDay = empAttendance.filter((a) => a.status === "Half Day").length;
    const leave = empAttendance.filter((a) => a.status === "Leave").length;

    const totalWorkingMinutes = empAttendance.reduce((sum, a) => sum + (a.workingHours || 0), 0);
    const totalHours = Math.floor(totalWorkingMinutes / 60);
    const totalMins = totalWorkingMinutes % 60;

    // Days in month
    const daysInMonth = endDate.getDate();
    // For absent count, we consider days with no record as absent? For MVP, only count explicit records
    // But for report completeness, we can calculate expected working days vs present

    return {
      employee: {
        _id: emp._id,
        employeeId: emp.employeeId,
        name: emp.name,
        department: emp.department,
        designation: emp.designation,
      },
      summary: {
        present,
        absent,
        halfDay,
        leave,
        totalRecords: empAttendance.length,
        totalWorkingMinutes,
        totalWorkingHours: `${totalHours}h ${totalMins.toString().padStart(2, "0")}m`,
        totalHoursDecimal: Number((totalWorkingMinutes / 60).toFixed(2)),
      },
    };
  });

  // Overall summary
  const overall = {
    month: monthNum,
    year: yearNum,
    monthName: startDate.toLocaleString("default", { month: "long" }),
    totalEmployees: employees.length,
    totalPresent: report.reduce((sum, r) => sum + r.summary.present, 0),
    totalAbsent: report.reduce((sum, r) => sum + r.summary.absent, 0),
    totalHalfDay: report.reduce((sum, r) => sum + r.summary.halfDay, 0),
    totalLeave: report.reduce((sum, r) => sum + r.summary.leave, 0),
    totalWorkingHours: report.reduce((sum, r) => sum + r.summary.totalWorkingMinutes, 0),
    startDate,
    endDate,
  };

  res.status(200).json(
    new ApiResponse(
      200,
      {
        report,
        overall,
      },
      `Monthly report for ${overall.monthName} ${yearNum} retrieved.`
    )
  );
});

/**
 * @desc    Employee Attendance Summary (for single employee monthly)
 * @route   GET /api/attendance/summary/:employeeId
 * @access  Private (attendance.view)
 */
exports.getEmployeeSummary = asyncHandler(async (req, res) => {
  const { employeeId } = req.params;
  const { month, year } = req.query;

  const employee = await findEmployee(req.businessId, employeeId);
  if (!employee) throw new ApiError(404, `Employee ${employeeId} not found.`);

  const now = new Date();
  const monthNum = month ? parseInt(month, 10) : now.getMonth() + 1;
  const yearNum = year ? parseInt(year, 10) : now.getFullYear();

  const startDate = new Date(yearNum, monthNum - 1, 1);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(yearNum, monthNum, 0);
  endDate.setHours(23, 59, 59, 999);

  const attendance = await Attendance.find({
    businessId: req.businessId,
    employee: employee._id,
    date: { $gte: startDate, $lte: endDate },
  }).sort({ date: 1 });

  const present = attendance.filter((a) => a.status === "Present").length;
  const absent = attendance.filter((a) => a.status === "Absent").length;
  const halfDay = attendance.filter((a) => a.status === "Half Day").length;
  const leave = attendance.filter((a) => a.status === "Leave").length;
  const totalMinutes = attendance.reduce((sum, a) => sum + (a.workingHours || 0), 0);

  const totalHours = Math.floor(totalMinutes / 60);
  const totalMins = totalMinutes % 60;

  res.status(200).json(
    new ApiResponse(
      200,
      {
        employee: {
          _id: employee._id,
          employeeId: employee.employeeId,
          name: employee.name,
          department: employee.department,
          designation: employee.designation,
        },
        month: monthNum,
        year: yearNum,
        summary: {
          present,
          absent,
          halfDay,
          leave,
          totalDays: attendance.length,
          totalWorkingMinutes: totalMinutes,
          totalWorkingHours: `${totalHours}h ${totalMins.toString().padStart(2, "0")}m`,
          totalHoursDecimal: Number((totalMinutes / 60).toFixed(2)),
        },
        attendance,
      },
      "Employee summary retrieved."
    )
  );
});

/**
 * @desc    Delete attendance record
 * @route   DELETE /api/attendance/:id
 * @access  Private (attendance.delete)
 */
exports.deleteAttendance = asyncHandler(async (req, res) => {
  const attendance = await Attendance.findOne({
    _id: req.params.id,
    businessId: req.businessId,
  });

  if (!attendance) throw new ApiError(404, "Attendance record not found.");

  await Attendance.deleteOne({ _id: attendance._id });

  res.status(200).json(new ApiResponse(200, null, "Attendance record deleted."));
});
