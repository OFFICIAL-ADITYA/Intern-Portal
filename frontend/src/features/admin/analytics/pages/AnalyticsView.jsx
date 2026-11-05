import { useEffect, useState } from 'react';
import { useAdminAnalytics } from '../hooks/useAdminAnalytics';
import AnalyticsControls from '../components/AnalyticsControls';
import AnalyticsKPICards from '../components/AnalyticsKPICards';
import AnalyticsCharts from '../components/AnalyticsCharts';
import AnalyticsTables from '../components/AnalyticsTables';
import AnalyticsTurnaround from '../components/AnalyticsTurnaround';
import Toast from '../../../../shared/components/Toast';
import { getAllTeamLeaders } from '../../services/admin.service';
import { fetchDomains } from '../services/analytics.service';
import './AnalyticsView.css';

export default function AnalyticsView({ onOpenRequests }) {
  const {
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
    refetchAll,
    handleExport,
    toastMessage,
    clearToast
  } = useAdminAnalytics();

  const [teamLeadersList, setTeamLeadersList] = useState([]);
  const [allDomainsList, setAllDomainsList] = useState([]);

  useEffect(() => {
    getAllTeamLeaders()
      .then((res) => {
        if (res.teamLeaders) setTeamLeadersList(res.teamLeaders);
      })
      .catch(() => {});
    fetchDomains({ range: 'all' })
      .then((res) => setAllDomainsList(res.data?.domains || []))
      .catch(() => {});
  }, []);

  const domainsList = allDomainsList;

  return (
    <div className="analytics-view-shell">
      {toastMessage && (
        <Toast
          type={toastMessage.type}
          message={toastMessage.message}
          onClose={clearToast}
        />
      )}

      {/* Controls Bar */}
      <AnalyticsControls
        range={range}
        setRange={setRange}
        from={from}
        setFrom={setFrom}
        to={to}
        setTo={setTo}
        domain={domain}
        setDomain={setDomain}
        teamLeader={teamLeader}
        setTeamLeader={setTeamLeader}
        groupBy={groupBy}
        setGroupBy={setGroupBy}
        lastUpdated={lastUpdated}
        onRefresh={refetchAll}
        onExport={handleExport}
        domainsList={domainsList}
        teamLeadersList={teamLeadersList}
      />

      {/* Top Row: KPI Cards */}
      <AnalyticsKPICards
        overviewData={widgets.overview}
        loading={loading.overview}
        error={errors.overview}
        onRetry={() => fetchSingleWidget('overview')}
      />

      <AnalyticsTurnaround
        data={widgets.turnaround}
        loading={loading.turnaround}
        error={errors.turnaround}
        onRetry={() => fetchSingleWidget('turnaround')}
        onExport={handleExport}
      />

      {/* Middle: Recharts Visualization Widgets */}
      <AnalyticsCharts
        trendData={widgets.trend}
        typesData={widgets.types}
        domainsData={widgets.domains}
        pipelineData={widgets.pipeline}
        teamLeadersData={widgets.teamLeaders}
        loadingMap={loading}
        errorMap={errors}
        onRetry={fetchSingleWidget}
        onExport={handleExport}
        onOpenRequests={onOpenRequests}
        onSelectDomain={setDomain}
        onSelectTeamLeader={setTeamLeader}
      />

      {/* Bottom: Performance Tables & Action Lists */}
      <AnalyticsTables
        teamLeadersData={widgets.teamLeaders}
        stuckData={widgets.stuck}
        upcomingData={widgets.upcoming}
        loadingMap={loading}
        errorMap={errors}
        onRetry={fetchSingleWidget}
        onExport={handleExport}
        onOpenRequests={onOpenRequests}
      />
    </div>
  );
}
