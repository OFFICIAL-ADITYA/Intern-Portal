import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { verifyCertificate } from '../services/verify.service';
import './VerifyPage.css';

const formatDate = (dateString) => {
  if (!dateString) return '—';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

export default function VerifyPage() {
  const { verifyId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [networkError, setNetworkError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchVerification = useCallback(async () => {
    if (!verifyId || !verifyId.trim()) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    setNotFound(false);
    setNetworkError(null);

    try {
      const result = await verifyCertificate(verifyId.trim());
      setData(result);
    } catch (err) {
      if (err.response?.status === 404) {
        setNotFound(true);
      } else {
        setNetworkError(err.message || 'Unable to connect to verification server. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [verifyId]);

  useEffect(() => {
    fetchVerification();
  }, [fetchVerification]);

  const handleCopyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/verify/${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <div className="verify-page-wrapper">
      {/* Brand Header: Phone-first layout with UPTOSKILL branding and NO login prompt */}
      <header className="verify-header" role="banner">
        <div className="verify-brand">
          <span className="verify-brand-icon" aria-hidden="true">UP</span>
          <div className="verify-brand-text">
            <strong>uptoskills</strong>
            <span className="verify-brand-badge">Verification Portal</span>
          </div>
        </div>
      </header>

      <main className="verify-main-container" id="main-content">
        {/* ========================================================
            1. LOADING SKELETON STATE
        ======================================================== */}
        {loading && (
          <div className="verify-card verify-card-skeleton" aria-busy="true" aria-label="Verifying certificate">
            <div className="skeleton-badge shimmer" />
            <div className="skeleton-title shimmer" />
            <div className="skeleton-line shimmer" style={{ width: '70%' }} />
            <div className="skeleton-field-grid">
              <div className="skeleton-field shimmer" />
              <div className="skeleton-field shimmer" />
              <div className="skeleton-field shimmer" />
              <div className="skeleton-field shimmer" />
            </div>
            <p className="verify-loading-text">Verifying credential against official registry…</p>
          </div>
        )}

        {/* ========================================================
            2. NETWORK / SERVER ERROR STATE (With Retry)
        ======================================================== */}
        {!loading && networkError && (
          <div className="verify-card verify-card-error" role="alert">
            <div className="verify-icon-wrap error-icon" aria-hidden="true">
              ⚠️
            </div>
            <h2>Verification Unavailable</h2>
            <p className="verify-error-msg">{networkError}</p>
            <button
              type="button"
              className="verify-retry-btn"
              onClick={fetchVerification}
            >
              🔄 Retry Verification
            </button>
          </div>
        )}

        {/* ========================================================
            3. NOT FOUND STATE (Neutral Message)
        ======================================================== */}
        {!loading && !networkError && notFound && (
          <div className="verify-card verify-card-not-found" role="region" aria-label="Certificate Not Found">
            <div className="verify-icon-wrap neutral-icon" aria-hidden="true">
              📜
            </div>
            <span className="verify-status-pill neutral-pill">Record Not Found</span>
            <h1 className="verify-result-title">Certificate Not Found</h1>
            <p className="verify-result-subtext">
              We could not verify any official certificate with the identifier provided.
            </p>

            <div className="verify-not-found-box">
              <p>
                The link or QR code you scanned may be incorrect, expired, or the certificate draft has not yet been finalized.
              </p>
              {verifyId && (
                <div className="verify-id-chip">
                  <span>Queried Identifier:</span>
                  <code>{verifyId}</code>
                </div>
              )}
            </div>

            {/* Manual Lookup Form */}
            <form className="verify-search-form" onSubmit={handleSearchSubmit}>
              <label htmlFor="verify-search-input" className="verify-search-label">
                Try searching another certificate or verify ID:
              </label>
              <div className="verify-search-bar">
                <input
                  id="verify-search-input"
                  type="text"
                  placeholder="e.g. UTS-2026-000123 or verify ID"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="verify-search-input"
                />
                <button type="submit" className="verify-search-btn" disabled={!searchQuery.trim()}>
                  Verify
                </button>
              </div>
            </form>

            <div className="verify-footer-note">
              If you believe this is an error, please contact the issuing organization at <strong>support@uptoskills.com</strong>.
            </div>
          </div>
        )}

        {/* ========================================================
            4. VALID STATE (Green Card)
        ======================================================== */}
        {!loading && !networkError && !notFound && data && data.status === 'valid' && (
          <div className="verify-card verify-card-valid" role="region" aria-label="Certificate Verified Genuine">
            <div className="verify-status-banner valid-banner">
              <div className="verify-badge-icon" aria-hidden="true">✓</div>
              <div className="verify-badge-details">
                <span className="verify-status-label">OFFICIALLY VERIFIED</span>
                <span className="verify-status-headline">Genuine Certificate</span>
              </div>
            </div>

            <div className="verify-card-body">
              <p className="verify-preamble">This confirms that</p>
              <h1 className="verify-recipient-name">{data.recipientName}</h1>
              <p className="verify-postamble">
                has successfully fulfilled all requirements and was awarded the credential:
              </p>

              <div className="verify-cert-highlight">
                <h2 className="verify-cert-title">{data.certificateTitle}</h2>
                {data.domain && (
                  <span className="verify-domain-tag">
                    Domain: <strong>{data.domain}</strong>
                  </span>
                )}
              </div>

              <div className="verify-details-grid">
                <div className="verify-detail-item">
                  <span className="detail-label">Certificate Number</span>
                  <code className="detail-code">{data.certificateNumber}</code>
                </div>

                <div className="verify-detail-item">
                  <span className="detail-label">Issue Date</span>
                  <span className="detail-value">{formatDate(data.issuedAt)}</span>
                </div>

                <div className="verify-detail-item">
                  <span className="detail-label">Issuer</span>
                  <span className="detail-value">UPTOSKILL Academy</span>
                </div>

                <div className="verify-detail-item">
                  <span className="detail-label">Verification Status</span>
                  <span className="detail-status-valid">● Active & Genuine</span>
                </div>
              </div>

              <div className="verify-trust-seal">
                <span className="seal-icon" aria-hidden="true">🛡️</span>
                <span>Cryptographically verified directly from UPTOSKILL credentials registry.</span>
              </div>

              {/* Action Buttons: Copy Link & Print */}
              <div className="verify-quick-actions">
                <button
                  type="button"
                  className="verify-action-btn"
                  onClick={handleCopyLink}
                  title="Copy verification link"
                >
                  {copied ? '✓ Link Copied!' : '🔗 Copy Shareable Link'}
                </button>
                <button
                  type="button"
                  className="verify-action-btn secondary"
                  onClick={handlePrint}
                  title="Print verification summary"
                >
                  🖨️ Print Summary
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            5. REVOKED STATE (Red Card with Revoked Date)
        ======================================================== */}
        {!loading && !networkError && !notFound && data && data.status === 'revoked' && (
          <div className="verify-card verify-card-revoked" role="region" aria-label="Certificate Revoked">
            <div className="verify-status-banner revoked-banner">
              <div className="verify-badge-icon" aria-hidden="true">✕</div>
              <div className="verify-badge-details">
                <span className="verify-status-label">OFFICIAL NOTICE</span>
                <span className="verify-status-headline">Certificate Revoked</span>
              </div>
            </div>

            <div className="verify-card-body">
              <div className="verify-revocation-alert" role="alert">
                <p>
                  <strong>Notice:</strong> This certificate was officially <strong>revoked</strong> by the issuing authority and is no longer valid.
                </p>
                {data.revokedAt && (
                  <p className="verify-revoked-date">
                    Revocation Date: <strong>{formatDate(data.revokedAt)}</strong>
                  </p>
                )}
              </div>

              <div className="verify-revoked-details">
                <h2 className="verify-recipient-name is-revoked">{data.recipientName}</h2>
                <p className="verify-cert-title">{data.certificateTitle}</p>
                {data.domain && <p className="verify-domain-text">Domain: {data.domain}</p>}

                <div className="verify-details-grid">
                  <div className="verify-detail-item">
                    <span className="detail-label">Certificate Number</span>
                    <code className="detail-code">{data.certificateNumber}</code>
                  </div>
                  <div className="verify-detail-item">
                    <span className="detail-label">Originally Issued</span>
                    <span className="detail-value">{formatDate(data.issuedAt)}</span>
                  </div>
                  <div className="verify-detail-item">
                    <span className="detail-label">Current Status</span>
                    <span className="detail-status-revoked">● Invalid / Revoked</span>
                  </div>
                  <div className="verify-detail-item">
                    <span className="detail-label">Issuer</span>
                    <span className="detail-value">UPTOSKILL Academy</span>
                  </div>
                </div>
              </div>

              <div className="verify-footer-note">
                For questions regarding this revocation, please contact <strong>compliance@uptoskills.com</strong>.
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="verify-page-footer">
        <p>© 2026 UptoSkills Education Services. All rights reserved.</p>
        <p className="verify-footer-sub">Tamper-evident verification backed by UPTOSKILL system.</p>
      </footer>
    </div>
  );
}
