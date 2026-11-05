import mongoose from "mongoose";

const dataRetentionPolicySchema = new mongoose.Schema(
{
    recordType: {
        type: String,
        required: true,
        trim: true,
        index: true
    },

    retentionDays: {
        type: Number,
        required: true
    },

    configuredBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true
    }
},
{
    timestamps: true
});

dataRetentionPolicySchema.pre("save", async function () {
    const userModel = mongoose.model("user");
    const configurer = await userModel.findById(this.configuredBy);
    if (!configurer) throw new Error("configuredBy does not reference an existing user");
    if (configurer.role !== "admin") throw new Error("configuredBy must reference a user with role \"admin\"");
});

const dataRetentionPolicyModel = mongoose.model(
    "data_retention_policy",
    dataRetentionPolicySchema
);

export default dataRetentionPolicyModel;
