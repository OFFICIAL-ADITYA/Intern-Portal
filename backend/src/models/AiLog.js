import mongoose from "mongoose";

const aiLogSchema = new mongoose.Schema(
{
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        index: true
    },

    requestId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "certificate_request",
        index: true
    },

    action: {
        type: String,
        required: true,
        trim: true
    },

    result: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    }
},
{
    timestamps: true
});

aiLogSchema.pre("save", async function () {
    const userModel = mongoose.model("user");
    const certificateRequestModel = mongoose.model("certificate_request");

    if (this.userId) {
        const user = await userModel.findById(this.userId);
        if (!user) throw new Error("userId does not reference an existing user");
    }

    if (this.requestId) {
        const request = await certificateRequestModel.findById(this.requestId);
        if (!request) throw new Error("requestId does not reference an existing certificate request");
    }
});

const aiLogModel = mongoose.model(
    "ai_log",
    aiLogSchema
);

export default aiLogModel;
