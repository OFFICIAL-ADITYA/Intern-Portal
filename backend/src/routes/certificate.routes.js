import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import verifyAuth from '../middlewares/verifyAuth.js';
import Certificate from '../models/Certificate.js';

const certificateRouter = express.Router();

/**
 * GET /api/certificates/:id/download
 * Unified authenticated download route:
 * - Requires authentication (verifyAuth)
 * - Allowed for Admin (can download any finalized certificate)
 * - Allowed for Intern (only if certificate belongs to them)
 * - Returns 403 if intern tries to download another user's certificate
 */
certificateRouter.get('/:id/download', verifyAuth, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid certificate ID format' });
    }

    const certificate = await Certificate.findById(id);
    if (!certificate) {
      return res.status(404).json({ message: 'Certificate not found' });
    }

    const isAdmin = req.user.role === 'admin';
    const isOwner = certificate.userId && certificate.userId.toString() === req.user.id;

    if (!isAdmin && !isOwner) {
      return res.status(403).json({
        message: 'Access denied: Certificate does not belong to you'
      });
    }

    if (certificate.status !== 'finalized') {
      return res.status(400).json({
        message: 'Certificate has not been finalized yet'
      });
    }

    if (!certificate.pdfPath) {
      return res.status(404).json({
        message: 'Certificate PDF path is missing'
      });
    }

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const absolutePath = path.resolve(__dirname, '../../', certificate.pdfPath);

    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({
        message: 'Certificate PDF file is unavailable on server'
      });
    }

    const safeFileName = `${(certificate.certificateNumber || 'Certificate').replace(
      /[^a-zA-Z0-9_-]/g,
      '_'
    )}.pdf`;

    return res.download(absolutePath, safeFileName);
  } catch (err) {
    return res.status(500).json({
      message: 'Server error downloading certificate'
    });
  }
});

export default certificateRouter;
