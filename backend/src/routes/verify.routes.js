import express from 'express';
import rateLimit from 'express-rate-limit';
import { verifyCertificate } from '../controllers/verify.controller.js';

const verifyRouter = express.Router();

// Rate limit: 30 requests per minute per IP
export const verifyLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Too many verification attempts, please try again later.'
  }
});

// GET /api/verify/:verifyId with no authentication
verifyRouter.get('/:verifyId', verifyLimiter, verifyCertificate);

export default verifyRouter;
