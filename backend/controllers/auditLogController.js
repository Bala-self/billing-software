const AuditLog = require("../models/AuditLog");
const ApiError = require("../utils/apiError");
const ApiResponse = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");

/**
 * @desc    Get Audit Logs with filters, date range & pagination
 * @route   GET /api/audit-logs
 * @access  Private (audit.view)
 */
exports.getAuditLogs = asyncHandler(async (req, res) => {
  const {
    module: filterModule,
    action,
    userId,
    search,
    startDate,
    endDate,
    page = 1,
    limit = 50,
  } = req.query;

  const query = { businessId: req.businessId };

  if (filterModule) query.module = filterModule;
  if (action) query.action = action;
  if (userId) query.user = userId;

  if (search) {
    query.$or = [
      { description: { $regex: search, $options: "i" } },
      { recordIdentifier: { $regex: search, $options: "i" } },
      { userName: { $regex: search, $options: "i" } },
    ];
  }

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;

  const [logs, total] = await Promise.all([
    AuditLog.find(query)
      .populate("user", "name email role")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum),
    AuditLog.countDocuments(query),
  ]);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        logs,
        pagination: {
          total,
          page: pageNum,
          pages: Math.ceil(total / limitNum),
          limit: limitNum,
        },
      },
      "Audit logs retrieved successfully."
    )
  );
});

/**
 * @desc    Get single audit log entry details (with full diff)
 * @route   GET /api/audit-logs/:id
 * @access  Private (audit.view)
 */
exports.getAuditLogById = asyncHandler(async (req, res) => {
  const log = await AuditLog.findOne({
    _id: req.params.id,
    businessId: req.businessId,
  }).populate("user", "name email role phone");

  if (!log) throw new ApiError(404, "Audit log entry not found.");

  res.status(200).json(new ApiResponse(200, log, "Audit log details retrieved."));
});
