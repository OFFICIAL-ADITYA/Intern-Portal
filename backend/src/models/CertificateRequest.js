import mongoose from "mongoose";

const certificateRequestSchema = new mongoose.Schema(
{
    requestNumber: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },

    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true,
        index: true
    },

    internCode: {
        type: String,
        required: true,
        index: true
    },

    certificateType: {
        type: String,
        required: true,
        trim: true
    },

    templateId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "certificate_template"
    },

    reason: {
        type: String,
        trim: true
    },

    metadata: {
        type: Map,
        of: String,
        default: {}
    },

    status: {
        type: String,
        enum: [
            "pending",
            "approved",
            "rejected",
            "processing",
            "completed",
            "cancelled"
        ],
        default: "pending",
        index: true
    },

    requestedAt: {
        type: Date,
        default: Date.now,
        index: true
    },

    reviewedAt: {
        type: Date,
    },

    forwardedAt: {
        type: Date,
        index: true
    },

    forwardedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        index: true
    },

    completedAt: {
        type: Date,
        index: true
    },

    reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        index: true
    },
    forwardedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        index: true
    },

    forwardedAt: {
        type: Date,
    },

    rejectionReason: {
        type: String,
        trim: true
    },

    certificateId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "certificate"
    }
},
{
    timestamps: true
});

certificateRequestSchema.index({ userId: 1, requestedAt: -1, status: 1 });
certificateRequestSchema.index({ forwardedBy: 1, forwardedAt: -1 });
certificateRequestSchema.index({ reviewedBy: 1, reviewedAt: -1 });
certificateRequestSchema.index({ status: 1, requestedAt: -1, forwardedAt: -1, reviewedAt: -1 });
certificateRequestSchema.index({ certificateType: 1, status: 1 });
certificateRequestSchema.index({ status: 1, createdAt: -1 });

certificateRequestSchema.pre("save", async function () {
    const userModel = mongoose.model("user");

    const user = await userModel.findById(this.userId);
    if (!user) throw new Error("userId does not reference an existing user");

    if (this.templateId) {
        const certificateTemplateModel = mongoose.model("certificate_template");
        const template = await certificateTemplateModel.findById(this.templateId);
        if (!template) throw new Error("templateId does not reference an existing certificate template");
    }

    if (this.reviewedBy) {
        const reviewer = await userModel.findById(this.reviewedBy);
        if (!reviewer) throw new Error("reviewedBy does not reference an existing user");
    }

    if (this.certificateId) {
        const certificateModel = mongoose.model("certificate");
        const certificate = await certificateModel.findById(this.certificateId);
        if (!certificate) throw new Error("certificateId does not reference an existing certificate");
    }
});

const certificateRequestModel = mongoose.model(
    "certificate_request",
    certificateRequestSchema
);

export default certificateRequestModel;
