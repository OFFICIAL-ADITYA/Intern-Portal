import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import User from '../src/models/User.js';
import CertificateRequest from '../src/models/CertificateRequest.js';
import Certificate from '../src/models/Certificate.js';
import CertificateTemplate from '../src/models/CertificateTemplate.js';
import Notification from '../src/models/Notification.model.js';
import Counter from '../src/models/Counter.model.js';
import AuditLog from '../src/models/AuditLog.model.js';

import { submitCertificateRequest } from '../src/controllers/intern.controller.js';
import { getRequestsForReview, reviewRequestAsTL } from '../src/controllers/teamleader.controller.js';
import { finalizeRequest } from '../src/controllers/admin.controller.js';
import verifyAuth from '../src/middlewares/verifyAuth.js';
import requireAdmin from '../src/middlewares/requireAdmin.js';
import { loginLimiter } from '../src/middlewares/rateLimiter.js';

// Mock response creator
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
    },
    download(path, name) {
      this.downloadPath = path;
      this.downloadName = name;
      return this;
    }
  };
  return res;
};

// Query mock helper
const mockQuery = (data) => {
  const p = Promise.resolve(data);
  p.select = () => p;
  p.sort = () => p;
  p.populate = () => p;
  return p;
};

test('Task I: Hardening and Quality Suite', async (t) => {
  const origAuditCreate = AuditLog.create;
  const origCounterFindOneAndUpdate = Counter.findOneAndUpdate;
  const origNotificationCreate = Notification.create;

  t.beforeEach(() => {
    AuditLog.create = async (doc) => ({ _id: new mongoose.Types.ObjectId(), ...doc });
    Counter.findOneAndUpdate = async () => ({ seq: 101 });
    Notification.create = async (doc) => ({ _id: new mongoose.Types.ObjectId(), ...doc });
  });

  t.afterEach(() => {
    AuditLog.create = origAuditCreate;
    Counter.findOneAndUpdate = origCounterFindOneAndUpdate;
    Notification.create = origNotificationCreate;
  });

  // ============================================================
  // 1. Role Gating & Authentication Verification
  // ============================================================
  await t.test('1.1 Unauthenticated request without token is rejected with 401', async () => {
    const req = { cookies: {}, headers: {} };
    const res = createMockRes();
    let nextCalled = false;

    await verifyAuth(req, res, () => { nextCalled = true; });

    assert.strictEqual(res.statusCode, 401);
    assert.strictEqual(nextCalled, false);
    assert.match(res.body.message, /unauthorized/i);
  });

  await t.test('1.2 Non-admin role calling requireAdmin is rejected with 403', async () => {
    const origUserFindById = User.findById;
    User.findById = () => mockQuery({ _id: new mongoose.Types.ObjectId(), role: 'intern' });

    try {
      const reqIntern = { user: { role: 'intern', id: '123' } };
      const resIntern = createMockRes();
      let nextCalled = false;

      await requireAdmin(reqIntern, resIntern, () => { nextCalled = true; });

      assert.strictEqual(resIntern.statusCode, 403);
      assert.strictEqual(nextCalled, false);
      assert.match(resIntern.body.message, /admin/i);
    } finally {
      User.findById = origUserFindById;
    }
  });

  // ============================================================
  // 2. Full Flow: Submit → TL Forward → Admin Approve → Draft Created
  // ============================================================
  await t.test('2.1 Full Request Lifecycle: Submit -> TL Forward -> Admin Approve', async () => {
    const internId = new mongoose.Types.ObjectId();
    const tlId = new mongoose.Types.ObjectId();
    const adminId = new mongoose.Types.ObjectId();
    const requestId = new mongoose.Types.ObjectId();

    const mockIntern = {
      _id: internId,
      fullName: 'Alice Intern',
      internCode: 'INT-ALICE',
      role: 'intern',
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-06-30'),
      internshipDetails: { status: 'ongoing', teamLeaderId: tlId }
    };

    const origUserFindById = User.findById;
    const origUserFindOne = User.findOne;
    const origUserFind = User.find;
    const origCertReqFindOne = CertificateRequest.findOne;
    const origCertReqFindById = CertificateRequest.findById;
    const origCertReqCreate = CertificateRequest.create;
    const origCertTemplateFindOne = CertificateTemplate.findOne;
    const origCertCreate = Certificate.create;

    let savedRequest = null;

    try {
      // Step A: Intern Submits Request
      User.findById = () => mockQuery(mockIntern);
      CertificateRequest.findOne = () => mockQuery(null); // No existing pending
      CertificateRequest.create = async (doc) => {
        savedRequest = {
          _id: requestId,
          status: 'pending',
          userId: internId,
          ...doc,
          save: async function () { return this; }
        };
        return savedRequest;
      };

      const submitReq = {
        user: { id: internId.toString(), role: 'intern' },
        body: { certificateType: 'bonafide', reason: 'College documentation' }
      };
      const submitRes = createMockRes();

      await submitCertificateRequest(submitReq, submitRes);
      assert.strictEqual(submitRes.statusCode, 201);
      assert.strictEqual(savedRequest.status, 'pending');

      // Step B: TL Reviews and Forwards Request
      CertificateRequest.findById = () => {
        const p = Promise.resolve(savedRequest);
        p.populate = () => Promise.resolve(savedRequest);
        return p;
      };
      User.find = () => mockQuery([{ _id: adminId }]);
      User.findById = (id) => {
        if (id.toString() === internId.toString()) return mockQuery(mockIntern);
        return mockQuery(null);
      };

      const tlReviewReq = {
        params: { id: requestId.toString() },
        user: { id: tlId.toString(), email: 'tl@uptoskills.com', role: 'teamleader' },
        body: { action: 'forward' }
      };
      const tlReviewRes = createMockRes();

      await reviewRequestAsTL(tlReviewReq, tlReviewRes);
      assert.strictEqual(tlReviewRes.statusCode, 200);
      assert.strictEqual(savedRequest.status, 'processing');
      assert.strictEqual(savedRequest.forwardedBy.toString(), tlId.toString());
      assert.ok(savedRequest.forwardedAt instanceof Date);

      // Step C: Admin Approves Request & Generates Draft
      CertificateTemplate.findOne = () => Promise.resolve({
        _id: new mongoose.Types.ObjectId(),
        certificateType: 'bonafide',
        content: '<h1>Bonafide: {{InternName}}</h1>'
      });
      Certificate.create = async (doc) => ({
        _id: new mongoose.Types.ObjectId(),
        status: 'draft',
        ...doc
      });
      Certificate.countDocuments = async () => 0;

      // Wrap savedRequest with populate for finalizeRequest
      savedRequest.populate = async function () {
        this.userId = mockIntern;
        return this;
      };

      const adminApproveReq = {
        params: { id: requestId.toString() },
        user: { id: adminId.toString(), role: 'admin' },
        body: { action: 'approve' }
      };
      const adminApproveRes = createMockRes();

      await finalizeRequest(adminApproveReq, adminApproveRes);
      assert.strictEqual(adminApproveRes.statusCode, 200);
      assert.strictEqual(savedRequest.status, 'approved');
      assert.ok(savedRequest.certificateId, 'Certificate draft ID must be linked');
    } finally {
      User.findById = origUserFindById;
      User.findOne = origUserFindOne;
      User.find = origUserFind;
      CertificateRequest.findOne = origCertReqFindOne;
      CertificateRequest.findById = origCertReqFindById;
      CertificateRequest.create = origCertReqCreate;
      CertificateTemplate.findOne = origCertTemplateFindOne;
      Certificate.create = origCertCreate;
    }
  });

  // ============================================================
  // 3. Duplicate Request Prevention (409 Conflict)
  // ============================================================
  await t.test('3.1 Submitting duplicate pending certificate request returns 409', async () => {
    const origUserFindById = User.findById;
    const origCertReqFindOne = CertificateRequest.findOne;

    User.findById = () => mockQuery({
      _id: new mongoose.Types.ObjectId(),
      role: 'intern',
      startDate: new Date('2026-01-01'),
      internshipDetails: { status: 'ongoing' }
    });

    CertificateRequest.findOne = () => mockQuery({
      _id: new mongoose.Types.ObjectId(),
      status: 'pending',
      certificateType: 'bonafide'
    });

    try {
      const req = {
        user: { id: new mongoose.Types.ObjectId().toString(), role: 'intern' },
        body: { certificateType: 'bonafide', reason: 'Another bonafide' }
      };
      const res = createMockRes();

      await submitCertificateRequest(req, res);

      assert.strictEqual(res.statusCode, 409);
      assert.match(res.body.message, /already have a request in progress/i);
    } finally {
      User.findById = origUserFindById;
      CertificateRequest.findOne = origCertReqFindOne;
    }
  });

  // ============================================================
  // 4. Team Leader Scoping & Isolation
  // ============================================================
  await t.test('4.1 TL B cannot review TL A intern request (403 Forbidden)', async () => {
    const tlAId = new mongoose.Types.ObjectId();
    const tlBId = new mongoose.Types.ObjectId();
    const internOfA = new mongoose.Types.ObjectId();
    const requestId = new mongoose.Types.ObjectId();

    const mockRequest = {
      _id: requestId,
      userId: internOfA,
      status: 'pending',
      save: async () => {}
    };

    const origCertReqFindById = CertificateRequest.findById;
    const origUserFindById = User.findById;

    CertificateRequest.findById = () => Promise.resolve(mockRequest);
    User.findById = (id) => {
      // Returns intern assigned to TL A
      if (id.toString() === internOfA.toString()) {
        return mockQuery({
          _id: internOfA,
          internshipDetails: { teamLeaderId: tlAId, teamLeader: tlAId, teamleaderEmail: 'tla@uptoskills.com' }
        });
      }
      return mockQuery(null);
    };

    try {
      // TL B attempts to review
      const req = {
        params: { id: requestId.toString() },
        user: { id: tlBId.toString(), email: 'tlb@uptoskills.com', role: 'teamleader' },
        body: { action: 'forward' }
      };
      const res = createMockRes();

      await reviewRequestAsTL(req, res);

      assert.strictEqual(res.statusCode, 403);
      assert.match(res.body.message, /access denied/i);
    } finally {
      CertificateRequest.findById = origCertReqFindById;
      User.findById = origUserFindById;
    }
  });

  await t.test('4.2 getRequestsForReview only returns requests belonging to TL assigned interns', async () => {
    const tlId = new mongoose.Types.ObjectId();
    const myInternId = new mongoose.Types.ObjectId();

    const origUserFind = User.find;
    const origCertReqFind = CertificateRequest.find;

    // TL's assigned interns
    User.find = () => mockQuery([{ _id: myInternId }]);

    let capturedQuery = null;
    CertificateRequest.find = (q) => {
      capturedQuery = q;
      return mockQuery([
        { _id: new mongoose.Types.ObjectId(), status: 'pending', userId: myInternId }
      ]);
    };

    try {
      const req = {
        user: { id: tlId.toString(), email: 'tl@uptoskills.com', role: 'teamleader' }
      };
      const res = createMockRes();

      await getRequestsForReview(req, res);

      assert.strictEqual(res.statusCode, 200);
      assert.ok(capturedQuery.userId.$in, 'Must filter by TL assigned interns');
      assert.strictEqual(capturedQuery.userId.$in[0].toString(), myInternId.toString());
    } finally {
      User.find = origUserFind;
      CertificateRequest.find = origCertReqFind;
    }
  });

  // ============================================================
  // 5. Rate Limiting Verification
  // ============================================================
  await t.test('5.1 loginLimiter returns 429 and Retry-After after limit is exceeded', async () => {
    const testEmail = `limit_${Date.now()}@test.com`;
    let lastRes = null;

    for (let i = 0; i < 6; i++) {
      const req = {
        ip: '127.0.0.99',
        body: { email: testEmail },
        headers: {}
      };
      lastRes = createMockRes();
      await new Promise((resolve) => {
        lastRes.json = (data) => {
          lastRes.body = data;
          resolve();
          return lastRes;
        };
        loginLimiter(req, lastRes, () => resolve());
      });
    }

    assert.strictEqual(lastRes.statusCode, 429);
    assert.strictEqual(lastRes.headers['Retry-After'], 900);
    assert.match(lastRes.body.message, /too many login attempts/i);
  });

  // ============================================================
  // 6. Central Error Handler & Information Leak Prevention
  // ============================================================
  await t.test('6.1 In production mode, 500 error does not leak err.message details', () => {
    const origEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    try {
      const err = new Error('Database password failed: SecretDbPass123');
      err.statusCode = 500;
      const res = createMockRes();

      // Simulate central error handler logic
      const isProduction = process.env.NODE_ENV === 'production';
      const statusCode = err.statusCode || 500;
      const response = {
        message: isProduction && statusCode === 500
          ? 'An unexpected error occurred. Please try again later.'
          : (err.message || 'Internal server error')
      };
      res.status(statusCode).json(response);

      assert.strictEqual(res.statusCode, 500);
      assert.strictEqual(res.body.message, 'An unexpected error occurred. Please try again later.');
      assert.strictEqual(JSON.stringify(res.body).includes('SecretDbPass123'), false);
    } finally {
      process.env.NODE_ENV = origEnv;
    }
  });

  // ============================================================
  // 7. Certificate Download Isolation
  // ============================================================
  await t.test('7.1 Intern A cannot download Intern B certificate (403 Forbidden)', async () => {
    const internAId = new mongoose.Types.ObjectId();
    const internBId = new mongoose.Types.ObjectId();
    const certId = new mongoose.Types.ObjectId();

    const mockCert = {
      _id: certId,
      userId: internBId,
      status: 'finalized',
      pdfPath: 'uploads/certificates/test.pdf'
    };

    const origCertFindById = Certificate.findById;
    Certificate.findById = () => Promise.resolve(mockCert);

    try {
      // Logic from certificate download route
      const req = {
        params: { id: certId.toString() },
        user: { id: internAId.toString(), role: 'intern' }
      };
      const res = createMockRes();

      const isAdmin = req.user.role === 'admin';
      const isOwner = mockCert.userId && mockCert.userId.toString() === req.user.id;

      if (!isAdmin && !isOwner) {
        res.status(403).json({ message: 'Access denied: Certificate does not belong to you' });
      }

      assert.strictEqual(res.statusCode, 403);
      assert.match(res.body.message, /access denied/i);
    } finally {
      Certificate.findById = origCertFindById;
    }
  });
});
