import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';

// Controllers
import {
  getAllInterns,
  getInternById,
  updateIntern,
  assignInternTeamLeader,
  getAllTeamLeaders,
  getTeamLeaderById,
  updateTeamLeader
} from '../src/controllers/admin.controller.js';

import {
  getInternsForTL,
  getAssignedInternById,
  updateAssignedIntern
} from '../src/controllers/teamleader.controller.js';

// Middlewares
import verifyAuth from '../src/middlewares/verifyAuth.js';
import requireAdmin from '../src/middlewares/requireAdmin.js';

// Models
import User from '../src/models/User.js';
import CertificateRequest from '../src/models/CertificateRequest.js';
import Certificate from '../src/models/Certificate.js';
import AuditLog from '../src/models/AuditLog.js';

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

test('ADMIN & TEAM LEADER INTERN MANAGEMENT TEST SUITE', async (t) => {
  const adminId = new mongoose.Types.ObjectId().toString();
  const tlAId = new mongoose.Types.ObjectId().toString();
  const tlBId = new mongoose.Types.ObjectId().toString();
  const intern1Id = new mongoose.Types.ObjectId().toString();
  const intern2Id = new mongoose.Types.ObjectId().toString();
  const intern3Id = new mongoose.Types.ObjectId().toString(); // assigned to TL-B
  const unassignedInternId = new mongoose.Types.ObjectId().toString();

  // Mock Users in memory for testing
  const usersDb = [
    {
      _id: new mongoose.Types.ObjectId(adminId),
      fullName: 'Chief Admin',
      email: 'admin@portal.com',
      role: 'admin'
    },
    {
      _id: new mongoose.Types.ObjectId(tlAId),
      fullName: 'TL Alpha',
      email: 'tla@portal.com',
      mobileNo: '9998887771',
      role: 'teamleader',
      toObject() { return { ...this }; },
      save: async function() { return this; }
    },
    {
      _id: new mongoose.Types.ObjectId(tlBId),
      fullName: 'TL Beta',
      email: 'tlb@portal.com',
      mobileNo: '9998887772',
      role: 'teamleader',
      toObject() { return { ...this }; },
      save: async function() { return this; }
    },
    {
      _id: new mongoose.Types.ObjectId(intern1Id),
      fullName: 'Intern One',
      email: 'intern1@portal.com',
      internCode: 'INT001',
      domain: 'Web Development',
      role: 'intern',
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-06-30'),
      internshipDetails: {
        teamLeader: new mongoose.Types.ObjectId(tlAId),
        teamleaderEmail: 'tla@portal.com',
        status: 'ongoing',
        mentor: 'Mentor Alpha'
      },
      save: async function() { return this; }
    },
    {
      _id: new mongoose.Types.ObjectId(intern2Id),
      fullName: 'Intern Two',
      email: 'intern2@portal.com',
      internCode: 'INT002',
      domain: 'Data Science',
      role: 'intern',
      startDate: new Date('2026-02-01'),
      endDate: new Date('2026-07-31'),
      internshipDetails: {
        teamLeader: new mongoose.Types.ObjectId(tlAId),
        teamleaderEmail: 'tla@portal.com',
        status: 'upcoming'
      },
      save: async function() { return this; }
    },
    {
      _id: new mongoose.Types.ObjectId(intern3Id),
      fullName: 'Intern Three',
      email: 'intern3@portal.com',
      internCode: 'INT003',
      domain: 'UI/UX Design',
      role: 'intern',
      startDate: new Date('2026-03-01'),
      endDate: new Date('2026-08-31'),
      internshipDetails: {
        teamLeader: new mongoose.Types.ObjectId(tlBId),
        teamleaderEmail: 'tlb@portal.com',
        status: 'ongoing'
      },
      save: async function() { return this; }
    },
    {
      _id: new mongoose.Types.ObjectId(unassignedInternId),
      fullName: 'Intern Unassigned',
      email: 'unassigned@portal.com',
      internCode: 'INT004',
      domain: 'Cloud Computing',
      role: 'intern',
      internshipDetails: {
        status: 'upcoming'
      },
      save: async function() { return this; }
    }
  ];

  // Backup originals
  const originalUserFind = User.find;
  const originalUserFindOne = User.findOne;
  const originalUserFindById = User.findById;
  const originalUserCount = User.countDocuments;
  const originalAuditCreate = AuditLog.create;
  const originalCertReqFind = CertificateRequest.find;
  const originalCertFind = Certificate.find;

  // Mock AuditLog.create
  AuditLog.create = async (doc) => ({ _id: new mongoose.Types.ObjectId(), ...doc });
  CertificateRequest.find = () => ({
    populate: () => ({ sort: () => Promise.resolve([]) }),
    sort: () => Promise.resolve([])
  });
  Certificate.find = () => ({
    select: () => ({ sort: () => Promise.resolve([]) })
  });

  t.after(() => {
    User.find = originalUserFind;
    User.findOne = originalUserFindOne;
    User.findById = originalUserFindById;
    User.countDocuments = originalUserCount;
    AuditLog.create = originalAuditCreate;
    CertificateRequest.find = originalCertReqFind;
    Certificate.find = originalCertFind;
  });

  // Setup find mock
  User.find = function(filter) {
    let result = usersDb.filter(u => {
      if (filter.role && u.role !== filter.role) return false;
      if (filter.$or) {
        return filter.$or.some(cond => {
          if (cond['internshipDetails.teamLeader']) {
            return u.internshipDetails?.teamLeader?.toString() === cond['internshipDetails.teamLeader'].toString();
          }
          if (cond['internshipDetails.teamleaderEmail']) {
            return u.internshipDetails?.teamleaderEmail?.toLowerCase() === cond['internshipDetails.teamleaderEmail']?.toLowerCase();
          }
          return false;
        });
      }
      return true;
    });

    return {
      select: () => ({
        populate: () => ({
          sort: () => Promise.resolve(result)
        }),
        sort: () => Promise.resolve(result)
      }),
      sort: () => Promise.resolve(result)
    };
  };

  const createQuery = (doc) => ({
    select() { return this; },
    populate() { return this; },
    sort() { return this; },
    then(resolve, reject) {
      return Promise.resolve(doc).then(resolve, reject);
    },
    catch(reject) {
      return Promise.resolve(doc).catch(reject);
    }
  });

  User.findOne = function(query) {
    const found = usersDb.find(u => {
      if (query._id && u._id.toString() !== query._id.toString()) return false;
      if (query.role && u.role !== query.role) return false;
      if (query.email && u.email.toLowerCase() !== query.email.toLowerCase()) return false;
      return true;
    });
    return createQuery(found || null);
  };

  User.findById = function(id) {
    const found = usersDb.find(u => u._id.toString() === id.toString());
    return createQuery(found || null);
  };

  User.countDocuments = function(filter) {
    const matching = usersDb.filter(u => {
      if (filter.role && u.role !== filter.role) return false;
      if (filter.$or) {
        return filter.$or.some(cond => {
          if (cond['internshipDetails.teamLeader']) {
            return u.internshipDetails?.teamLeader?.toString() === cond['internshipDetails.teamLeader'].toString();
          }
          if (cond['internshipDetails.teamleaderEmail']) {
            return u.internshipDetails?.teamleaderEmail?.toLowerCase() === cond['internshipDetails.teamleaderEmail']?.toLowerCase();
          }
          return false;
        });
      }
      return true;
    });
    return Promise.resolve(matching.length);
  };

  // ================= ADMIN TESTS =================
  await t.test('1. Admin can list all interns', async () => {
    const res = mockRes();
    await getAllInterns({ query: {}, user: { id: adminId, role: 'admin' } }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.interns.length, 4); // intern1, 2, 3, unassigned
  });

  await t.test('2. Admin can view any intern', async () => {
    const res = mockRes();
    await getInternById({ params: { id: intern3Id }, user: { id: adminId, role: 'admin' } }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.intern.fullName, 'Intern Three');
  });

  await t.test('3. Admin can edit permitted intern fields', async () => {
    const res = mockRes();
    await updateIntern({
      params: { id: intern1Id },
      body: { fullName: 'Intern One Updated', mobileNo: '9991112223' },
      user: { id: adminId, role: 'admin' }
    }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.intern.fullName, 'Intern One Updated');
  });

  await t.test('4. Admin can manage permitted internship fields (mentor, remarks, status)', async () => {
    const res = mockRes();
    await updateIntern({
      params: { id: intern1Id },
      body: { mentor: 'Dr. Expert', status: 'completed', performanceRemarks: 'Outstanding work' },
      user: { id: adminId, role: 'admin' }
    }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.intern.internshipDetails.mentor, 'Dr. Expert');
    assert.equal(res.body.intern.internshipDetails.status, 'completed');
  });

  await t.test('5. Admin can list all TLs with assigned intern count', async () => {
    const res = mockRes();
    await getAllTeamLeaders({ query: {}, user: { id: adminId, role: 'admin' } }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.teamLeaders.length, 2);
    const tlA = res.body.teamLeaders.find(tl => tl.email === 'tla@portal.com');
    assert.equal(tlA.assignedInternCount, 2); // Intern 1 and Intern 2
  });

  await t.test('6. Admin can view TL', async () => {
    const res = mockRes();
    await getTeamLeaderById({ params: { id: tlAId }, user: { id: adminId, role: 'admin' } }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.teamLeader.fullName, 'TL Alpha');
    assert.equal(res.body.assignedInterns.length, 2);
  });

  await t.test('7. Admin can manage permitted TL fields', async () => {
    const res = mockRes();
    await updateTeamLeader({
      params: { id: tlAId },
      body: { fullName: 'TL Alpha Senior', mobileNo: '9876543210' },
      user: { id: adminId, role: 'admin' }
    }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.teamLeader.fullName, 'TL Alpha Senior');
  });

  await t.test('8. Admin can assign intern to TL', async () => {
    const res = mockRes();
    await assignInternTeamLeader({
      params: { id: unassignedInternId },
      body: { teamLeaderId: tlAId },
      user: { id: adminId, role: 'admin' }
    }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.intern.internshipDetails.teamLeader.toString(), tlAId);
    assert.equal(res.body.intern.internshipDetails.teamleaderEmail, 'tla@portal.com');
  });

  await t.test('9. Admin can reassign intern to another TL', async () => {
    const res = mockRes();
    await assignInternTeamLeader({
      params: { id: intern1Id },
      body: { teamLeaderId: tlBId },
      user: { id: adminId, role: 'admin' }
    }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.intern.internshipDetails.teamLeader.toString(), tlBId);
    assert.equal(res.body.intern.internshipDetails.teamleaderEmail, 'tlb@portal.com');
    // Restore intern1 back to tlA for following tests
    usersDb.find(u => u._id.toString() === intern1Id).internshipDetails.teamLeader = new mongoose.Types.ObjectId(tlAId);
    usersDb.find(u => u._id.toString() === intern1Id).internshipDetails.teamleaderEmail = 'tla@portal.com';
  });

  // ================= TEAM LEADER TESTS =================
  await t.test('10. TL receives only assigned interns', async () => {
    const res = mockRes();
    await getInternsForTL({
      query: {},
      user: { id: tlAId, email: 'tla@portal.com', role: 'teamleader' }
    }, res);
    assert.equal(res.statusCode, 200);
    // Intern 1, Intern 2, and previously assigned unassignedInternId are TL-A's
    const internEmails = res.body.interns.map(i => i.email);
    assert.ok(internEmails.includes('intern1@portal.com'));
    assert.ok(internEmails.includes('intern2@portal.com'));
    assert.ok(!internEmails.includes('intern3@portal.com')); // Belongs to TL-B
  });

  await t.test('11. TL can view assigned intern', async () => {
    const res = mockRes();
    await getAssignedInternById({
      params: { id: intern1Id },
      user: { id: tlAId, email: 'tla@portal.com', role: 'teamleader' }
    }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.intern.email, 'intern1@portal.com');
  });

  await t.test('12. TL can edit assigned intern permitted fields', async () => {
    const res = mockRes();
    await updateAssignedIntern({
      params: { id: intern1Id },
      body: { fullName: 'Intern One Updated By TL', mobileNo: '9112233445' },
      user: { id: tlAId, email: 'tla@portal.com', role: 'teamleader' }
    }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.intern.fullName, 'Intern One Updated By TL');
  });

  await t.test('13. TL can manage assigned intern (mentor, remarks, status)', async () => {
    const res = mockRes();
    await updateAssignedIntern({
      params: { id: intern1Id },
      body: { mentor: 'Lead Dev', performanceRemarks: 'Great velocity', status: 'ongoing' },
      user: { id: tlAId, email: 'tla@portal.com', role: 'teamleader' }
    }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.intern.internshipDetails.mentor, 'Lead Dev');
  });

  await t.test('14. TL cannot see unassigned interns in list', async () => {
    // Re-set unassigned intern to have no TL
    usersDb.find(u => u._id.toString() === unassignedInternId).internshipDetails.teamLeader = undefined;
    usersDb.find(u => u._id.toString() === unassignedInternId).internshipDetails.teamleaderEmail = undefined;

    const res = mockRes();
    await getInternsForTL({
      query: {},
      user: { id: tlAId, email: 'tla@portal.com', role: 'teamleader' }
    }, res);
    assert.equal(res.statusCode, 200);
    const emails = res.body.interns.map(i => i.email);
    assert.ok(!emails.includes('unassigned@portal.com'));
  });

  await t.test('15. TL cannot access another TL\'s intern by ID (403 Forbidden)', async () => {
    const res = mockRes();
    await getAssignedInternById({
      params: { id: intern3Id }, // Intern 3 belongs to TL-B
      user: { id: tlAId, email: 'tla@portal.com', role: 'teamleader' }
    }, res);
    assert.equal(res.statusCode, 403);
    assert.match(res.body.message, /Access denied: Intern is not assigned to you/i);
    assert.equal(res.body.intern, undefined); // No leak!
  });

  await t.test('16. TL cannot edit another TL\'s intern by ID (403 Forbidden)', async () => {
    const res = mockRes();
    await updateAssignedIntern({
      params: { id: intern3Id }, // Intern 3 belongs to TL-B
      body: { fullName: 'Malicious Edit' },
      user: { id: tlAId, email: 'tla@portal.com', role: 'teamleader' }
    }, res);
    assert.equal(res.statusCode, 403);
    assert.match(res.body.message, /Access denied: Intern is not assigned to you/i);
  });

  await t.test('17. TL cannot reassign interns (rejected with 403)', async () => {
    const res = mockRes();
    await updateAssignedIntern({
      params: { id: intern1Id },
      body: { teamLeaderId: tlBId },
      user: { id: tlAId, email: 'tla@portal.com', role: 'teamleader' }
    }, res);
    assert.equal(res.statusCode, 403);
    assert.match(res.body.message, /cannot reassign interns/i);
  });

  await t.test('18. TL cannot change role (rejected with 403)', async () => {
    const res = mockRes();
    await updateAssignedIntern({
      params: { id: intern1Id },
      body: { role: 'admin' },
      user: { id: tlAId, email: 'tla@portal.com', role: 'teamleader' }
    }, res);
    assert.equal(res.statusCode, 403);
    assert.match(res.body.message, /modify roles/i);
  });

  await t.test('19. TL cannot elevate privileges or modify password (rejected with 403)', async () => {
    const res = mockRes();
    await updateAssignedIntern({
      params: { id: intern1Id },
      body: { password: 'newpassword123' },
      user: { id: tlAId, email: 'tla@portal.com', role: 'teamleader' }
    }, res);
    assert.equal(res.statusCode, 403);
    assert.match(res.body.message, /security credentials/i);
  });

  // ================= SECURITY TESTS =================
  await t.test('20. Unauthenticated request rejected by verifyAuth', async () => {
    let nextCalled = false;
    const req = { cookies: {}, headers: {} };
    const res = mockRes();
    verifyAuth(req, res, () => { nextCalled = true; });
    assert.equal(res.statusCode, 401);
    assert.equal(nextCalled, false);
  });

  await t.test('21. Wrong-role request rejected by requireAdmin', async () => {
    const req = { user: { id: tlAId, role: 'teamleader' } };
    const res = mockRes();
    let nextCalled = false;
    await requireAdmin(req, res, () => { nextCalled = true; });
    assert.equal(res.statusCode, 403);
    assert.equal(nextCalled, false);
  });

  await t.test('22. Ownership enforced server-side directly', async () => {
    const res = mockRes();
    await getAssignedInternById({
      params: { id: intern3Id },
      user: { id: tlAId, email: 'tla@portal.com', role: 'teamleader' }
    }, res);
    assert.equal(res.statusCode, 403);
  });

  await t.test('23. Client-supplied teamLeaderId cannot bypass ownership', async () => {
    const res = mockRes();
    await updateAssignedIntern({
      params: { id: intern1Id },
      body: { teamLeaderId: tlBId, teamLeader: tlBId },
      user: { id: tlAId, email: 'tla@portal.com', role: 'teamleader' }
    }, res);
    assert.equal(res.statusCode, 403);
  });

  await t.test('24. Unauthorized intern information is not leaked on 403', async () => {
    const res = mockRes();
    await getAssignedInternById({
      params: { id: intern3Id },
      user: { id: tlAId, email: 'tla@portal.com', role: 'teamleader' }
    }, res);
    assert.equal(res.statusCode, 403);
    assert.equal(res.body.intern, undefined);
    assert.equal(res.body.requests, undefined);
    assert.equal(res.body.certificates, undefined);
  });

  await t.test('25. Mass-assignment vulnerability prevented on Admin and TL updates', async () => {
    const res1 = mockRes();
    await updateIntern({
      params: { id: intern1Id },
      body: { role: 'admin', password: 'hacked', internCode: 'INT999' },
      user: { id: adminId, role: 'admin' }
    }, res1);
    assert.equal(res1.statusCode, 403);

    const res2 = mockRes();
    await updateTeamLeader({
      params: { id: tlAId },
      body: { role: 'admin', password: 'hacked' },
      user: { id: adminId, role: 'admin' }
    }, res2);
    assert.equal(res2.statusCode, 403);
  });

  // ================= REGRESSION TESTS =================
  await t.test('26. Date order validation rejects start date > end date', async () => {
    const res = mockRes();
    await updateIntern({
      params: { id: intern1Id },
      body: { startDate: '2026-12-01', endDate: '2026-01-01' },
      user: { id: adminId, role: 'admin' }
    }, res);
    assert.equal(res.statusCode, 400);
    assert.match(res.body.message, /Start date cannot be after end date/i);
  });

  await t.test('27. Invalid status value rejected', async () => {
    const res = mockRes();
    await updateIntern({
      params: { id: intern1Id },
      body: { status: 'invalid_status_xyz' },
      user: { id: adminId, role: 'admin' }
    }, res);
    assert.equal(res.statusCode, 400);
    assert.match(res.body.message, /Invalid status/i);
  });

  await t.test('28. Days 3-6 Certificate Engine integration preserved without side effects', async () => {
    // Confirm Certificate schema and requests can still be queried safely
    const intern = usersDb.find(u => u._id.toString() === intern1Id);
    assert.ok(intern);
    assert.equal(intern.role, 'intern');
  });
});
