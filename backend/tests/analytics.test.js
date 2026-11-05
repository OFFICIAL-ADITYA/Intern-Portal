import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import XLSX from 'xlsx';
import { validationResult } from 'express-validator';
import { analyticsQueryValidator } from '../src/validators/adminAnalytics.validator.js';
import { getRequestsTrend, getTurnaroundStats } from '../src/services/adminAnalytics.service.js';
import {
  getOverview,
  getTrend,
  getTypes,
  getTurnaround,
  getTeamLeaders,
  getDomains,
  getPipeline,
  getUpcoming,
  getStuck,
  exportAnalyticsCSV,
  buildAnalyticsCacheKey
} from '../src/controllers/adminAnalytics.controller.js';
import app from '../src/app.js';

// Models
import User from '../src/models/User.js';
import CertificateRequest from '../src/models/CertificateRequest.js';
import Certificate from '../src/models/Certificate.js';
import AuditLog from '../src/models/AuditLog.js';

const mockRes = () => {
  const res = {
    statusCode: 200,
    body: null,
    headers: {},
    sentContent: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
    setHeader(key, val) {
      this.headers[key] = val;
    },
    send(content) {
      this.sentContent = content;
      return this;
    }
  };
  return res;
};

test('Admin Analytics Controller Tests', async (t) => {
  const adminId = new mongoose.Types.ObjectId().toString();

  await t.test('analytics cache keys separate date, domain, Team Leader, and grouping filters', () => {
    const base = { range: '30d', from: '2026-09-01', to: '2026-09-30', groupBy: 'day', domain: 'Data Science', teamLeader: adminId };
    const key = buildAnalyticsCacheKey('trend', base);
    assert.notEqual(key, buildAnalyticsCacheKey('trend', { ...base, domain: 'Web Development' }));
    assert.notEqual(key, buildAnalyticsCacheKey('trend', { ...base, teamLeader: new mongoose.Types.ObjectId().toString() }));
    assert.notEqual(key, buildAnalyticsCacheKey('trend', { ...base, from: '2026-08-01' }));
    assert.notEqual(key, buildAnalyticsCacheKey('trend', { ...base, groupBy: 'week' }));
  });

  await t.test('analytics routes reject requests without authentication', async () => {
    const server = await new Promise((resolve) => {
      const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
    });
    try {
      const { port } = server.address();
      const response = await fetch(`http://127.0.0.1:${port}/api/admin/analytics/overview`);
      assert.equal(response.status, 401);
    } finally {
      await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
  });

  await t.test('GET /overview should return KPI metrics shape', async () => {
    // Stub Mongo queries
    const origUserCount = User.countDocuments;
    const origCertReqCount = CertificateRequest.countDocuments;
    const origCertCount = Certificate.countDocuments;
    const origCertReqFind = CertificateRequest.find;
    const origUserFind = User.find;
    const origUserDistinct = User.distinct;

    User.countDocuments = async () => 10;
    User.distinct = async () => [];
    User.find = () => ({ select: async () => [{ _id: new mongoose.Types.ObjectId() }] });
    CertificateRequest.countDocuments = async () => 5;
    Certificate.countDocuments = async () => 2;
    CertificateRequest.find = () => ({
      select: async () => [
        { requestedAt: new Date(Date.now() - 3600000 * 5), updatedAt: new Date() }
      ]
    });

    const req = { query: { range: '30d' } };
    const res = mockRes();

    await getOverview(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.kpis);
    assert.equal(res.body.data.kpis.totalInterns, 10);

    User.countDocuments = origUserCount;
    User.distinct = origUserDistinct;
    User.find = origUserFind;
    CertificateRequest.countDocuments = origCertReqCount;
    Certificate.countDocuments = origCertCount;
    CertificateRequest.find = origCertReqFind;
  });

  await t.test('request trend applies custom date, domain, and Team Leader scope in Mongo match', async () => {
    const origUserFind = User.find;
    const origAggregate = CertificateRequest.aggregate;
    const leaderId = new mongoose.Types.ObjectId();
    const internId = new mongoose.Types.ObjectId();
    let internQuery;
    let requestMatch;

    User.find = (query) => {
      internQuery = query;
      return { select: async () => [{ _id: internId }] };
    };
    CertificateRequest.aggregate = async (pipeline) => {
      requestMatch = pipeline[0].$match;
      return [];
    };

    try {
      await getRequestsTrend({
        from: '2026-09-01', to: '2026-09-30', range: 'custom',
        domain: 'Data Science', teamLeader: leaderId.toString(), groupBy: 'week'
      });
      assert.equal(internQuery.domain, 'Data Science');
      assert.equal(internQuery['internshipDetails.teamLeader'], leaderId.toString());
      assert.deepEqual(requestMatch.userId.$in, [internId]);
      assert.equal(requestMatch.requestedAt.$gte.toISOString(), new Date(2026, 8, 1).toISOString());
      assert.equal(requestMatch.requestedAt.$lte.toISOString(), new Date(2026, 8, 30, 23, 59, 59, 999).toISOString());
    } finally {
      User.find = origUserFind;
      CertificateRequest.aggregate = origAggregate;
    }
  });

  await t.test('date validator rejects a reversed range and incomplete custom range', async () => {
    const validateQuery = async (query) => {
      const req = { query, body: {}, params: {} };
      let finish;
      const res = {
        statusCode: 200,
        status(code) { this.statusCode = code; return this; },
        json() { finish?.(); return this; }
      };
      for (const middleware of analyticsQueryValidator) {
        await new Promise((resolve) => {
          finish = resolve;
          middleware(req, res, resolve);
        });
      }
      return res.statusCode === 200 ? [] : validationResult(req).array();
    };

    assert.ok((await validateQuery({ from: '2026-09-20', to: '2026-09-01' })).length > 0);
    assert.ok((await validateQuery({ range: 'custom', from: '2026-09-01' })).length > 0);
    assert.equal((await validateQuery({ from: '2026-09-01', to: '2026-09-30', range: 'custom' })).length, 0);
  });

  await t.test('GET /requests-trend should return labels and series', async () => {
    const origAggregate = CertificateRequest.aggregate;
    const origUserFind = User.find;
    User.find = () => ({ select: async () => [] });
    CertificateRequest.aggregate = async () => [
      { _id: { period: '2026-01', status: 'pending' }, count: 3 },
      { _id: { period: '2026-01', status: 'completed' }, count: 5 }
    ];

    const req = { query: { groupBy: 'month' } };
    const res = mockRes();

    await getTrend(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data.labels));
    assert.ok(Array.isArray(res.body.data.series));
    assert.deepEqual(res.body.data.raw, [{ period: '2026-01', pending: 3, approved: 0, rejected: 0, processing: 0, completed: 5, cancelled: 0, total: 8 }]);
    assert.equal(res.body.data.series.find((series) => series.status === 'pending').data[0], 3);
    assert.equal(res.body.data.series.find((series) => series.status === 'completed').data[0], 5);

    CertificateRequest.aggregate = origAggregate;
    User.find = origUserFind;
  });

  await t.test('turnaround uses scoped facet durations and returns known seeded-style statistics', async () => {
    const origAggregate = CertificateRequest.aggregate;
    const origUserFind = User.find;
    const internId = new mongoose.Types.ObjectId();
    let pipeline;
    User.find = () => ({ select: async () => [{ _id: internId }] });
    CertificateRequest.aggregate = async (stages) => {
      pipeline = stages;
      return [{
        review: [{ hours: 1 }, { hours: 3 }, { hours: 5 }],
        finalize: [{ hours: 2 }, { hours: 4 }],
        total: [{ hours: 3 }, { hours: 7 }]
      }];
    };
    try {
      const result = await getTurnaroundStats({ range: '30d', domain: 'Data Science' });
      assert.deepEqual(pipeline[0].$match.userId.$in, [internId]);
      assert.ok(pipeline[2].$facet.review.some((stage) => stage.$set?.seconds?.$dateDiff));
      assert.equal(result.timeToTLReview.avg, 3);
      assert.equal(result.timeToTLReview.median, 3);
      assert.equal(result.timeToTLReview.p90, 4.6);
      assert.equal(result.timeToAdminFinalize.avg, 3);
      assert.equal(result.totalTurnaround.median, 5);
    } finally {
      CertificateRequest.aggregate = origAggregate;
      User.find = origUserFind;
    }
  });

  await t.test('GET /team-leaders should return team leader metrics list', async () => {
    const tlId = new mongoose.Types.ObjectId();
    const origUserFind = User.find;
    const origUserDistinct = User.distinct;
    const origUserCount = User.countDocuments;
    const origCertReqFind = CertificateRequest.find;

    User.find = (query) => {
      if (query.role === 'teamleader') {
        return {
          select: async () => [
            { _id: tlId, fullName: 'TL One', email: 'tl1@test.com' }
          ]
        };
      }
      return { select: async () => [] };
    };
    User.distinct = async () => [tlId];

    User.countDocuments = async () => 4;
    CertificateRequest.find = () => ({
      select: async () => []
    });

    const req = { query: {} };
    const res = mockRes();

    await getTeamLeaders(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data));
    assert.equal(res.body.data[0].fullName, 'TL One');

    User.find = origUserFind;
    User.distinct = origUserDistinct;
    User.countDocuments = origUserCount;
    CertificateRequest.find = origCertReqFind;
  });

  await t.test('GET /export should generate CSV and log to AuditLog', async () => {
    const origUserCount = User.countDocuments;
    const origCertReqCount = CertificateRequest.countDocuments;
    const origCertCount = Certificate.countDocuments;
    const origCertReqFind = CertificateRequest.find;
    const origUserFind = User.find;
    const origAuditCreate = AuditLog.create;

    User.countDocuments = async () => 10;
    User.find = () => ({ select: async () => [{ _id: new mongoose.Types.ObjectId() }] });
    CertificateRequest.countDocuments = async () => 5;
    Certificate.countDocuments = async () => 2;
    CertificateRequest.find = () => ({
      select: async () => []
    });

    let auditLogged = false;
    AuditLog.create = async (doc) => {
      auditLogged = true;
      assert.ok(['EXPORT', 'EXPORT_ANALYTICS'].includes(doc.action));
      return doc;
    };

    const req = { user: { id: adminId }, query: { type: 'overview' } };
    const res = mockRes();

    await exportAnalyticsCSV(req, res);

    assert.equal(res.statusCode, 200);
    assert.match(res.headers['Content-Type'], /^text\/csv/);
    assert.ok(res.sentContent.includes('totalInterns'));
    assert.equal(auditLogged, true);

    User.countDocuments = origUserCount;
    User.find = origUserFind;
    CertificateRequest.countDocuments = origCertReqCount;
    Certificate.countDocuments = origCertCount;
    CertificateRequest.find = origCertReqFind;
    AuditLog.create = origAuditCreate;
  });

  await t.test('GET /export?format=xlsx creates a workbook and logs its format', async () => {
    const origUserCount = User.countDocuments;
    const origUserFind = User.find;
    const origCertReqCount = CertificateRequest.countDocuments;
    const origCertCount = Certificate.countDocuments;
    const origCertReqFind = CertificateRequest.find;
    const origAuditCreate = AuditLog.create;
    let auditFormat;

    User.countDocuments = async () => 1;
    User.find = () => ({ select: async () => [{ _id: new mongoose.Types.ObjectId() }] });
    CertificateRequest.countDocuments = async () => 0;
    Certificate.countDocuments = async () => 0;
    CertificateRequest.find = () => ({ select: async () => [] });
    AuditLog.create = async (doc) => {
      try {
        if (doc.description && doc.description.includes('format')) {
          auditFormat = JSON.parse(doc.description).format;
        } else if (doc.meta?.format) {
          auditFormat = doc.meta.format;
        }
      } catch (e) {}
      return doc;
    };

    try {
      const req = { user: { id: adminId }, query: { type: 'overview', format: 'xlsx', range: '30d' } };
      const res = mockRes();
      await exportAnalyticsCSV(req, res);
      assert.equal(res.statusCode, 200);
      assert.equal(res.headers['Content-Type'], 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      assert.match(res.headers['Content-Disposition'], /\.xlsx/);
      assert.ok(Buffer.isBuffer(res.sentContent));
      const workbook = XLSX.read(res.sentContent, { type: 'buffer' });
      assert.ok(workbook.SheetNames.includes('overview'));
      assert.equal(auditFormat, 'xlsx');
    } finally {
      User.countDocuments = origUserCount;
      User.find = origUserFind;
      CertificateRequest.countDocuments = origCertReqCount;
      Certificate.countDocuments = origCertCount;
      CertificateRequest.find = origCertReqFind;
      AuditLog.create = origAuditCreate;
    }
  });

  await t.test('GET /stuck and GET /stuck-requests return overdue requests', async () => {
    const origFind = CertificateRequest.find;
    const origUserFind = User.find;
    User.find = () => ({ select: async () => [] });
    CertificateRequest.find = () => ({
      populate: () => ({
        populate: () => ({
          populate: () => ({
            sort: async () => [
              {
                _id: new mongoose.Types.ObjectId(),
                requestNumber: 'CERT-2026-00001',
                status: 'pending',
                requestedAt: new Date(Date.now() - 4 * 24 * 3600 * 1000)
              }
            ]
          })
        })
      })
    });

    try {
      const req = { query: { days: 3 } };
      const res = mockRes();
      await getStuck(req, res);
      assert.equal(res.statusCode, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.length, 1);
      assert.equal(res.body.data[0].requestNumber, 'CERT-2026-00001');
    } finally {
      CertificateRequest.find = origFind;
      User.find = origUserFind;
    }
  });
});
