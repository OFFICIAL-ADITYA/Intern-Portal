import { useState } from 'react';
import useCertificateRequests from '../hooks/useCertificateRequests';
import StatusBadge from '../../shared/components/StatusBadge';
import Toast from '../../../shared/components/Toast';
import { getCertificateForRequest, downloadCertificatePdf } from '../services/intern.service';
import './MyRequestsList.css';

const formatDate = (date) => date ? new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

export default function MyRequestsList() {
  const { requests, loading, error, refetch } = useCertificateRequests();
  const [downloadingId, setDownloadingId] = useState(null);
  const [downloadError, setDownloadError] = useState(null);
  const [downloadSuccess, setDownloadSuccess] = useState(null);

  const handleDownload = async (request) => {
    const id = request._id || request.id;
    if (!id || downloadingId) return;

    setDownloadingId(id);
    setDownloadError(null);
    setDownloadSuccess(null);

    try {
      // 1. Fetch certificate metadata to verify backend confirms finalized certificate is available
      const data = await getCertificateForRequest(id);
      const certificate = data.certificate;

      if (!certificate || certificate.status !== 'finalized') {
        throw new Error('Certificate is not finalized or available for download yet.');
      }

      // 2. Download the actual persisted PDF
      const safeFileName = `${(certificate.certificateNumber || request.requestNumber || 'Certificate').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
      await downloadCertificatePdf(id, safeFileName);

      setDownloadSuccess(`Downloaded certificate ${certificate.certificateNumber || ''} successfully.`);
      setTimeout(() => setDownloadSuccess(null), 4000);
    } catch (err) {
      setDownloadError(err.response?.data?.message || err.message || 'Unable to download certificate. Please try again.');
      setTimeout(() => setDownloadError(null), 5000);
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <section className="requests-panel" aria-labelledby="my-requests-title">
      <div className="requests-panel-heading">
        <div>
          <p className="request-eyebrow">REQUEST HISTORY</p>
          <h2 id="my-requests-title">My certificate requests</h2>
        </div>
        <button className="requests-refresh" type="button" onClick={refetch}>Refresh</button>
      </div>

      {downloadSuccess && (
        <div className="requests-toast-wrap">
          <Toast type="success" message={downloadSuccess} onClose={() => setDownloadSuccess(null)} />
        </div>
      )}

      {downloadError && (
        <div className="requests-toast-wrap">
          <Toast type="error" message={downloadError} onClose={() => setDownloadError(null)} />
        </div>
      )}

      {loading && <p className="requests-state">Loading requests…</p>}
      {!loading && error && <p className="requests-state requests-error" role="alert">{error}</p>}
      {!loading && !error && !requests.length && <p className="requests-state">No requests yet</p>}
      {!loading && !error && requests.length > 0 && (
        <div className="requests-table-wrap">
          <table className="requests-table">
            <thead>
              <tr>
                <th>Request</th>
                <th>Certificate</th>
                <th>Status</th>
                <th>Requested</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => {
                const id = request._id || request.id || request.requestNumber;
                const isCompleted = request.status === 'completed';
                const isDownloading = downloadingId === (request._id || request.id);

                return (
                  <tr key={id}>
                    <td>{request.requestNumber || '—'}</td>
                    <td>{request.certificateType?.replaceAll('_', ' ') || '—'}</td>
                    <td><StatusBadge status={request.status} /></td>
                    <td>{formatDate(request.requestedAt || request.createdAt)}</td>
                    <td>
                      {isCompleted ? (
                        <button
                          type="button"
                          className="request-download-btn"
                          onClick={() => handleDownload(request)}
                          disabled={isDownloading}
                          title="Download finalized certificate PDF"
                        >
                          {isDownloading ? (
                            <>
                              <span className="download-spinner" aria-hidden="true" />
                              <span>Downloading…</span>
                            </>
                          ) : (
                            <span>📥 Download Certificate</span>
                          )}
                        </button>
                      ) : (
                        <span className="request-action-disabled" title="Available once finalized by admin">
                          —
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}