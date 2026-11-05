export default function AnalyticsExportActions({ onExport, type, formats = ['csv', 'xlsx'] }) {
  return (
    <div className="analytics-export-actions">
      {formats.includes('csv') && <button type="button" className="table-export-btn" onClick={() => onExport(type, 'csv')} aria-label={`Export ${type} as CSV`}>CSV</button>}
      {formats.includes('xlsx') && <button type="button" className="table-export-btn" onClick={() => onExport(type, 'xlsx')} aria-label={`Export ${type} as Excel`}>Excel</button>}
    </div>
  );
}
