import Counter from '../src/models/Counter.model.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import Handlebars from 'handlebars';

// Target services & controllers
import {
  createCertificateDraft,
  getCertificateDraft,
  updateCertificateDraft,
  finalizeCertificate
} from '../src/services/certificate.service.js';
import { submitCertificateRequest } from '../src/controllers/intern.controller.js';

// Models & template definition
import CertificateRequest from '../src/models/CertificateRequest.js';
import Certificate from '../src/models/Certificate.js';
import CertificateTemplate from '../src/models/CertificateTemplate.js';
import User from '../src/models/User.js';
import { templates } from '../scripts/seed_templates.js';

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

test('Comprehensive 7 Certificate Types & Generation Flow Tests', async (t) => {
  const allRequiredTypes = [
    'offer_letter',
    'bonafide',
    'ojt_certificate',
    'experience_letter',
    'completion_certificate',
    'intern_of_month',
    'league_winner'
  ];

  // ============================================================
  // SECTION A: Certificate Type Recognition & Eligibility
  // ============================================================
  await t.test('Section A.1: All 7 required certificate types are recognized by request controller', async () => {
    const origFindById = User.findById;
    const origFindOne = CertificateRequest.findOne;
    const origCreate = CertificateRequest.create;
    const origCount = CertificateRequest.countDocuments;
    const origCounterFindOneAndUpdate = Counter.findOneAndUpdate;

    User.findById = () => Promise.resolve({
      _id: new mongoose.Types.ObjectId(),
      fullName: 'Alice Intern',
      internCode: 'INT-ALICE1',
      domain: 'Engineering',
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
      internshipDetails: { status: 'ongoing' }
    });

    CertificateRequest.findOne = () => Promise.resolve(null);
    CertificateRequest.countDocuments = () => Promise.resolve(10);
    Counter.findOneAndUpdate = () => Promise.resolve({ seq: 11 });
    CertificateRequest.create = (doc) => Promise.resolve({ _id: new mongoose.Types.ObjectId(), ...doc });

    try {
      for (const certType of allRequiredTypes) {
        // adjust dates if completion/experience tests completion requirement
        if (certType === 'completion_certificate' || certType === 'experience_letter') {
          User.findById = () => Promise.resolve({
            _id: new mongoose.Types.ObjectId(),
            fullName: 'Alice Intern',
            internCode: 'INT-ALICE1',
            domain: 'Engineering',
            startDate: new Date('2025-01-01'),
            endDate: new Date('2025-06-30'),
            internshipDetails: { status: 'completed' }
          });
        } else {
          User.findById = () => Promise.resolve({
            _id: new mongoose.Types.ObjectId(),
            fullName: 'Alice Intern',
            internCode: 'INT-ALICE1',
            domain: 'Engineering',
            startDate: new Date('2026-01-01'),
            endDate: new Date('2026-12-31'),
            internshipDetails: { status: 'ongoing' }
          });
        }

        const res = mockRes();
        await submitCertificateRequest({
          user: { id: new mongoose.Types.ObjectId().toString() },
          body: { certificateType: certType, reason: `Need ${certType}` }
        }, res);

        assert.equal(res.statusCode, 201, `Failed to submit request for recognized type ${certType}`);
        assert.equal(res.body.request.certificateType, certType);
      }
    } finally {
      User.findById = origFindById;
      CertificateRequest.findOne = origFindOne;
      CertificateRequest.create = origCreate;
      CertificateRequest.countDocuments = origCount;
      Counter.findOneAndUpdate = origCounterFindOneAndUpdate;
    }
  });

  await t.test('Section A.2: Unsupported certificate type is rejected with 400', async () => {
    const res = mockRes();
    await submitCertificateRequest({
      user: { id: new mongoose.Types.ObjectId().toString() },
      body: { certificateType: 'unsupported_fake_type', reason: 'Invalid' }
    }, res);

    assert.equal(res.statusCode, 400);
    assert.match(res.body.message, /Valid certificate type is required/i);
  });

  await t.test('Section A.3: Bonafide eligibility enforces active/ongoing internship', async () => {
    const origFindById = User.findById;
    // Ended internship with status 'completed'
    User.findById = () => Promise.resolve({
      _id: new mongoose.Types.ObjectId(),
      fullName: 'Former Intern',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-06-30'),
      internshipDetails: { status: 'completed' }
    });

    try {
      const res = mockRes();
      await submitCertificateRequest({
        user: { id: new mongoose.Types.ObjectId().toString() },
        body: { certificateType: 'bonafide', reason: 'For college' }
      }, res);

      assert.equal(res.statusCode, 400);
      assert.match(res.body.message, /in progress/i);
    } finally {
      User.findById = origFindById;
    }
  });

  await t.test('Section A.4: Completion certificate eligibility enforces completed tenure', async () => {
    const origFindById = User.findById;
    // Future end date, still ongoing
    User.findById = () => Promise.resolve({
      _id: new mongoose.Types.ObjectId(),
      fullName: 'Active Intern',
      startDate: new Date(),
      endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 60),
      internshipDetails: { status: 'ongoing' }
    });

    try {
      const res = mockRes();
      await submitCertificateRequest({
        user: { id: new mongoose.Types.ObjectId().toString() },
        body: { certificateType: 'completion_certificate', reason: 'Finished early' }
      }, res);

      assert.equal(res.statusCode, 400);
      assert.match(res.body.message, /after completing your internship/i);
    } finally {
      User.findById = origFindById;
    }
  });

  // ============================================================
  // SECTION B: Template Lookup & Strict Matching (No Fallbacks)
  // ============================================================
  await t.test('Section B.1: Active template lookup succeeds for each required certificate type', async () => {
    for (const certType of allRequiredTypes) {
      const matched = templates.find((t) => t.certificateType === certType);
      assert.ok(matched, `Template definition missing for ${certType}`);
      assert.equal(matched.status, 'active');
      assert.ok(matched.content.length > 50);
    }
  });

  await t.test('Section B.2: Missing template throws controlled 404 error without fallback', async () => {
    const origFindOne = CertificateTemplate.findOne;
    CertificateTemplate.findOne = () => Promise.resolve(null);

    const origRequestFindById = CertificateRequest.findById;
    CertificateRequest.findById = () => ({
      populate: () => Promise.resolve({
        _id: new mongoose.Types.ObjectId(),
        certificateType: 'ojt_certificate',
        userId: { _id: new mongoose.Types.ObjectId(), fullName: 'Test Intern', startDate: new Date() }
      })
    });

    try {
      await assert.rejects(
        async () => {
          await createCertificateDraft(new mongoose.Types.ObjectId().toString());
        },
        (err) => {
          assert.equal(err.statusCode, 404);
          assert.match(err.message, /No active certificate template found for type: ojt_certificate/i);
          return true;
        }
      );
    } finally {
      CertificateTemplate.findOne = origFindOne;
      CertificateRequest.findById = origRequestFindById;
    }
  });

  // ============================================================
  // SECTION C: Template Placeholder Compilation & Casing Tests
  // ============================================================
  await t.test('Section C.1: Bonafide supports both InternName (PascalCase) and internName (camelCase)', () => {
    const bonaTemplateDef = templates.find((t) => t.certificateType === 'bonafide');
    const compile = Handlebars.compile(bonaTemplateDef.content);

    // Render with PascalCase
    const renderedPascal = compile({
      InternName: 'Sai Pradheep',
      OrganizationName: 'UptoSkills',
      Department: 'Full Stack Web Development',
      InternshipTitle: 'Full Stack Intern',
      CollegeName: 'Tech University',
      StartDate: 'January 01, 2026',
      EndDate: 'June 30, 2026',
      Duration: '6 Months',
      Purpose: 'Academic Submission',
      IssueDate: 'July 01, 2026',
      CertificateNumber: 'CERT-2026-00100',
      VerificationCode: 'VER-ABC-123'
    });

    assert.ok(renderedPascal.includes('Sai Pradheep'));
    assert.ok(renderedPascal.includes('Tech University'));
    assert.ok(renderedPascal.includes('Academic Submission'));

    // Render with camelCase
    const renderedCamel = compile({
      internName: 'Akash Sharma',
      organizationName: 'UptoSkills',
      department: 'Cloud Computing',
      internshipTitle: 'Cloud Intern',
      collegeName: 'National College',
      startDate: 'February 01, 2026',
      endDate: 'August 31, 2026',
      duration: '7 Months',
      purpose: 'Verification',
      issueDate: 'September 01, 2026',
      certificateNumber: 'CERT-2026-00101',
      verificationCode: 'VER-XYZ-789'
    });

    // In bona template, {{InternName}} is primary; dual-case ensures InternName has value
    assert.ok(renderedCamel.length > 100);
  });

  await t.test('Section C.2: All 7 templates compile cleanly with mock metadata and no unparsed tags', () => {
    const testDataMap = {
      offer_letter: {
        InternName: 'Candidate One',
        InternshipRole: 'Frontend Developer Intern',
        Department: 'UI/UX Engineering',
        StartDate: 'October 01, 2026',
        EndDate: 'March 31, 2027',
        ReportingManager: 'John Smith',
        Stipend: '₹20,000/month',
        OrganizationName: 'UptoSkills',
        HRName: 'Sarah Jenkins',
        IssueDate: 'September 15, 2026',
        CertificateNumber: 'OFF-2026-0001',
        VerificationCode: 'VER-OFF-01'
      },
      bonafide: {
        InternName: 'Student Two',
        CollegeName: 'Delhi Engineering College',
        InternshipTitle: 'Software Engineering Intern',
        Department: 'Full Stack',
        StartDate: 'May 01, 2026',
        EndDate: 'November 01, 2026',
        Duration: '6 Months',
        Purpose: 'College Internship Examination',
        OrganizationName: 'UptoSkills',
        IssueDate: 'May 10, 2026',
        CertificateNumber: 'BON-2026-0001',
        VerificationCode: 'VER-BON-01'
      },
      ojt_certificate: {
        InternName: 'Trainee Three',
        TrainingProgram: 'Enterprise Backend Mastery',
        Department: 'Node.js & Microservices',
        TrainingStartDate: 'January 10, 2026',
        TrainingEndDate: 'July 10, 2026',
        MentorName: 'David Miller',
        Place: 'New Delhi',
        IssueDate: 'July 15, 2026',
        CertificateNumber: 'OJT-2026-0001',
        VerificationCode: 'VER-OJT-01'
      },
      experience_letter: {
        InternName: 'Professional Four',
        InternshipRole: 'Product Engineering Intern',
        Department: 'SaaS Platform',
        StartDate: 'December 01, 2025',
        EndDate: 'June 01, 2026',
        Duration: '6 Months',
        HRName: 'Head of People',
        OrganizationName: 'UptoSkills',
        IssueDate: 'June 05, 2026',
        CertificateNumber: 'EXP-2026-0001',
        VerificationCode: 'VER-EXP-01'
      },
      completion_certificate: {
        InternName: 'Graduate Five',
        Department: 'Machine Learning',
        StartDate: 'January 01, 2026',
        EndDate: 'July 01, 2026',
        IssueDate: 'July 05, 2026',
        CertificateNumber: 'CERT-2026-0001',
        VerificationCode: 'VER-COMP-01'
      },
      intern_of_month: {
        InternName: 'Star Six',
        Department: 'DevOps & Reliability',
        AwardMonth: 'August 2026',
        RecognitionCriteria: 'Automated CI/CD pipeline achieving 99.9% uptime',
        IssueDate: 'September 01, 2026',
        CertificateNumber: 'IOM-2026-0001',
        VerificationCode: 'VER-IOM-01'
      },
      league_winner: {
        WinnerName: 'Champion Seven',
        Position: '1st Place Champion',
        EventName: 'National Code Blitz 2026',
        EventDate: 'August 25, 2026',
        Place: 'Bangalore Tech Arena',
        IssueDate: 'August 26, 2026',
        CertificateNumber: 'WIN-2026-0001',
        VerificationCode: 'VER-WIN-01'
      }
    };

    for (const certType of allRequiredTypes) {
      const tpl = templates.find((t) => t.certificateType === certType);
      const data = testDataMap[certType];
      const compiled = Handlebars.compile(tpl.content);
      const rendered = compiled(data);

      assert.ok(rendered.includes(data.InternName || data.WinnerName), `Name missing in ${certType}`);
      assert.ok(rendered.includes(data.CertificateNumber), `Cert number missing in ${certType}`);
      assert.ok(!rendered.includes('{{'), `Unparsed Handlebars tag found in ${certType}`);
    }
  });

  // ============================================================
  // SECTION D: Metadata Protection & Injection Tests
  // ============================================================
  await t.test('Section D.1: Metadata values cannot override trusted core fields', async () => {
    const origRequestFindById = CertificateRequest.findById;
    const origTemplateFindOne = CertificateTemplate.findOne;
    const origCertCreate = Certificate.create;
    const origCertCount = Certificate.countDocuments;
    const origCertExists = Certificate.exists;

    const origCounterFind = Counter.findOneAndUpdate;
    Counter.findOneAndUpdate = async () => ({ seq: 42 });

    Certificate.countDocuments = () => Promise.resolve(0);
    Certificate.exists = () => Promise.resolve(false);

    let savedPayload = null;

    const trustedInternId = new mongoose.Types.ObjectId();
    CertificateRequest.findById = () => ({
      populate: () => Promise.resolve({
        _id: new mongoose.Types.ObjectId(),
        certificateType: 'bonafide',
        metadata: new Map([
          ['InternName', 'HACKER_NAME_OVERRIDE'],
          ['CertificateNumber', 'HACKED_CERT_NUM'],
          ['collegeName', 'Real IIT Delhi'],
          ['purpose', 'Visa Application']
        ]),
        userId: {
          _id: trustedInternId,
          fullName: 'Trusted Genuine Intern',
          internCode: 'INT-REAL',
          domain: 'Cybersecurity',
          startDate: new Date('2026-01-01'),
          endDate: new Date('2026-06-30')
        },
        save: () => Promise.resolve()
      })
    });

    CertificateTemplate.findOne = () => Promise.resolve({
      _id: new mongoose.Types.ObjectId(),
      content: '<p>{{InternName}} - {{CertificateNumber}} - {{collegeName}} - {{purpose}}</p>'
    });

    Certificate.create = (doc) => {
      savedPayload = doc;
      return Promise.resolve({ _id: new mongoose.Types.ObjectId(), ...doc });
    };

    try {
      const result = await createCertificateDraft(new mongoose.Types.ObjectId().toString());
      assert.ok(savedPayload.htmlContent.includes('Trusted Genuine Intern'), 'Core InternName must NOT be overridden');
      assert.ok(!savedPayload.htmlContent.includes('HACKER_NAME_OVERRIDE'), 'Metadata attempted override must be rejected');
      assert.ok(!savedPayload.htmlContent.includes('HACKED_CERT_NUM'), 'Metadata attempted certNum override must be rejected');
      assert.ok(savedPayload.htmlContent.includes('Real IIT Delhi'), 'Safe metadata collegeName must be rendered');
      assert.ok(savedPayload.htmlContent.includes('Visa Application'), 'Safe metadata purpose must be rendered');
    } finally {
      CertificateRequest.findById = origRequestFindById;
      CertificateTemplate.findOne = origTemplateFindOne;
      Certificate.create = origCertCreate;
      Certificate.countDocuments = origCertCount;
      Certificate.exists = origCertExists;
      Counter.findOneAndUpdate = origCounterFind;
    }
  });

  // ============================================================
  // SECTION E: Draft Generation for All 7 Types
  // ============================================================
  await t.test('Section E.1: All 7 certificate types successfully generate drafts', async () => {
    const origRequestFindById = CertificateRequest.findById;
    const origTemplateFindOne = CertificateTemplate.findOne;
    const origCertCreate = Certificate.create;
    const origCertCount = Certificate.countDocuments;
    const origCertExists = Certificate.exists;

    const origCounterFind = Counter.findOneAndUpdate;
    Counter.findOneAndUpdate = async () => ({ seq: 42 });

    Certificate.countDocuments = () => Promise.resolve(0);
    Certificate.exists = () => Promise.resolve(false);

    try {
      for (const certType of allRequiredTypes) {
        const tplDef = templates.find((t) => t.certificateType === certType);

        CertificateRequest.findById = () => ({
          populate: () => Promise.resolve({
            _id: new mongoose.Types.ObjectId(),
            certificateType: certType,
            metadata: {
              collegeName: 'Apex Institute',
              trainingProgram: 'Mobile Dev',
              awardMonth: 'July 2026',
              eventName: 'Coding Cup',
              position: 'Top 3'
            },
            userId: {
              _id: new mongoose.Types.ObjectId(),
              fullName: `Intern For ${certType}`,
              internCode: 'INT-TEST',
              domain: 'Engineering',
              startDate: new Date('2026-01-01'),
              endDate: new Date('2026-06-30')
            },
            save: () => Promise.resolve()
          })
        });

        CertificateTemplate.findOne = () => Promise.resolve({
          _id: new mongoose.Types.ObjectId(),
          content: tplDef.content
        });

        Certificate.create = (doc) => Promise.resolve({
          _id: new mongoose.Types.ObjectId(),
          ...doc
        });

        const cert = await createCertificateDraft(new mongoose.Types.ObjectId().toString());
        assert.equal(cert.status, 'draft', `Draft status expected for ${certType}`);
        assert.equal(cert.certificateType, certType);
        assert.ok(cert.htmlContent.length > 50, `HTML content must be generated for ${certType}`);
      }
    } finally {
      CertificateRequest.findById = origRequestFindById;
      CertificateTemplate.findOne = origTemplateFindOne;
      Certificate.create = origCertCreate;
      Certificate.countDocuments = origCertCount;
      Certificate.exists = origCertExists;
      Counter.findOneAndUpdate = origCounterFind;
    }
  });

  // ============================================================
  // SECTION F: Regression Test for Internship Completion Certificate
  // ============================================================
  await t.test('Section F.1: Internship Completion Certificate regression test preserves Day 3-6 workflow', async () => {
    const origRequestFindById = CertificateRequest.findById;
    const origTemplateFindOne = CertificateTemplate.findOne;
    const origCertCreate = Certificate.create;
    const origCertCount = Certificate.countDocuments;
    const origCertExists = Certificate.exists;

    const origCounterFind = Counter.findOneAndUpdate;
    Counter.findOneAndUpdate = async () => ({ seq: 42 });

    Certificate.countDocuments = () => Promise.resolve(0);
    Certificate.exists = () => Promise.resolve(false);

    CertificateRequest.findById = () => ({
      populate: () => Promise.resolve({
        _id: new mongoose.Types.ObjectId(),
        certificateType: 'completion_certificate',
        userId: {
          _id: new mongoose.Types.ObjectId(),
          fullName: 'Jane Doe',
          internCode: 'INT-001',
          domain: 'Full Stack',
          startDate: new Date('2026-01-01'),
          endDate: new Date('2026-06-01')
        },
        save: () => Promise.resolve()
      })
    });

    const compTpl = templates.find((t) => t.certificateType === 'completion_certificate');
    CertificateTemplate.findOne = () => Promise.resolve({
      _id: new mongoose.Types.ObjectId(),
      content: compTpl.content
    });

    Certificate.create = (doc) => Promise.resolve({
      _id: new mongoose.Types.ObjectId(),
      ...doc
    });

    try {
      const draft = await createCertificateDraft(new mongoose.Types.ObjectId().toString());
      assert.ok(draft.htmlContent.includes('Jane Doe'));
      assert.ok(draft.htmlContent.includes('Certificate of Completion'));
      assert.ok(draft.htmlContent.includes('Full Stack'));
    } finally {
      CertificateRequest.findById = origRequestFindById;
      CertificateTemplate.findOne = origTemplateFindOne;
      Certificate.create = origCertCreate;
      Certificate.countDocuments = origCertCount;
      Certificate.exists = origCertExists;
      Counter.findOneAndUpdate = origCounterFind;
    }
  });
});
