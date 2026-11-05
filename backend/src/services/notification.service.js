import Notification from '../models/Notification.model.js';
import User from '../models/User.js';
import { sendEmail } from '../utils/sendEmail.js';

/**
 * Sends in-app and optional email notifications.
 *
 * @param {string|import('mongoose').Types.ObjectId} userId - Recipient user ID
 * @param {string} type - Notification event type
 * @param {Object} options
 * @param {string} options.title - Notification title
 * @param {string} options.message - Notification message content
 * @param {string|import('mongoose').Types.ObjectId} [options.requestId] - Linked certificate request ID
 * @param {boolean} [options.email=false] - Whether to also send an email
 * @returns {Promise<Object>} Created notification document
 */
export const notify = async (userId, type, { title, message, requestId = null, email = false } = {}) => {
  try {
    // 1. Save in-app notification
    const notification = await Notification.create({
      userId,
      type,
      title,
      message,
      requestId: requestId || null,
      isRead: false,
      readAt: null
    });

    // 2. Send email notification if requested
    if (email) {
      try {
        const recipient = await User.findById(userId).select('email fullName');
        if (recipient && recipient.email) {
          const recipientName = recipient.fullName || 'User';
          const html = `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 20px; }
                .card { max-width: 560px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
                .header { background: #0f172a; padding: 20px 24px; color: #ffffff; }
                .header h1 { margin: 0; font-size: 18px; font-weight: 700; letter-spacing: -0.01em; }
                .content { padding: 24px; }
                .title { font-size: 16px; font-weight: 600; color: #0f172a; margin-top: 0; margin-bottom: 12px; }
                .message { font-size: 14px; line-height: 1.6; color: #334155; margin-bottom: 24px; }
                .footer { padding: 16px 24px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; text-align: center; }
              </style>
            </head>
            <body>
              <div class="card">
                <div class="header">
                  <h1>UPTOSKILL Intern Portal</h1>
                </div>
                <div class="content">
                  <h2 class="title">${title}</h2>
                  <p class="message">Hello <strong>${recipientName}</strong>,<br><br>${message}</p>
                </div>
                <div class="footer">
                  This is an automated notification. Please do not reply directly to this email.
                </div>
              </div>
            </body>
            </html>
          `;

          await sendEmail({
            to: recipient.email,
            subject: `[UPTOSKILL] ${title}`,
            html
          });
        } else {
          console.warn(`[NotificationService] Cannot send email: User ${userId} has no email address`);
        }
      } catch (mailError) {
        // Email failure must never fail the request
        console.error(`[NotificationService] Email delivery failed for user ${userId}:`, mailError.message);
      }
    }

    return notification;
  } catch (error) {
    console.error(`[NotificationService] Failed to create notification for user ${userId}:`, error.message);
    return null;
  }
};

export default { notify };
