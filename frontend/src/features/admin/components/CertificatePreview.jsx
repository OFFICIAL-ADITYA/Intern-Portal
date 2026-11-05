import { useRef, useEffect } from 'react';
import './CertificatePreview.css';

/**
 * CertificatePreview
 *
 * Reusable certificate HTML preview component.
 * Safely renders HTML inside a controlled, isolated iframe.
 *
 * @param {Object} props
 * @param {string} props.htmlContent - The raw HTML string representing the certificate.
 */
export default function CertificatePreview({ htmlContent = '' }) {
  const iframeRef = useRef(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    // Reactively update iframe document when htmlContent changes
    if ('srcdoc' in iframe) {
      iframe.srcdoc = htmlContent || '';
    } else if (iframe.contentDocument) {
      try {
        iframe.contentDocument.open();
        iframe.contentDocument.write(htmlContent || '');
        iframe.contentDocument.close();
      } catch {
        // Fallback in case of document write restriction
        iframe.setAttribute('srcdoc', htmlContent || '');
      }
    }
  }, [htmlContent]);

  const hasContent = typeof htmlContent === 'string' && htmlContent.trim().length > 0;

  return (
    <section className="certificate-preview-container" aria-label="Certificate preview workspace">
      <header className="certificate-preview-header">
        <div className="certificate-preview-title-group">
          <span className="certificate-preview-status-dot" aria-hidden="true" />
          <h2 className="certificate-preview-title">Certificate Live Preview</h2>
        </div>
        <div className="certificate-preview-badge">
          <span>Real-time HTML</span>
        </div>
      </header>

      <div className="certificate-preview-viewport">
        {hasContent ? (
          <iframe
            ref={iframeRef}
            srcDoc={htmlContent}
            title="Certificate Live Preview"
            className="certificate-preview-iframe"
            sandbox="allow-same-origin allow-popups"
            loading="lazy"
          />
        ) : (
          <div className="certificate-preview-empty" role="status">
            <div className="certificate-preview-empty-icon" aria-hidden="true">
              <span>▤</span>
            </div>
            <h3>No Certificate Content</h3>
            <p>The certificate template is currently empty. Edit the HTML in the editor panel to view the live preview.</p>
          </div>
        )}
      </div>
    </section>
  );
}
