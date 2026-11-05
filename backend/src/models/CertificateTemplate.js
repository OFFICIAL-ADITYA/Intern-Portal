import mongoose from "mongoose";

const certificateTemplateSchema = new mongoose.Schema(
  {
    templateCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    templateName: {
      type: String,
      required: true,
      trim: true,
    },

    certificateType: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    // Existing certificate engine field
    content: {
      type: String,
      default: "",
    },

    // Week 1 template editor field
    htmlContent: {
      type: String,
      default: "",
    },

    placeholders: {
      type: [String],
      default: [],
    },

    logoPath: {
      type: String,
      default: "",
    },

    backgroundPath: {
      type: String,
      default: "",
    },

    signaturePath: {
      type: String,
      default: "",
    },

    version: {
      type: Number,
      default: 1,
    },

    status: {
      type: String,
      enum: ["draft", "active", "inactive", "archived"],
      default: "draft",
      index: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
    },
  },
  {
    timestamps: true,
  }
);

certificateTemplateSchema.pre("save", async function () {
  if (this.createdBy) {
    const userModel = mongoose.model("user");

    const creator = await userModel.findById(this.createdBy);

    if (!creator) {
      throw new Error(
        "createdBy does not reference an existing user"
      );
    }
  }
});

const CertificateTemplate = mongoose.model(
  "certificate_template",
  certificateTemplateSchema
);

export default CertificateTemplate;