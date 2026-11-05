import dotenv from "dotenv";
import { fileURLToPath } from "url";
import nodemailer from "nodemailer";

dotenv.config({
    path: fileURLToPath(new URL("../../.env", import.meta.url)),
    override: true
});

export const sendEmail = async ({ to, subject, html, attachments }) => {
    const { BREVO_SMTP_USER, BREVO_SMTP_KEY, BREVO_SENDER_EMAIL } = process.env;

    if (!BREVO_SMTP_USER || !BREVO_SMTP_KEY) {
        throw new Error("BREVO_SMTP_USER and BREVO_SMTP_KEY must be configured");
    }

    if (!BREVO_SENDER_EMAIL) {
        throw new Error("BREVO_SENDER_EMAIL must be configured with a verified Brevo sender");
    }

    const transporter = nodemailer.createTransport({
        host: "smtp-relay.brevo.com",
        port: 587,
        auth: {
            user: BREVO_SMTP_USER,
            pass: BREVO_SMTP_KEY
        }
    });

    const mailOptions = {
        from: `"UPTOSKILL" <${BREVO_SENDER_EMAIL}>`,
        to,
        subject,
        html
    };

    if (attachments && Array.isArray(attachments) && attachments.length > 0) {
        mailOptions.attachments = attachments;
    }

    return transporter.sendMail(mailOptions);
};