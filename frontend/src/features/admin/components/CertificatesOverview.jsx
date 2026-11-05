import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getAllCertificates,
  downloadAdminCertificate,
  revokeCertificate,
  unrevokeCertificate
} from '../services/admin.service';
import Toast from '../../../shared/components/Toast';
import './CertificatesOverview.css';

const formatDate = (date) => {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

export default function CertificatesOverview() {
  const navigate = useNavigate();
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const [toast, setToast] = useState(null);

  // Revocation Modal State
  const [revokingCert, setRevokingCert] = useState(null);
  const [revokeReason, setRevokeReason] = useState('');
  const [revokingLoading, setRevokingLoading] = useState(false);
  const [modalError, setModalError] = useState(null);
  const reasonInputRef = useRef(null);

  const fetchCertificates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAllCertificates();
      setCertificates(data.certificates || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load certificates');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCertificates();
  }, [fetchCertificates]);

  // Focus the input when modal opens
  useEffect(() => {
    if (revokingCert) {
      setModalError(null);
      setRevokeReason('');
      setTimeout(() => {
        reasonInputRef.current?.focus();
      }, 50);
    }
  }, [revokingCert]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && revokingCert && !revokingLoading) {
        closeRevokeModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [revokingCert, revokingLoading]);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  };

  const handleDownload = async (cert) => {
    if (!cert._id || downloadingId) return;

    setDownloadingId(cert._id);
    try {
      const safeName = `${(cert.certificateNumber || 'Certificate').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
      await downloadAdminCertificate(cert._id, safeName);
      showToast('success', `Downloaded ${cert.certificateNumber} successfully.`);
    } catch (err) {
      showToast('error', err.response?.data?.message || err.message || 'Unable to download certificate PDF.');
    } finally {
      setDownloadingId(null);
    }
  };

  const openRevokeModal = (cert) => {
    setRevokingCert(cert);
    setRevokeReason('');
    setModalError(null);
  };

  const closeRevokeModal = () => {
    if (revokingLoading) return;
    setRevokingCert(null);
    setRevokeReason('');
    setModalError(null);
  };

  const handleConfirmRevoke = async (e) => {
    e?.preventDefault();
    if (!revokeReason.trim()) {
      setModalError('Please provide a reason for revoking this certificate.');
      reasonInputRef.current?.focus();
      return;
    }

    setRevokingLoading(true);
    setModalError(null);

    try {
      const result = await revokeCertificate(revokingCert._id, revokeReason.trim());
      showToast('success', `Certificate ${revokingCert.certificateNumber} has been revoked successfully.`);

      // Update state locally to refresh the row immediately
      setCertificates((prev) =>
        prev.map((c) =>
          c._id === revokingCert._id
            ? { ...c, ...result.certificate, isRevoked: true, status: 'finalized' }
            : c
        )
      );

      closeRevokeModal();
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Failed to revoke certificate.';
      setModalError(errMsg);
      showToast('error', errMsg);
    } finally {
      setRevokingLoading(false);
    }
  };

  const handleUnrevoke = async (cert) => {
    try {
      const result = await unrevokeCertificate(cert._id);
      showToast('success', `Certificate ${cert.certificateNumber} has been unrevoked.`);
      setCertificates((prev) =>
        prev.map((c) =>
          c._id === cert._id
            ? { ...c, ...result.certificate, isRevoked: false }
            : c
        )
      );
    } catch (err) {
      showToast('error', err.response?.data?.message || err.message || 'Failed to unrevoke certificate.');
    }
  };

  return (
    <section className="certificates-overview-panel" aria-labelledby="cert-overview-title">
      <div className="certificates-overview-heading">
        <div>
          <p className="admin-eyebrow">AUDIT & COMPLIANCE</p>
          <h2 id="cert-overview-title">Issued Certificates Overview</h2>
          <p className="cert-overview-subtext">
            Oversight of all certificates generated, finalized, and verified across the organization.
          </p>
        </div>
        <div className="cert-overview-actions">
          <span className="cert-overview-count">{certificates.length} Total</span>
          <button
            type="button"
            className="cert-overview-refresh"
            onClick={fetchCertificates}
            disabled={loading}
          >
            {loading ? 'Refreshing…' : '↻ Refresh'}
          </button>
        </div>
      </div>

      {toast && (
        <div className="cert-overview-toast">
          <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="cert-overview-skeleton-wrap" aria-busy="true" aria-label="Loading certificates">
          <div className="cert-skeleton-row shimmer" />
          <div className="cert-skeleton-row shimmer" />
          <div className="cert-skeleton-row shimmer" />
          <div className="cert-skeleton-row shimmer" />
        </div>
      )}

      {/* Error State with Retry */}
      {!loading && error && (
        <div className="cert-overview-error" role="alert">
          <div>
            <p className="error-title">⚠ Failed to load certificates</p>
            <p className="error-desc">{error}</p>
          </div>
          <button type="button" onClick={fetchCertificates} className="cert-retry-btn">
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && certificates.length === 0 && (
        <div className="cert-overview-empty">
          <div className="cert-empty-icon" aria-hidden="true">📜</div>
          <h3>No Certificates Generated Yet</h3>
          <p>When certificate drafts are approved and finalized, their official records will appear here.</p>
        </div>
      )}

      {/* Table */}
      {!loading && !error && certificates.length > 0 && (
        <div className="cert-overview-table-wrap">
          <table className="cert-overview-table">
            <thead>
              <tr>
                <th>Certificate No.</th>
                <th>Intern Name</th>
                <th>Code</th>
                <th>Type</th>
                <th>Issued Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {certificates.map((cert) => {
                const isFinalized = cert.status === 'finalized';
                const isRevoked = Boolean(cert.isRevoked || cert.status === 'revoked');
                const hasPdf = Boolean(cert.pdfPath) && isFinalized;
                const isDownloading = downloadingId === cert._id;
                const intern = cert.userId || {};
                const recipientDisplayName = cert.recipientName || intern.fullName || '—';

                return (
                  <tr key={cert._id} className={isRevoked ? 'row-revoked' : ''}>
                    <td>
                      <code className="cert-num-code">{cert.certificateNumber}</code>
                      {cert.verifyId && (
                        <div className="cert-verify-link-wrap">
                          <a
                            href={`/verify/${cert.verifyId}`}
                            target="_blank"
                            rel="noreferrer"
                            className="cert-verify-link"
                            title="Open public verification page"
                          >
                            Verify ↗
                          </a>
                        </div>
                      )}
                    </td>
                    <td>
                      <strong>{recipientDisplayName}</strong>
                    </td>
                    <td>
                      <span className="cert-intern-code">{cert.internCode || intern.internCode || '—'}</span>
                    </td>
                    <td>
                      <span className="cert-type-text">
                        {cert.certificateTitle || (cert.certificateType ? cert.certificateType.replace(/_/g, ' ') : '—')}
                      </span>
                    </td>
                    <td>{formatDate(cert.issuedAt || cert.issuedDate || cert.createdAt)}</td>
                    <td>
                      {isRevoked ? (
                        <span
                          className="cert-status-tag is-revoked"
                          title={cert.revokedReason ? `Reason: ${cert.revokedReason}` : 'Certificate is revoked'}
                        >
                          REVOKED
                        </span>
                      ) : isFinalized ? (
                        <span className="cert-status-tag is-valid">
                          VALID
                        </span>
                      ) : (
                        <span className="cert-status-tag is-draft">
                          DRAFT
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="cert-action-btn-group">
                        {hasPdf && (
                          <button
                            type="button"
                            className="cert-pdf-btn"
                            onClick={() => handleDownload(cert)}
                            disabled={isDownloading}
                            title="Download official finalized PDF"
                          >
                            {isDownloading ? (
                              <>
                                <span className="cert-mini-spinner" aria-hidden="true" />
                                <span>Downloading…</span>
                              </>
                            ) : (
                              <span>📥 PDF</span>
                            )}
                          </button>
                        )}

                        {cert.status === 'draft' && (
                          <button
                            type="button"
                            className="cert-review-link-btn"
                            onClick={() => navigate(`/admin/certificates/${cert._id}/review`)}
                            title="Open draft in review editor"
                          >
                            Review Draft →
                          </button>
                        )}

                        {isFinalized && !isRevoked && (
                          <button
                            type="button"
                            className="cert-revoke-btn"
                            onClick={() => openRevokeModal(cert)}
                            title="Revoke this certificate"
                          >
                            🚫 Revoke
                          </button>
                        )}

                        {isFinalized && isRevoked && (
                          <button
                            type="button"
                            className="cert-unrevoke-btn"
                            onClick={() => handleUnrevoke(cert)}
                            title="Restore / unrevoke this certificate"
                          >
                            ↺ Unrevoke
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ========================================================
          CONFIRMATION MODAL FOR REVOCATION (Keyboard Accessible)
      ======================================================== */}
      {revokingCert && (
        <div
          className="revoke-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeRevokeModal();
          }}
          role="presentation"
        >
          <div
            className="revoke-modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="revoke-modal-title"
            aria-describedby="revoke-modal-desc"
          >
            <div className="revoke-modal-header">
              <div className="revoke-modal-icon" aria-hidden="true">⚠️</div>
              <div>
                <h3 id="revoke-modal-title">Revoke Certificate</h3>
                <p id="revoke-modal-desc" className="revoke-modal-sub">
                  This action marks the certificate as permanently revoked on the public verification portal.
                </p>
              </div>
            </div>

            <div className="revoke-modal-cert-summary">
              <div>
                <span className="summary-label">Certificate No:</span>
                <code>{revokingCert.certificateNumber}</code>
              </div>
              <div>
                <span className="summary-label">Recipient:</span>
                <strong>{revokingCert.recipientName || revokingCert.userId?.fullName || 'Intern'}</strong>
              </div>
            </div>

            {modalError && (
              <div className="revoke-modal-error" role="alert">
                ⚠ {modalError}
              </div>
            )}

            <form onSubmit={handleConfirmRevoke}>
              <div className="revoke-input-group">
                <label htmlFor="revoke-reason-input">
                  Reason for Revocation <span className="required-star">*</span>
                </label>
                <div className="revoke-presets">
                  <span className="presets-label">Quick suggestions:</span>
                  {[
                    'Honor code / policy violation',
                    'Inaccurate tenure dates',
                    'Issued in error',
                    'Internship incomplete'
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      className="revoke-preset-pill"
                      onClick={() => {
                        setRevokeReason(preset);
                        reasonInputRef.current?.focus();
                      }}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
                <textarea
                  id="revoke-reason-input"
                  ref={reasonInputRef}
                  className="revoke-textarea"
                  rows={3}
                  placeholder="e.g. Terms violation, inaccurate internship duration, issued in error..."
                  value={revokeReason}
                  onChange={(e) => setRevokeReason(e.target.value)}
                  disabled={revokingLoading}
                  required
                />
              </div>

              <div className="revoke-modal-actions">
                <button
                  type="button"
                  className="revoke-cancel-btn"
                  onClick={closeRevokeModal}
                  disabled={revokingLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="revoke-confirm-btn"
                  disabled={revokingLoading || !revokeReason.trim()}
                >
                  {revokingLoading ? 'Revoking…' : 'Confirm Revoke'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
