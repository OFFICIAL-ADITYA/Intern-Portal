import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../src/models/User.js';
import AuditLog from '../src/models/AuditLog.model.js';
import { setPassword, updateProfile, getProfile } from '../src/controllers/intern.controller.js';
import { login, resetPassword, getMe } from '../src/controllers/auth.controller.js';

// Helper mock response object
const createMockRes = () => {
  const res = {
    statusCode: 200,
    body: null,
    cookies: {},
    cookie(name, value, options) {
      this.cookies[name] = { value, options };
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

// Helper to wrap a mock doc into a thenable Mongoose query mock
const mockQuery = (doc) => {
  const promise = Promise.resolve(doc);
  promise.select = () => Promise.resolve(doc);
  return promise;
};

test('Task H: Intern Profile and Password Setup Suite', async (t) => {
  let loggedActions = [];
  const originalAuditCreate = AuditLog.create;

  t.beforeEach(() => {
    loggedActions = [];
    AuditLog.create = async (doc) => {
      loggedActions.push(doc);
      return { _id: new mongoose.Types.ObjectId(), ...doc };
    };
  });

  t.afterEach(() => {
    AuditLog.create = originalAuditCreate;
  });

  // ============================================================
  // 1. Schema Default
  // ============================================================
  await t.test('1.1 User schema includes passwordSetAt defaulting to null', () => {
    const user = new User({
      fullName: 'Test Intern',
      email: 'intern@test.com',
      password: 'InitialPassword123',
      role: 'intern',
      internCode: 'INT-9999'
    });
    assert.strictEqual(user.passwordSetAt, null, 'passwordSetAt must default to null');
  });

  // ============================================================
  // 2. Set Password Endpoint (PATCH /api/intern/set-password)
  // ============================================================
  await t.test('2.1 First-time set-password rejects when currentSecret is not internCode', async () => {
    const mockUser = {
      _id: new mongoose.Types.ObjectId(),
      role: 'intern',
      internCode: 'INT-1234',
      passwordSetAt: null,
      save: async () => {}
    };

    const originalFindById = User.findById;
    User.findById = () => mockQuery(mockUser);

    try {
      const req = {
        user: { id: mockUser._id.toString() },
        body: {
          currentSecret: 'WRONG-CODE',
          newPassword: 'NewPassword123'
        }
      };
      const res = createMockRes();

      await setPassword(req, res);

      assert.strictEqual(res.statusCode, 400);
      assert.match(res.body.message, /intern code/i);
    } finally {
      User.findById = originalFindById;
    }
  });

  await t.test('2.2 First-time set-password succeeds with valid internCode and complex password', async () => {
    let saved = false;
    const mockUser = {
      _id: new mongoose.Types.ObjectId(),
      role: 'intern',
      email: 'intern@uptoskills.com',
      internCode: 'INT-1234',
      passwordSetAt: null,
      password: 'hashedOldPassword',
      save: async function () {
        saved = true;
      }
    };

    const originalFindById = User.findById;
    User.findById = () => mockQuery(mockUser);

    try {
      const req = {
        user: { id: mockUser._id.toString() },
        body: {
          currentSecret: 'INT-1234',
          newPassword: 'MySecurePassword2026'
        }
      };
      const res = createMockRes();

      await setPassword(req, res);

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(saved, true);
      assert.ok(mockUser.passwordSetAt instanceof Date, 'passwordSetAt must be set to Date');
      assert.notEqual(mockUser.password, 'MySecurePassword2026', 'Password must be hashed');
      assert.ok(await bcrypt.compare('MySecurePassword2026', mockUser.password), 'Hashed password must match');

      // Verify Audit Log
      assert.strictEqual(loggedActions.length, 1);
      assert.strictEqual(loggedActions[0].action, 'PASSWORD_CHANGED');
      assert.strictEqual(loggedActions[0].targetType, 'user');
      // Ensure no passwords or secrets leaked in meta
      const metaStr = JSON.stringify(loggedActions[0].meta || {});
      assert.strictEqual(metaStr.includes('MySecurePassword2026'), false);
      assert.strictEqual(metaStr.includes('INT-1234'), false);
    } finally {
      User.findById = originalFindById;
    }
  });

  await t.test('2.3 Subsequent password change requires correct current password', async () => {
    const existingHash = await bcrypt.hash('CurrentPass123', 10);
    let saved = false;
    const mockUser = {
      _id: new mongoose.Types.ObjectId(),
      role: 'intern',
      email: 'intern@uptoskills.com',
      internCode: 'INT-1234',
      passwordSetAt: new Date('2026-01-01'),
      password: existingHash,
      comparePassword: async function (candidate) {
        return bcrypt.compare(candidate, this.password);
      },
      save: async function () {
        saved = true;
      }
    };

    const originalFindById = User.findById;
    User.findById = () => mockQuery(mockUser);

    try {
      // Test incorrect current password
      const badReq = {
        user: { id: mockUser._id.toString() },
        body: {
          currentSecret: 'WrongPass123',
          newPassword: 'BrandNewPass2026'
        }
      };
      const badRes = createMockRes();
      await setPassword(badReq, badRes);

      assert.strictEqual(badRes.statusCode, 400);
      assert.match(badRes.body.message, /current password/i);
      assert.strictEqual(saved, false);

      // Test correct current password
      const goodReq = {
        user: { id: mockUser._id.toString() },
        body: {
          currentSecret: 'CurrentPass123',
          newPassword: 'BrandNewPass2026'
        }
      };
      const goodRes = createMockRes();
      await setPassword(goodReq, goodRes);

      assert.strictEqual(goodRes.statusCode, 200);
      assert.strictEqual(saved, true);
      assert.ok(await bcrypt.compare('BrandNewPass2026', mockUser.password));
    } finally {
      User.findById = originalFindById;
    }
  });

  // ============================================================
  // 3. Profile Update Endpoint (PATCH /api/intern/profile)
  // ============================================================
  await t.test('3.1 Profile update only allows mobileNo and ignores disallowed fields', async () => {
    let saved = false;
    const mockUser = {
      _id: new mongoose.Types.ObjectId(),
      fullName: 'Original Name',
      email: 'original@test.com',
      role: 'intern',
      internCode: 'INT-ORIG',
      mobileNo: '9876543210',
      toObject: function () {
        const copy = { ...this };
        delete copy.password;
        return copy;
      },
      save: async function () {
        saved = true;
      }
    };

    const originalFindById = User.findById;
    User.findById = () => mockQuery(mockUser);

    try {
      const req = {
        user: { id: mockUser._id.toString() },
        body: {
          mobileNo: '9123456789',
          fullName: 'Hacked Name',
          role: 'admin',
          email: 'hacked@admin.com',
          internCode: 'ADMIN-1'
        }
      };
      const res = createMockRes();

      await updateProfile(req, res);

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(mockUser.mobileNo, '9123456789', 'mobileNo must be updated');
      assert.strictEqual(mockUser.fullName, 'Original Name', 'fullName must not be updated');
      assert.strictEqual(mockUser.role, 'intern', 'role must not be updated');
      assert.strictEqual(mockUser.email, 'original@test.com', 'email must not be updated');
      assert.strictEqual(mockUser.internCode, 'INT-ORIG', 'internCode must not be updated');
      assert.strictEqual(saved, true);

      // Verify Audit Log
      assert.strictEqual(loggedActions.length, 1);
      assert.strictEqual(loggedActions[0].action, 'PROFILE_UPDATED');
      assert.strictEqual(loggedActions[0].meta.field, 'mobileNo');
      assert.ok(loggedActions[0].meta.previousMobile.startsWith('987'));
    } finally {
      User.findById = originalFindById;
    }
  });

  // ============================================================
  // 4. Login Authentication Flow (POST /api/auth/login)
  // ============================================================
  await t.test('4.1 Intern with passwordSetAt == null can login with internCode', async () => {
    const mockIntern = {
      _id: new mongoose.Types.ObjectId(),
      email: 'intern1@uptoskills.com',
      role: 'intern',
      internCode: 'INT-4001',
      passwordSetAt: null,
      password: await bcrypt.hash('INT-4001', 10),
      isArchived: false,
      comparePassword: async function (candidate) {
        return bcrypt.compare(candidate, this.password);
      }
    };

    const originalFindOne = User.findOne;
    User.findOne = () => mockQuery(mockIntern);

    try {
      const req = {
        body: {
          email: 'intern1@uptoskills.com',
          password: 'INT-4001'
        }
      };
      const res = createMockRes();

      await login(req, res);

      assert.strictEqual(res.statusCode, 200);
      assert.ok(res.cookies.token && res.cookies.token.value, 'Token should be returned in cookie');
      assert.strictEqual(res.body.user.role, 'intern');
      assert.strictEqual(res.body.user.hasPassword, false);
    } finally {
      User.findOne = originalFindOne;
    }
  });

  await t.test('4.2 Intern with passwordSetAt set can only login with password, NOT internCode', async () => {
    const passwordHash = await bcrypt.hash('CustomPassword99', 10);
    const mockIntern = {
      _id: new mongoose.Types.ObjectId(),
      email: 'intern2@uptoskills.com',
      role: 'intern',
      internCode: 'INT-4002',
      passwordSetAt: new Date('2026-02-01'),
      password: passwordHash,
      isArchived: false,
      comparePassword: async function (candidate) {
        return bcrypt.compare(candidate, this.password);
      }
    };

    const originalFindOne = User.findOne;
    User.findOne = () => mockQuery(mockIntern);

    try {
      // Attempt 1: Trying to log in with internCode should fail
      const reqCode = {
        body: {
          email: 'intern2@uptoskills.com',
          password: 'INT-4002'
        }
      };
      const resCode = createMockRes();
      await login(reqCode, resCode);

      assert.strictEqual(resCode.statusCode, 401);
      assert.match(resCode.body.message, /invalid credentials/i);

      // Attempt 2: Logging in with actual password succeeds
      const reqPass = {
        body: {
          email: 'intern2@uptoskills.com',
          password: 'CustomPassword99'
        }
      };
      const resPass = createMockRes();
      await login(reqPass, resPass);

      assert.strictEqual(resPass.statusCode, 200);
      assert.ok(resPass.cookies.token && resPass.cookies.token.value, 'Token should be returned in cookie');
      assert.strictEqual(resPass.body.user.hasPassword, true);
    } finally {
      User.findOne = originalFindOne;
    }
  });

  // ============================================================
  // 5. Reset Password updates passwordSetAt
  // ============================================================
  await t.test('5.1 resetPassword sets passwordSetAt when intern resets password', async () => {
    let saved = false;
    const mockUser = {
      _id: new mongoose.Types.ObjectId(),
      email: 'intern3@uptoskills.com',
      role: 'intern',
      passwordSetAt: null,
      resetPasswordToken: 'hashed_token',
      resetPasswordExpires: new Date(Date.now() + 3600000),
      save: async function () {
        saved = true;
      }
    };

    const originalFindOne = User.findOne;
    User.findOne = () => mockQuery(mockUser);

    try {
      const req = {
        params: { token: 'raw_valid_token' },
        body: { newPassword: 'ResetPassword2026' }
      };
      const res = createMockRes();

      await resetPassword(req, res);

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(saved, true);
      assert.ok(mockUser.passwordSetAt instanceof Date, 'passwordSetAt must be updated');
      assert.ok(await bcrypt.compare('ResetPassword2026', mockUser.password));
    } finally {
      User.findOne = originalFindOne;
    }
  });
});
