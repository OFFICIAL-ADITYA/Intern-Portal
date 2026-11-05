import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Target controllers & middlewares
import {
  getCertificateForRequest,
  downloadCertificateForRequest
} from '../src/controllers/intern.controller.js';
import {
  getAllCertificates,
  retryCertificateGeneration,
  downloadCertificatePdf
} from '../src/controllers/admin.controller.js';
import requireAdmin from '../src/middlewares/requireAdmin.js';

// Models
import CertificateRequest from '../src/models/CertificateRequest.js';
import Certificate from '../src/models/Certificate.js';
import User from '../src/models/User.js';

const mockRes = () => {
  const res = {
    statusCode: 200,
    body: null,
    downloadPath: null,
    downloadFileName: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
    download(filePath, fileName) {
      this.downloadPath = filePath;
      this.downloadFileName = fileName;
      return this;
    }
  };
  return res;
};

test('Day 5 Test Cases A - J', async (t) => {
  const internId1 = new mongoose.Types.ObjectId().toString();
  const internId2 = new mongoose.Types.ObjectId().toString();
  const validReqId = new mongoose.Types.ObjectId().toString();
  const validCertId = new mongoose.Types.ObjectId().toString();

  await t.test('CASE A: Intern requests another intern\'s certificate -> 403 Access denied', async () => {
    // Stub findById to return request owned by internId2
    const originalFindById = CertificateRequest.findById;
    CertificateRequest.findById = async () => ({
      _id: validReqId,
      userId: internId2, // Owned by intern 2
      certificateId: validCertId,
      status: 'completed'
    });

    try {
      const req = {
        params: { id: validReqId },
        user: { id: internId1, role: 'intern' } // Caller is intern 1
      };
      const res = mockRes();

      await getCertificateForRequest(req, res);

      assert.equal(res.statusCode, 403);
      assert.match(res.body.message, /Access denied/i);
    } finally {
      CertificateRequest.findById = originalFindById;
    }
  });

  await t.test('CASE B: Intern requests certificate for request with no certificate -> 404', async () => {
    const originalFindById = CertificateRequest.findById;
    CertificateRequest.findById = async () => ({
      _id: validReqId,
      userId: internId1,
      certificateId: null, // No certificate linked
      status: 'processing'
    });

    try {
      const req = {
        params: { id: validReqId },
        user: { id: internId1, role: 'intern' }
      };
      const res = mockRes();

      await getCertificateForRequest(req, res);

      assert.equal(res.statusCode, 404);
      assert.match(res.body.message, /No certificate/i);
    } finally {
      CertificateRequest.findById = originalFindById;
    }
  });

  await t.test('CASE C: Intern requests a draft certificate -> 400 Draft NOT exposed', async () => {
    const originalReqFind = CertificateRequest.findById;
    const originalCertFind = Certificate.findById;

    CertificateRequest.findById = async () => ({
      _id: validReqId,
      userId: internId1,
      certificateId: validCertId,
      status: 'processing' // Not completed
    });

    Certificate.findById = async () => ({
      _id: validCertId,
      userId: internId1,
      status: 'draft', // Certificate is still in draft mode
      certificateNumber: 'CERT-2026-0001'
    });

    try {
      const req = {
        params: { id: validReqId },
        user: { id: internId1, role: 'intern' }
      };
      const res = mockRes();

      await getCertificateForRequest(req, res);

      assert.equal(res.statusCode, 400);
      assert.match(res.body.message, /not finalized/i);
      assert.equal(res.body.certificate, undefined);
    } finally {
      CertificateRequest.findById = originalReqFind;
      Certificate.findById = originalCertFind;
    }
  });

  await t.test('CASE D: Intern requests a finalized certificate -> 200 metadata returned', async () => {
    const originalReqFind = CertificateRequest.findById;
    const originalCertFind = Certificate.findById;

    CertificateRequest.findById = async () => ({
      _id: validReqId,
      userId: internId1,
      certificateId: validCertId,
      status: 'completed'
    });

    Certificate.findById = async () => ({
      _id: validCertId,
      userId: internId1,
      status: 'finalized',
      certificateNumber: 'CERT-2026-00099',
      certificateType: 'completion_certificate',
      domain: 'Full Stack',
      issuedDate: new Date(),
      verificationCode: 'VER-123456',
      pdfPath: 'uploads/certificates/CERT-2026-00099.pdf'
    });

    try {
      const req = {
        params: { id: validReqId },
        user: { id: internId1, role: 'intern' }
      };
      const res = mockRes();

      await getCertificateForRequest(req, res);

      assert.equal(res.statusCode, 200);
      assert.equal(res.body.certificate.certificateNumber, 'CERT-2026-00099');
      assert.equal(res.body.certificate.status, 'finalized');
      assert.equal(res.body.certificate.hasPdf, true);
      assert.match(res.body.certificate.downloadUrl, /\/download/);
    } finally {
      CertificateRequest.findById = originalReqFind;
      Certificate.findById = originalCertFind;
    }
  });

  await t.test('CASE E: Admin requests all certificates -> 200 overview data returned', async () => {
    const originalFind = Certificate.find;
    Certificate.find = () => ({
      populate: () => ({
        select: () => ({
          sort: async () => [
            {
              _id: validCertId,
              certificateNumber: 'CERT-2026-00001',
              certificateType: 'offer_letter',
              status: 'finalized',
              pdfPath: 'uploads/certificates/CERT-2026-00001.pdf',
              userId: {
                fullName: 'Test Intern',
                email: 'intern@uptoskills.com',
                internCode: 'UPS-101'
              }
            }
          ]
        })
      })
    });

    try {
      const req = { user: { role: 'admin' } };
      const res = mockRes();

      await getAllCertificates(req, res);

      assert.equal(res.statusCode, 200);
      assert.equal(Array.isArray(res.body.certificates), true);
      assert.equal(res.body.certificates.length, 1);
      assert.equal(res.body.certificates[0].certificateNumber, 'CERT-2026-00001');
    } finally {
      Certificate.find = originalFind;
    }
  });

  await t.test('CASE F: Non-admin attempts GET /api/admin/certificates -> 403 Forbidden', async () => {
    const originalUserFind = User.findById;
    User.findById = () => ({
      select: async () => ({ role: 'intern' }) // User is an intern, not admin
    });

    try {
      const req = { user: { id: internId1 } };
      const res = mockRes();
      let nextCalled = false;

      await requireAdmin(req, res, () => {
        nextCalled = true;
      });

      assert.equal(res.statusCode, 403);
      assert.match(res.body.message, /Admin access required/i);
      assert.equal(nextCalled, false);
    } finally {
      User.findById = originalUserFind;
    }
  });

  await t.test('CASE G: Admin retries approved request with no certificate -> 200 Draft generated', async () => {
    const originalReqFind = CertificateRequest.findById;
    const originalTemplateFindOne = (await import('../src/models/CertificateTemplate.js')).default.findOne;
    const originalCertCreate = Certificate.create;
    const originalCertCount = Certificate.countDocuments;
    const originalCertExists = Certificate.exists;

    const mockRequest = {
      _id: validReqId,
      status: 'approved',
      certificateId: null,
      certificateType: 'completion_certificate',
      reviewedBy: new mongoose.Types.ObjectId(),
      userId: {
        _id: internId1,
        fullName: 'Intern A',
        internCode: 'UPS-2026-001',
        domain: 'Web Development',
        startDate: new Date(),
        endDate: new Date()
      },
      save: async function() { return this; }
    };

    CertificateRequest.findById = () => ({
      populate: async () => mockRequest
    });

    const CertificateTemplate = (await import('../src/models/CertificateTemplate.js')).default;
    CertificateTemplate.findOne = async () => ({
      _id: new mongoose.Types.ObjectId(),
      certificateType: 'completion_certificate',
      status: 'active',
      content: '<h1>Certificate for {{InternName}} - {{CertificateNumber}}</h1>'
    });

    Certificate.countDocuments = async () => 0;
    Certificate.exists = async () => false;
    Certificate.create = async (data) => ({
      ...data,
      _id: validCertId
    });

    try {
      const req = { params: { id: validReqId }, user: { role: 'admin' } };
      const res = mockRes();

      await retryCertificateGeneration(req, res);

      assert.equal(res.statusCode, 200);
      assert.equal(res.body.certificate._id, validCertId);
      assert.match(res.body.message, /generated successfully/i);
    } finally {
      CertificateRequest.findById = originalReqFind;
      CertificateTemplate.findOne = originalTemplateFindOne;
      Certificate.create = originalCertCreate;
      Certificate.countDocuments = originalCertCount;
      Certificate.exists = originalCertExists;
    }
  });

  await t.test('CASE H: Admin retries request that already has certificateId -> 409 Duplicate prevented', async () => {
    const originalReqFind = CertificateRequest.findById;
    const originalCertFind = Certificate.findById;

    CertificateRequest.findById = () => ({
      populate: async () => ({
        _id: validReqId,
        status: 'approved',
        certificateId: validCertId
      })
    });

    Certificate.findById = async () => ({
      _id: validCertId,
      certificateNumber: 'CERT-2026-00002',
      status: 'draft'
    });

    try {
      const req = { params: { id: validReqId }, user: { role: 'admin' } };
      const res = mockRes();

      await retryCertificateGeneration(req, res);

      assert.equal(res.statusCode, 409);
      assert.match(res.body.message, /already linked|already exists/i);
    } finally {
      CertificateRequest.findById = originalReqFind;
      Certificate.findById = originalCertFind;
    }
  });

  await t.test('CASE I: Admin retries rejected/ineligible request -> 400 Bad Request', async () => {
    const originalReqFind = CertificateRequest.findById;

    CertificateRequest.findById = () => ({
      populate: async () => ({
        _id: validReqId,
        status: 'rejected', // Ineligible
        certificateId: null
      })
    });

    try {
      const req = { params: { id: validReqId }, user: { role: 'admin' } };
      const res = mockRes();

      await retryCertificateGeneration(req, res);

      assert.equal(res.statusCode, 400);
      assert.match(res.body.message, /not eligible/i);
    } finally {
      CertificateRequest.findById = originalReqFind;
    }
  });

  await t.test('CASE J: Certificate PDF does not exist at persisted location -> 404 Controlled Error', async () => {
    const originalReqFind = CertificateRequest.findById;
    const originalCertFind = Certificate.findById;

    CertificateRequest.findById = async () => ({
      _id: validReqId,
      userId: internId1,
      certificateId: validCertId,
      status: 'completed'
    });

    Certificate.findById = async () => ({
      _id: validCertId,
      userId: internId1,
      status: 'finalized',
      certificateNumber: 'CERT-MISSING-001',
      pdfPath: 'uploads/certificates/non_existent_file_12345.pdf' // Missing file
    });

    try {
      const req = {
        params: { id: validReqId },
        user: { id: internId1, role: 'intern' }
      };
      const res = mockRes();

      await downloadCertificateForRequest(req, res);

      assert.equal(res.statusCode, 404);
      assert.match(res.body.message, /unavailable/i);
    } finally {
      CertificateRequest.findById = originalReqFind;
      Certificate.findById = originalCertFind;
    }
  });
});
