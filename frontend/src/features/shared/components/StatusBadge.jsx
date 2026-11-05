import './StatusBadge.css';

export default function StatusBadge({ status }) {
  const label = (status || 'unknown').replaceAll('_', ' ');
  return <span className={`status-badge status-${status || 'unknown'}`}>{label}</span>;
}