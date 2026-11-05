import mongoose from "mongoose";

const certificateSchema = new mongoose.Schema(
{
    certificateNumber: {
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

    internshipId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "internship",
        index: true
    },

    templateId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "certificate_template"
    },

    certificateType: {
        type: String,
        required: true,
        trim: true,
        index: true
    },

    domain: {
        type: String,
        trim: true
    },

    startDate: {
        type: Date
    },

    endDate: {
        type: Date
    },

    issuedDate: {
        type: Date,
        default: Date.now,
        index: true
    },

    finalizedAt: {
        type: Date,
        index: true
    },

    status: {
        type: String,
        enum: ["draft", "finalized", "generated", "issued", "revoked", "expired"],
        default: "draft",
        index: true
    },

    htmlContent: {
        type: String
    },

    pdfPath: {
        type: String
    },

    verificationCode: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        index: true
    },

    qrCodePath: {
        type: String
    },

    verifyId: {
        type: String,
        unique: true,
        sparse: true,
        trim: true,
        index: true
    },

    isRevoked: {
        type: Boolean,
        default: false,
        index: true
    },

    revokedAt: {
        type: Date
    },

    revokedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user"
    },

    revokedReason: {
        type: String,
        trim: true
    },

    recipientName: {
        type: String,
        trim: true
    },

    certificateTitle: {
        type: String,
        trim: true
    },

    issuedAt: {
        type: Date,
        index: true
    },

    generatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user"
    }
},
{
    timestamps: true
});

certificateSchema.index({ userId: 1, finalizedAt: -1, status: 1 });
certificateSchema.index({ domain: 1, finalizedAt: -1, status: 1 });
certificateSchema.index({ issuedAt: -1, certificateType: 1 });

certificateSchema.pre("save", async function () {
    const userModel = mongoose.model("user");

    if (this.isNew || this.isModified("userId")) {
        const user = await userModel.findById(this.userId);
        if (!user) throw new Error("userId does not reference an existing user");
    }

    if (this.internshipId && mongoose.models.internship && (this.isNew || this.isModified("internshipId"))) {
        const internshipModel = mongoose.model("internship");
        const internship = await internshipModel.findById(this.internshipId);
        if (!internship) throw new Error("internshipId does not reference an existing internship");
    }

    if (this.templateId && (this.isNew || this.isModified("templateId"))) {
        const certificateTemplateModel = mongoose.model("certificate_template");
        const template = await certificateTemplateModel.findById(this.templateId);
        if (!template) throw new Error("templateId does not reference an existing certificate template");
    }

    if (this.generatedBy && (this.isNew || this.isModified("generatedBy"))) {
        const generator = await userModel.findById(this.generatedBy);
        if (!generator) throw new Error("generatedBy does not reference an existing user");
    }
});

const certificateModel = mongoose.model(
    "certificate",
    certificateSchema
);

export default certificateModel;
