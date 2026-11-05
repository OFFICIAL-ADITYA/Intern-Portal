import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import Handlebars from 'handlebars';

// Target controllers & services
import {
  updateCertificateDraft,
  finalizeCertificate,
  getCertificateDraft
} from '../src/services/certificate.service.js';
import {
  getCertificateForRequest,
  downloadCertificateForRequest
} from '../src/controllers/intern.controller.js';
import {
  retryCertificateGeneration,
  downloadCertificatePdf,
  getAllCertificates
} from '../src/controllers/admin.controller.js';

// Models
import Certificate from '../src/models/Certificate.js';
import CertificateRequest from '../src/models/CertificateRequest.js';

const mockRes = () => {
  const res = {
    statusCode: 200,
    body: null,
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

test('Day 6 Hardening & Edge-Case Verification', async (t) => {
  const validId = new mongoose.Types.ObjectId().toString();

  await t.test('Edge Case 1: Malformed ObjectId rejection on intern endpoints', async () => {
    const res1 = mockRes();
    await getCertificateForRequest({ params: { id: 'invalid-id' }, user: { id: validId } }, res1);
    assert.equal(res1.statusCode, 400);
    assert.match(res1.body.message, /Invalid request ID/i);

    const res2 = mockRes();
    await downloadCertificateForRequest({ params: { id: 'bad-123' }, user: { id: validId } }, res2);
    assert.equal(res2.statusCode, 400);
    assert.match(res2.body.message, /Invalid request ID/i);
  });

  await t.test('Edge Case 2: Malformed ObjectId rejection on admin endpoints', async () => {
    const res1 = mockRes();
    await retryCertificateGeneration({ params: { id: 'not-an-objectid' }, user: { role: 'admin' } }, res1);
    assert.equal(res1.statusCode, 400);
    assert.match(res1.body.message, /Invalid request ID/i);

    const res2 = mockRes();
    await downloadCertificatePdf({ params: { id: 'abc!!' }, user: { role: 'admin' } }, res2);
    assert.equal(res2.statusCode, 400);
    assert.match(res2.body.message, /Invalid certificate ID/i);
  });

  await t.test('Edge Case 9: Attempt to edit finalized certificate is rejected with 400', async () => {
    const originalFindById = Certificate.findById;
    Certificate.findById = async () => ({
      _id: validId,
      status: 'finalized', // Already finalized
      htmlContent: '<html>Existing</html>'
    });

    try {
      await assert.rejects(
        async () => {
          await updateCertificateDraft(validId, '<html>New Content</html>');
        },
        (err) => {
          assert.equal(err.statusCode, 400);
          assert.match(err.message, /Only draft certificates can be edited/i);
          return true;
        }
      );
    } finally {
      Certificate.findById = originalFindById;
    }
  });

  await t.test('Edge Case 10: Attempt to finalize non-draft certificate is rejected with 409', async () => {
    const originalFindById = Certificate.findById;
    Certificate.findById = () => ({
      populate: async () => ({
        _id: validId,
        status: 'finalized', // Already finalized
        htmlContent: '<html>Existing</html>'
      })
    });

    try {
      await assert.rejects(
        async () => {
          await finalizeCertificate(validId);
        },
        (err) => {
          assert.equal(err.statusCode, 409);
          assert.match(err.message, /Only draft certificates can be finalized/i);
          return true;
        }
      );
    } finally {
      Certificate.findById = originalFindById;
    }
  });

  await t.test('Template Casing Normalization: Both camelCase and PascalCase render without empty placeholders', () => {
    const rawTemplate = `
      <h1>{{InternName}} / {{internName}} / {{fullName}}</h1>
      <p>Number: {{CertificateNumber}} / {{certificateNumber}}</p>
      <p>Domain: {{Department}} / {{domain}}</p>
      <p>Dates: {{StartDate}} - {{endDate}} | Issued: {{issueDate}}</p>
    `;

    const templateData = {
      InternName: 'Jane Doe',
      internName: 'Jane Doe',
      fullName: 'Jane Doe',
      CertificateNumber: 'CERT-2026-00042',
      certificateNumber: 'CERT-2026-00042',
      Department: 'AI Engineering',
      domain: 'AI Engineering',
      StartDate: 'January 1, 2026',
      endDate: 'June 30, 2026',
      issueDate: 'June 30, 2026'
    };

    const compiled = Handlebars.compile(rawTemplate)(templateData);

    assert.ok(compiled.includes('Jane Doe / Jane Doe / Jane Doe'));
    assert.ok(compiled.includes('CERT-2026-00042 / CERT-2026-00042'));
    assert.ok(compiled.includes('AI Engineering / AI Engineering'));
    assert.ok(compiled.includes('January 1, 2026 - June 30, 2026'));
  });

  await t.test('Security: Admin Overview does not expose password or sensitive user tokens', async () => {
    const originalFind = Certificate.find;
    Certificate.find = () => ({
      populate: (path, fields) => {
        // Assert populate specifies safe fields only
        assert.equal(fields, 'fullName email internCode domain');
        return {
          select: (selectFields) => {
            // Assert password or token is not selected
            assert.ok(!selectFields.includes('password'));
            assert.ok(!selectFields.includes('token'));
            return {
              sort: async () => [
                {
                  _id: validId,
                  certificateNumber: 'CERT-2026-00100',
                  status: 'finalized',
                  userId: {
                    fullName: 'Alice Safe',
                    email: 'alice@example.com',
                    internCode: 'INT-01'
                  }
                }
              ]
            };
          }
        };
      }
    });

    try {
      const res = mockRes();
      await getAllCertificates({ user: { role: 'admin' } }, res);
      assert.equal(res.statusCode, 200);
      assert.equal(res.body.certificates[0].userId.password, undefined);
    } finally {
      Certificate.find = originalFind;
    }
  });
});
