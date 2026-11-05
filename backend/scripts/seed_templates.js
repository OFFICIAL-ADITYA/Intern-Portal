import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'dns';
import CertificateTemplate from '../src/models/CertificateTemplate.js';
import User from '../src/models/User.js';

// Ensure DNS resolvers work in all network environments
dns.setServers(['8.8.8.8', '1.1.1.1']);
dotenv.config();

export const templates = [
  {
    templateCode: 'TPL-COMP-01',
    templateName: 'Internship Completion Certificate',
    certificateType: 'completion_certificate',
    title: 'Certificate of Internship Completion',
    description: 'Official verified credential for successful internship completion.',
    placeholders: [
      'InternName', 'internName', 'CertificateNumber', 'certificateNumber',
      'Department', 'department', 'StartDate', 'startDate',
      'EndDate', 'endDate', 'IssueDate', 'issueDate',
      'InternCode', 'internCode', 'CertificateType', 'VerificationCode'
    ],
    status: 'active',
    version: 1,
    content: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { margin: 0; padding: 0; background: #fafafa; font-family: 'Georgia', serif; }
    .cert-container {
      width: 1000px;
      height: 680px;
      margin: 0 auto;
      padding: 40px;
      border: 14px solid #14162e;
      outline: 3px solid #c9a84c;
      outline-offset: -8px;
      background: #ffffff;
      text-align: center;
      box-sizing: border-box;
      position: relative;
    }
    .header { font-size: 13px; text-transform: uppercase; letter-spacing: 3px; color: #888; margin-top: 15px; font-family: Arial, sans-serif; }
    .title { font-size: 38px; color: #14162e; margin: 20px 0 10px; font-weight: bold; }
    .sub { font-size: 16px; color: #666; margin-bottom: 20px; font-style: italic; }
    .name { font-size: 34px; color: #1e3a8a; margin: 10px 0 18px; border-bottom: 2px solid #c9a84c; display: inline-block; padding-bottom: 6px; }
    .body-text { font-size: 15px; line-height: 1.8; color: #444; max-width: 780px; margin: 0 auto; font-family: Arial, sans-serif; }
    .footer { margin-top: 45px; display: flex; justify-content: space-around; padding: 0 40px; font-family: Arial, sans-serif; }
    .sig-box { border-top: 1px solid #aaa; width: 220px; padding-top: 8px; font-size: 12px; color: #666; }
    .sig-name { color: #14162e; font-weight: bold; font-size: 13px; margin-top: 4px; }
    .meta-id { position: absolute; bottom: 20px; left: 40px; font-size: 12px; color: #888; font-family: monospace; }
  </style>
</head>
<body>
  <div class="cert-container">
    <div class="header">UPTOSKILLS VERIFIED CREDENTIAL</div>
    <div class="title">Certificate of Completion</div>
    <div class="sub">This is to proudly certify that</div>
    <div class="name">{{InternName}}</div>
    <div class="body-text">
      has successfully completed an intensive internship program in <strong>{{Department}}</strong> from <strong>{{StartDate}}</strong> to <strong>{{EndDate}}</strong>, demonstrating exemplary professional dedication, initiative, and high-impact contributions.
    </div>
    <div class="footer">
      <div class="sig-box">Authorized Signature<div class="sig-name">Director of Internship Programs</div></div>
      <div class="sig-box">Date of Issue<div class="sig-name">{{IssueDate}}</div></div>
    </div>
    <div class="meta-id">Certificate ID: {{CertificateNumber}} | Verification: {{VerificationCode}}</div>
  </div>
</body>
</html>`
  },
  {
    templateCode: 'TPL-BONA-01',
    templateName: 'Bonafide Certificate',
    certificateType: 'bonafide',
    title: 'Bonafide Certificate of Internship',
    description: 'Official bonafide certification verifying active internship status and educational enrollment.',
    placeholders: [
      'InternName', 'internName', 'CollegeName', 'collegeName',
      'Purpose', 'purpose', 'InternshipTitle', 'internshipTitle',
      'Department', 'department', 'StartDate', 'startDate',
      'EndDate', 'endDate', 'Duration', 'duration',
      'OrganizationName', 'organizationName', 'IssueDate', 'issueDate',
      'CertificateNumber', 'VerificationCode'
    ],
    status: 'active',
    version: 1,
    content: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { margin: 0; padding: 0; background: #fafafa; font-family: 'Georgia', serif; }
    .cert-container {
      width: 1000px;
      height: 680px;
      margin: 0 auto;
      padding: 40px;
      border: 14px solid #14162e;
      outline: 3px solid #2563eb;
      outline-offset: -8px;
      background: #ffffff;
      text-align: center;
      box-sizing: border-box;
      position: relative;
    }
    .header { font-size: 13px; text-transform: uppercase; letter-spacing: 3px; color: #64748b; margin-top: 15px; font-family: Arial, sans-serif; }
    .title { font-size: 38px; color: #1e3a8a; margin: 20px 0 10px; font-weight: bold; }
    .sub { font-size: 16px; color: #64748b; margin-bottom: 20px; font-style: italic; }
    .name { font-size: 34px; color: #0f172a; margin: 10px 0 18px; border-bottom: 2px solid #2563eb; display: inline-block; padding-bottom: 6px; }
    .body-text { font-size: 15px; line-height: 1.8; color: #334155; max-width: 780px; margin: 0 auto; font-family: Arial, sans-serif; }
    .footer { margin-top: 45px; display: flex; justify-content: space-around; padding: 0 40px; font-family: Arial, sans-serif; }
    .sig-box { border-top: 1px solid #cbd5e1; width: 220px; padding-top: 8px; font-size: 12px; color: #64748b; }
    .sig-name { color: #1e293b; font-weight: bold; font-size: 13px; margin-top: 4px; }
    .meta-id { position: absolute; bottom: 20px; left: 40px; font-size: 12px; color: #64748b; font-family: monospace; }
  </style>
</head>
<body>
  <div class="cert-container">
    <div class="header">UPTOSKILLS VERIFIED BONAFIDE CREDENTIAL</div>
    <div class="title">Bonafide Certificate</div>
    <div class="sub">This is to officially certify that</div>
    <div class="name">{{InternName}}</div>
    <div class="body-text">
      is a bonafide intern at <strong>{{OrganizationName}}</strong>, currently undertaking practical internship training in the <strong>{{Department}}</strong> division as <strong>{{InternshipTitle}}</strong>{{#if CollegeName}} from <strong>{{CollegeName}}</strong>{{/if}}. The internship tenure is from <strong>{{StartDate}}</strong> to <strong>{{EndDate}}</strong> ({{Duration}}). This certificate is issued for <strong>{{Purpose}}</strong> upon formal request.
    </div>
    <div class="footer">
      <div class="sig-box">Authorized Signature<div class="sig-name">Director of Training</div></div>
      <div class="sig-box">Date of Issue<div class="sig-name">{{IssueDate}}</div></div>
    </div>
    <div class="meta-id">Certificate ID: {{CertificateNumber}} | Verification: {{VerificationCode}}</div>
  </div>
</body>
</html>`
  },
  {
    templateCode: 'TPL-OFFER-01',
    templateName: 'Internship Offer Letter',
    certificateType: 'offer_letter',
    title: 'Internship Offer Letter',
    description: 'Official offer letter detailing role, department, tenure, and joining terms.',
    placeholders: [
      'InternName', 'internName', 'InternshipRole', 'internshipRole',
      'Department', 'department', 'StartDate', 'startDate',
      'EndDate', 'endDate', 'Duration', 'duration',
      'Stipend', 'stipend', 'ReportingManager', 'reportingManager',
      'JoiningDate', 'joiningDate', 'JoiningGuidelines', 'OrganizationName',
      'HRName', 'IssueDate', 'CertificateNumber', 'VerificationCode'
    ],
    status: 'active',
    version: 1,
    content: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { margin: 0; padding: 0; background: #fafafa; font-family: 'Georgia', serif; }
    .cert-container {
      width: 1000px;
      height: 680px;
      margin: 0 auto;
      padding: 40px;
      border: 14px solid #14162e;
      outline: 3px solid #059669;
      outline-offset: -8px;
      background: #ffffff;
      text-align: center;
      box-sizing: border-box;
      position: relative;
    }
    .header { font-size: 13px; text-transform: uppercase; letter-spacing: 3px; color: #64748b; margin-top: 15px; font-family: Arial, sans-serif; }
    .title { font-size: 38px; color: #065f46; margin: 20px 0 10px; font-weight: bold; }
    .sub { font-size: 16px; color: #64748b; margin-bottom: 20px; font-style: italic; }
    .name { font-size: 34px; color: #0f172a; margin: 10px 0 18px; border-bottom: 2px solid #059669; display: inline-block; padding-bottom: 6px; }
    .body-text { font-size: 15px; line-height: 1.8; color: #334155; max-width: 780px; margin: 0 auto; font-family: Arial, sans-serif; }
    .footer { margin-top: 45px; display: flex; justify-content: space-around; padding: 0 40px; font-family: Arial, sans-serif; }
    .sig-box { border-top: 1px solid #cbd5e1; width: 220px; padding-top: 8px; font-size: 12px; color: #64748b; }
    .sig-name { color: #1e293b; font-weight: bold; font-size: 13px; margin-top: 4px; }
    .meta-id { position: absolute; bottom: 20px; left: 40px; font-size: 12px; color: #64748b; font-family: monospace; }
  </style>
</head>
<body>
  <div class="cert-container">
    <div class="header">UPTOSKILLS OFFICIAL APPOINTMENT CREDENTIAL</div>
    <div class="title">Internship Offer Letter</div>
    <div class="sub">We are pleased to extend this official appointment offer to</div>
    <div class="name">{{InternName}}</div>
    <div class="body-text">
      as <strong>{{InternshipRole}}</strong> in the <strong>{{Department}}</strong> department at <strong>{{OrganizationName}}</strong>. Your tenure commences on <strong>{{StartDate}}</strong> and extends through <strong>{{EndDate}}</strong>.{{#if ReportingManager}} You will be reporting directly to <strong>{{ReportingManager}}</strong>.{{/if}}{{#if Stipend}} Monthly remuneration: <strong>{{Stipend}}</strong>.{{/if}}{{#if JoiningGuidelines}} {{JoiningGuidelines}}{{/if}} We warmly welcome you to our professional team.
    </div>
    <div class="footer">
      <div class="sig-box">Authorized Human Resources<div class="sig-name">{{HRName}}</div></div>
      <div class="sig-box">Date of Issuance<div class="sig-name">{{IssueDate}}</div></div>
    </div>
    <div class="meta-id">Offer Reference: {{CertificateNumber}} | Verification: {{VerificationCode}}</div>
  </div>
</body>
</html>`
  },
  {
    templateCode: 'TPL-OJT-01',
    templateName: 'On-the-Job Training Certificate',
    certificateType: 'ojt_certificate',
    title: 'On-the-Job Training Certificate',
    description: 'Certification of completion for structured on-the-job training programs.',
    placeholders: [
      'InternName', 'internName', 'TrainingProgram', 'trainingProgram',
      'Department', 'department', 'TrainingStartDate', 'TrainingEndDate',
      'MentorName', 'mentorName', 'PerformanceDetails', 'performanceDetails',
      'Place', 'place', 'IssueDate', 'CertificateNumber', 'VerificationCode'
    ],
    status: 'active',
    version: 1,
    content: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { margin: 0; padding: 0; background: #fafafa; font-family: 'Georgia', serif; }
    .cert-container {
      width: 1000px;
      height: 680px;
      margin: 0 auto;
      padding: 40px;
      border: 14px solid #14162e;
      outline: 3px solid #7c3aed;
      outline-offset: -8px;
      background: #ffffff;
      text-align: center;
      box-sizing: border-box;
      position: relative;
    }
    .header { font-size: 13px; text-transform: uppercase; letter-spacing: 3px; color: #64748b; margin-top: 15px; font-family: Arial, sans-serif; }
    .title { font-size: 38px; color: #5b21b6; margin: 20px 0 10px; font-weight: bold; }
    .sub { font-size: 16px; color: #64748b; margin-bottom: 20px; font-style: italic; }
    .name { font-size: 34px; color: #0f172a; margin: 10px 0 18px; border-bottom: 2px solid #7c3aed; display: inline-block; padding-bottom: 6px; }
    .body-text { font-size: 15px; line-height: 1.8; color: #334155; max-width: 780px; margin: 0 auto; font-family: Arial, sans-serif; }
    .footer { margin-top: 45px; display: flex; justify-content: space-around; padding: 0 40px; font-family: Arial, sans-serif; }
    .sig-box { border-top: 1px solid #cbd5e1; width: 220px; padding-top: 8px; font-size: 12px; color: #64748b; }
    .sig-name { color: #1e293b; font-weight: bold; font-size: 13px; margin-top: 4px; }
    .meta-id { position: absolute; bottom: 20px; left: 40px; font-size: 12px; color: #64748b; font-family: monospace; }
  </style>
</head>
<body>
  <div class="cert-container">
    <div class="header">UPTOSKILLS PRACTICAL APPRENTICESHIP DIVISION</div>
    <div class="title">On-the-Job Training Certificate</div>
    <div class="sub">This credential is proudly awarded to</div>
    <div class="name">{{InternName}}</div>
    <div class="body-text">
      for successfully completing comprehensive On-the-Job Training in the <strong>{{TrainingProgram}}</strong> within the <strong>{{Department}}</strong> department from <strong>{{TrainingStartDate}}</strong> to <strong>{{TrainingEndDate}}</strong>{{#if MentorName}} under the technical guidance of mentor <strong>{{MentorName}}</strong>{{/if}}. Demonstrated commendable problem-solving capability, operational discipline, and technical proficiency.
    </div>
    <div class="footer">
      <div class="sig-box">Training Lead / Mentor<div class="sig-name">{{#if MentorName}}{{MentorName}}{{else}}Technical Supervisor{{/if}}</div></div>
      <div class="sig-box">Date of Issue ({{Place}})<div class="sig-name">{{IssueDate}}</div></div>
    </div>
    <div class="meta-id">OJT Credential ID: {{CertificateNumber}} | Verification: {{VerificationCode}}</div>
  </div>
</body>
</html>`
  },
  {
    templateCode: 'TPL-EXP-01',
    templateName: 'Internship Experience Letter',
    certificateType: 'experience_letter',
    title: 'Internship Experience Certificate',
    description: 'Official certificate of work experience and professional conduct.',
    placeholders: [
      'InternName', 'internName', 'InternshipRole', 'internshipRole',
      'Department', 'department', 'StartDate', 'startDate',
      'EndDate', 'endDate', 'Duration', 'duration',
      'ManagerName', 'managerName', 'HRName', 'hrName',
      'OrganizationName', 'IssueDate', 'CertificateNumber', 'VerificationCode'
    ],
    status: 'active',
    version: 1,
    content: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { margin: 0; padding: 0; background: #fafafa; font-family: 'Georgia', serif; }
    .cert-container {
      width: 1000px;
      height: 680px;
      margin: 0 auto;
      padding: 40px;
      border: 14px solid #14162e;
      outline: 3px solid #0284c7;
      outline-offset: -8px;
      background: #ffffff;
      text-align: center;
      box-sizing: border-box;
      position: relative;
    }
    .header { font-size: 13px; text-transform: uppercase; letter-spacing: 3px; color: #64748b; margin-top: 15px; font-family: Arial, sans-serif; }
    .title { font-size: 38px; color: #0369a1; margin: 20px 0 10px; font-weight: bold; }
    .sub { font-size: 16px; color: #64748b; margin-bottom: 20px; font-style: italic; }
    .name { font-size: 34px; color: #0f172a; margin: 10px 0 18px; border-bottom: 2px solid #0284c7; display: inline-block; padding-bottom: 6px; }
    .body-text { font-size: 15px; line-height: 1.8; color: #334155; max-width: 780px; margin: 0 auto; font-family: Arial, sans-serif; }
    .footer { margin-top: 45px; display: flex; justify-content: space-around; padding: 0 40px; font-family: Arial, sans-serif; }
    .sig-box { border-top: 1px solid #cbd5e1; width: 220px; padding-top: 8px; font-size: 12px; color: #64748b; }
    .sig-name { color: #1e293b; font-weight: bold; font-size: 13px; margin-top: 4px; }
    .meta-id { position: absolute; bottom: 20px; left: 40px; font-size: 12px; color: #64748b; font-family: monospace; }
  </style>
</head>
<body>
  <div class="cert-container">
    <div class="header">UPTOSKILLS VERIFIED PROFESSIONAL SERVICE</div>
    <div class="title">Experience Certificate</div>
    <div class="sub">TO WHOMSOEVER IT MAY CONCERN</div>
    <div class="name">{{InternName}}</div>
    <div class="body-text">
      This is to certify that <strong>{{InternName}}</strong> worked with <strong>{{OrganizationName}}</strong> as <strong>{{InternshipRole}}</strong> in the <strong>{{Department}}</strong> department from <strong>{{StartDate}}</strong> to <strong>{{EndDate}}</strong> ({{Duration}}). During this tenure, their professional conduct was exemplary and their contributions to our projects were highly commendable. We wish them all success in future endeavors.
    </div>
    <div class="footer">
      <div class="sig-box">Head of Human Resources<div class="sig-name">{{HRName}}</div></div>
      <div class="sig-box">Date of Issue<div class="sig-name">{{IssueDate}}</div></div>
    </div>
    <div class="meta-id">Certificate ID: {{CertificateNumber}} | Verification: {{VerificationCode}}</div>
  </div>
</body>
</html>`
  },
  {
    templateCode: 'TPL-IOM-01',
    templateName: 'Intern of the Month Certificate',
    certificateType: 'intern_of_month',
    title: 'Intern of the Month Award',
    description: 'Prestigious award recognizing outstanding performance and team leadership.',
    placeholders: [
      'InternName', 'internName', 'Department', 'department',
      'AwardMonth', 'awardMonth', 'PerformanceDetails', 'performanceDetails',
      'RecognitionCriteria', 'recognitionCriteria', 'IssueDate',
      'CertificateNumber', 'VerificationCode', 'OrganizationName'
    ],
    status: 'active',
    version: 1,
    content: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { margin: 0; padding: 0; background: #fafafa; font-family: 'Georgia', serif; }
    .cert-container {
      width: 1000px;
      height: 680px;
      margin: 0 auto;
      padding: 40px;
      border: 14px solid #14162e;
      outline: 3px solid #d97706;
      outline-offset: -8px;
      background: #ffffff;
      text-align: center;
      box-sizing: border-box;
      position: relative;
    }
    .header { font-size: 13px; text-transform: uppercase; letter-spacing: 3px; color: #b45309; margin-top: 15px; font-family: Arial, sans-serif; font-weight: bold; }
    .title { font-size: 38px; color: #92400e; margin: 20px 0 10px; font-weight: bold; }
    .sub { font-size: 16px; color: #64748b; margin-bottom: 20px; font-style: italic; }
    .name { font-size: 34px; color: #0f172a; margin: 10px 0 18px; border-bottom: 2px solid #d97706; display: inline-block; padding-bottom: 6px; }
    .body-text { font-size: 15px; line-height: 1.8; color: #334155; max-width: 780px; margin: 0 auto; font-family: Arial, sans-serif; }
    .footer { margin-top: 45px; display: flex; justify-content: space-around; padding: 0 40px; font-family: Arial, sans-serif; }
    .sig-box { border-top: 1px solid #cbd5e1; width: 220px; padding-top: 8px; font-size: 12px; color: #64748b; }
    .sig-name { color: #1e293b; font-weight: bold; font-size: 13px; margin-top: 4px; }
    .meta-id { position: absolute; bottom: 20px; left: 40px; font-size: 12px; color: #64748b; font-family: monospace; }
  </style>
</head>
<body>
  <div class="cert-container">
    <div class="header">★ UPTOSKILLS DISTINGUISHED PERFORMANCE RECOGNITION ★</div>
    <div class="title">Intern of the Month</div>
    <div class="sub">This honor is proudly conferred upon</div>
    <div class="name">{{InternName}}</div>
    <div class="body-text">
      in recognition of extraordinary diligence, leadership, and outstanding contributions in the <strong>{{Department}}</strong> department for the month of <strong>{{AwardMonth}}</strong>.{{#if RecognitionCriteria}} {{RecognitionCriteria}}{{/if}} Your initiative and commitment set a shining benchmark for all peers.
    </div>
    <div class="footer">
      <div class="sig-box">Program Director<div class="sig-name">UptoSkills Leadership Council</div></div>
      <div class="sig-box">Date of Conformance<div class="sig-name">{{IssueDate}}</div></div>
    </div>
    <div class="meta-id">Honors ID: {{CertificateNumber}} | Verification: {{VerificationCode}}</div>
  </div>
</body>
</html>`
  },
  {
    templateCode: 'TPL-LEAG-01',
    templateName: 'League Winner Certificate',
    certificateType: 'league_winner',
    title: 'League Winner Award',
    description: 'Championship award recognizing top performance in organizational leagues and competitions.',
    placeholders: [
      'WinnerName', 'winnerName', 'InternName', 'internName',
      'EventName', 'eventName', 'Position', 'position',
      'EventDate', 'eventDate', 'Place', 'place',
      'IssueDate', 'CertificateNumber', 'VerificationCode', 'OrganizationName'
    ],
    status: 'active',
    version: 1,
    content: `<!DOCTYPE html>
<html>
<head>
  <style>
    body { margin: 0; padding: 0; background: #fafafa; font-family: 'Georgia', serif; }
    .cert-container {
      width: 1000px;
      height: 680px;
      margin: 0 auto;
      padding: 40px;
      border: 14px solid #14162e;
      outline: 3px solid #dc2626;
      outline-offset: -8px;
      background: #ffffff;
      text-align: center;
      box-sizing: border-box;
      position: relative;
    }
    .header { font-size: 13px; text-transform: uppercase; letter-spacing: 3px; color: #991b1b; margin-top: 15px; font-family: Arial, sans-serif; font-weight: bold; }
    .title { font-size: 38px; color: #7f1d1d; margin: 20px 0 10px; font-weight: bold; }
    .sub { font-size: 16px; color: #64748b; margin-bottom: 20px; font-style: italic; }
    .name { font-size: 34px; color: #0f172a; margin: 10px 0 18px; border-bottom: 2px solid #dc2626; display: inline-block; padding-bottom: 6px; }
    .body-text { font-size: 15px; line-height: 1.8; color: #334155; max-width: 780px; margin: 0 auto; font-family: Arial, sans-serif; }
    .footer { margin-top: 45px; display: flex; justify-content: space-around; padding: 0 40px; font-family: Arial, sans-serif; }
    .sig-box { border-top: 1px solid #cbd5e1; width: 220px; padding-top: 8px; font-size: 12px; color: #64748b; }
    .sig-name { color: #1e293b; font-weight: bold; font-size: 13px; margin-top: 4px; }
    .meta-id { position: absolute; bottom: 20px; left: 40px; font-size: 12px; color: #64748b; font-family: monospace; }
  </style>
</head>
<body>
  <div class="cert-container">
    <div class="header">🏆 UPTOSKILLS HACKATHON & LEAGUE CHAMPIONSHIP 🏆</div>
    <div class="title">League Winner Certificate</div>
    <div class="sub">Championship victory honors proudly awarded to</div>
    <div class="name">{{WinnerName}}</div>
    <div class="body-text">
      for securing <strong>{{Position}}</strong> in the competitive event <strong>{{EventName}}</strong> held on <strong>{{EventDate}}</strong>{{#if Place}} at <strong>{{Place}}</strong>{{/if}}. Exhibited supreme technical ingenuity, problem solving under pressure, and outstanding championship excellence.
    </div>
    <div class="footer">
      <div class="sig-box">League Commissioner<div class="sig-name">Tournament Jury</div></div>
      <div class="sig-box">Date of Conformance<div class="sig-name">{{IssueDate}}</div></div>
    </div>
    <div class="meta-id">Championship ID: {{CertificateNumber}} | Verification: {{VerificationCode}}</div>
  </div>
</body>
</html>`
  }
];

export async function seedAllTemplates() {
  try {
    if (!process.env.MONGO_URI) {
      console.log('[SEED] MONGO_URI not set.');
      return { success: false, reason: 'MONGO_URI not set' };
    }

    console.log('[SEED] Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });

    const admin = await User.findOne({ role: 'admin' });

    let createdCount = 0;
    let updatedCount = 0;

    for (const tpl of templates) {
      const existing = await CertificateTemplate.findOne({
        $or: [
          { templateCode: tpl.templateCode },
          { certificateType: tpl.certificateType }
        ]
      });

      if (!existing) {
        await CertificateTemplate.create({
          ...tpl,
          createdBy: admin ? admin._id : undefined
        });
        createdCount++;
        console.log(`[SEED] Created template: ${tpl.templateCode} (${tpl.certificateType})`);
      } else {
        existing.templateCode = tpl.templateCode;
        existing.templateName = tpl.templateName;
        existing.certificateType = tpl.certificateType;
        existing.title = tpl.title;
        existing.description = tpl.description;
        existing.content = tpl.content;
        existing.placeholders = tpl.placeholders;
        existing.status = 'active';
        await existing.save();
        updatedCount++;
        console.log(`[SEED] Updated active template: ${tpl.templateCode} (${tpl.certificateType})`);
      }
    }

    console.log(`[SEED] Template seeding finished. Created: ${createdCount}, Updated: ${updatedCount}`);
    return { success: true, createdCount, updatedCount };
  } catch (err) {
    console.error(`[SEED] Seeding error: ${err.message}`);
    return { success: false, error: err.message };
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
}

// Auto-run if executed directly via CLI
if (process.argv[1] && process.argv[1].endsWith('seed_templates.js')) {
  seedAllTemplates();
}
