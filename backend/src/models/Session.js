import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema(
{
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true,
        index: true
    },

    token: {
        type: String,
        required: true,
        unique: true
    },

    ipAddress: {
        type: String
    },

    userAgent: {
        type: String
    },

    expiresAt: {
        type: Date,
        required: true,
        index: true
    },

    isActive: {
        type: Boolean,
        default: true,
        index: true
    }
},
{
    timestamps: true
});

sessionSchema.pre("save", async function () {
    const userModel = mongoose.model("user");
    const user = await userModel.findById(this.userId);
    if (!user) throw new Error("userId does not reference an existing user");
});

const sessionModel = mongoose.model(
    "session",
    sessionSchema
);

export default sessionModel;
