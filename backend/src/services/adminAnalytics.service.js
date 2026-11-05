import mongoose from 'mongoose';
import User from '../models/User.js';
import CertificateRequest from '../models/CertificateRequest.js';
import Certificate from '../models/Certificate.js';

// Helper to resolve date range windows
export function resolveDateWindow(from, to, range = '6m') {
  const now = new Date();
  let startDate;
  let endDate = to ? new Date(to) : new Date(now);

  // Set end of day for endDate if only date string was provided
  if (to && typeof to === 'string' && to.length === 10) {
    endDate.setHours(23, 59, 59, 999);
  }

  if (from) {
    startDate = new Date(from);
    if (typeof from === 'string' && from.length === 10) {
      startDate.setHours(0, 0, 0, 0);
    }
  } else {
    startDate = new Date(endDate);
    if (range === '7d') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (range === '30d') {
      startDate.setDate(startDate.getDate() - 30);
    } else if (range === '12m') {
      startDate.setMonth(startDate.getMonth() - 12);
    } else if (range === 'all') {
      startDate = new Date(0);
    } else {
      // Default 6m
      startDate.setMonth(startDate.getMonth() - 6);
    }
  }

  // Previous period window for percentage change comparisons
  const durationMs = endDate.getTime() - startDate.getTime();
  const prevEndDate = new Date(startDate.getTime() - 1);
  const prevStartDate = new Date(prevEndDate.getTime() - durationMs);

  return { startDate, endDate, prevStartDate, prevEndDate };
}

async function getScopedInternIds(filters = {}, { includeDates = true } = {}) {
  const dateRange = resolveDateWindow(filters.from, filters.to, filters.range);
  const query = { role: 'intern' };
  if (filters.domain) query.domain = filters.domain;
  const tl = filters.teamLeaderId || filters.teamLeader;
  if (tl) query['internshipDetails.teamLeader'] = tl;
  if (includeDates) query.createdAt = { $gte: dateRange.startDate, $lte: dateRange.endDate };
  const interns = await User.find(query).select('_id');
  return interns.map(({ _id }) => _id);
}

function scopedRequestMatch(filters, startDate, endDate, internIds) {
  return {
    requestedAt: { $gte: startDate, $lte: endDate },
    userId: { $in: internIds }
  };
}

// Percentile helper function
function calculatePercentiles(values) {
  if (!values || values.length === 0) {
    return { avg: 0, median: 0, p90: 0 };
  }
  const sorted = [...values].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, v) => acc + v, 0);
  const avg = Number((sum / sorted.length).toFixed(1));

  const getPercentile = (p) => {
    const idx = (p / 100) * (sorted.length - 1);
    const lower = Math.floor(idx);
    const upper = Math.ceil(idx);
    if (lower === upper) return sorted[lower];
    return sorted[lower] + (sorted[upper] - sorted[lower]) * (idx - lower);
  };

  const median = Number(getPercentile(50).toFixed(1));
  const p90 = Number(getPercentile(90).toFixed(1));

  return { avg, median, p90 };
}

/**
 * 1. Overview KPIs
 */
export async function getOverviewKPIs(filters = {}) {
  const { startDate, endDate, prevStartDate, prevEndDate } = resolveDateWindow(
    filters.from,
    filters.to,
    filters.range
  );

  const internIds = await getScopedInternIds(filters, { includeDates: false });
  const scopedLeaderIds = filters.domain || filters.teamLeader
    ? await User.distinct('internshipDetails.teamLeader', { role: 'intern', _id: { $in: internIds }, 'internshipDetails.teamLeader': { $ne: null } })
    : null;
  const internFilter = {
    _id: { $in: internIds },
    createdAt: { $gte: startDate, $lte: endDate }
  };
  const dateMatchCurrent = { requestedAt: { $gte: startDate, $lte: endDate } };
  const dateMatchPrev = { requestedAt: { $gte: prevStartDate, $lte: prevEndDate } };
  const requestScope = { userId: { $in: internIds } };

  // Current period counts
  const [
    totalInterns,
    activeInterns,
    upcomingInterns,
    completedInterns,
    cancelledInterns,
    totalTeamLeaders,
    pendingRequests,
    approvedRequests,
    forwardedRequests,
    requestsThisMonth,
    certificatesIssuedThisMonth,
    totalRequests,
    totalApprovedCount,
    totalRejectedCount,
    prevRequestsCount,
    prevIssuedCertificates
  ] = await Promise.all([
    User.countDocuments(internFilter),
    User.countDocuments({ ...internFilter, 'internshipDetails.status': 'ongoing', isArchived: { $ne: true } }),
    User.countDocuments({ ...internFilter, 'internshipDetails.status': 'upcoming' }),
    User.countDocuments({ ...internFilter, 'internshipDetails.status': 'completed' }),
    User.countDocuments({ ...internFilter, 'internshipDetails.status': 'cancelled' }),
    User.countDocuments(scopedLeaderIds ? { _id: { $in: scopedLeaderIds }, role: 'teamleader' } : { role: 'teamleader' }),
    CertificateRequest.countDocuments({ status: 'pending', ...dateMatchCurrent, ...requestScope }),
    CertificateRequest.countDocuments({ status: 'approved', ...dateMatchCurrent, ...requestScope }),
    CertificateRequest.countDocuments({ status: 'processing', ...dateMatchCurrent, ...requestScope }),
    CertificateRequest.countDocuments({ ...dateMatchCurrent, ...requestScope }),
    Certificate.countDocuments({
      status: { $in: ['issued', 'finalized'] },
      userId: { $in: internIds },
      $or: [
        { finalizedAt: { $gte: startDate, $lte: endDate } },
        { finalizedAt: null, issuedDate: { $gte: startDate, $lte: endDate } }
      ]
    }),
    CertificateRequest.countDocuments({ ...dateMatchCurrent, ...requestScope }),
    CertificateRequest.countDocuments({ status: { $in: ['processing', 'approved', 'completed'] }, ...dateMatchCurrent, ...requestScope }),
    CertificateRequest.countDocuments({ status: 'rejected', ...dateMatchCurrent, ...requestScope }),
    CertificateRequest.countDocuments({ ...dateMatchPrev, ...requestScope }),
    Certificate.countDocuments({
      status: { $in: ['issued', 'finalized'] },
      userId: { $in: internIds },
      $or: [
        { finalizedAt: { $gte: prevStartDate, $lte: prevEndDate } },
        { finalizedAt: null, issuedDate: { $gte: prevStartDate, $lte: prevEndDate } }
      ]
    })
  ]);

  const totalDecided = totalApprovedCount + totalRejectedCount;
  const approvalRate = totalDecided > 0 ? Number(((totalApprovedCount / totalDecided) * 100).toFixed(1)) : 0;
  const rejectionRate = totalDecided > 0 ? Number(((totalRejectedCount / totalDecided) * 100).toFixed(1)) : 0;

  // Turnaround calculation for current window
  const completedRequests = await CertificateRequest.find({
    status: 'completed',
    ...dateMatchCurrent,
    ...requestScope
  }).select('requestedAt updatedAt completedAt');

  const turnaroundHoursList = completedRequests
    .filter((r) => r.requestedAt && (r.completedAt || r.updatedAt))
    .map((r) => ((r.completedAt || r.updatedAt) - r.requestedAt) / (1000 * 60 * 60))
    .filter((hours) => Number.isFinite(hours) && hours >= 0);

  const turnaroundStats = calculatePercentiles(turnaroundHoursList);

  // Percentage change calculations
  const calcChange = (curr, prev) => {
    if (!prev || prev === 0) return curr > 0 ? 100 : 0;
    return Number((((curr - prev) / prev) * 100).toFixed(1));
  };

  return {
    kpis: {
      totalInterns,
      activeInterns,
      upcomingInterns,
      completedInterns,
      cancelledInterns,
      totalTeamLeaders,
      pendingRequests,
      approvedRequests,
      forwardedRequests,
      requestsThisMonth,
      certificatesIssuedThisMonth,
      approvalRate,
      rejectionRate,
      avgTurnaroundHours: turnaroundStats.avg
    },
    changes: {
      requests: calcChange(requestsThisMonth, prevRequestsCount),
      certificates: calcChange(certificatesIssuedThisMonth, prevIssuedCertificates)
    },
    period: {
      startDate,
      endDate
    }
  };
}

/**
 * 2. Requests Trend
 */
export async function getRequestsTrend(filters = {}) {
  const { startDate, endDate } = resolveDateWindow(filters.from, filters.to, filters.range);
  const groupBy = filters.groupBy || 'month';

  let formatStr = '%Y-%m';
  if (groupBy === 'day') formatStr = '%Y-%m-%d';
  if (groupBy === 'week') formatStr = '%Y-W%V';

  const internIds = await getScopedInternIds(filters, { includeDates: false });
  const matchQuery = scopedRequestMatch(filters, startDate, endDate, internIds);

  const trendData = await CertificateRequest.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: {
          period: { $dateToString: { format: formatStr, date: '$requestedAt' } },
          status: '$status'
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { '_id.period': 1 } }
  ]);

  // Aggregate into map of periods
  const periodsMap = {};
  const statuses = ['pending', 'approved', 'rejected', 'processing', 'completed', 'cancelled'];

  trendData.forEach((item) => {
    const p = item._id.period;
    const s = item._id.status;
    if (!periodsMap[p]) {
      periodsMap[p] = { period: p, pending: 0, approved: 0, rejected: 0, processing: 0, completed: 0, cancelled: 0, total: 0 };
    }
    if (statuses.includes(s)) {
      periodsMap[p][s] = item.count;
    }
    periodsMap[p].total += item.count;
  });

  const raw = Object.values(periodsMap).sort((a, b) => a.period.localeCompare(b.period));
  const labels = raw.map((r) => r.period);

  const series = statuses.map((st) => ({
    status: st,
    name: st.charAt(0).toUpperCase() + st.slice(1),
    data: raw.map((r) => r[st] || 0)
  }));

  return { labels, series, raw };
}

/**
 * 3. Certificate Types Count & Breakdown
 */
export async function getCertificateTypes(filters = {}) {
  const { startDate, endDate } = resolveDateWindow(filters.from, filters.to, filters.range);

  const internIds = await getScopedInternIds(filters, { includeDates: false });
  const matchQuery = scopedRequestMatch(filters, startDate, endDate, internIds);

  const counts = await CertificateRequest.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: '$certificateType',
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } }
  ]);

  const total = counts.reduce((sum, item) => sum + item.count, 0);

  const breakdown = counts.map((item) => ({
    certificateType: item._id || 'Standard',
    count: item.count,
    percentage: total > 0 ? Number(((item.count / total) * 100).toFixed(1)) : 0
  }));

  return { total, breakdown };
}

/**
 * 4. Turnaround Time Analysis (Average, Median, P90)
 */
export async function getTurnaroundStats(filters = {}) {
  const { startDate, endDate } = resolveDateWindow(filters.from, filters.to, filters.range);

  const internIds = await getScopedInternIds(filters, { includeDates: false });
  const [facet = { review: [], finalize: [], total: [] }] = await CertificateRequest.aggregate([
    { $match: { requestedAt: { $gte: startDate, $lte: endDate }, userId: { $in: internIds } } },
    { $set: { reviewDate: { $ifNull: ['$forwardedAt', '$reviewedAt'] }, completedDate: { $ifNull: ['$completedAt', '$updatedAt'] } } },
    { $facet: {
      review: [ { $match: { reviewDate: { $ne: null } } }, { $set: { seconds: { $dateDiff: { startDate: '$requestedAt', endDate: '$reviewDate', unit: 'second' } } } }, { $match: { seconds: { $gte: 0 } } }, { $project: { hours: { $divide: ['$seconds', 3600] } } } ],
      finalize: [ { $match: { status: 'completed', reviewDate: { $ne: null }, completedDate: { $ne: null } } }, { $set: { seconds: { $dateDiff: { startDate: '$reviewDate', endDate: '$completedDate', unit: 'second' } } } }, { $match: { seconds: { $gte: 0 } } }, { $project: { hours: { $divide: ['$seconds', 3600] } } } ],
      total: [ { $match: { status: 'completed', completedDate: { $ne: null } } }, { $set: { seconds: { $dateDiff: { startDate: '$requestedAt', endDate: '$completedDate', unit: 'second' } } } }, { $match: { seconds: { $gte: 0 } } }, { $project: { hours: { $divide: ['$seconds', 3600] } } } ]
    } }
  ]);
  const values = (rows) => rows.map(({ hours }) => hours);

  return {
    timeToTLReview: calculatePercentiles(values(facet.review)),
    timeToAdminFinalize: calculatePercentiles(values(facet.finalize)),
    totalTurnaround: calculatePercentiles(values(facet.total))
  };
}

/**
 * 5. Team Leader Performance Table
 */
export async function getTeamLeadersPerformance(filters = {}) {
  const scopedInternIds = await getScopedInternIds(filters, { includeDates: false });
  const assignedLeaderIds = await User.distinct('internshipDetails.teamLeader', {
    role: 'intern', _id: { $in: scopedInternIds }, 'internshipDetails.teamLeader': { $ne: null }
  });
  const leaderQuery = { role: 'teamleader', _id: { $in: assignedLeaderIds } };
  if (filters.teamLeader) leaderQuery._id = filters.teamLeader;
  const teamLeaders = await User.find(leaderQuery).select('_id fullName email');
  const { startDate, endDate } = resolveDateWindow(filters.from, filters.to, filters.range);

  const performanceList = await Promise.all(
    teamLeaders.map(async (tl) => {
      const internsAssigned = await User.countDocuments({
        role: 'intern',
        'internshipDetails.teamLeader': tl._id,
        _id: { $in: scopedInternIds }
      });

      // Requests reviewed by this TL
      const reviewedRequests = await CertificateRequest.find({
        $or: [{ forwardedBy: tl._id }, { reviewedBy: tl._id }],
        $and: [
          { $or: [{ forwardedAt: { $gte: startDate, $lte: endDate } }, { forwardedAt: null, reviewedAt: { $gte: startDate, $lte: endDate } }] },
          { userId: { $in: scopedInternIds } }
        ]
      }).select('requestedAt reviewedAt forwardedAt status');

      const reviewedCount = reviewedRequests.length;
      const rejectedCount = reviewedRequests.filter((r) => r.status === 'rejected').length;

      const reviewDurations = reviewedRequests
        .filter((r) => r.requestedAt && (r.forwardedAt || r.reviewedAt))
        .map((r) => ((r.forwardedAt || r.reviewedAt) - r.requestedAt) / (1000 * 60 * 60))
        .filter((hours) => Number.isFinite(hours) && hours >= 0);

      const avgReviewTimeHours = calculatePercentiles(reviewDurations).avg;
      const rejectionRate = reviewedCount > 0 ? Number(((rejectedCount / reviewedCount) * 100).toFixed(1)) : 0;

      // Pending requests for this TL's interns
      const assignedInterns = await User.find({
        role: 'intern',
        'internshipDetails.teamLeader': tl._id,
        _id: { $in: scopedInternIds }
      }).select('_id');

      const assignedInternIds = assignedInterns.map((i) => i._id);

      const pendingRequests = await CertificateRequest.find({
        userId: { $in: assignedInternIds },
        status: 'pending',
        requestedAt: { $gte: startDate, $lte: endDate }
      }).select('requestedAt');

      const now = new Date();
      let maxPendingDays = 0;
      let hasOverdueRequests = false;

      pendingRequests.forEach((req) => {
        const days = (now - new Date(req.requestedAt)) / (1000 * 60 * 60 * 24);
        if (days > maxPendingDays) maxPendingDays = Number(days.toFixed(1));
        if (days >= 3) hasOverdueRequests = true; // flagged if > 3 days pending
      });

      return {
        id: tl._id,
        fullName: tl.fullName,
        email: tl.email,
        internsAssigned,
        requestsReviewed: reviewedCount,
        pendingReviews: pendingRequests.length,
        avgReviewTimeHours,
        rejectionRate,
        hasOverdueRequests,
        maxPendingDays
      };
    })
  );

  return performanceList.sort((a, b) => b.pendingReviews - a.pendingReviews);
}

/**
 * 6. Domains & Departments Distribution
 */
export async function getDomainsDistribution(filters = {}) {
  const internIds = await getScopedInternIds(filters);

  const userDomainCounts = await User.aggregate([
    { $match: { role: 'intern', _id: { $in: internIds } } },
    {
      $group: {
        _id: '$domain',
        totalInterns: { $sum: 1 },
        activeInterns: {
          $sum: { $cond: [{ $and: [{ $eq: ['$internshipDetails.status', 'ongoing'] }, { $ne: ['$isArchived', true] }] }, 1, 0] }
        }
      }
    }
  ]);

  const { startDate, endDate } = resolveDateWindow(filters.from, filters.to, filters.range);
  const certDomainCounts = await Certificate.aggregate([
    {
      $match: {
        userId: { $in: internIds },
        status: { $in: ['issued', 'finalized'] },
        $or: [
          { finalizedAt: { $gte: startDate, $lte: endDate } },
          { finalizedAt: null, issuedDate: { $gte: startDate, $lte: endDate } }
        ]
      }
    }, {
      $group: {
        _id: '$domain',
        certificatesCount: { $sum: 1 }
      }
    }
  ]);

  const certMap = {};
  certDomainCounts.forEach((c) => {
    if (c._id) certMap[c._id] = c.certificatesCount;
  });

  const domains = userDomainCounts.map((d) => {
    const domainName = d._id || 'Unassigned';
    return {
      domain: domainName,
      totalInterns: d.totalInterns,
      activeInterns: d.activeInterns,
      certificatesCount: certMap[domainName] || 0
    };
  });

  return { departments: [], domains };
}

/**
 * 7. Pipeline / Bottleneck Stages
 */
export async function getPipelineStages(filters = {}) {
  const { startDate, endDate } = resolveDateWindow(filters.from, filters.to, filters.range);

  const internIds = await getScopedInternIds(filters, { includeDates: false });
  const matchQuery = scopedRequestMatch(filters, startDate, endDate, internIds);

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const [
    pendingCount,
    processingCount,
    completedCount,
    rejectedByTLCount,
    rejectedByAdminCount,
    failedGenerationCount,
    awaitingFinalizationCount
  ] = await Promise.all([
    CertificateRequest.countDocuments({ ...matchQuery, status: 'pending' }),
    CertificateRequest.countDocuments({ ...matchQuery, status: 'processing' }),
    CertificateRequest.countDocuments({ ...matchQuery, status: 'completed' }),
    CertificateRequest.countDocuments({
      ...matchQuery,
      status: 'rejected',
      $or: [{ forwardedAt: null }, { forwardedAt: { $exists: false } }]
    }),
    CertificateRequest.countDocuments({
      ...matchQuery,
      status: 'rejected',
      forwardedAt: { $ne: null, $exists: true }
    }),
    CertificateRequest.countDocuments({
      ...matchQuery,
      status: 'approved',
      $or: [{ certificateId: null }, { certificateId: { $exists: false } }],
      updatedAt: { $lt: oneHourAgo }
    }),
    CertificateRequest.countDocuments({
      ...matchQuery,
      status: 'approved',
      $or: [
        { certificateId: { $ne: null, $exists: true } },
        { updatedAt: { $gte: oneHourAgo } }
      ]
    })
  ]);

  const pipeline = [
    { stage: 'With Team Leader', status: 'pending', count: pendingCount },
    { stage: 'With Admin', status: 'processing', count: processingCount },
    { stage: 'Awaiting Finalization', status: 'approved', count: awaitingFinalizationCount },
    { stage: 'Completed', status: 'completed', count: completedCount },
    { stage: 'Rejected by TL', status: 'rejected_tl', count: rejectedByTLCount },
    { stage: 'Rejected by Admin', status: 'rejected_admin', count: rejectedByAdminCount },
    { stage: 'Failed Generation', status: 'failed_generation', count: failedGenerationCount }
  ];

  return { pipeline, failedGenerations: failedGenerationCount };
}

/**
 * 8. Upcoming Completions
 */
export async function getUpcomingCompletions(days = 30, filters = {}) {
  const now = new Date();
  const startDate = new Date(now);
  startDate.setHours(0, 0, 0, 0);
  let futureDate = new Date(startDate);
  if (filters.range === 'custom' && filters.from && filters.to) {
    const range = resolveDateWindow(filters.from, filters.to, filters.range);
    if (range.startDate > startDate) startDate.setTime(range.startDate.getTime());
    futureDate = range.endDate;
  } else if (filters.range && filters.range !== 'all') {
    const months = filters.range === '6m' ? 6 : filters.range === '12m' ? 12 : 0;
    const rangeDays = filters.range === '7d' ? 7 : filters.range === '30d' ? 30 : null;
    if (months) futureDate.setMonth(futureDate.getMonth() + months);
    else if (rangeDays) futureDate.setDate(futureDate.getDate() + rangeDays);
    else futureDate.setDate(futureDate.getDate() + Number(days));
  } else {
    futureDate.setDate(futureDate.getDate() + Number(days));
  }

  const internFilter = {
    role: 'intern',
    'internshipDetails.status': { $nin: ['completed', 'cancelled'] },
    endDate: { $gte: startDate, $lte: futureDate }
  };
  if (filters.domain) internFilter.domain = filters.domain;
  const tl = filters.teamLeaderId || filters.teamLeader;
  if (tl) internFilter['internshipDetails.teamLeader'] = tl;
  const interns = await User.find(internFilter).populate('internshipDetails.teamLeader', 'fullName email');

  const results = await Promise.all(
    interns.map(async (intern) => {
      const request = await CertificateRequest.findOne({ userId: intern._id }).select('status requestNumber requestedAt').sort({ requestedAt: -1 });

      return {
        id: intern._id,
        fullName: intern.fullName,
        email: intern.email,
        domain: intern.domain || 'N/A',
        endDate: intern.endDate,
        daysRemaining: Math.ceil((new Date(intern.endDate) - now) / (1000 * 60 * 60 * 24)),
        teamLeaderName: intern.internshipDetails?.teamLeader?.fullName || 'Not assigned',
        hasRequestedCertificate: !!request,
        certificateStatus: request ? request.status : 'Not Requested',
        requestNumber: request ? request.requestNumber : null
      };
    })
  );

  return results.sort((a, b) => a.daysRemaining - b.daysRemaining);
}

/**
 * 9. Stuck Requests List
 */
export async function getStuckRequests(days = 3, filters = {}) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - Number(days));

  const dateRange = filters.from || filters.to || filters.range
    ? resolveDateWindow(filters.from, filters.to, filters.range)
    : null;
  const internIds = await getScopedInternIds(filters, { includeDates: false });
  const requests = await CertificateRequest.find({
    status: { $in: ['pending', 'processing', 'approved'] },
    requestedAt: {
      ...(dateRange ? { $gte: dateRange.startDate, $lte: new Date(Math.min(cutoff.getTime(), dateRange.endDate.getTime())) } : { $lte: cutoff })
    },
    userId: { $in: internIds }
  })
    .populate('userId', 'fullName email domain')
    .populate('reviewedBy', 'fullName email')
    .populate('certificateId', '_id')
    .sort({ requestedAt: 1 });

  const now = new Date();

  return requests.map((req) => {
    const daysPending = Number(((now - new Date(req.requestedAt)) / (1000 * 60 * 60 * 24)).toFixed(1));

    return {
      id: req._id,
      requestNumber: req.requestNumber,
      internName: req.userId?.fullName || 'Unknown Intern',
      internEmail: req.userId?.email || 'N/A',
      domain: req.userId?.domain || 'N/A',
      certificateType: req.certificateType,
      requestedAt: req.requestedAt,
      status: req.status,
      daysPending,
      reviewedBy: req.reviewedBy?.fullName || (req.status === 'processing' ? 'With Admin' : 'Pending TL Review'),
      reviewLink: req.certificateId
        ? `/admin/certificates/${req.certificateId._id || req.certificateId}/review`
        : (req.status === 'processing' || req.status === 'approved') ? 'requests-queue' : null
    };
  });
}
