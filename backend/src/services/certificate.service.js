import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import Handlebars from 'handlebars';
import puppeteer from 'puppeteer';
import QRCode from 'qrcode';

import Certificate from '../models/Certificate.js';
import CertificateRequest from '../models/CertificateRequest.js';
import CertificateTemplate from '../models/CertificateTemplate.js';
import Counter from '../models/Counter.model.js';
import { sendEmail } from '../utils/sendEmail.js';
import { logAction } from '../utils/logAction.js';

/* =========================================================
   CONSTANTS
========================================================= */

const FRONTEND_URL =
  process.env.FRONTEND_URL || 'http://localhost:5173';

/* =========================================================
   CERTIFICATE TITLE MAPPER
========================================================= */

const CERTIFICATE_TITLE_MAP = {
  offer_letter: 'Offer Letter',
  bonafide: 'Bonafide Certificate',
  bonafide_certificate: 'Bonafide Certificate',
  ojt_certificate: 'On-the-Job Training Certificate',
  experience_letter: 'Experience Certificate',
  experience_letter1: 'Experience Certificate',
  experience_letter2: 'Experience Certificate',
  completion_certificate: 'Internship Completion Certificate',
  internship_completion_certificate: 'Internship Completion Certificate',
  intern_of_month: 'Intern of the Month',
  league_winner: 'League Winner Certificate',
  custom: 'Certificate',
};

/**
 * Converts certificateType into the official certificate title.
 */
const getCertificateTitle = (certificateType) => {
  if (!certificateType) {
    return 'Certificate';
  }

  return (
    CERTIFICATE_TITLE_MAP[certificateType] ||
    certificateType
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase())
  );
};

/* =========================================================
   VERIFY ID GENERATOR
========================================================= */

export const generateVerifyId = () => {
  return crypto.randomBytes(6).toString('hex');
};

/* =========================================================
   CERTIFICATE NUMBER
========================================================= */

export const generateCertificateNumber = async () => {
  const year = new Date().getFullYear();

  try {
    const counter = await Counter.findOneAndUpdate(
      { _id: 'certificateNumber' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );

    if (counter && typeof counter.seq === 'number') {
      return `UTS-${year}-${String(counter.seq).padStart(6, '0')}`;
    }
  } catch (err) {
    // Fallback if Counter model query fails or in mock environments
  }

  let count = await Certificate.countDocuments();
  let candidate = `UTS-${year}-${String(count + 1).padStart(6, '0')}`;

  while (await Certificate.exists({ certificateNumber: candidate })) {
    count += 1;
    candidate = `UTS-${year}-${String(count + 1).padStart(6, '0')}`;
  }

  return candidate;
};

/* =========================================================
   VERIFICATION CODE
========================================================= */

const generateVerificationCode = () => {
  return `VER-${Date.now()}-${Math.random()
    .toString(36)
    .substring(2, 8)
    .toUpperCase()}`;
};

/* =========================================================
   DATE FORMATTER
========================================================= */

const formatDate = (date) => {
  if (!date) {
    return '';
  }

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return '';
  }

  return parsedDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

/* =========================================================
   QR CODE GENERATOR
========================================================= */

/**
 * Generates an actual QR code image as a data URL.
 *
 * Example output:
 * data:image/png;base64,iVBORw0KGgoAAAANSUhEUg...
 */
export const generateQrCode = async (verifyId) => {
  const verificationUrl =
    `${FRONTEND_URL}/verify/${encodeURIComponent(verifyId)}`;

  const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, {
    errorCorrectionLevel: 'M',
    type: 'image/png',
    width: 180,
    margin: 2,
  });

  return {
    qrCodeDataUrl,
    verificationUrl,
  };
};

/**
 * Ensures a real, high-contrast scannable <img> tag is rendered
 * for the verification QR code instead of a dummy icon or placeholder box.
 */
export const injectQrCodeImage = (html, qrCodeDataUrl = '') => {
  if (!html || typeof html !== 'string') return html;

  let updated = html;

  // 1. If there is a qr-placeholder-box or dummy qr-box, replace its inner placeholder with the real <img> tag
  if (/<div[^>]*class=["'][^"']*qr-placeholder-box[^"']*["']/i.test(updated)) {
    updated = updated.replace(
      /(<div[^>]*class=["'][^"']*qr-placeholder-box[^"']*["'][^>]*>)([\s\S]*?)(<\/div>)/gi,
      (match, openTag, innerContent, closeTag) => {
        let effectiveUrl = qrCodeDataUrl;
        if (!effectiveUrl) {
          const existingImg = innerContent.match(/<img[^>]+src=["'](data:image\/[^"']+|https?:\/\/[^"']+)["']/i);
          if (existingImg && existingImg[1]) {
            effectiveUrl = existingImg[1];
          }
        }
        if (!effectiveUrl) {
          const titleMatch = openTag.match(/title=["'](?:Verification:\s*)?(data:image\/[^"']+)["']/i);
          if (titleMatch) effectiveUrl = titleMatch[1];
        }

        // If innerContent already has a valid image and no new url provided, don't touch it
        if (!effectiveUrl && /<img[^>]+src=["']data:image/i.test(innerContent)) {
          return match;
        }

        const cleanOpen = openTag
          .replace(/\s*style=["'][^"']*["']/gi, '')
          .replace(/\s*title=["'][^"']*["']/gi, '')
          .replace(
            /class=["']([^"']*)["']/i,
            'class="$1" style="width: 68px; height: 68px; border: 1px solid #d4af37; border-radius: 4px; background: #ffffff; padding: 2px; box-sizing: border-box; display: flex; align-items: center; justify-content: center;"'
          );

        return `${cleanOpen}<img src="${effectiveUrl || ''}" alt="Scan to Verify" class="certificate-qr-code" style="width: 100%; height: 100%; object-fit: contain; display: block;" />${closeTag}`;
      }
    );
  }

  // 2. Also replace standard {{qrCodeUrl}} template placeholders
  if (qrCodeDataUrl) {
    updated = updated.replace(/\{\{\s*qrCodeUrl\s*\}\}/gi, qrCodeDataUrl);
  }

  return updated;
};

/* =========================================================
   HANDLEBARS HELPERS
========================================================= */

Handlebars.registerHelper('formatDate', (date) => {
  return formatDate(date);
});

/* =========================================================
   PUPPETEER BROWSER
========================================================= */

let browserInstance = null;

/**
 * Reuses one Puppeteer browser instead of launching a new
 * browser for every certificate.
 */
const getBrowser = async () => {
  if (browserInstance) {
    try {
      if (browserInstance.connected) {
        return browserInstance;
      }
    } catch {
      browserInstance = null;
    }
  }

  browserInstance = await puppeteer.launch({
    headless: 'new',
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
    ],
  });

  return browserInstance;
};

/* =========================================================
   CREATE CERTIFICATE DRAFT
========================================================= */

/**
 * Creates a certificate draft for an approved CertificateRequest.
 *
 * Important:
 * - Uses active CertificateTemplate
 * - Generates actual QR code
 * - Provides all trusted placeholders
 * - Supports htmlContent and legacy content
 * - Protects trusted fields from metadata overrides
 *
 * @param {string|mongoose.Types.ObjectId} requestId
 * @returns {Promise<Certificate>}
 */
export const createCertificateDraft = async (requestId) => {
  const request = await CertificateRequest.findById(requestId).populate(
    'userId'
  );

  if (!request) {
    const error = new Error('Certificate request not found');
    error.statusCode = 404;
    throw error;
  }

  /* ---------------------------------------------------------
     Duplicate draft protection
  --------------------------------------------------------- */

  if (request.certificateId) {
    const existingCertificate = await Certificate.findById(
      request.certificateId
    );

    if (existingCertificate) {
      return existingCertificate;
    }
  }

  /* ---------------------------------------------------------
     User
  --------------------------------------------------------- */

  const user = request.userId;

  if (!user) {
    const error = new Error(
      'Associated intern not found for this request'
    );

    error.statusCode = 404;

    throw error;
  }

  /* ---------------------------------------------------------
     Normalize certificate type
  --------------------------------------------------------- */

  const normalizedType =
    request.certificateType ===
    'internship_completion_certificate'
      ? 'completion_certificate'
      : request.certificateType;

  /* ---------------------------------------------------------
     Find active template
  --------------------------------------------------------- */

  const template = await CertificateTemplate.findOne({
    certificateType: {
      $in: [request.certificateType, normalizedType],
    },
    status: 'active',
  });

  if (!template) {
    const error = new Error(
      `No active certificate template found for type: ${request.certificateType}`
    );

    error.statusCode = 404;

    throw error;
  }

  /* ---------------------------------------------------------
     Support both htmlContent and content
  --------------------------------------------------------- */

  const templateHtml =
    template.htmlContent || template.content || '';

  if (!templateHtml.trim()) {
    const error = new Error(
      `Certificate template for type '${request.certificateType}' does not contain HTML content`
    );

    error.statusCode = 400;

    throw error;
  }

  /* ---------------------------------------------------------
     Certificate number
  --------------------------------------------------------- */

  const certificateNumber =
    await generateCertificateNumber();

  /* ---------------------------------------------------------
     Verification ID and Code
  --------------------------------------------------------- */

  const verifyId =
    generateVerifyId();

  const verificationCode =
    generateVerificationCode();

  /* ---------------------------------------------------------
     Certificate title
  --------------------------------------------------------- */

  const certificateTitle =
    getCertificateTitle(request.certificateType);

  /* ---------------------------------------------------------
     QR CODE
  --------------------------------------------------------- */

  const {
    qrCodeDataUrl,
    verificationUrl,
  } = await generateQrCode(verifyId);

  /* ---------------------------------------------------------
     Request metadata
  --------------------------------------------------------- */

  const rawMeta =
    request.metadata instanceof Map
      ? Object.fromEntries(request.metadata)
      : request.metadata || {};

  /* ---------------------------------------------------------
     Duration
  --------------------------------------------------------- */

  let durationStr = '';

  if (user.startDate && user.endDate) {
    const start = new Date(user.startDate);
    const end = new Date(user.endDate);

    const diffMonths = Math.max(
      1,
      Math.round(
        (end - start) /
          (1000 * 60 * 60 * 24 * 30.4375)
      )
    );

    durationStr =
      `${diffMonths} Month${diffMonths > 1 ? 's' : ''}`;
  }

  /* ---------------------------------------------------------
     Sanitize metadata
  --------------------------------------------------------- */

  const safeMeta = {};

  for (const [key, value] of Object.entries(rawMeta)) {
    if (
      typeof value === 'string' &&
      value.trim()
    ) {
      const cleanedValue = value.trim();

      safeMeta[key] = cleanedValue;

      const pascal =
        key.charAt(0).toUpperCase() +
        key.slice(1);

      const camel =
        key.charAt(0).toLowerCase() +
        key.slice(1);

      safeMeta[pascal] = cleanedValue;
      safeMeta[camel] = cleanedValue;
    }
  }

  /* =========================================================
     SUPPLEMENTARY DATA
  ========================================================= */

  const supplementaryData = {
    /* -------------------------------------------------------
       Bonafide
    ------------------------------------------------------- */

    CollegeName:
      safeMeta.CollegeName ||
      safeMeta.collegeName ||
      '',

    collegeName:
      safeMeta.CollegeName ||
      safeMeta.collegeName ||
      '',

    Purpose:
      safeMeta.Purpose ||
      safeMeta.purpose ||
      'Academic Requirement',

    purpose:
      safeMeta.Purpose ||
      safeMeta.purpose ||
      'Academic Requirement',

    InternshipTitle:
      safeMeta.InternshipTitle ||
      safeMeta.internshipTitle ||
      (
        user.domain
          ? `${user.domain} Intern`
          : 'Intern'
      ),

    internshipTitle:
      safeMeta.InternshipTitle ||
      safeMeta.internshipTitle ||
      (
        user.domain
          ? `${user.domain} Intern`
          : 'Intern'
      ),

    Duration:
      safeMeta.Duration ||
      safeMeta.duration ||
      durationStr,

    duration:
      safeMeta.Duration ||
      safeMeta.duration ||
      durationStr,

    OrganizationName:
      'UptoSkills',

    organizationName:
      'UptoSkills',

    Organization:
      'UptoSkills',

    organization:
      'UptoSkills',

    /* -------------------------------------------------------
       Offer Letter
    ------------------------------------------------------- */

    InternshipRole:
      safeMeta.InternshipRole ||
      safeMeta.internshipRole ||
      (
        user.domain
          ? `${user.domain} Intern`
          : 'Intern'
      ),

    internshipRole:
      safeMeta.InternshipRole ||
      safeMeta.internshipRole ||
      (
        user.domain
          ? `${user.domain} Intern`
          : 'Intern'
      ),

    Stipend:
      safeMeta.Stipend ||
      safeMeta.stipend ||
      '',

    stipend:
      safeMeta.Stipend ||
      safeMeta.stipend ||
      '',

    ReportingManager:
      safeMeta.ReportingManager ||
      safeMeta.reportingManager ||
      '',

    reportingManager:
      safeMeta.ReportingManager ||
      safeMeta.reportingManager ||
      '',

    ManagerName:
      safeMeta.ManagerName ||
      safeMeta.managerName ||
      safeMeta.ReportingManager ||
      safeMeta.reportingManager ||
      '',

    managerName:
      safeMeta.ManagerName ||
      safeMeta.managerName ||
      safeMeta.ReportingManager ||
      safeMeta.reportingManager ||
      '',

    JoiningDate:
      safeMeta.JoiningDate ||
      safeMeta.joiningDate ||
      formatDate(user.startDate),

    joiningDate:
      safeMeta.JoiningDate ||
      safeMeta.joiningDate ||
      formatDate(user.startDate),

    JoiningGuidelines:
      safeMeta.JoiningGuidelines ||
      safeMeta.joiningGuidelines ||
      '',

    joiningGuidelines:
      safeMeta.JoiningGuidelines ||
      safeMeta.joiningGuidelines ||
      '',

    HRName:
      safeMeta.HRName ||
      safeMeta.hrName ||
      'HR Team',

    hrName:
      safeMeta.HRName ||
      safeMeta.hrName ||
      'HR Team',

    /* -------------------------------------------------------
       OJT
    ------------------------------------------------------- */

    TrainingProgram:
      safeMeta.TrainingProgram ||
      safeMeta.trainingProgram ||
      (
        user.domain
          ? `${user.domain} Training Program`
          : 'On-the-Job Training Program'
      ),

    trainingProgram:
      safeMeta.TrainingProgram ||
      safeMeta.trainingProgram ||
      (
        user.domain
          ? `${user.domain} Training Program`
          : 'On-the-Job Training Program'
      ),

    TrainingStartDate:
      safeMeta.TrainingStartDate ||
      safeMeta.trainingStartDate ||
      formatDate(user.startDate),

    trainingStartDate:
      safeMeta.TrainingStartDate ||
      safeMeta.trainingStartDate ||
      formatDate(user.startDate),

    TrainingEndDate:
      safeMeta.TrainingEndDate ||
      safeMeta.trainingEndDate ||
      formatDate(user.endDate),

    trainingEndDate:
      safeMeta.TrainingEndDate ||
      safeMeta.trainingEndDate ||
      formatDate(user.endDate),

    MentorName:
      safeMeta.MentorName ||
      safeMeta.mentorName ||
      '',

    mentorName:
      safeMeta.MentorName ||
      safeMeta.mentorName ||
      '',

    PerformanceDetails:
      safeMeta.PerformanceDetails ||
      safeMeta.performanceDetails ||
      '',

    performanceDetails:
      safeMeta.PerformanceDetails ||
      safeMeta.performanceDetails ||
      '',

    /* -------------------------------------------------------
       Intern of the Month
    ------------------------------------------------------- */

    AwardMonth:
      safeMeta.AwardMonth ||
      safeMeta.awardMonth ||
      '',

    awardMonth:
      safeMeta.AwardMonth ||
      safeMeta.awardMonth ||
      '',

    RecognitionCriteria:
      safeMeta.RecognitionCriteria ||
      safeMeta.recognitionCriteria ||
      '',

    recognitionCriteria:
      safeMeta.RecognitionCriteria ||
      safeMeta.recognitionCriteria ||
      '',

    /* -------------------------------------------------------
       League Winner
    ------------------------------------------------------- */

    WinnerName:
      user.fullName || '',

    winnerName:
      user.fullName || '',

    EventName:
      safeMeta.EventName ||
      safeMeta.eventName ||
      '',

    eventName:
      safeMeta.EventName ||
      safeMeta.eventName ||
      '',

    Position:
      safeMeta.Position ||
      safeMeta.position ||
      '',

    position:
      safeMeta.Position ||
      safeMeta.position ||
      '',

    EventDate:
      safeMeta.EventDate ||
      safeMeta.eventDate ||
      formatDate(new Date()),

    eventDate:
      safeMeta.EventDate ||
      safeMeta.eventDate ||
      formatDate(new Date()),

    Place:
      safeMeta.Place ||
      safeMeta.place ||
      'New Delhi',

    place:
      safeMeta.Place ||
      safeMeta.place ||
      'New Delhi',

    /* -------------------------------------------------------
       Custom metadata
    ------------------------------------------------------- */

    ...safeMeta,
  };

  /* =========================================================
     TRUSTED CORE DATA
     IMPORTANT:
     This object is placed AFTER supplementaryData so
     request metadata cannot override trusted values.
  ========================================================= */

  const trustedCoreData = {
    /* -------------------------------------------------------
       New required placeholders
    ------------------------------------------------------- */

    fullName:
      user.fullName || '',

    internCode:
      user.internCode || '',

    domain:
      user.domain || '',

    startDate:
      formatDate(user.startDate),

    endDate:
      formatDate(user.endDate),

    issueDate:
      formatDate(new Date()),

    requestNumber:
      request.requestNumber || certificateNumber,

    certificateTitle,

    qrCodeUrl:
      qrCodeDataUrl,

    /* -------------------------------------------------------
       QR verification information
    ------------------------------------------------------- */

    verifyId,

    verificationUrl,

    /* -------------------------------------------------------
       Legacy placeholders
       These keep old templates working.
    ------------------------------------------------------- */

    InternName:
      user.fullName || '',

    internName:
      user.fullName || '',

    name:
      user.fullName || '',

    CertificateNumber:
      certificateNumber,

    certificateNumber,

    Department:
      user.domain || '',

    department:
      user.domain || '',

    StartDate:
      formatDate(user.startDate),

    EndDate:
      formatDate(user.endDate),

    IssueDate:
      formatDate(new Date()),

    InternCode:
      user.internCode || '',

    CertificateType:
      certificateTitle,

    certificateType:
      certificateTitle,

    rawCertificateType:
      request.certificateType || '',

    VerificationCode:
      verificationCode,

    verificationCode,
  };

  /* =========================================================
     FINAL TEMPLATE DATA
  ========================================================= */

  const templateData = {
    ...supplementaryData,
    ...trustedCoreData,
  };

  /* =========================================================
     COMPILE HANDLEBARS TEMPLATE
  ========================================================= */

  let compiledTemplate;

  try {
    compiledTemplate =
      Handlebars.compile(templateHtml, {
        strict: false,
      });
  } catch (compileError) {
    const error = new Error(
      `Certificate template compilation failed: ${compileError.message}`
    );

    error.statusCode = 400;

    throw error;
  }

  /* =========================================================
     RENDER HTML
  ========================================================= */

  let htmlContent;

  try {
    htmlContent =
      compiledTemplate(templateData);
    htmlContent =
      injectQrCodeImage(htmlContent, qrCodeDataUrl);
  } catch (renderError) {
    const error = new Error(
      `Certificate template rendering failed: ${renderError.message}`
    );

    error.statusCode = 400;

    throw error;
  }

  /* =========================================================
     SAFETY CHECK
  ========================================================= */

  if (!htmlContent || !htmlContent.trim()) {
    const error = new Error(
      'Generated certificate HTML is empty'
    );

    error.statusCode = 400;

    throw error;
  }

  /* =========================================================
     CREATE CERTIFICATE
  ========================================================= */

  const certificate =
    await Certificate.create({
      certificateNumber,

      verifyId,

      userId:
        user._id,

      internCode:
        user.internCode,

      templateId:
        template._id,

      certificateType:
        request.certificateType,

      recipientName:
        user.fullName || '',

      certificateTitle,

      domain:
        user.domain,

      startDate:
        user.startDate,

      endDate:
        user.endDate,

      issuedDate:
        new Date(),

      status:
        'draft',

      htmlContent,

      verificationCode,

      generatedBy:
        request.reviewedBy,
    });

  /* =========================================================
     LINK REQUEST TO CERTIFICATE
  ========================================================= */

  request.certificateId =
    certificate._id;

  await request.save();

  await logAction({
    actor: { id: request.reviewedBy, role: 'admin' },
    action: 'CERTIFICATE_DRAFT_CREATED',
    targetType: 'certificate',
    targetId: certificate._id,
    meta: {
      certificateNumber: certificate.certificateNumber,
      certificateType: certificate.certificateType
    }
  });

  return certificate;
};

/* =========================================================
   GET CERTIFICATE DRAFT
========================================================= */

/**
 * Fetches a certificate draft.
 */
export const getCertificateDraft = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const error =
      new Error('Invalid certificate ID');

    error.statusCode = 400;

    throw error;
  }

  const certificate =
    await Certificate.findById(id)
      .populate(
        'userId',
        'fullName email internCode domain'
      );

  if (!certificate) {
    const error =
      new Error('Certificate draft not found');

    error.statusCode = 404;

    throw error;
  }

  return certificate;
};

/* =========================================================
   UPDATE CERTIFICATE DRAFT
========================================================= */

/**
 * Updates the HTML of a draft certificate.
 */
export const updateCertificateDraft = async (
  id,
  htmlContent
) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const error =
      new Error('Invalid certificate ID');

    error.statusCode = 400;

    throw error;
  }

  if (
    typeof htmlContent !== 'string' ||
    !htmlContent.trim()
  ) {
    const error =
      new Error('htmlContent is required');

    error.statusCode = 400;

    throw error;
  }

  const certificate =
    await Certificate.findById(id);

  if (!certificate) {
    const error =
      new Error('Certificate draft not found');

    error.statusCode = 404;

    throw error;
  }

  if (certificate.status !== 'draft') {
    const error =
      new Error(
        'Only draft certificates can be edited'
      );

    error.statusCode = 400;

    throw error;
  }

  certificate.htmlContent =
    htmlContent;

  await certificate.save();

  await logAction({
    actor: { id: certificate.userId, role: 'admin' },
    action: 'CERTIFICATE_EDITED',
    targetType: 'certificate',
    targetId: certificate._id,
    meta: {
      certificateNumber: certificate.certificateNumber
    }
  });

  return certificate;
};

/* =========================================================
   RENDER CERTIFICATE PDF
========================================================= */

/**
 * Renders certificate HTML into A4 landscape PDF.
 *
 * Important:
 * - Reuses Puppeteer browser
 * - Waits for fonts
 * - Waits for all images including QR
 * - A4 landscape
 * - Zero margins
 * - Background graphics enabled
 */
export const renderCertificatePdf = async (
  htmlContent
) => {
  if (
    !htmlContent ||
    typeof htmlContent !== 'string' ||
    !htmlContent.trim()
  ) {
    const error =
      new Error(
        'Certificate htmlContent is required for PDF rendering'
      );

    error.statusCode = 400;

    throw error;
  }

  const processedHtml = injectQrCodeImage(htmlContent);

  let page = null;

  try {
    const browser =
      await getBrowser();

    page =
      await browser.newPage();

    /* -------------------------------------------------------
       A4 landscape viewport
    ------------------------------------------------------- */

    await page.setViewport({
      width: 1123,
      height: 794,
      deviceScaleFactor: 1,
    });

    /* -------------------------------------------------------
       Load certificate
    ------------------------------------------------------- */

    await page.setContent(
      processedHtml,
      {
        waitUntil: [
          'load',
          'domcontentloaded',
          'networkidle0',
        ],
      }
    );

    /* -------------------------------------------------------
       Wait for Google/local fonts
    ------------------------------------------------------- */

    await page.evaluate(async () => {
      if (document.fonts) {
        await document.fonts.ready;
      }
    });

    /* -------------------------------------------------------
       Wait for QR and other images
    ------------------------------------------------------- */

    await page.evaluate(async () => {
      const images =
        Array.from(
          document.images
        );

      await Promise.all(
        images.map((image) => {
          if (image.complete) {
            return Promise.resolve();
          }

          return new Promise((resolve) => {
            image.addEventListener(
              'load',
              resolve,
              { once: true }
            );

            image.addEventListener(
              'error',
              resolve,
              { once: true }
            );
          });
        })
      );
    });

    /* -------------------------------------------------------
       Give browser a small rendering buffer
    ------------------------------------------------------- */

    await new Promise((resolve) => {
      setTimeout(resolve, 200);
    });

    /* -------------------------------------------------------
       Generate PDF
    ------------------------------------------------------- */

    const pdfBytes =
      await page.pdf({
        format: 'A4',

        landscape: true,

        printBackground: true,

        preferCSSPageSize: true,

        margin: {
          top: '0',
          right: '0',
          bottom: '0',
          left: '0',
        },
      });

    return Buffer.from(pdfBytes);
  } catch (err) {
    const error =
      new Error(
        `PDF rendering failed: ${err.message}`
      );

    error.statusCode = 500;

    throw error;
  } finally {
    if (page) {
      try {
        await page.close();
      } catch {
        // Safe cleanup
      }
    }
  }
};

/* =========================================================
   FINALIZE CERTIFICATE
========================================================= */

/**
 * Finalizes a certificate:
 *
 * 1. Checks draft status
 * 2. Renders PDF
 * 3. Saves PDF
 * 4. Marks certificate finalized
 * 5. Marks linked request completed
 */
export const finalizeCertificate = async (
  certificateId
) => {
  if (
    !mongoose.Types.ObjectId.isValid(
      certificateId
    )
  ) {
    const error =
      new Error('Invalid certificate ID');

    error.statusCode = 400;

    throw error;
  }

  const certificate =
    await Certificate.findById(
      certificateId
    ).populate(
      'userId',
      'fullName email internCode domain'
    );

  if (!certificate) {
    const error =
      new Error('Certificate not found');

    error.statusCode = 404;

    throw error;
  }

  if (certificate.status !== 'draft') {
    const error =
      new Error(
        `Cannot finalize certificate with status '${certificate.status}'. Only draft certificates can be finalized.`
      );

    error.statusCode = 409;

    throw error;
  }

  if (
    !certificate.htmlContent ||
    !certificate.htmlContent.trim()
  ) {
    const error =
      new Error(
        'Certificate htmlContent is missing or empty'
      );

    error.statusCode = 400;

    throw error;
  }

  /* -------------------------------------------------------
     Ensure verifyId and QR Code Data URI
  ------------------------------------------------------- */

  if (!certificate.verifyId) {
    certificate.verifyId = generateVerifyId();
  }

  const { qrCodeDataUrl, verificationUrl } = await generateQrCode(
    certificate.verifyId
  );

  let htmlContentToRender = injectQrCodeImage(
    certificate.htmlContent,
    qrCodeDataUrl
  )
    .replace(/\{\{\s*certificateNumber\s*\}\}/gi, certificate.certificateNumber)
    .replace(/\{\{\s*verificationUrl\s*\}\}/gi, verificationUrl);

  /* -------------------------------------------------------
     Render PDF
  ------------------------------------------------------- */

  const pdfBuffer =
    await renderCertificatePdf(
      htmlContentToRender
    );

  /* -------------------------------------------------------
     Upload directory
  ------------------------------------------------------- */

  const __filename =
    fileURLToPath(import.meta.url);

  const __dirname =
    path.dirname(__filename);

  const uploadDir =
    path.resolve(
      __dirname,
      '../../uploads/certificates'
    );

  fs.mkdirSync(
    uploadDir,
    {
      recursive: true,
    }
  );

  /* -------------------------------------------------------
     File name
  ------------------------------------------------------- */

  const sanitizedNumber =
    certificate.certificateNumber.replace(
      /[^a-zA-Z0-9_-]/g,
      '_'
    );

  const fileName =
    `${sanitizedNumber}.pdf`;

  const absolutePdfPath =
    path.join(
      uploadDir,
      fileName
    );

  const relativePdfPath =
    `uploads/certificates/${fileName}`;

  /* -------------------------------------------------------
     Save PDF
  ------------------------------------------------------- */

  try {
    fs.writeFileSync(
      absolutePdfPath,
      pdfBuffer
    );
  } catch (fsError) {
    const error =
      new Error(
        `Failed to persist certificate PDF: ${fsError.message}`
      );

    error.statusCode = 500;

    throw error;
  }

  /* -------------------------------------------------------
     Update certificate
  ------------------------------------------------------- */

  const finalizedAt =
    new Date();

  certificate.status =
    'finalized';

  certificate.pdfPath =
    relativePdfPath;

  certificate.finalizedAt =
    finalizedAt;

  certificate.issuedDate =
    finalizedAt;

  certificate.issuedAt =
    finalizedAt;

  certificate.recipientName =
    certificate.recipientName ||
    certificate.userId?.fullName ||
    'Intern';

  certificate.certificateTitle =
    certificate.certificateTitle ||
    getCertificateTitle(certificate.certificateType);

  certificate.domain =
    certificate.domain ||
    certificate.userId?.domain ||
    '';

  certificate.htmlContent =
    htmlContentToRender;

  await certificate.save();

  /* -------------------------------------------------------
     Update linked request
  ------------------------------------------------------- */

  const request =
    await CertificateRequest.findOne({
      certificateId:
        certificate._id,
    });

  if (request) {
    request.status =
      'completed';

    request.completedAt =
      finalizedAt;

    await request.save();
  }

  await logAction({
    actor: { id: certificate.generatedBy || certificate.userId, role: 'admin' },
    action: 'CERTIFICATE_FINALIZED',
    targetType: 'certificate',
    targetId: certificate._id,
    meta: {
      certificateNumber: certificate.certificateNumber,
      certificateType: certificate.certificateType
    }
  });

  return {
    certificate,
    request,
    absolutePdfPath,
    fileName,
  };
};

/* =========================================================
   SEND CERTIFICATE EMAIL
========================================================= */

/**
 * Sends finalized certificate PDF by email.
 */
export const sendCertificateEmail = async ({
  certificate,
  absolutePdfPath,
  user,
}) => {
  const recipientEmail =
    user?.email;

  if (!recipientEmail) {
    throw new Error(
      'Associated intern email address not found on user record'
    );
  }

  const certificateTypeFormatted =
    getCertificateTitle(
      certificate.certificateType
    );

  const subject =
    `Your ${certificateTypeFormatted} - UPTOSKILL (${certificate.certificateNumber})`;

  const html = `
    <div
      style="
        font-family: Arial, sans-serif;
        color: #333;
        max-width: 600px;
        margin: 0 auto;
        line-height: 1.6;
      "
    >

      <h2 style="color: #2563eb;">
        Congratulations, ${user.fullName || 'Intern'}!
      </h2>

      <p>
        We are pleased to inform you that your
        <strong>${certificateTypeFormatted}</strong>
        certificate has been officially reviewed
        and finalized.
      </p>

      <div
        style="
          background-color: #f3f4f6;
          padding: 16px;
          border-radius: 8px;
          margin: 20px 0;
        "
      >

        <p style="margin: 4px 0;">
          <strong>Certificate Number:</strong>
          ${certificate.certificateNumber}
        </p>

        <p style="margin: 4px 0;">
          <strong>Verification Code:</strong>
          ${certificate.verificationCode}
        </p>

        <p style="margin: 4px 0;">
          <strong>Issue Date:</strong>
          ${new Date(
            certificate.issuedDate || Date.now()
          ).toLocaleDateString(
            'en-US',
            {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            }
          )}
        </p>

      </div>

      <p>
        Your official digital certificate is attached
        to this email as a PDF document.
      </p>

      <p
        style="
          margin-top: 30px;
          font-size: 13px;
          color: #6b7280;
        "
      >
        Best regards,<br />
        <strong>UPTOSKILL Certificate Desk</strong>
      </p>

    </div>
  `;

  const fileName =
    `${certificate.certificateNumber.replace(
      /[^a-zA-Z0-9_-]/g,
      '_'
    )}.pdf`;

  return sendEmail({
    to: recipientEmail,

    subject,

    html,

    attachments: [
      {
        filename: fileName,
        path: absolutePdfPath,
      },
    ],
  });
};