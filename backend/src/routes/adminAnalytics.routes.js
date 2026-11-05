import express from 'express';
import verifyAuth from '../middlewares/verifyAuth.js';
import requireAdmin from '../middlewares/requireAdmin.js';
import {
  analyticsQueryValidator,
  analyticsExportValidator,
  analyticsDaysValidator
} from '../validators/adminAnalytics.validator.js';
import {
  getOverview,
  getTrend,
  getTypes,
  getTurnaround,
  getTeamLeaders,
  getDomains,
  getPipeline,
  getUpcoming,
  getStuck,
  exportAnalyticsCSV
} from '../controllers/adminAnalytics.controller.js';

const analyticsRouter = express.Router();

// Apply auth and admin check middleware to all routes
analyticsRouter.use(verifyAuth, requireAdmin);

analyticsRouter.get('/overview', analyticsQueryValidator, getOverview);
analyticsRouter.get('/requests-trend', analyticsQueryValidator, getTrend);
analyticsRouter.get('/certificate-types', analyticsQueryValidator, getTypes);
analyticsRouter.get('/turnaround', analyticsQueryValidator, getTurnaround);
analyticsRouter.get('/team-leaders', analyticsQueryValidator, getTeamLeaders);
analyticsRouter.get('/domains', analyticsQueryValidator, getDomains);
analyticsRouter.get('/pipeline', analyticsQueryValidator, getPipeline);
analyticsRouter.get('/upcoming-completions', analyticsDaysValidator, getUpcoming);
analyticsRouter.get('/stuck', analyticsDaysValidator, getStuck);
analyticsRouter.get('/stuck-requests', analyticsDaysValidator, getStuck);
analyticsRouter.get('/export', analyticsExportValidator, exportAnalyticsCSV);

export default analyticsRouter;
