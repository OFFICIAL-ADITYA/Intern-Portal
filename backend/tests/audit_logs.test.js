import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';

import AuditLog from '../src/models/AuditLog.model.js';
import { logAction, sanitizeMeta } from '../src/utils/logAction.js';
import { getAuditLogs, exportAuditLogs } from '../src/controllers/auditLog.controller.js';

test('Task D: Audit Logs Suite', async (t) => {
  await t.test('1. Meta sanitization strips passwords, tokens, internCodes and secrets recursively', () => {
    const raw = {
      username: 'intern_user',
      password: 'plain_password',
      token: 'jwt_token_value',
      internCode: 'INT-2026-001',
      resetPasswordToken: 'reset_hash_123',
      apiSecret: 'shhh',
      nested: {
        normalField: 'ok',
        client_secret: 'nested_secret',
        deep: [
          { token: 'array_token', valid: true },
          { userPassword: 'no_pass', secretKey: 'top_secret' }
        ]
      }
    };

    const cleaned = sanitizeMeta(raw);

    assert.equal(cleaned.password, undefined);
    assert.equal(cleaned.token, undefined);
    assert.equal(cleaned.internCode, undefined);
    assert.equal(cleaned.resetPasswordToken, undefined);
    assert.equal(cleaned.apiSecret, undefined);
    assert.equal(cleaned.username, 'intern_user');
    assert.equal(cleaned.nested.normalField, 'ok');
    assert.equal(cleaned.nested.client_secret, undefined);
    assert.equal(cleaned.nested.deep[0].token, undefined);
    assert.equal(cleaned.nested.deep[0].valid, true);
    assert.equal(cleaned.nested.deep[1].secretKey, undefined);
  });

  await t.test('2. logAction never throws even when database fails', async () => {
    const origCreate = AuditLog.create;
    AuditLog.create = async () => {
      throw new Error('Simulated database crash');
    };

    try {
      // Must not throw
      await assert.doesNotReject(async () => {
        await logAction({
          action: 'LOGIN_FAILED',
          meta: { reason: 'test failure' }
        });
      });
    } finally {
      AuditLog.create = origCreate;
    }
  });

  await t.test('3. logAction populates actor, IP, userAgent, and sanitizes meta before saving', async () => {
    let capturedDoc = null;
    const origCreate = AuditLog.create;
    AuditLog.create = async (doc) => {
      capturedDoc = doc;
      return { _id: new mongoose.Types.ObjectId(), ...doc };
    };

    const mockReq = {
      ip: '192.168.1.50',
      get: (header) => (header === 'user-agent' ? 'Mozilla/5.0 TestBrowser' : null),
      user: {
        id: new mongoose.Types.ObjectId(),
        role: 'admin'
      }
    };

    try {
      await logAction({
        req: mockReq,
        action: 'USER_CREATED',
        targetType: 'user',
        targetId: 'target-user-123',
        meta: {
          role: 'intern',
          email: 'test@example.com',
          password: 'should_not_exist',
          internCode: 'INT-999',
          clientSecret: 'hidden'
        }
      });

      assert.ok(capturedDoc);
      assert.equal(capturedDoc.action, 'USER_CREATED');
      assert.equal(capturedDoc.actorRole, 'admin');
      assert.equal(String(capturedDoc.actorId), String(mockReq.user.id));
      assert.equal(capturedDoc.ip, '192.168.1.50');
      assert.equal(capturedDoc.userAgent, 'Mozilla/5.0 TestBrowser');
      assert.equal(capturedDoc.targetType, 'user');
      assert.equal(capturedDoc.targetId, 'target-user-123');
      assert.equal(capturedDoc.meta.email, 'test@example.com');
      assert.equal(capturedDoc.meta.password, undefined);
      assert.equal(capturedDoc.meta.internCode, undefined);
      assert.equal(capturedDoc.meta.clientSecret, undefined);
    } finally {
      AuditLog.create = origCreate;
    }
  });

  await t.test('4. System actor has null actorId and system role', async () => {
    let capturedDoc = null;
    const origCreate = AuditLog.create;
    AuditLog.create = async (doc) => {
      capturedDoc = doc;
      return { _id: new mongoose.Types.ObjectId(), ...doc };
    };

    try {
      await logAction({
        actor: 'system',
        action: 'INTERN_ARCHIVED',
        targetType: 'user',
        targetId: '507f1f77bcf86cd799439011',
        meta: { days: 30 }
      });

      assert.ok(capturedDoc);
      assert.equal(capturedDoc.actorId, null);
      assert.equal(capturedDoc.actorRole, 'system');
      assert.equal(capturedDoc.action, 'INTERN_ARCHIVED');
    } finally {
      AuditLog.create = origCreate;
    }
  });

  await t.test('5. AuditLog model is append-only: blocks update and delete operations', async () => {
    await assert.rejects(async () => {
      await AuditLog.updateOne({ _id: new mongoose.Types.ObjectId() }, { action: 'MODIFIED' });
    }, /append-only/);

    await assert.rejects(async () => {
      await AuditLog.findOneAndUpdate({ _id: new mongoose.Types.ObjectId() }, { action: 'MODIFIED' });
    }, /append-only/);

    await assert.rejects(async () => {
      await AuditLog.deleteOne({ _id: new mongoose.Types.ObjectId() });
    }, /append-only/);
  });

  await t.test('6. GET /api/admin/audit-logs validates query parameters', async () => {
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
        }
      };
      return res;
    };

    // Invalid from date
    {
      const req = { query: { from: 'invalid-date' } };
      const res = mockRes();
      await getAuditLogs(req, res);
      assert.equal(res.statusCode, 400);
      assert.match(res.body.message, /valid date/);
    }

    // from after to
    {
      const req = { query: { from: '2026-10-15', to: '2026-10-10' } };
      const res = mockRes();
      await getAuditLogs(req, res);
      assert.equal(res.statusCode, 400);
      assert.match(res.body.message, /before or equal/);
    }

    // limit out of range
    {
      const req = { query: { limit: 150 } };
      const res = mockRes();
      await getAuditLogs(req, res);
      assert.equal(res.statusCode, 400);
      assert.match(res.body.message, /between 1 and 100/);
    }
  });

  await t.test('7. GET /api/admin/audit-logs/export produces CSV and logs EXPORT action', async () => {
    let exportActionLogged = false;
    const origCreate = AuditLog.create;
    AuditLog.create = async (doc) => {
      if (doc.action === 'EXPORT') {
        exportActionLogged = true;
      }
      return { _id: new mongoose.Types.ObjectId(), ...doc };
    };

    const origFind = AuditLog.find;
    AuditLog.find = () => ({
      sort: () => ({
        limit: () => ({
          populate: () => ({
            lean: async () => [
              {
                _id: 'log-1',
                actorId: { fullName: 'Admin User', email: 'admin@uptoskills.com', role: 'admin' },
                actorRole: 'admin',
                action: 'REQUEST_APPROVED',
                targetType: 'request',
                targetId: 'req-123',
                ip: '127.0.0.1',
                userAgent: 'NodeTest',
                meta: { certificateType: 'bonafide' },
                createdAt: new Date('2026-10-14T10:00:00Z')
              }
            ]
          })
        })
      })
    });

    const headers = {};
    const res = {
      statusCode: 200,
      body: '',
      setHeader(name, val) {
        headers[name] = val;
      },
      status(code) {
        this.statusCode = code;
        return this;
      },
      send(data) {
        this.body = data;
        return this;
      }
    };

    const req = {
      query: { action: 'REQUEST_APPROVED' },
      user: { id: new mongoose.Types.ObjectId(), role: 'admin' }
    };

    try {
      await exportAuditLogs(req, res);
      assert.equal(res.statusCode, 200);
      assert.equal(headers['Content-Type'], 'text/csv; charset=utf-8');
      assert.ok(res.body.includes('"REQUEST_APPROVED"'));
      assert.ok(res.body.includes('"Admin User"'));
      assert.equal(exportActionLogged, true);
    } finally {
      AuditLog.create = origCreate;
      AuditLog.find = origFind;
    }
  });
});
