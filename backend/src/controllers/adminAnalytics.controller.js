import XLSX from 'xlsx';
import {
  getOverviewKPIs,
  getRequestsTrend,
  getCertificateTypes,
  getTurnaroundStats,
  getTeamLeadersPerformance,
  getDomainsDistribution,
  getPipelineStages,
  getUpcomingCompletions,
  getStuckRequests
} from '../services/adminAnalytics.service.js';
import { getCache, setCache } from '../utils/redisCache.js';
import { logAudit } from '../utils/auditLogger.js';
import { logAction } from '../utils/logAction.js';

const readFilters = (query) => ({
  from: query.from,
  to: query.to,
  range: query.range,
  domain: query.domain,
  teamLeader: query.teamLeaderId || query.teamLeader,
  teamLeaderId: query.teamLeaderId || query.teamLeader,
  groupBy: query.groupBy
});

export const buildAnalyticsCacheKey = (widget, query, extras = {}) =>
  `analytics:${widget}:${JSON.stringify({ ...readFilters(query), ...extras })}`;

async function fetchWithCache(cacheKey, ttl, fetcherFn) {
  try {
    const cached = await getCache(cacheKey);
    if (cached !== null) return cached;
  } catch { /* Cache outages must not make Analytics unavailable. */ }

  const data = await fetcherFn();
  try { await setCache(cacheKey, data, ttl); } catch { /* Cache writes are best effort. */ }
  return data;
}

async function sendWidget(res, widget, req, ttl, fetcher) {
  const data = await fetchWithCache(buildAnalyticsCacheKey(widget, req.query), ttl, () => fetcher(readFilters(req.query)));
  return res.status(200).json({ success: true, data });
}

export async function getOverview(req, res) {
  try { return await sendWidget(res, 'overview', req, 180, getOverviewKPIs); }
  catch (err) { return res.status(500).json({ message: 'Error retrieving overview analytics', error: err.message }); }
}

export async function getTrend(req, res) {
  try { return await sendWidget(res, 'trend', req, 300, getRequestsTrend); }
  catch (err) { return res.status(500).json({ message: 'Error retrieving requests trend', error: err.message }); }
}

export async function getTypes(req, res) {
  try { return await sendWidget(res, 'types', req, 300, getCertificateTypes); }
  catch (err) { return res.status(500).json({ message: 'Error retrieving certificate types analytics', error: err.message }); }
}

export async function getTurnaround(req, res) {
  try { return await sendWidget(res, 'turnaround', req, 300, getTurnaroundStats); }
  catch (err) { return res.status(500).json({ message: 'Error retrieving turnaround time analytics', error: err.message }); }
}

export async function getTeamLeaders(req, res) {
  try { return await sendWidget(res, 'teamleaders', req, 180, getTeamLeadersPerformance); }
  catch (err) { return res.status(500).json({ message: 'Error retrieving team leader analytics', error: err.message }); }
}

export async function getDomains(req, res) {
  try { return await sendWidget(res, 'domains', req, 300, getDomainsDistribution); }
  catch (err) { return res.status(500).json({ message: 'Error retrieving domain analytics', error: err.message }); }
}

export async function getPipeline(req, res) {
  try { return await sendWidget(res, 'pipeline', req, 180, getPipelineStages); }
  catch (err) { return res.status(500).json({ message: 'Error retrieving pipeline analytics', error: err.message }); }
}

export async function getUpcoming(req, res) {
  try {
    const days = Number(req.query.days || 30);
    const data = await fetchWithCache(buildAnalyticsCacheKey('upcoming', req.query, { days }), 180,
      () => getUpcomingCompletions(days, readFilters(req.query)));
    return res.status(200).json({ success: true, data });
  } catch (err) { return res.status(500).json({ message: 'Error retrieving upcoming completions', error: err.message }); }
}

export async function getStuck(req, res) {
  try {
    const days = Number(req.query.days || 3);
    const data = await fetchWithCache(buildAnalyticsCacheKey('stuck', req.query, { days }), 180,
      () => getStuckRequests(days, readFilters(req.query)));
    return res.status(200).json({ success: true, data });
  } catch (err) { return res.status(500).json({ message: 'Error retrieving stuck requests', error: err.message }); }
}

function toExportRows(type, data) {
  if (type === 'overview') return Object.entries(data.kpis).map(([metric, value]) => ({ metric, value }));
  if (type === 'requests-trend') return data.raw;
  if (type === 'certificate-types') return data.breakdown;
  if (type === 'turnaround') return Object.entries(data).map(([stage, stats]) => ({ stage, ...stats }));
  if (type === 'team-leaders') return data;
  if (type === 'domains') return data.domains;
  if (type === 'pipeline') return [...data.pipeline, { stage: 'Failed draft generation (retry available)', status: 'failed-generation', count: data.failedGenerations }];
  if (type === 'stuck-requests' || type === 'upcoming-completions') return data;
  return [];
}

function rowsToCsv(rows) {
  if (!rows.length) return 'No data\r\n';
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const escape = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  return [columns.map(escape).join(','), ...rows.map((row) => columns.map((column) => escape(row[column])).join(','))].join('\r\n');
}

export async function exportAnalyticsCSV(req, res) {
  try {
    const { type = 'overview', format = 'csv' } = req.query;
    const filters = readFilters(req.query);
    const exports = {
      overview: () => getOverviewKPIs(filters),
      'requests-trend': () => getRequestsTrend(filters),
      'certificate-types': () => getCertificateTypes(filters),
      turnaround: () => getTurnaroundStats(filters),
      'team-leaders': () => getTeamLeadersPerformance(filters),
      domains: () => getDomainsDistribution(filters),
      pipeline: () => getPipelineStages(filters),
      stuck: () => getStuckRequests(Number(req.query.days || 3), filters),
      'stuck-requests': () => getStuckRequests(Number(req.query.days || 3), filters),
      'upcoming-completions': () => getUpcomingCompletions(Number(req.query.days || 30), filters)
    };
    const resolvedType = type === 'stuck' ? 'stuck-requests' : type;
    const data = await exports[type]();
    const rows = toExportRows(resolvedType, data);
    const extension = format === 'xlsx' ? 'xlsx' : 'csv';
    const filename = `uptoskill_analytics_${type}_${new Date().toISOString().slice(0, 10)}.${extension}`;
    let content;

    if (format === 'xlsx') {
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(workbook, worksheet, type.slice(0, 31));
      content = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    } else {
      content = `\uFEFF${rowsToCsv(rows)}`;
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    }

    await logAudit({
      userId: req.user.id,
      action: 'EXPORT_ANALYTICS',
      entityType: 'Analytics',
      description: { type, format, from: filters.from || null, to: filters.to || null, range: filters.range || null, domain: filters.domain || null, teamLeader: filters.teamLeader || null }
    });

    try {
      await logAction({
        req,
        actor: req.user,
        action: 'EXPORT',
        targetType: 'analytics',
        meta: { type, format, ...filters }
      });
    } catch (e) {
      // Best-effort audit logging
    }

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(content);
  } catch (err) {
    return res.status(500).json({ message: 'Error exporting analytics', error: err.message });
  }
}
