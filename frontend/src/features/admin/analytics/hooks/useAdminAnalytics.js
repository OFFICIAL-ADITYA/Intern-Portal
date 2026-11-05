import { useState, useEffect, useCallback } from 'react';
import {
  fetchOverview,
  fetchTrend,
  fetchTypes,
  fetchTurnaround,
  fetchTeamLeaders,
  fetchDomains,
  fetchPipeline,
  fetchUpcoming,
  fetchStuck,
  downloadAnalytics
} from '../services/analytics.service';

export function useAdminAnalytics() {
  const [range, setRange] = useState('6m');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [domain, setDomain] = useState('');
  const [teamLeader, setTeamLeader] = useState('');
  const [groupBy, setGroupBy] = useState('month');
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [toastMessage, setToastMessage] = useState(null);

  // Per-widget state storage
  const [widgets, setWidgets] = useState({
    overview: null,
    trend: null,
    types: null,
    turnaround: null,
    teamLeaders: null,
    domains: null,
    pipeline: null,
    upcoming: null,
    stuck: null
  });

  const [loading, setLoading] = useState({
    overview: true,
    trend: true,
    types: true,
    turnaround: true,
    teamLeaders: true,
    domains: true,
    pipeline: true,
    upcoming: true,
    stuck: true
  });

  const [errors, setErrors] = useState({
    overview: null,
    trend: null,
    types: null,
    turnaround: null,
    teamLeaders: null,
    domains: null,
    pipeline: null,
    upcoming: null,
    stuck: null
  });

  const getParams = useCallback(() => {
    const params = { range: range === 'custom' && (!from || !to) ? '6m' : range, domain, teamLeader, groupBy };
    if (range === 'custom') {
      if (from) params.from = from;
      if (to) params.to = to;
    }
    return params;
  }, [range, from, to, domain, teamLeader, groupBy]);

  const fetchSingleWidget = useCallback(
    async (key) => {
      setLoading((prev) => ({ ...prev, [key]: true }));
      setErrors((prev) => ({ ...prev, [key]: null }));
      try {
        const params = getParams();
        let res;
        switch (key) {
          case 'overview':
            res = await fetchOverview(params);
            break;
          case 'trend':
            res = await fetchTrend({ ...params, groupBy });
            break;
          case 'types':
            res = await fetchTypes(params);
            break;
          case 'turnaround':
            res = await fetchTurnaround(params);
            break;
          case 'teamLeaders':
            res = await fetchTeamLeaders(params);
            break;
          case 'domains':
            res = await fetchDomains(params);
            break;
          case 'pipeline':
            res = await fetchPipeline(params);
            break;
          case 'upcoming':
            res = await fetchUpcoming(30, params);
            break;
          case 'stuck':
            res = await fetchStuck(3, params);
            break;
          default:
            return;
        }

        setWidgets((prev) => ({ ...prev, [key]: res.data }));
      } catch (err) {
        setErrors((prev) => ({ ...prev, [key]: err.message || 'Failed to load widget' }));
      } finally {
        setLoading((prev) => ({ ...prev, [key]: false }));
      }
    },
    [getParams, groupBy]
  );

  const fetchAll = useCallback(async () => {
    await Promise.all([
      fetchSingleWidget('overview'),
      fetchSingleWidget('trend'),
      fetchSingleWidget('types'),
      fetchSingleWidget('turnaround'),
      fetchSingleWidget('teamLeaders'),
      fetchSingleWidget('domains'),
      fetchSingleWidget('pipeline'),
      fetchSingleWidget('upcoming'),
      fetchSingleWidget('stuck')
    ]);
    setLastUpdated(new Date());
  }, [fetchSingleWidget]);

  useEffect(() => {
    fetchAll();
  }, [range, from, to, domain, teamLeader, groupBy, fetchAll]);

  const handleExport = async (type, format = 'csv') => {
    try {
      setToastMessage({ type: 'loading', message: `Exporting ${type} ${format.toUpperCase()}...` });
      await downloadAnalytics(type, getParams(), format);
      setToastMessage({ type: 'success', message: `${type.toUpperCase()} ${format.toUpperCase()} exported successfully!` });
    } catch (err) {
      setToastMessage({ type: 'error', message: err.message || `${format.toUpperCase()} export failed` });
    }
  };

  const clearToast = () => setToastMessage(null);

  return {
    range,
    setRange,
    from,
    setFrom,
    to,
    setTo,
    domain,
    setDomain,
    teamLeader,
    setTeamLeader,
    groupBy,
    setGroupBy,
    lastUpdated,
    widgets,
    loading,
    errors,
    fetchSingleWidget,
    refetchAll: fetchAll,
    handleExport,
    toastMessage,
    clearToast
  };
}
