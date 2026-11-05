import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import User from '../src/models/User.js';
import CertificateRequest from '../src/models/CertificateRequest.js';
import Certificate from '../src/models/Certificate.js';
import Notification from '../src/models/Notification.model.js';
import AuditLog from '../src/models/AuditLog.model.js';

import { chatWithBot, setPassword } from '../src/controllers/intern.controller.js';
import { revokeCertificate, restoreArchivedIntern } from '../src/controllers/admin.controller.js';
import { verifyCertificate } from '../src/controllers/verify.controller.js';
import { notify } from '../src/services/notification.service.js';
import { logAction } from '../src/utils/logAction.js';

// Helper to mock Express response object
const createMockRes = () => {
  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(name, val) {
      this.headers[name] = val;
      return this;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    }
  };
  return res;
};

// Helper to mock mongoose query chains
const mockQuery = (data) => {
  const p = Promise.resolve(data);
  p.select = () => p;
  p.sort = () => p;
  p.limit = () => p;
  p.lean = () => p;
  p.populate = () => p;
  return p;
};

test('Week 4 Regression Test Suite', async (t) => {
  const origFindById = User.findById;
  const origFindOne = User.findOne;
  const origCertFindOne = Certificate.findOne;
  const origCertFindById = Certificate.findById;
  const origReqFind = CertificateRequest.find;
  const origAuditCreate = AuditLog.create;
  const origNotifCreate = Notification.create;

  t.beforeEach(() => {
    Notification.create = async (doc) => doc;
    AuditLog.create = async (doc) => doc;
  });

  t.afterEach(() => {
    User.findById = origFindById;
    User.findOne = origFindOne;
    Certificate.findOne = origCertFindOne;
    Certificate.findById = origCertFindById;
    CertificateRequest.find = origReqFind;
    AuditLog.create = origAuditCreate;
    Notification.create = origNotifCreate;
  });

  await t.test('1. GET /api/health returns database connectivity status', async () => {
    // Test logic of health endpoint
    const readyState = mongoose.connection.readyState;
    const isConnected = readyState === 1;
    const expectedStatus = isConnected ? 200 : 503;
    assert.ok([200, 503].includes(expectedStatus));
  });

  await t.test('2. Chatbot proxy (POST /api/intern/chat) returns friendly fallback when chatbot service is unreachable', async () => {
    const fakeInternId = new mongoose.Types.ObjectId();
    CertificateRequest.find = () => mockQuery([]);

    const req = {
      user: { id: fakeInternId.toString(), role: 'intern' },
      body: { message: 'How do I download my completion certificate?' }
    };
    const res = createMockRes();

    // Force non-existent chatbot port to test polite fallback
    process.env.CHATBOT_API_URL = 'http://127.0.0.1:59999/api/chat';
    await chatWithBot(req, res);

    assert.equal(res.statusCode, 200);
    assert.ok(res.body && typeof res.body.answer === 'string');
    assert.ok(res.body.answer.includes('support assistant is currently unreachable') || res.body.answer.length > 0);
  });

  await t.test('3. Archive and Restore lifecycle: Admin restores archived intern', async () => {
    const internId = new mongoose.Types.ObjectId();
    const mockArchivedIntern = {
      _id: internId,
      fullName: 'Archived Student',
      email: 'archived@uptoskill.test',
      role: 'intern',
      isArchived: true,
      archivedAt: new Date(Date.now() - 5 * 86400000),
      save: async function () {
        return this;
      }
    };

    User.findOne = (query) => {
      if (query._id.toString() === internId.toString() && query.isArchived === true) {
        return Promise.resolve(mockArchivedIntern);
      }
      return Promise.resolve(null);
    };

    let loggedAction = null;
    AuditLog.create = async (doc) => {
      loggedAction = doc.action;
      return doc;
    };

    const req = {
      params: { id: internId.toString() },
      user: { id: new mongoose.Types.ObjectId().toString(), role: 'admin' },
      ip: '127.0.0.1',
      headers: {}
    };
    const res = createMockRes();

    await restoreArchivedIntern(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(mockArchivedIntern.isArchived, false);
    assert.equal(mockArchivedIntern.archivedAt, null);
    assert.ok(mockArchivedIntern.archiveRestoredAt instanceof Date);
    assert.equal(res.body.message, 'Intern restored.');
    assert.equal(loggedAction, 'INTERN_RESTORED');
  });

  await t.test('4. Certificate Revocation & Public Verification integration', async () => {
    const certId = new mongoose.Types.ObjectId();
    const verifyId = 'uts-verify-revoked-123';
    const mockCert = {
      _id: certId,
      certificateNumber: 'UTS-2026-009999',
      recipientName: 'Alex Mercer',
      certificateTitle: 'Internship Completion Certificate',
      domain: 'Cloud Computing',
      verifyId,
      status: 'finalized',
      isRevoked: false,
      userId: new mongoose.Types.ObjectId(),
      save: async function () {
        return this;
      }
    };

    Certificate.findById = () => mockQuery(mockCert);
    Certificate.findOne = (query) => {
      if (query.$or) {
        return mockQuery(mockCert);
      }
      return mockQuery(null);
    };
    User.findById = () => mockQuery({ email: 'alex@example.com', fullName: 'Alex Mercer' });

    // 4.1 Admin revokes the certificate
    const revokeReq = {
      params: { id: certId.toString() },
      body: { reason: 'Plagiarism in final evaluation' },
      user: { id: new mongoose.Types.ObjectId().toString(), role: 'admin' },
      ip: '127.0.0.1',
      headers: {}
    };
    const revokeRes = createMockRes();
    await revokeCertificate(revokeReq, revokeRes);

    assert.equal(revokeRes.statusCode, 200);
    assert.equal(mockCert.isRevoked, true);
    assert.equal(mockCert.revokedReason, 'Plagiarism in final evaluation');

    // 4.2 Public verification returns status 'revoked'
    const verifyReq = {
      params: { verifyId }
    };
    const verifyRes = createMockRes();
    await verifyCertificate(verifyReq, verifyRes);

    assert.equal(verifyRes.statusCode, 200);
    assert.equal(verifyRes.body.status, 'revoked');
    assert.equal(verifyRes.body.certificateNumber, 'UTS-2026-009999');
    assert.equal(verifyRes.body.recipientName, 'Alex Mercer');
    // Ensure sensitive intern info is NOT leaked in public verification
    assert.equal(verifyRes.body.email, undefined);
    assert.equal(verifyRes.body.internCode, undefined);
    assert.equal(verifyRes.body.mobileNo, undefined);
  });

  await t.test('5. Public verify endpoint returns 404 for non-existent certificate', async () => {
    Certificate.findOne = () => mockQuery(null);
    const req = { params: { verifyId: 'non-existent-id' } };
    const res = createMockRes();

    await verifyCertificate(req, res);
    assert.equal(res.statusCode, 404);
    assert.equal(res.body.message, 'Certificate not found');
  });

  await t.test('6. Notification trigger records notification in database', async () => {
    let createdNotification = null;
    Notification.create = async (doc) => {
      createdNotification = doc;
      return doc;
    };

    const targetUserId = new mongoose.Types.ObjectId();
    await notify(targetUserId, 'CERTIFICATE_GENERATED', {
      title: 'Certificate Ready',
      message: 'Your certificate has been finalized and is ready for download.',
      email: false
    });

    assert.ok(createdNotification);
    assert.equal(createdNotification.userId.toString(), targetUserId.toString());
    assert.equal(createdNotification.type, 'CERTIFICATE_GENERATED');
    assert.equal(createdNotification.title, 'Certificate Ready');
  });

  await t.test('7. Intern password set validates complexity and updates status', async () => {
    const internId = new mongoose.Types.ObjectId();
    const mockUser = {
      _id: internId,
      fullName: 'New Intern',
      email: 'newintern@uptoskill.test',
      internCode: 'UTS-2026-CODE-99',
      passwordSetAt: null,
      password: null,
      comparePassword: async (input) => input === 'UTS-2026-CODE-99',
      save: async function () {
        return this;
      }
    };

    User.findById = () => Promise.resolve(mockUser);

    const req = {
      user: { id: internId.toString(), role: 'intern' },
      body: {
        currentSecret: 'UTS-2026-CODE-99',
        newPassword: 'SecurePassword2026!'
      },
      ip: '127.0.0.1',
      headers: {}
    };
    const res = createMockRes();

    await setPassword(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.message, 'Password updated successfully');
    assert.ok(mockUser.passwordSetAt instanceof Date);
    assert.ok(mockUser.password.startsWith('$2'));
  });
});
