import mongoose from "mongoose";

const departmentSchema = new mongoose.Schema(
{
    departmentCode: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },

    departmentName: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },

    description: {
        type: String,
        trim: true
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

const departmentModel = mongoose.model(
    "department",
    departmentSchema
);

export default departmentModel;
