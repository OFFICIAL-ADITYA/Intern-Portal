import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import Certificate from '../src/models/Certificate.js';
import User from '../src/models/User.js';
import Counter from '../src/models/Counter.model.js';
import AuditLog from '../src/models/AuditLog.model.js';
import Notification from '../src/models/Notification.model.js';
import {
  generateVerifyId,
  generateCertificateNumber,
  generateQrCode
} from '../src/services/certificate.service.js';
import { verifyCertificate } from '../src/controllers/verify.controller.js';
import { revokeCertificate, unrevokeCertificate } from '../src/controllers/admin.controller.js';

// Helper mock response object
const mockResponse = () => {
  const res = {};
  res.statusCode = 200;
  res.body = null;
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data) => {
    res.body = data;
    return res;
  };
  return res;
};

test('Task F: Certificate Verification (QR Code) Suite', async (t) => {
  // ============================================================
  // 1. Generators & Schema Identifiers
  // ============================================================
  await t.test('1.1 generateVerifyId generates 12-character unguessable hex string', () => {
    const id1 = generateVerifyId();
    const id2 = generateVerifyId();
    assert.equal(typeof id1, 'string');
    assert.equal(id1.length, 12);
    assert.match(id1, /^[0-9a-f]{12}$/);
    assert.notEqual(id1, id2, 'Verify IDs must be random and unique');
  });

  await t.test('1.2 generateQrCode returns base64 PNG data URI and verification URL', async () => {
    const testVerifyId = 'a1b2c3d4e5f6';
    const { qrCodeDataUrl, verificationUrl } = await generateQrCode(testVerifyId);
    assert.ok(qrCodeDataUrl.startsWith('data:image/png;base64,'), 'QR code must be a base64 PNG data URI');
    assert.ok(verificationUrl.includes(`/verify/${testVerifyId}`), 'Verification URL must link to verifyId');
  });

  await t.test('1.3 generateCertificateNumber formats with atomic Counter UTS-YYYY-XXXXXX', async () => {
    const originalFindOneAndUpdate = Counter.findOneAndUpdate;
    Counter.findOneAndUpdate = async () => ({ seq: 42 });
    try {
      const certNum = await generateCertificateNumber();
      const currentYear = new Date().getFullYear();
      assert.equal(certNum, `UTS-${currentYear}-000042`);
    } finally {
      Counter.findOneAndUpdate = originalFindOneAndUpdate;
    }
  });

  // ============================================================
  // 2. Public Verification Endpoint (GET /api/verify/:verifyId)
  // ============================================================
  await t.test('2.1 Malformed or missing verifyId returns uniform 404 shape', async () => {
    const malformedReq = { params: { verifyId: '$$invalid!!' } };
    const res = mockResponse();
    await verifyCertificate(malformedReq, res);
    assert.equal(res.statusCode, 404);
    assert.deepEqual(res.body, { message: 'Certificate not found' });
  });

  await t.test('2.2 Non-existent verifyId returns uniform 404 shape', async () => {
    const originalFindOne = Certificate.findOne;
    Certificate.findOne = () => ({
      lean: async () => null
    });

    try {
      const req = { params: { verifyId: 'nonexistent12' } };
      const res = mockResponse();
      await verifyCertificate(req, res);
      assert.equal(res.statusCode, 404);
      assert.deepEqual(res.body, { message: 'Certificate not found' });
    } finally {
      Certificate.findOne = originalFindOne;
    }
  });

  await t.test('2.3 Draft certificate is not publicly verified (returns 404)', async () => {
    const originalFindOne = Certificate.findOne;
    Certificate.findOne = () => ({
      lean: async () => ({
        verifyId: 'draftcert123',
        status: 'draft',
        certificateNumber: 'UTS-2026-000001'
      })
    });

    try {
      const req = { params: { verifyId: 'draftcert123' } };
      const res = mockResponse();
      await verifyCertificate(req, res);
      assert.equal(res.statusCode, 404);
      assert.deepEqual(res.body, { message: 'Certificate not found' });
    } finally {
      Certificate.findOne = originalFindOne;
    }
  });

  await t.test('2.4 Finalized valid certificate returns whitelisted fields and leaks no private data', async () => {
    const issuedAt = new Date('2026-06-15T10:00:00Z');
    const originalFindOne = Certificate.findOne;

    Certificate.findOne = () => ({
      lean: async () => ({
        _id: new mongoose.Types.ObjectId(),
        userId: new mongoose.Types.ObjectId(),
        verifyId: 'validxx12345',
        certificateNumber: 'UTS-2026-000123',
        recipientName: 'Alice Johnson',
        certificateTitle: 'Internship Completion Certificate',
        domain: 'Full Stack Web Development',
        issuedAt,
        status: 'finalized',
        isRevoked: false,
        // Sensitive private fields that must NOT leak:
        email: 'alice@secret.com',
        internCode: 'INT-999999',
        mobileNo: '+919999999999',
        pdfPath: 'uploads/certificates/UTS-2026-000123.pdf',
        htmlContent: '<html>...</html>'
      })
    });

    try {
      const req = { params: { verifyId: 'validxx12345' } };
      const res = mockResponse();
      await verifyCertificate(req, res);

      assert.equal(res.statusCode, 200);
      assert.equal(res.body.certificateNumber, 'UTS-2026-000123');
      assert.equal(res.body.recipientName, 'Alice Johnson');
      assert.equal(res.body.certificateTitle, 'Internship Completion Certificate');
      assert.equal(res.body.domain, 'Full Stack Web Development');
      assert.equal(res.body.status, 'valid');
      assert.equal(new Date(res.body.issuedAt).toISOString(), issuedAt.toISOString());

      // Explicit security leak checks:
      assert.equal(res.body.email, undefined, 'Email must never be exposed');
      assert.equal(res.body.internCode, undefined, 'InternCode must never be exposed');
      assert.equal(res.body.mobileNo, undefined, 'Mobile number must never be exposed');
      assert.equal(res.body._id, undefined, 'Database ID must never be exposed');
      assert.equal(res.body.userId, undefined, 'User reference must never be exposed');
      assert.equal(res.body.pdfPath, undefined, 'Internal pdfPath must never be exposed');
      assert.equal(res.body.htmlContent, undefined, 'HTML content must never be exposed');
    } finally {
      Certificate.findOne = originalFindOne;
    }
  });

  await t.test('2.5 Purged/anonymized intern verification still works from snapshot fields', async () => {
    // When Task C purges an intern, user.fullName is anonymized to 'Former Intern ...'.
    // Certificate snapshot fields ensure verification remains genuine and unaffected.
    const originalFindOne = Certificate.findOne;
    Certificate.findOne = () => ({
      lean: async () => ({
        verifyId: 'purgedintern',
        certificateNumber: 'UTS-2026-000789',
        recipientName: 'Bob Genuine Intern',
        certificateTitle: 'On-the-Job Training Certificate',
        domain: 'Data Science',
        issuedAt: new Date('2026-03-01'),
        status: 'finalized',
        isRevoked: false
      })
    });

    try {
      const req = { params: { verifyId: 'purgedintern' } };
      const res = mockResponse();
      await verifyCertificate(req, res);

      assert.equal(res.statusCode, 200);
      assert.equal(res.body.recipientName, 'Bob Genuine Intern');
      assert.equal(res.body.status, 'valid');
    } finally {
      Certificate.findOne = originalFindOne;
    }
  });

  await t.test('2.6 Revoked certificate returns status "revoked" and revokedAt', async () => {
    const revokedAt = new Date('2026-07-20T12:00:00Z');
    const originalFindOne = Certificate.findOne;

    Certificate.findOne = () => ({
      lean: async () => ({
        verifyId: 'revokedcert1',
        certificateNumber: 'UTS-2026-000456',
        recipientName: 'Carol Danvers',
        certificateTitle: 'Experience Certificate',
        domain: 'Cloud Computing',
        issuedAt: new Date('2026-05-01'),
        status: 'finalized',
        isRevoked: true,
        revokedAt
      })
    });

    try {
      const req = { params: { verifyId: 'revokedcert1' } };
      const res = mockResponse();
      await verifyCertificate(req, res);

      assert.equal(res.statusCode, 200);
      assert.equal(res.body.status, 'revoked');
      assert.equal(new Date(res.body.revokedAt).toISOString(), revokedAt.toISOString());
    } finally {
      Certificate.findOne = originalFindOne;
    }
  });

  // ============================================================
  // 3. Admin Revocation Endpoints
  // ============================================================
  await t.test('3.1 PATCH /api/admin/certificates/:id/revoke requires reason', async () => {
    const req = {
      params: { id: new mongoose.Types.ObjectId().toString() },
      body: { reason: '' },
      user: { id: new mongoose.Types.ObjectId().toString(), role: 'admin' }
    };
    const res = mockResponse();
    await revokeCertificate(req, res);
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.message, 'Revocation reason is required');
  });

  await t.test('3.2 PATCH /api/admin/certificates/:id/revoke sets revocation fields, logs action, and notifies intern', async () => {
    const certId = new mongoose.Types.ObjectId();
    const userId = new mongoose.Types.ObjectId();
    const adminId = new mongoose.Types.ObjectId();

    let saved = false;
    const mockCert = {
      _id: certId,
      certificateNumber: 'UTS-2026-000555',
      status: 'finalized',
      isRevoked: false,
      userId: { _id: userId, fullName: 'David Doe', email: 'david@uptoskills.com' },
      save: async () => {
        saved = true;
      }
    };

    const originalFindById = Certificate.findById;
    Certificate.findById = () => ({
      populate: async () => mockCert
    });

    const origUserFindById = User.findById;
    User.findById = () => ({
      select: async () => ({ _id: userId, email: 'david@uptoskills.com', fullName: 'David Doe' })
    });

    let loggedAction = null;
    const origAuditCreate = AuditLog.create;
    AuditLog.create = async (doc) => {
      loggedAction = doc;
      return doc;
    };

    let notificationSent = null;
    const origNotifCreate = Notification.create;
    Notification.create = async (doc) => {
      notificationSent = doc;
      return doc;
    };

    try {
      const req = {
        params: { id: certId.toString() },
        body: { reason: 'Academic integrity policy violation' },
        user: { id: adminId.toString(), role: 'admin', email: 'admin@uptoskills.com' }
      };
      const res = mockResponse();

      await revokeCertificate(req, res);

      assert.equal(res.statusCode, 200);
      assert.equal(res.body.message, 'Certificate revoked successfully');
      assert.equal(mockCert.isRevoked, true);
      assert.equal(mockCert.revokedReason, 'Academic integrity policy violation');
      assert.ok(mockCert.revokedAt instanceof Date);
      assert.ok(saved, 'Certificate must be persisted');

      // Audit log check:
      assert.ok(loggedAction, 'Audit log entry must be created');
      assert.equal(loggedAction.action, 'CERTIFICATE_REVOKED');
      assert.equal(loggedAction.meta.certificateNumber, 'UTS-2026-000555');

      // Notification check:
      assert.ok(notificationSent, 'Notification must be sent to intern');
      assert.equal(notificationSent.type, 'CERTIFICATE_REVOKED');
      assert.equal(notificationSent.userId.toString(), userId.toString());
    } finally {
      Certificate.findById = originalFindById;
      User.findById = origUserFindById;
      AuditLog.create = origAuditCreate;
      Notification.create = origNotifCreate;
    }
  });

  await t.test('3.3 PATCH /api/admin/certificates/:id/unrevoke restores certificate and logs action', async () => {
    const certId = new mongoose.Types.ObjectId();
    const adminId = new mongoose.Types.ObjectId();

    let saved = false;
    const mockCert = {
      _id: certId,
      certificateNumber: 'UTS-2026-000555',
      status: 'finalized',
      isRevoked: true,
      revokedAt: new Date(),
      revokedReason: 'Mistaken revocation',
      userId: { _id: new mongoose.Types.ObjectId() },
      save: async () => {
        saved = true;
      }
    };

    const originalFindById = Certificate.findById;
    Certificate.findById = () => ({
      populate: async () => mockCert
    });

    let loggedAction = null;
    const origAuditCreate = AuditLog.create;
    AuditLog.create = async (doc) => {
      loggedAction = doc;
      return doc;
    };

    try {
      const req = {
        params: { id: certId.toString() },
        user: { id: adminId.toString(), role: 'admin' }
      };
      const res = mockResponse();

      await unrevokeCertificate(req, res);

      assert.equal(res.statusCode, 200);
      assert.equal(res.body.message, 'Certificate unrevoked successfully');
      assert.equal(mockCert.isRevoked, false);
      assert.equal(mockCert.revokedAt, null);
      assert.equal(mockCert.revokedReason, null);
      assert.ok(saved);

      assert.ok(loggedAction);
      assert.equal(loggedAction.action, 'CERTIFICATE_UNREVOKED');
    } finally {
      Certificate.findById = originalFindById;
      AuditLog.create = origAuditCreate;
    }
  });
});
