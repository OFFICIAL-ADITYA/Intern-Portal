import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
    {
        fullName: {
            type: String,
            required: true
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },

        mobileNo: {
            type: String
        },

        internCode: {
            type: String,
            unique: true,
            sparse: true
        },

        domain: {
            type: String
        },

        startDate: {
            type: Date
        },

        endDate: {
            type: Date
        },

        isArchived: {
            type: Boolean,
            default: false,
            index: true
        },

        archivedAt: {
            type: Date,
            default: null,
            index: true
        },

        archiveWarningSentAt: {
            type: Date,
            default: null
        },

        archiveRestoredAt: {
            type: Date,
            default: null
        },

        personalDataPurged: {
            type: Boolean,
            default: false
        },

        password: {
            type: String,
            required: function () {
                return !this.internCode;
            }
        },

        resetPasswordToken: {
            type: String
        },

        resetPasswordExpires: {
            type: Date
        },

        passwordSetAt: {
            type: Date,
            default: null
        },

        role: {
            type: String,
            enum: ["admin", "intern", "teamleader"],
            default: "intern"
        },
        internshipDetails:{
            teamLeaderId: { type: mongoose.Schema.Types.ObjectId, ref: 'user', index: true },
            teamLeader: { type: mongoose.Schema.Types.ObjectId, ref: 'user', index: true },
            teamleaderEmail: { type: String, trim: true, lowercase: true },
            mentor: { type: String, trim: true },
            collegeName: { type: String, trim: true },
            degree: { type: String, trim: true },
            internshipTitle: { type: String, trim: true },
            performanceRemarks: { type: String, trim: true },
            status: {
                type: String,
                enum: ["upcoming", "ongoing", "completed", "cancelled"],
                default: "upcoming"
            },
            createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'user' },
            createdAt: { type: Date, default: Date.now }
        }
    },
    {
        timestamps: true
    });


userSchema.index({ role: 1, domain: 1, 'internshipDetails.teamLeader': 1, createdAt: 1 });
userSchema.index({ role: 1, domain: 1, 'internshipDetails.teamLeaderId': 1, createdAt: 1 });
userSchema.index({ role: 1, isArchived: 1, archivedAt: 1 });

userSchema.methods.comparePassword = async function (candidatePassword) {

    return bcrypt.compare(
        candidatePassword,
        this.password
    );

};

userSchema.pre("save", async function (next) {
    if (!this.internCode) {
        this.internCode = this.email
    }

    if (!this.isModified("password")) {
        return;
    }

    // Never store a plain-text password or intern code.
    if (!/^\$2[aby]\$\d{2}\$/.test(this.password)) {
        this.password = await bcrypt.hash(this.password, 10);
    }
    next;
});

const userModel = mongoose.model(
    "user",
    userSchema
);

export default userModel;
