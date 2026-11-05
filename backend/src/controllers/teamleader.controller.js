import mongoose from 'mongoose';
import User from '../models/User.js';
import { generateInternCode } from '../utils/generateInternCode.js';
import CertificateRequest from '../models/CertificateRequest.js';
import Certificate from '../models/Certificate.js';
import { logAudit } from '../utils/auditLogger.js';
import { logAction } from '../utils/logAction.js';
import { notify } from '../services/notification.service.js';
import { invalidateAnalyticsCache } from '../utils/redisCache.js';

export async function createIntern(req, res) {
	try {
		const { fullName, email, mobileNo, domain, startDate, endDate } = req.body;
		const teamLeader = await User.findById(req.user.id).select('email role');

		if (!teamLeader || teamLeader.role !== 'teamleader') {
			return res.status(403).json({ message: 'Team leader access required' });
		}

		const existingUser = await User.findOne({ email: email.toLowerCase() });
		if (existingUser) {
			return res.status(409).json({ message: 'user already exists' });
		}

		const internCode = await generateInternCode();
		const user = await User.create({
			fullName,
			email: email.toLowerCase(),
			mobileNo,
			internCode,
			domain,
			startDate,
			endDate,
			role: 'intern',
			password: internCode,
			internshipDetails: {
				teamLeaderId: teamLeader._id,
				teamLeader: teamLeader._id,
				teamleaderEmail: teamLeader.email.toLowerCase(),
				status: 'ongoing',
				createdBy: teamLeader._id,
			},
		});

		return res.status(201).json({
			message: 'Intern created successfully',
			user: { id: user._id, email: user.email },
		});
	} catch (error) {
		return res.status(500).json({ message: 'internal server error' });
	}
}

export async function getInternsForTL(req, res) {
	try {
		const tlId = req.user.id;
		const tlEmail = req.user.email?.toLowerCase();

		const filter = {
			role: 'intern',
			isArchived: { $ne: true },
			$or: [
				{ 'internshipDetails.teamLeaderId': tlId },
				{ 'internshipDetails.teamLeader': tlId },
				{ 'internshipDetails.teamleaderEmail': tlEmail }
			]
		};

		if (req.query.search) {
			const s = req.query.search.trim();
			filter.$and = [
				{
					$or: [
						{ fullName: { $regex: s, $options: 'i' } },
						{ email: { $regex: s, $options: 'i' } },
						{ internCode: { $regex: s, $options: 'i' } },
						{ domain: { $regex: s, $options: 'i' } }
					]
				}
			];
		}

		if (req.query.status) {
			filter['internshipDetails.status'] = req.query.status;
		}

		const interns = await User.find(filter)
			.select('-password -resetPasswordToken -resetPasswordExpires')
			.sort({ createdAt: -1 });

		return res.status(200).json({
			message: 'Interns fetched successfully',
			interns,
			total: interns.length
		});
	} catch (error) {
		return res.status(500).json({ message: 'internal server error' });
	}
}

export async function getAssignedInternById(req, res) {
	try {
		const { id } = req.params;
		if (!mongoose.Types.ObjectId.isValid(id)) {
			return res.status(400).json({ message: 'Invalid intern ID format' });
		}

		const intern = await User.findOne({ _id: id, role: 'intern', isArchived: { $ne: true } })
			.select('-password -resetPasswordToken -resetPasswordExpires');

		if (!intern) {
			return res.status(404).json({ message: 'Intern not found' });
		}

		// Server-side ownership check
		const tlId = req.user.id.toString();
		const tlEmail = req.user.email?.toLowerCase();
		const isAssigned =
			(intern.internshipDetails?.teamLeaderId && intern.internshipDetails.teamLeaderId.toString() === tlId) ||
			(intern.internshipDetails?.teamLeader && intern.internshipDetails.teamLeader.toString() === tlId) ||
			(intern.internshipDetails?.teamleaderEmail && intern.internshipDetails.teamleaderEmail.toLowerCase() === tlEmail);

		if (!isAssigned) {
			return res.status(403).json({ message: 'Access denied: Intern is not assigned to you' });
		}

		const requests = await CertificateRequest.find({ userId: intern._id }).sort({ requestedAt: -1 });
		const certificates = await Certificate.find({ userId: intern._id, status: 'finalized' })
			.select('-htmlContent')
			.sort({ createdAt: -1 });

		return res.status(200).json({
			message: 'Intern fetched successfully',
			intern,
			requests,
			certificates
		});
	} catch (error) {
		return res.status(500).json({ message: 'Server error', error: error.message });
	}
}

export async function updateAssignedIntern(req, res) {
	try {
		const { id } = req.params;
		if (!mongoose.Types.ObjectId.isValid(id)) {
			return res.status(400).json({ message: 'Invalid intern ID format' });
		}

		// Rejection of ownership or role hijacking attempts
		if (
			req.body.teamLeaderId !== undefined ||
			req.body.teamLeader !== undefined ||
			req.body.teamleaderEmail !== undefined ||
			req.body.role !== undefined ||
			req.body.password !== undefined ||
			req.body.email !== undefined ||
			req.body.internCode !== undefined
		) {
			return res.status(403).json({ message: 'Team leaders cannot reassign interns, modify roles, or alter security credentials' });
		}

		const intern = await User.findOne({ _id: id, role: 'intern' });
		if (!intern) {
			return res.status(404).json({ message: 'Intern not found' });
		}

		// Server-side ownership check
		const tlId = req.user.id.toString();
		const tlEmail = req.user.email?.toLowerCase();
		const isAssigned =
			(intern.internshipDetails?.teamLeader && intern.internshipDetails.teamLeader.toString() === tlId) ||
			(intern.internshipDetails?.teamleaderEmail && intern.internshipDetails.teamleaderEmail.toLowerCase() === tlEmail);

		if (!isAssigned) {
			return res.status(403).json({ message: 'Access denied: Intern is not assigned to you' });
		}

		// Allowlist validation
		const {
			fullName,
			mobileNo,
			domain,
			startDate,
			endDate,
			collegeName,
			degree,
			internshipTitle,
			mentor,
			performanceRemarks,
			status
		} = req.body;

		const effectiveStart = startDate !== undefined ? new Date(startDate) : intern.startDate;
		const effectiveEnd = endDate !== undefined ? new Date(endDate) : intern.endDate;
		if (effectiveStart && effectiveEnd && effectiveStart > effectiveEnd) {
			return res.status(400).json({ message: 'Start date cannot be after end date' });
		}

		if (status !== undefined && !['upcoming', 'ongoing', 'completed', 'cancelled'].includes(status)) {
			return res.status(400).json({ message: 'Invalid status value. Must be upcoming, ongoing, completed, or cancelled' });
		}

		const changes = {};
		if (fullName !== undefined) { changes.fullName = { from: intern.fullName, to: fullName }; intern.fullName = fullName; }
		if (mobileNo !== undefined) { changes.mobileNo = { from: intern.mobileNo, to: mobileNo }; intern.mobileNo = mobileNo; }
		if (domain !== undefined) { changes.domain = { from: intern.domain, to: domain }; intern.domain = domain; }
		if (startDate !== undefined) { changes.startDate = { from: intern.startDate, to: startDate }; intern.startDate = startDate; }
		if (endDate !== undefined) { changes.endDate = { from: intern.endDate, to: endDate }; intern.endDate = endDate; }

		if (!intern.internshipDetails) intern.internshipDetails = {};
		if (collegeName !== undefined) { changes.collegeName = { from: intern.internshipDetails.collegeName, to: collegeName }; intern.internshipDetails.collegeName = collegeName; }
		if (degree !== undefined) { changes.degree = { from: intern.internshipDetails.degree, to: degree }; intern.internshipDetails.degree = degree; }
		if (internshipTitle !== undefined) { changes.internshipTitle = { from: intern.internshipDetails.internshipTitle, to: internshipTitle }; intern.internshipDetails.internshipTitle = internshipTitle; }
		if (mentor !== undefined) { changes.mentor = { from: intern.internshipDetails.mentor, to: mentor }; intern.internshipDetails.mentor = mentor; }
		if (performanceRemarks !== undefined) { changes.performanceRemarks = { from: intern.internshipDetails.performanceRemarks, to: performanceRemarks }; intern.internshipDetails.performanceRemarks = performanceRemarks; }
		if (status !== undefined) { changes.status = { from: intern.internshipDetails.status, to: status }; intern.internshipDetails.status = status; }

		await intern.save();

		await logAudit({
			userId: req.user.id,
			action: 'UPDATE_ASSIGNED_INTERN',
			entityType: 'User',
			entityId: intern._id,
			description: changes,
			req
		});

		const sanitizedIntern = await User.findById(intern._id).select('-password -resetPasswordToken -resetPasswordExpires');

		return res.status(200).json({
			message: 'Intern updated successfully',
			intern: sanitizedIntern
		});
	} catch (error) {
		return res.status(500).json({ message: 'Server error', error: error.message });
	}
}



// Step 1: TL sees requests waiting for their review
export const getRequestsForReview = async (req, res) => {
  try {
    const tlId = req.user.id;
    const tlEmail = req.user.email?.toLowerCase();

    const assignedInterns = await User.find({
      role: 'intern',
      $or: [
        { 'internshipDetails.teamLeaderId': tlId },
        { 'internshipDetails.teamLeader': tlId },
        { 'internshipDetails.teamleaderEmail': tlEmail }
      ]
    }).select('_id');

    const internIds = assignedInterns.map((i) => i._id);

    const requests = await CertificateRequest.find({
      status: 'pending',
      userId: { $in: internIds }
    })
      .populate('userId', 'fullName email internCode domain')
      .sort({ requestedAt: -1 });

    res.json({ requests });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};



// Step 2: TL either forwards (→ processing) or rejects (→ rejected, terminal)
export const reviewRequestAsTL = async (req, res) => {
  try {
    const { action, rejectionReason } = req.body; // action: 'forward' | 'reject'

    if (!['forward', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'action must be "forward" or "reject"' });
    }

    const request = await CertificateRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });

    // Verify request belongs to this TL's assigned intern
    const intern = await User.findById(request.userId).select('internshipDetails');
    const tlId = req.user.id?.toString();
    const tlEmail = req.user.email?.toLowerCase();
    const isAssigned = intern && (
      (intern.internshipDetails?.teamLeaderId && intern.internshipDetails.teamLeaderId.toString() === tlId) ||
      (intern.internshipDetails?.teamLeader && intern.internshipDetails.teamLeader.toString() === tlId) ||
      (intern.internshipDetails?.teamleaderEmail && intern.internshipDetails.teamleaderEmail.toLowerCase() === tlEmail)
    );

    if (!isAssigned) {
      return res.status(403).json({ message: "Access denied: Request does not belong to your assigned intern" });
    }

    if (request.status !== 'pending') {
      return res.status(409).json({ message: 'This request has already been reviewed' });
    }

    if (action === 'reject') {
      if (!rejectionReason) {
        return res.status(400).json({ message: 'rejectionReason is required when rejecting' });
      }
      request.status = 'rejected';
      request.reviewedBy = req.user.id;
      request.reviewedAt = new Date();
      request.rejectionReason = rejectionReason;
    } else {
      request.status = 'processing';
      request.forwardedBy = req.user.id;   // remove this line if you skipped the schema addition
      request.forwardedAt = new Date();    // remove this line if you skipped the schema addition
    }

    await request.save();
    await invalidateAnalyticsCache();

    await logAction({
      req,
      actor: req.user,
      action: action === 'forward' ? 'REQUEST_FORWARDED' : 'REQUEST_REJECTED',
      targetType: 'request',
      targetId: request._id,
      meta: action === 'reject' ? { reason: rejectionReason } : { certificateType: request.certificateType }
    });

    try {
      if (action === 'forward') {
        const admins = await User.find({ role: 'admin' }).select('_id');
        for (const admin of admins) {
          await notify(admin._id, 'REQUEST_FORWARDED', {
            title: 'Certificate Request Forwarded',
            message: `A request for ${request.certificateType} (${request.requestNumber || ''}) has been forwarded by Team Leader for your decision.`,
            requestId: request._id,
            email: false
          });
        }
      } else if (action === 'reject') {
        await notify(request.userId, 'REQUEST_REJECTED', {
          title: 'Certificate Request Rejected',
          message: `Your request for ${request.certificateType} was rejected. Reason: ${rejectionReason}`,
          requestId: request._id,
          email: true
        });
      }
    } catch (notifErr) {
      console.error('[Notification] Error in TL review notifications:', notifErr.message);
    }

    res.json({ request });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
 // Get interns whose internship completion date is today or within the next 3 days
export const getUpcomingCompletionsForTL = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thirdDay = new Date(today);
    thirdDay.setDate(thirdDay.getDate() + 3);
    thirdDay.setHours(23, 59, 59, 999);

    const interns = await User.find({
      role: 'intern',
      'internshipDetails.teamleaderEmail': req.user.email.toLowerCase(),
      endDate: {
        $gte: today,
        $lte: thirdDay,
      },
      'internshipDetails.status': {
        $nin: ['completed', 'cancelled'],
      },
    })
      .select('-password')
      .sort({ endDate: 1 });

    const upcomingCompletions = interns.map((intern) => {
      const endDate = new Date(intern.endDate);
      endDate.setHours(0, 0, 0, 0);

      const diffInMs = endDate.getTime() - today.getTime();
      const daysUntilCompletion = Math.round(
        diffInMs / (1000 * 60 * 60 * 24)
      );

      return {
        ...intern.toObject(),
        daysUntilCompletion,
      };
    });

    return res.status(200).json({
      message: 'Upcoming internship completions fetched successfully',
      upcomingCompletions,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'internal server error',
    });
  }
};
