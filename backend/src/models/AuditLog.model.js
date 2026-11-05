import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      default: null,
      index: true,
    },
    actorRole: {
      type: String,
      enum: ["admin", "teamleader", "intern", "system"],
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    targetType: {
      type: String,
      trim: true,
      default: null,
      index: true,
    },
    targetId: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({}),
    },
    ip: {
      type: String,
      trim: true,
      default: "",
    },
    userAgent: {
      type: String,
      trim: true,
      default: "",
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    // Compatibility fields for any legacy callers/tests:
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
    },
    entityType: {
      type: String,
    },
    entityId: {
      type: mongoose.Schema.Types.Mixed,
    },
    description: {
      type: String,
    },
    ipAddress: {
      type: String,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
    bufferCommands: false,
  }
);

// Indexes on actorId, action, targetType and createdAt (descending)
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ actorId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ targetType: 1, createdAt: -1 });

// Append-only: block updateOne, findOneAndUpdate and deleteOne through schema hooks
const blockMutation = function (next) {
  const err = new Error("Audit logs are append-only: updates and deletions are blocked.");
  if (typeof next === "function") return next(err);
  throw err;
};

auditLogSchema.pre(
  [
    "updateOne",
    "updateMany",
    "findOneAndUpdate",
    "replaceOne",
    "findOneAndReplace",
    "deleteOne",
    "deleteMany",
    "findOneAndDelete",
  ],
  blockMutation
);

auditLogSchema.pre(["deleteOne", "remove"], { document: true, query: false }, blockMutation);

const AuditLog =
  mongoose.models.audit_log || mongoose.model("audit_log", auditLogSchema);

export default AuditLog;
