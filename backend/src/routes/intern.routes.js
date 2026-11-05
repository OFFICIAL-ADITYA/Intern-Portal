import express from 'express';
import User from '../models/User.js';
import verifyAuth from '../middlewares/verifyAuth.js';
import {
  getMyRequests,
  getProfile,
  submitCertificateRequest,
  getCertificateForRequest,
  downloadCertificateForRequest,
  setPassword,
  updateProfile,
  chatWithBot
} from '../controllers/intern.controller.js';
import {
  setPasswordValidator,
  updateProfileValidator,
  submitCertificateRequestValidator,
  chatMessageValidator
} from '../validators/intern.validator.js';
import { passwordLimiter, chatLimiter } from '../middlewares/rateLimiter.js';

const internRouter = express.Router();

internRouter.use(verifyAuth, (req, res, next) => {
	if (req.user.role !== 'intern') {
		return res.status(403).json({ message: 'Forbidden' });
	}

	next();
});

internRouter.use(async (req, res, next) => {
	try {
		const user = await User.findById(req.user.id).select('isArchived');
		if (user?.isArchived) {
			return res.status(403).json({ message: 'Your internship account has been archived. Contact admin.' });
		}
		return next();
	} catch (error) {
		return res.status(500).json({ message: 'Unable to verify account status.' });
	}
});

internRouter.get('/profile', getProfile);
internRouter.patch('/profile', updateProfileValidator, updateProfile);

internRouter.patch('/set-password', passwordLimiter, setPasswordValidator, setPassword);

internRouter.post('/request-certificate', submitCertificateRequestValidator, submitCertificateRequest);

internRouter.get('/requests', getMyRequests);

// Task M: Chatbot assistance endpoint
internRouter.post('/chat', chatLimiter, chatMessageValidator, chatWithBot);

// Day 5 Intern Certificate Fetch and Secure Download routes
internRouter.get('/requests/:id/certificate', getCertificateForRequest);
internRouter.get('/requests/:id/certificate/download', downloadCertificateForRequest);

export default internRouter;
