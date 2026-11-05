import AnalyticsExportActions from './AnalyticsExportActions';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'];

const tooltipStyle = {
  backgroundColor: 'var(--card)',
  borderColor: 'var(--border)',
  color: 'var(--text)',
  borderRadius: '10px',
  boxShadow: '0 4px 16px var(--shadow, rgba(0, 0, 0, 0.12))',
  fontSize: '0.8125rem'
};

export default function AnalyticsCharts({
  trendData,
  typesData,
  domainsData,
  pipelineData,
  teamLeadersData,
  loadingMap,
  errorMap,
  onRetry,
  onExport,
  onOpenRequests,
  onSelectDomain,
  onSelectTeamLeader
}) {
  return (
    <div className="analytics-charts-grid">
      {/* 1. Requests Trend (Area / Line Chart) */}
      <div className="chart-card wide">
        <div className="chart-header">
          <div>
            <h3>Certificate Requests Trend Over Time</h3>
            <p className="chart-subtitle">Volume of requests split by status</p>
          </div>
          <AnalyticsExportActions onExport={onExport} type="requests-trend" />
        </div>
        {loadingMap.trend ? (
          <div className="chart-skeleton">Loading trend visualization...</div>
        ) : errorMap.trend ? (
          <div className="widget-error-box">
            <p>⚠️ Error loading trend: {errorMap.trend}</p>
            <button className="retry-btn" onClick={() => onRetry('trend')}>Retry</button>
          </div>
        ) : !trendData?.raw || trendData.raw.length === 0 ? (
          <div className="empty-state">No request data found for this period</div>
        ) : (
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={trendData.raw} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorPending" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorApproved" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} stroke="var(--border)" />
                <XAxis dataKey="period" stroke="var(--muted)" fontSize={12} />
                <YAxis stroke="var(--muted)" fontSize={12} />
                <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: 'var(--text)' }} />
                <Legend wrapperStyle={{ color: 'var(--text)', fontSize: '0.8125rem' }} />
                <Area type="monotone" dataKey="pending" name="Pending" stroke="#f59e0b" fillOpacity={1} fill="url(#colorPending)" />
                <Area type="monotone" dataKey="approved" name="Forwarded" stroke="#3b82f6" fillOpacity={1} fill="url(#colorApproved)" />
                <Area type="monotone" dataKey="completed" name="Issued" stroke="#10b981" fillOpacity={1} fill="url(#colorCompleted)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* 2. Certificate Types Donut Chart */}
      <div className="chart-card">
        <div className="chart-header">
          <div>
            <h3>Certificate Types Distribution</h3>
            <p className="chart-subtitle">Breakdown by certificate type</p>
          </div>
          <AnalyticsExportActions onExport={onExport} type="certificate-types" />
        </div>
        {loadingMap.types ? (
          <div className="chart-skeleton">Loading types...</div>
        ) : errorMap.types ? (
          <div className="widget-error-box">
            <p>⚠️ Error loading types: {errorMap.types}</p>
            <button className="retry-btn" onClick={() => onRetry('types')}>Retry</button>
          </div>
        ) : !typesData?.breakdown || typesData.breakdown.length === 0 ? (
          <div className="empty-state">No certificate data for this period</div>
        ) : (
          <div className="chart-container donut-layout">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={typesData.breakdown}
                  dataKey="count"
                  nameKey="certificateType"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={4}
                  label={({ certificateType, percentage }) => `${certificateType} (${percentage}%)`}
                  onClick={() => onOpenRequests?.()}
                >
                  {typesData.breakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: 'var(--text)' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* 3. Interns per Domain Bar Chart */}
      <div className="chart-card wide">
        <div className="chart-header">
          <div>
            <h3>Interns & Certificates by Domain</h3>
            <p className="chart-subtitle">Total interns vs issued certificates</p>
          </div>
          <AnalyticsExportActions onExport={onExport} type="domains" />
        </div>
        {loadingMap.domains ? (
          <div className="chart-skeleton">Loading domains...</div>
        ) : errorMap.domains ? (
          <div className="widget-error-box">
            <p>⚠️ Error loading domains: {errorMap.domains}</p>
            <button className="retry-btn" onClick={() => onRetry('domains')}>Retry</button>
          </div>
        ) : !domainsData?.domains || domainsData.domains.length === 0 ? (
          <div className="empty-state">No domain data found</div>
        ) : (() => {
          const ABBREV = {
            'Artificial Intelligence & Machine Learning': 'AI & ML',
            'Artificial Intelligence and Machine Learning': 'AI & ML',
            'MERN Stack': 'MERN Stack',
            'Web Development': 'Web Dev',
            'AI Research': 'AI Research',
            'Prompt Engineering': 'Prompt Eng.',
            'Data Science': 'Data Science',
            'Cloud Computing': 'Cloud',
            'Cyber Security': 'Cyber Sec.',
          };
          const abbreviate = (name = '') =>
            ABBREV[name] || (name.length > 18 ? name.slice(0, 16) + '\u2026' : name);

          const chartData = domainsData.domains.map(d => ({
            ...d,
            shortDomain: abbreviate(d.domain),
          }));

          const longestLabel = Math.max(...chartData.map(d => d.shortDomain.length));
          const yAxisWidth = Math.min(longestLabel * 7 + 16, 140);
          const chartHeight = Math.max(chartData.length * 52 + 60, 220);

          return (
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={chartHeight}>
                <BarChart
                  layout="vertical"
                  data={chartData}
                  margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
                  barCategoryGap="30%"
                  barGap={3}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.2} stroke="var(--border)" />
                  <XAxis
                    type="number"
                    stroke="var(--muted)"
                    fontSize={12}
                    allowDecimals={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="shortDomain"
                    stroke="var(--muted)"
                    tick={{ fontSize: 12, fill: 'var(--text)' }}
                    width={yAxisWidth}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    itemStyle={{ color: 'var(--text)' }}
                    labelFormatter={(label) => {
                      const found = chartData.find(d => d.shortDomain === label);
                      return found ? found.domain : label;
                    }}
                  />
                  <Legend wrapperStyle={{ color: 'var(--text)', fontSize: '0.8125rem', paddingTop: '8px' }} />
                  <Bar dataKey="totalInterns" name="Total Interns" fill="#3b82f6" radius={[0, 4, 4, 0]} maxBarSize={20} onClick={(entry) => onSelectDomain?.(entry.domain)} cursor="pointer" />
                  <Bar dataKey="certificatesCount" name="Certificates Issued" fill="#10b981" radius={[0, 4, 4, 0]} maxBarSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          );
        })()}
      </div>

      {/* 4. Pipeline Stages Funnel / Horizontal Bar Chart */}
      <div className="chart-card">
        <div className="chart-header">
          <div>
            <h3>Request Pipeline & Bottlenecks</h3>
            <p className="chart-subtitle">Current request volume at each stage</p>
          </div>
          <AnalyticsExportActions onExport={onExport} type="pipeline" />
          {pipelineData?.failedGenerations > 0 && (
            <span className="status-badge alert" title="Approved requests missing a generated certificate draft; retry is available in the request queue">
              ⚠️ {pipelineData.failedGenerations} Failed Draft Generations
            </span>
          )}
        </div>
        {loadingMap.pipeline ? (
          <div className="chart-skeleton">Loading pipeline...</div>
        ) : errorMap.pipeline ? (
          <div className="widget-error-box">
            <p>⚠️ Error loading pipeline: {errorMap.pipeline}</p>
            <button className="retry-btn" onClick={() => onRetry('pipeline')}>Retry</button>
          </div>
        ) : !pipelineData?.pipeline || pipelineData.pipeline.length === 0 ? (
          <div className="empty-state">No pipeline data found</div>
        ) : (
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart layout="vertical" data={pipelineData.pipeline} margin={{ left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} stroke="var(--border)" />
                <XAxis type="number" stroke="var(--muted)" fontSize={12} />
                <YAxis type="category" dataKey="stage" stroke="var(--muted)" tick={{ fontSize: 11 }} width={120} />
                <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: 'var(--text)' }} />
                <Bar dataKey="count" name="Requests Count" fill="#8b5cf6" radius={[0, 4, 4, 0]} onClick={(entry) => onOpenRequests?.(entry.status)}>
                  {pipelineData.pipeline.map((entry, idx) => (
                    <Cell
                      key={`cell-p-${idx}`}
                      onClick={() => onOpenRequests?.(entry.status)}
                      fill={
                        entry.status === 'pending'
                          ? '#f59e0b'
                          : entry.status === 'processing'
                          ? '#8b5cf6'
                          : entry.status === 'approved'
                          ? '#3b82f6'
                          : entry.status === 'completed'
                          ? '#10b981'
                          : (entry.status === 'rejected' || entry.status === 'rejected_tl' || entry.status === 'rejected_admin')
                          ? '#ef4444'
                          : entry.status === 'failed_generation'
                          ? '#f97316'
                          : '#8b5cf6'
                      }
                      style={{ cursor: 'pointer' }}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* 5. Team Leader Average Review Time Bar Chart */}
      <div className="chart-card">
        <div className="chart-header">
          <div>
            <h3>TL Average Review Time (Hours)</h3>
            <p className="chart-subtitle">Turnaround speed per Team Leader</p>
          </div>
        </div>
        {loadingMap.teamLeaders ? (
          <div className="chart-skeleton">Loading TL turnaround...</div>
        ) : errorMap.teamLeaders ? (
          <div className="widget-error-box">
            <p>⚠️ Error loading TL data: {errorMap.teamLeaders}</p>
            <button className="retry-btn" onClick={() => onRetry('teamLeaders')}>Retry</button>
          </div>
        ) : !teamLeadersData || teamLeadersData.length === 0 ? (
          <div className="empty-state">No Team Leader data found</div>
        ) : (
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={teamLeadersData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} stroke="var(--border)" />
                <XAxis dataKey="fullName" stroke="var(--muted)" tick={{ fontSize: 11 }} />
                <YAxis stroke="var(--muted)" fontSize={12} label={{ value: 'Hours', angle: -90, position: 'insideLeft', fill: 'var(--muted)' }} />
                <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: 'var(--text)' }} />
                <Bar dataKey="avgReviewTimeHours" name="Avg Review Time (hrs)" fill="#06b6d4" radius={[4, 4, 0, 0]} onClick={(entry) => onSelectTeamLeader?.(entry.id)} cursor="pointer" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
