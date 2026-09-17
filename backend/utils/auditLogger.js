const AuditLog = require("../models/AuditLog");

// List of sensitive fields to never store in audit snapshots
const SENSITIVE_FIELDS = [
  "password",
  "refreshToken",
  "token",
  "accessToken",
  "secret",
  "JWT_SECRET",
];

const sanitizePayload = (data) => {
  if (!data || typeof data !== "object") return data;

  if (Array.isArray(data)) {
    return data.map(sanitizePayload);
  }

  const sanitized = { ...(data._doc || data) };
  for (const field of SENSITIVE_FIELDS) {
    delete sanitized[field];
  }

  return sanitized;
};

/**
 * Log an audit entry
 * @param {Object} req - Express request object (contains req.user, req.businessId, headers)
 * @param {Object} details - Action details
 * @param {string} details.action - Action type (CREATE, UPDATE, DELETE, etc.)
 * @param {string} details.module - Module name (INVOICE, PRODUCT, etc.)
 * @param {string} [details.recordId] - MongoDB _id of affected document
 * @param {string} [details.recordIdentifier] - Readable string (INV-2026-0001, email, etc.)
 * @param {string} details.description - Human-readable summary
 * @param {Object} [details.oldData] - Previous state snapshot
 * @param {Object} [details.newData] - New state snapshot
 */


const logAudit = async (req, details) => {
  try {
    if (!req || !req.user || !req.businessId) return;

    const ipAddress =
      req.headers["x-forwarded-for"] ||
      req.socket?.remoteAddress ||
      req.ip ||
      "";

    const userAgent = req.headers["user-agent"] || "";

    await AuditLog.create({
      businessId: req.businessId,
      user: req.user._id,
      userName: req.user.name || "System User",
      userRole: req.user.role || "Unknown",
      action: details.action,
      module: details.module,
      recordId: details.recordId || undefined,
      recordIdentifier: details.recordIdentifier || "",
      description: details.description,
      oldData: sanitizePayload(details.oldData),
      newData: sanitizePayload(details.newData),
      ipAddress: String(ipAddress),
      userAgent: String(userAgent),
    });
  } catch (err) {
    // Non-blocking: Audit failure should not crash business transactions, but log to server console
    console.error("⚠️ AuditLog Recording Failed:", err.message);
  }
};

module.exports = { logAudit };
