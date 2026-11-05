import mongoose from "mongoose";
import AuditLog from "../models/AuditLog.model.js";
import User from "../models/User.js";
import { logAction } from "../utils/logAction.js";

/**
 * Parses and validates audit logs query parameters.
 */
async function buildAuditLogQuery(queryParams) {
  const { actor, action, targetType, from, to, limit = 20, page = 1, sort = "-createdAt" } = queryParams;

  const parsedPage = Number(page);
  const parsedLimit = Number(limit);

  if (!Number.isInteger(parsedPage) || parsedPage < 1) {
    const error = new Error("Parameter 'page' must be an integer >= 1");
    error.status = 400;
    throw error;
  }

  if (!Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
    const error = new Error("Parameter 'limit' must be an integer between 1 and 100");
    error.status = 400;
    throw error;
  }

  let fromDate = null;
  let toDate = null;

  if (from) {
    fromDate = new Date(from);
    if (isNaN(fromDate.getTime())) {
      const error = new Error("Parameter 'from' must be a valid date");
      error.status = 400;
      throw error;
    }
  }

  if (to) {
    toDate = new Date(to);
    if (isNaN(toDate.getTime())) {
      const error = new Error("Parameter 'to' must be a valid date");
      error.status = 400;
      throw error;
    }
    // If only date portion provided (e.g., YYYY-MM-DD), include full day
    if (typeof to === "string" && to.trim().length === 10) {
      toDate.setUTCHours(23, 59, 59, 999);
    }
  }

  if (fromDate && toDate && fromDate > toDate) {
    const error = new Error("Parameter 'from' date must be before or equal to 'to' date");
    error.status = 400;
    throw error;
  }

  const query = {};

  if (fromDate || toDate) {
    query.createdAt = {};
    if (fromDate) query.createdAt.$gte = fromDate;
    if (toDate) query.createdAt.$lte = toDate;
  }

  if (action && typeof action === "string" && action.trim()) {
    query.action = action.trim();
  }

  if (targetType && typeof targetType === "string" && targetType.trim()) {
    query.targetType = targetType.trim();
  }

  if (actor && typeof actor === "string" && actor.trim()) {
    const actorStr = actor.trim();
    if (actorStr.toLowerCase() === "system") {
      query.actorRole = "system";
    } else if (mongoose.Types.ObjectId.isValid(actorStr)) {
      query.actorId = actorStr;
    } else {
      const matchingUsers = await User.find({
        $or: [
          { fullName: { $regex: actorStr, $options: "i" } },
          { email: { $regex: actorStr, $options: "i" } },
        ],
      })
        .select("_id")
        .lean();

      const userIds = matchingUsers.map((u) => u._id);
      const orConditions = [];

      if (userIds.length > 0) {
        orConditions.push({ actorId: { $in: userIds } });
      }

      if (["admin", "teamleader", "intern"].includes(actorStr.toLowerCase())) {
        orConditions.push({ actorRole: actorStr.toLowerCase() });
      }

      orConditions.push({ "meta.email": { $regex: actorStr, $options: "i" } });

      if (orConditions.length > 0) {
        query.$or = orConditions;
      }
    }
  }

  let sortCriteria = { createdAt: -1 };
  if (sort === "asc" || sort === "createdAt" || sort === "+createdAt") {
    sortCriteria = { createdAt: 1 };
  } else if (sort === "desc" || sort === "-createdAt") {
    sortCriteria = { createdAt: -1 };
  }

  return {
    query,
    page: parsedPage,
    limit: parsedLimit,
    sortCriteria,
  };
}

/**
 * GET /api/admin/audit-logs
 * Paginated list of audit logs with filters.
 */
export async function getAuditLogs(req, res) {
  try {
    const { query, page, limit, sortCriteria } = await buildAuditLogQuery(req.query);

    const skip = (page - 1) * limit;

    const [total, logs] = await Promise.all([
      AuditLog.countDocuments(query),
      AuditLog.find(query)
        .sort(sortCriteria)
        .skip(skip)
        .limit(limit)
        .populate("actorId", "fullName email role")
        .lean(),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return res.status(200).json({
      logs,
      page,
      totalPages,
      total,
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      message: error.message || "Failed to retrieve audit logs",
    });
  }
}

/**
 * Escapes values for safe CSV representation.
 */
function escapeCsvValue(val) {
  if (val === null || val === undefined) return '""';
  let str = typeof val === "object" ? JSON.stringify(val) : String(val);
  str = str.replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * GET /api/admin/audit-logs/export
 * CSV download of current filtered audit logs.
 * This download is itself logged as EXPORT.
 */
export async function exportAuditLogs(req, res) {
  try {
    const { query, sortCriteria } = await buildAuditLogQuery({
      ...req.query,
      page: 1,
      limit: 100, // bypass pagination limit for export query
    });

    const logs = await AuditLog.find(query)
      .sort(sortCriteria)
      .limit(10000)
      .populate("actorId", "fullName email role")
      .lean();

    // Log the EXPORT action
    await logAction({
      req,
      actor: req.user,
      action: "EXPORT",
      targetType: "audit_log",
      targetId: null,
      meta: {
        format: "csv",
        recordCount: logs.length,
        filter: {
          actor: req.query.actor || null,
          action: req.query.action || null,
          targetType: req.query.targetType || null,
          from: req.query.from || null,
          to: req.query.to || null,
        },
      },
    });

    const headers = [
      "Timestamp",
      "Actor Name",
      "Actor Email",
      "Actor Role",
      "Action",
      "Target Type",
      "Target ID",
      "IP Address",
      "User Agent",
      "Metadata",
    ];

    const csvRows = [headers.map(escapeCsvValue).join(",")];

    for (const log of logs) {
      const actorName = log.actorId?.fullName || (log.actorRole === "system" ? "System" : "");
      const actorEmail = log.actorId?.email || "";
      const actorRole = log.actorRole || log.actorId?.role || "";
      const metaStr = log.meta ? JSON.stringify(log.meta) : "{}";

      const row = [
        escapeCsvValue(log.createdAt ? new Date(log.createdAt).toISOString() : ""),
        escapeCsvValue(actorName),
        escapeCsvValue(actorEmail),
        escapeCsvValue(actorRole),
        escapeCsvValue(log.action),
        escapeCsvValue(log.targetType || ""),
        escapeCsvValue(log.targetId ? String(log.targetId) : ""),
        escapeCsvValue(log.ip || ""),
        escapeCsvValue(log.userAgent || ""),
        escapeCsvValue(metaStr),
      ];

      csvRows.push(row.join(","));
    }

    const csvContent = csvRows.join("\r\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="audit_logs_${new Date().toISOString().slice(0, 10)}.csv"`
    );

    return res.status(200).send(csvContent);
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      message: error.message || "Failed to export audit logs",
    });
  }
}
