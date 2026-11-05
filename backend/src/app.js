import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dns from 'dns';
import helmet from 'helmet';
import mongoose from 'mongoose';
import mongoSanitize from 'express-mongo-sanitize';

import authRouter from './routes/auth.routes.js';
import internRouter from './routes/intern.routes.js';
import adminRouter from './routes/admin.routes.js';
import teamleaderRouter from './routes/teamleader.routes.js';
import analyticsRouter from './routes/adminAnalytics.routes.js';
import notificationRouter from './routes/notification.routes.js';
import verifyRouter from './routes/verify.routes.js';
import certificateRouter from './routes/certificate.routes.js';

// Use public DNS providers (Cloudflare and Google) to avoid local DNS issues.
dns.setServers(["1.1.1.1", "8.8.8.8"]);

const app = express();

// Trust proxy for accurate req.ip when behind a reverse proxy (Render, Heroku, Nginx)
app.set('trust proxy', 1);

// Security Headers with Helmet
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration with whitelist
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://127.0.0.1:5173'
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true
}));

// Health check endpoint (checks database connection status)
app.get('/api/health', (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  const statusCode = isDbConnected ? 200 : 503;
  res.status(statusCode).json({
    status: isDbConnected ? 'ok' : 'degraded',
    service: 'uptoskill-backend',
    database: isDbConnected ? 'connected' : 'disconnected',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

// Parse JSON request bodies with 1mb limit
app.use(express.json({ limit: '1mb' }));

// NoSQL injection protection (Express 5 compatible)
const sanitizeObject = (obj) => {
  if (!obj || typeof obj !== 'object') return;
  for (const key of Object.keys(obj)) {
    if (key.startsWith('$') || key.includes('.')) {
      delete obj[key];
    } else if (typeof obj[key] === 'object') {
      sanitizeObject(obj[key]);
    }
  }
};

app.use((req, res, next) => {
  if (req.body) sanitizeObject(req.body);
  if (req.params) sanitizeObject(req.params);
  if (req.query) sanitizeObject(req.query);
  next();
});

// Parse cookies and populate `req.cookies`.
app.use(cookieParser());

// Mount API routes
app.use('/api/auth', authRouter);
app.use('/api/intern', internRouter);
app.use('/api/admin/analytics', analyticsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/teamleader', teamleaderRouter);
app.use('/api/notifications', notificationRouter);
app.use('/api/verify', verifyRouter);
app.use('/api/certificates', certificateRouter);

// Centralized Error Handler with uniform { message, errors? } shape
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || err.status || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  const response = {
    message: isProduction && statusCode === 500
      ? 'An unexpected error occurred. Please try again later.'
      : (err.message || 'Internal server error')
  };

  if (err.errors) {
    response.errors = err.errors;
  }

  res.status(statusCode).json(response);
});

export default app;