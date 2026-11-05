import express from 'express';
import { registerValidator, teamLeaderValidator } from "../validators/auth.validator.js";
import {
  createIntern,
  createTeamLeader,
  getAllTeamLeaders,
  getTeamLeaderById,
  updateTeamLeader,
  getInternsByTeamLeader,
  getAllInterns,
  getInternById,
  updateIntern,
  assignInternTeamLeader,
  getForwardedRequests,
  getAdminRequests,
  finalizeRequest,
  getCertificateDraft,
  updateCertificateDraft,
  finalizeCertificate,
  getAllCertificates,
  retryCertificateGeneration,
  downloadCertificatePdf,
  revokeCertificate,
  unrevokeCertificate,
  getTemplatePlaceholders,
  createCertificateTemplate,
  updateCertificateTemplate,
  getCertificateTemplates,
  getRetentionPolicy,
  updateRetentionPolicy,
  getArchivedInterns,
  restoreArchivedIntern,
} from "../controllers/admin.controller.js";
import {
  getAuditLogs,
  exportAuditLogs,
} from "../controllers/auditLog.controller.js";
import { updateInternValidator, assignTeamLeaderValidator } from "../validators/intern.validator.js";
import verifyAuth from "../middlewares/verifyAuth.js";
import requireAdmin from "../middlewares/requireAdmin.js";

const adminRouter = express.Router();

adminRouter.get(
  "/templates",
  verifyAuth,
  requireAdmin,
  getCertificateTemplates
);

adminRouter.get(
  "/templates/placeholders",
  verifyAuth,
  requireAdmin,
  getTemplatePlaceholders
);

adminRouter.post(
  "/templates",
  verifyAuth,
  requireAdmin,
  createCertificateTemplate
);

adminRouter.patch(
  "/templates/:id",
  verifyAuth,
  requireAdmin,
  updateCertificateTemplate
);

adminRouter.get('/retention-policy', verifyAuth, requireAdmin, getRetentionPolicy);
adminRouter.patch('/retention-policy', verifyAuth, requireAdmin, updateRetentionPolicy);
adminRouter.get('/interns/archived', verifyAuth, requireAdmin, getArchivedInterns);
adminRouter.patch('/interns/:id/restore', verifyAuth, requireAdmin, restoreArchivedIntern);

// Audit logs routes
adminRouter.get("/audit-logs/export", verifyAuth, requireAdmin, exportAuditLogs);
adminRouter.get("/audit-logs", verifyAuth, requireAdmin, getAuditLogs);

// POST api/auth/register-intern
adminRouter.post("/create-intern", verifyAuth, requireAdmin, registerValidator, createIntern);

// POST api/auth/register-tl
adminRouter.post("/create-tl", verifyAuth, requireAdmin, teamLeaderValidator, createTeamLeader);

// Intern Management routes
adminRouter.get("/interns", verifyAuth, requireAdmin, getAllInterns);
adminRouter.get("/interns/:id", verifyAuth, requireAdmin, getInternById);
adminRouter.patch("/interns/:id", verifyAuth, requireAdmin, updateInternValidator, updateIntern);
adminRouter.patch("/interns/:id/assignment", verifyAuth, requireAdmin, assignTeamLeaderValidator, assignInternTeamLeader);

// Team Leader Management routes
adminRouter.get("/teamleaders", verifyAuth, requireAdmin, getAllTeamLeaders);
adminRouter.get("/teamleaders/:id", verifyAuth, requireAdmin, getTeamLeaderById);
adminRouter.patch("/teamleaders/:id", verifyAuth, requireAdmin, updateTeamLeader);
adminRouter.get("/teamleaders/:id/interns", verifyAuth, requireAdmin, getInternsByTeamLeader);

adminRouter.get("/forwarded-requests", verifyAuth, requireAdmin, getForwardedRequests);
adminRouter.get("/requests", verifyAuth, requireAdmin, getAdminRequests);

adminRouter.patch("/requests/:id/finalize", verifyAuth, requireAdmin, finalizeRequest);

// Day 3 Certificate Draft Review routes
adminRouter.get("/certificates/:id", verifyAuth, requireAdmin, getCertificateDraft);
adminRouter.patch("/certificates/:id", verifyAuth, requireAdmin, updateCertificateDraft);

// Day 4 Certificate Finalization & Email Delivery route
adminRouter.post("/certificates/:id/finalize", verifyAuth, requireAdmin, finalizeCertificate);

// Day 5 Admin Overview, Download & Retry Generation routes
adminRouter.get("/certificates", verifyAuth, requireAdmin, getAllCertificates);
adminRouter.get("/certificates/:id/download", verifyAuth, requireAdmin, downloadCertificatePdf);
adminRouter.post("/requests/:id/retry-generation", verifyAuth, requireAdmin, retryCertificateGeneration);

// Task F Certificate Revocation routes
adminRouter.patch("/certificates/:id/revoke", verifyAuth, requireAdmin, revokeCertificate);
adminRouter.patch("/certificates/:id/unrevoke", verifyAuth, requireAdmin, unrevokeCertificate);

export default adminRouter;
