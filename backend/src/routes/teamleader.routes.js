import express from 'express';
import { registerValidator } from '../validators/auth.validator.js';
import { reviewRequestTLValidator } from '../validators/intern.validator.js';
import verifyAuth from '../middlewares/verifyAuth.js';
import {
	createIntern,
	getInternsForTL,
	getAssignedInternById,
	updateAssignedIntern,
	getRequestsForReview,
	reviewRequestAsTL,
        getUpcomingCompletionsForTL
} from '../controllers/teamleader.controller.js';

const teamleaderRouter = express.Router();

teamleaderRouter.use(verifyAuth, (req, res, next) => {
	if (req.user.role !== 'teamleader') {
		return res.status(403).json({ message: 'Team leader access required' });
	}

	next();
});

teamleaderRouter.post('/create-intern', registerValidator, createIntern);

teamleaderRouter.get('/interns', getInternsForTL);
teamleaderRouter.get('/interns/:id', getAssignedInternById);
teamleaderRouter.patch('/interns/:id', updateAssignedIntern);

teamleaderRouter.get('/requests-for-review', getRequestsForReview);
teamleaderRouter.get('/upcoming-completions', getUpcomingCompletionsForTL);

teamleaderRouter.patch('/requests/:id/review', reviewRequestTLValidator, reviewRequestAsTL);

export default teamleaderRouter;
