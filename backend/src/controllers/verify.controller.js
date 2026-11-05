import Certificate from '../models/Certificate.js';

/**
 * Public Certificate Verification
 * 
 * GET /api/verify/:verifyId
 * 
 * Returns only:
 * - certificateNumber
 * - recipientName
 * - certificateTitle
 * - domain
 * - issuedAt
 * - status ('valid' or 'revoked', plus revokedAt if revoked)
 * 
 * Never returns private information (email, intern code, mobile number, internal IDs).
 * Returns the exact same 404 response shape for unknown, malformed, or unfinalized IDs.
 */
export const verifyCertificate = async (req, res) => {
  const { verifyId } = req.params;

  // Validate verifyId format (alphanumeric and hyphens/underscores, 3-64 chars)
  if (
    !verifyId ||
    typeof verifyId !== 'string' ||
    verifyId.trim().length < 3 ||
    verifyId.trim().length > 64 ||
    !/^[a-zA-Z0-9_-]+$/.test(verifyId.trim())
  ) {
    return res.status(404).json({
      message: 'Certificate not found'
    });
  }

  try {
    const trimmedId = verifyId.trim();
    const lowerId = trimmedId.toLowerCase();

    // Search by verifyId (exact or lowercase hex); fallback to certificateNumber for legacy
    const certificate = await Certificate.findOne({
      $or: [
        { verifyId: trimmedId },
        { verifyId: lowerId },
        { certificateNumber: { $regex: new RegExp(`^${trimmedId}$`, 'i') } }
      ]
    }).lean();

    const isRevoked = Boolean(certificate?.isRevoked || certificate?.status === 'revoked');
    const isFinalized = certificate?.status === 'finalized' || isRevoked;

    // Certificate must exist and either be finalized or revoked
    if (!certificate || !isFinalized) {
      return res.status(404).json({
        message: 'Certificate not found'
      });
    }

    const publicData = {
      certificateNumber: certificate.certificateNumber,
      recipientName: certificate.recipientName || 'Intern',
      certificateTitle: certificate.certificateTitle || 'Certificate',
      domain: certificate.domain || '',
      issuedAt: certificate.issuedAt || certificate.issuedDate || certificate.createdAt,
      status: isRevoked ? 'revoked' : 'valid'
    };

    if (isRevoked && certificate.revokedAt) {
      publicData.revokedAt = certificate.revokedAt;
    }

    return res.status(200).json(publicData);
  } catch (error) {
    console.error('[Verify] Verification error:', error.message);
    return res.status(500).json({
      message: 'Internal server error'
    });
  }
};
