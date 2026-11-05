import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import axios from "axios";
import User from "../models/User.js";
import CertificateRequest from "../models/CertificateRequest.js";
import Certificate from "../models/Certificate.js";
import Counter from "../models/Counter.model.js";
import RetentionPolicy from "../models/RetentionPolicy.js";
import { logAction } from "../utils/logAction.js";
import { notify } from "../services/notification.service.js";

const ALLOWED_TYPES = [
  "offer_letter",
  "bonafide",
  "ojt_certificate",
  "experience_letter",
  "completion_certificate",
  "intern_of_month",
  "league_winner",
  "custom",
];

const generateRequestNumber = async () => {
  const year = new Date().getFullYear();

  const counter = await Counter.findOneAndUpdate(
    { _id: "certRequest" },
    { $inc: { seq: 1 } },
    { new: true, upsert: true },
  );

  return `CERT-${year}-${String(counter.seq).padStart(5, "0")}`;
};

export const submitCertificateRequest = async (req, res) => {
  try {
    const { certificateType, reason, metadata } = req.body;

    if (!certificateType || !ALLOWED_TYPES.includes(certificateType)) {
      return res.status(400).json({
        message: "Valid certificate type is required",
      });
    }

    // Intern details are taken from the logged-in user.
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.startDate) {
      return res.status(404).json({
        message: "No internship details found for this account",
      });
    }

    // Eligibility validations.
    const now = new Date();
    const hasEnded = user.endDate && new Date(user.endDate) < now;
    const isOngoing = user.internshipDetails?.status === "ongoing" || !hasEnded;
    const isCompleted =
      user.internshipDetails?.status === "completed" || hasEnded;

    if (certificateType === "bonafide" && !isOngoing) {
      return res.status(400).json({
        message:
          "Bonafide certificate is only available for internships currently in progress",
      });
    }

    if (certificateType === "completion_certificate" && !isCompleted) {
      return res.status(400).json({
        message:
          "Internship completion certificate is only available after completing your internship",
      });
    }

    if (certificateType === "experience_letter" && !isCompleted) {
      return res.status(400).json({
        message:
          "Experience letter is only available after completing your internship",
      });
    }

    const existingPending = await CertificateRequest.findOne({
      userId: req.user.id,
      certificateType,
      status: { $in: ["pending", "processing"] },
    });

    if (existingPending) {
      return res.status(409).json({
        message:
          "You already have a request in progress for this certificate type",
      });
    }

    const requestNumber = await generateRequestNumber();

    // Keep only non-empty string metadata values.
    const safeMetadata = {};

    if (metadata && typeof metadata === "object") {
      for (const [key, val] of Object.entries(metadata)) {
        if (typeof val === "string" && val.trim()) {
          safeMetadata[key] = val.trim();
        }
      }
    }

    const request = await CertificateRequest.create({
      requestNumber,
      userId: req.user.id,
      internCode: user.internCode,
      certificateType,
      reason,
      metadata: safeMetadata,
    });

    await logAction({
      req,
      actor: req.user,
      action: "REQUEST_SUBMITTED",
      targetType: "request",
      targetId: request._id,
      meta: {
        certificateType: request.certificateType,
        requestNumber: request.requestNumber,
      },
    });

    try {
      const tlEmail = user.internshipDetails?.teamleaderEmail;
      if (tlEmail) {
        const tl = await User.findOne({
          email: tlEmail.toLowerCase(),
          role: "teamleader",
        });
        if (tl) {
          await notify(tl._id, "REQUEST_SUBMITTED", {
            title: "New Certificate Request",
            message: `${user.fullName || "An intern"} has submitted a request for ${request.certificateType} (Ref: ${request.requestNumber}).`,
            requestId: request._id,
            email: true,
          });
        } else {
          console.warn(
            `[Notification] No team leader found with email: ${tlEmail}`,
          );
        }
      } else {
        console.warn(
          `[Notification] Intern ${user._id} has no team leader email assigned`,
        );
      }
    } catch (notifErr) {
      console.error(
        "[Notification] Error sending submission notification:",
        notifErr.message,
      );
    }

    return res.status(201).json({ request });
  } catch (err) {
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

export const getMyRequests = async (req, res) => {
  try {
    const requests = await CertificateRequest.find({
      userId: req.user.id,
    })
      .populate("certificateId", "certificateNumber status pdfPath issuedDate")
      .sort({ requestedAt: -1 });

    // Never expose draft or incomplete certificates to the intern.
    const sanitizedRequests = requests.map((reqDoc) => {
      const plain = reqDoc.toObject();

      if (
        plain.certificateId &&
        (plain.certificateId.status !== "finalized" ||
          plain.status !== "completed")
      ) {
        delete plain.certificateId;
      }

      return plain;
    });

    return res.json({ requests: sanitizedRequests });
  } catch (err) {
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Preserve the configurable internship retention policy.
    const policy = await RetentionPolicy.findOne({
      policyKey: "intern",
    }).lean();

    const graceDays = policy?.graceDays ?? 30;
    let archiveNotice = null;

    if (user.endDate && user.role === "intern" && !user.isArchived) {
      const archiveDate = new Date(user.endDate);
      archiveDate.setUTCDate(archiveDate.getUTCDate() + graceDays);
      archiveDate.setUTCHours(0, 0, 0, 0);

      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);

      const daysUntilArchive = Math.ceil(
        (archiveDate.getTime() - today.getTime()) / 86400000,
      );

      if (daysUntilArchive >= 0 && daysUntilArchive <= 7) {
        archiveNotice = {
          archiveDate,
          daysUntilArchive,
        };
      }
    }

    return res.json({ user, hasPassword: !!user.passwordSetAt, archiveNotice });
  } catch (err) {
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

/**
 * Fetches finalized certificate metadata for a specific request owned by
 * the authenticated intern.
 */
export const getCertificateForRequest = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid request ID" });
    }

    const request = await CertificateRequest.findById(id);

    if (!request) {
      return res.status(404).json({
        message: "Certificate request not found",
      });
    }

    if (request.userId.toString() !== req.user.id) {
      return res.status(403).json({
        message: "Access denied: You do not own this certificate request",
      });
    }

    if (!request.certificateId) {
      return res.status(404).json({
        message: "No certificate exists for this request",
      });
    }

    const certificate = await Certificate.findById(request.certificateId);

    if (!certificate) {
      return res.status(404).json({
        message: "Certificate record not found",
      });
    }

    if (certificate.userId.toString() !== req.user.id) {
      return res.status(403).json({
        message: "Access denied: Certificate does not belong to you",
      });
    }

    // Draft certificates must never be exposed to the intern.
    if (certificate.status !== "finalized" || request.status !== "completed") {
      return res.status(400).json({
        message: "Certificate is not finalized or available yet",
        status: request.status,
      });
    }

    return res.status(200).json({
      certificate: {
        _id: certificate._id,
        certificateNumber: certificate.certificateNumber,
        certificateType: certificate.certificateType,
        domain: certificate.domain,
        issuedDate: certificate.issuedDate,
        status: certificate.status,
        verificationCode: certificate.verificationCode,
        hasPdf: Boolean(certificate.pdfPath),
        downloadUrl: `/api/intern/requests/${request._id}/certificate/download`,
      },
    });
  } catch (err) {
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

/**
 * Streams the finalized certificate PDF to the authenticated intern.
 * Validates ownership and checks that the PDF exists.
 */
export const downloadCertificateForRequest = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid request ID" });
    }

    const request = await CertificateRequest.findById(id);

    if (!request) {
      return res.status(404).json({
        message: "Certificate request not found",
      });
    }

    if (request.userId.toString() !== req.user.id) {
      return res.status(403).json({
        message: "Access denied: You do not own this certificate request",
      });
    }

    if (!request.certificateId) {
      return res.status(404).json({
        message: "No certificate exists for this request",
      });
    }

    const certificate = await Certificate.findById(request.certificateId);

    if (!certificate) {
      return res.status(404).json({
        message: "Certificate record not found",
      });
    }

    if (certificate.userId.toString() !== req.user.id) {
      return res.status(403).json({
        message: "Access denied: Certificate does not belong to you",
      });
    }

    if (certificate.status !== "finalized" || request.status !== "completed") {
      return res.status(400).json({
        message: "Certificate has not been finalized yet",
      });
    }

    if (!certificate.pdfPath) {
      return res.status(404).json({
        message: "Certificate PDF path is missing",
      });
    }

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const absolutePath = path.resolve(__dirname, "../../", certificate.pdfPath);

    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({
        message: "Certificate PDF file is unavailable on server",
      });
    }

    const safeFileName = `${(
      certificate.certificateNumber || "Certificate"
    ).replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`;

    return res.download(absolutePath, safeFileName);
  } catch (err) {
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

export const setPassword = async (req, res) => {
  try {
    const { currentSecret, newPassword } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const hasPassword = !!user.passwordSetAt;
    let isValidCurrentSecret = false;

    if (!hasPassword) {
      // If no password exists yet, currentSecret must be the intern code.
      isValidCurrentSecret =
        currentSecret === user.internCode ||
        (typeof user.comparePassword === "function"
          ? await user.comparePassword(currentSecret)
          : false);
    } else {
      // If password exists, it must be the current password.
      isValidCurrentSecret =
        typeof user.comparePassword === "function"
          ? await user.comparePassword(currentSecret)
          : user.password
            ? await bcrypt.compare(currentSecret, user.password)
            : false;
    }

    if (!isValidCurrentSecret) {
      return res.status(400).json({
        message: hasPassword
          ? "Incorrect current password"
          : "Invalid intern code",
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.passwordSetAt = new Date();
    await user.save();

    await logAction({
      req,
      actor: req.user,
      action: "PASSWORD_CHANGED",
      targetType: "user",
      targetId: user._id,
      meta: { email: user.email },
    });

    return res.status(200).json({
      message: "Password updated successfully",
      passwordSetAt: user.passwordSetAt,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Internal server error",
      error: err.message,
    });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { mobileNo } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Whitelisted update: Only mobileNo is editable. Ignore every other field in the body.
    const oldMobile = user.mobileNo;
    user.mobileNo = String(mobileNo).trim();
    await user.save();

    await logAction({
      req,
      actor: req.user,
      action: "PROFILE_UPDATED",
      targetType: "user",
      targetId: user._id,
      meta: {
        field: "mobileNo",
        previousMobile: oldMobile ? `${oldMobile.slice(0, 3)}***` : null,
      },
    });

    return res.status(200).json({
      message: "Profile updated successfully",
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        mobileNo: user.mobileNo,
        domain: user.domain,
        internCode: user.internCode,
        hasPassword: !!user.passwordSetAt,
        passwordSetAt: user.passwordSetAt,
      },
    });
  } catch (err) {
    return res.status(500).json({
      message: "Internal server error",
      error: err.message,
    });
  }
};

/**
 * Task M: Proxy chatbot queries to Web Support Chatbot service
 * Authenticated for intern role only; never exposes chatbot keys or raw error stacks.
 */
export const chatWithBot = async (req, res) => {
  const { message } = req.body;
  const chatbotUrl =
    process.env.CHATBOT_API_URL || "http://127.0.0.1:8000/api/chat";

  try {
    // Optionally fetch safe, scoped context for this intern's requests
    let internContext = "";
    const cleanMsg = String(message || "").trim();
    const isGreeting =
      /^(hi|hello|hey|good\s*(morning|afternoon|evening)|greetings)\b/i.test(
        cleanMsg,
      );

    try {
      if (isGreeting) {
        internContext = `[Guideline: User is saying hello. Reply warmly in 1-2 friendly sentences. Do not dump tables, requests, or unasked instructions.]`;
      } else {
        const recentRequests = await CertificateRequest.find({
          userId: req.user.id,
        })
          .select("certificateType status submissionDate createdAt")
          .sort({ createdAt: -1 })
          .limit(4)
          .lean();

        if (recentRequests && recentRequests.length > 0) {
          const summary = recentRequests
            .map((r) => `${r.certificateType.replace(/_/g, " ")} (${r.status})`)
            .join("; ");
          internContext = `[Intern Context: User's requests: ${summary}. Only mention if directly relevant to their question. Keep answers concise, clear, and direct without overwhelming tables.]`;
        }
      }
    } catch {
      // Non-fatal if context lookup fails
    }

    const questionToSend = internContext
      ? `${internContext}\nUser Question: ${cleanMsg}`
      : cleanMsg;

    // Allow sufficient time for AI model inference
    const response = await axios.post(
      chatbotUrl,
      { question: questionToSend },
      {
        headers: { "Content-Type": "application/json" },
        timeout: 60000,
      },
    );

    const answer =
      response.data?.answer ||
      response.data?.response ||
      response.data?.message ||
      "I processed your request, but received an empty response. Please ask again or contact support.";

    return res.status(200).json({ answer });
  } catch (err) {
    // Return polite, friendly fallback message on connection failure or timeout without error stack
    console.warn(
      `[Chatbot Proxy] Service fallback triggered (${chatbotUrl}):`,
      err.message,
    );
    return res.status(200).json({
      answer:
        "The support assistant is currently unreachable. You can check your dashboard for active request statuses or contact support@uptoskill.com if you need immediate assistance.",
    });
  }
};
