import User from "../models/User.js";
import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "crypto";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { sendEmail } from "../utils/sendEmail.js";
import { logAction } from "../utils/logAction.js";

dotenv.config();

export async function login(req, res) {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
        await logAction({
            req,
            actor: { role: "system", id: null },
            action: "LOGIN_FAILED",
            targetType: "user",
            targetId: null,
            meta: { email, reason: "Invalid credentials" }
        });
        return res.status(401).json({
            message: "Invalid credentials"
        });
    }

    // Determine password validity:
    // If intern has set a password, only password works. If not, intern code works for first login.
    let isCredentialValid = false;
    if (user.role === "intern") {
        if (user.passwordSetAt) {
            isCredentialValid = await user.comparePassword(password);
        } else {
            isCredentialValid = (password === user.internCode) || (await user.comparePassword(password));
        }
    } else {
        isCredentialValid = await user.comparePassword(password);
    }

    if (!isCredentialValid) {
        await logAction({
            req,
            actor: { role: "system", id: user._id },
            action: "LOGIN_FAILED",
            targetType: "user",
            targetId: user._id,
            meta: { email, reason: "Invalid credentials" }
        });
        return res.status(401).json({
            message: "Invalid credentials"
        });
    }

    if (user.role === "intern" && user.isArchived) {
        await logAction({
            req,
            actor: { role: "system", id: user._id },
            action: "LOGIN_FAILED",
            targetType: "user",
            targetId: user._id,
            meta: { email, reason: "Account archived" }
        });
        return res.status(403).json({
            message: "Your internship account has been archived. Contact admin."
        });
    }

    // The frontend uses the returned role to select the correct dashboard.
    const token = jwt.sign({
        id: user._id,
        email: user.email,
        role: user.role
    }, process.env.JWT_SECRET, { expiresIn: "7d" });

    res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000
    });

    await logAction({
        req,
        actor: { id: user._id, role: user.role },
        action: "LOGIN",
        targetType: "user",
        targetId: user._id,
        meta: { email: user.email, role: user.role }
    });

    return res.status(200).json({
        message: "User logged in successfully",
        user: {
            id: user._id,
            fullName: user.fullName,
            email: user.email,
            mobileNo: user.mobileNo,
            role: user.role,
            internCode: user.internCode,
            hasPassword: !!user.passwordSetAt,
            passwordSetAt: user.passwordSetAt,
            createdAt: user.createdAt
        }
    });
}

export async function logout(req, res) {
    try {
        if (req.user) {
            await logAction({
                req,
                actor: req.user,
                action: "LOGOUT",
                targetType: "user",
                targetId: req.user.id
            });
        }
        res.clearCookie("token", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax"
        });
        return res.status(200).json({
            message: "User logged out successfully"
        });
    } catch (err) {
        return res.status(500).json({
            message: "Internal server error"
        });
    }
}

export async function getMe(req, res) {
    try {
        const userId = req.user.id;

        const user = await User.findById(userId).select('fullName email mobileNo role internCode passwordSetAt createdAt');

        if (!user) {
            return res.status(404).json({
                message: "user not found"
            })
        }

        res.status(200).json({
            message: "user found",
            id: user._id,
            fullName: user.fullName,
            email: user.email,
            mobileNo: user.mobileNo,
            role: user.role,
            internCode: user.internCode,
            hasPassword: !!user.passwordSetAt,
            passwordSetAt: user.passwordSetAt,
            createdAt: user.createdAt
        })
    } catch (err) {
        res.status(500).json({
            message: "internal server error"
        })
    }
}

export async function forgotPassword(req, res) {
    const { email } = req.body;

    if (typeof email !== "string" || !email.trim()) {
        return res.status(400).json({
            message: "Email is required"
        });
    }

    try {
        const normalizedEmail = email.trim().toLowerCase();
        const user = await User.findOne({ email: normalizedEmail });
        const genericMessage = "If an account with this email exists, a reset link has been sent.";

        if (!user) {
            return res.status(200).json({ message: genericMessage });
        }

        const rawToken = randomBytes(32).toString("hex");
        const hashedToken = createHash("sha256").update(rawToken).digest("hex");

        user.resetPasswordToken = hashedToken;
        user.resetPasswordExpires = Date.now() + 15 * 60 * 1000;
        await user.save();

        const resetLink = `${process.env.FRONTEND_URL}/reset-password/${rawToken}`;

        await sendEmail({
            to: user.email,
            subject: "Reset your UPTOSKILL password",
            html: `<p>Click the link below to reset your password:</p>
                <p><a href="${resetLink}">${resetLink}</a></p>
                <p>This link expires in 15 minutes.</p>`
        });

        await logAction({
            req,
            actor: { role: "system", id: user._id },
            action: "PASSWORD_RESET_REQUESTED",
            targetType: "user",
            targetId: user._id,
            meta: { email: user.email }
        });

        return res.status(200).json({ message: genericMessage });
    } catch (err) {
        return res.status(500).json({
            message: err.message
        });
    }
}

export async function resetPassword(req, res) {
    const { token } = req.params;
    const newPassword = req.body.newPassword || req.body.password;

    if (typeof newPassword !== "string" || newPassword.length < 8 || !/^(?=.*[A-Za-z])(?=.*\d)/.test(newPassword)) {
        return res.status(400).json({
            message: "New password must be at least 8 characters long and contain at least one letter and one number"
        });
    }

    try {
        const hashedToken = createHash("sha256").update(token).digest("hex");
        const user = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({
                message: "Reset link is invalid or has expired"
            });
        }

        user.password = await bcrypt.hash(newPassword, 10);
        user.passwordSetAt = new Date();
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        await logAction({
            req,
            actor: { role: "system", id: user._id },
            action: "PASSWORD_RESET_COMPLETED",
            targetType: "user",
            targetId: user._id,
            meta: { email: user.email }
        });

        return res.status(200).json({
            message: "Password reset successful. You can now log in."
        });
    } catch (err) {
        return res.status(500).json({
            message: err.message
        });
    }
}
