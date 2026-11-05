import AuditLog from '../models/AuditLog.js';

export async function logAudit({ userId, action, entityType, entityId, description, req }) {
  try {
    const ipAddress = req?.ip || req?.headers?.['x-forwarded-for'] || req?.socket?.remoteAddress || '';
    const userAgent = req?.headers?.['user-agent'] || '';

    await AuditLog.create({
      userId,
      action,
      entityType,
      entityId,
      description: typeof description === 'object' ? JSON.stringify(description) : String(description || ''),
      ipAddress: String(ipAddress).slice(0, 100),
      userAgent: String(userAgent).slice(0, 255)
    });
  } catch (err) {
    // Non-blocking log failure
    console.error('Audit log failure:', err.message);
  }
}

export default logAudit;
