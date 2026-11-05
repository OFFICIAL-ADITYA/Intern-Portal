import './Toast.css';

/**
 * Shared Toast / Alert feedback component.
 *
 * @param {Object} props
 * @param {'success'|'error'|'info'|'loading'} [props.type='info'] - Alert style type
 * @param {string} props.message - Message to display
 * @param {function} [props.onClose] - Optional dismiss handler
 */
export default function Toast({ type = 'info', message, onClose }) {
  if (!message) return null;

  const icons = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
    loading: '⏳'
  };

  return (
    <div className={`shared-toast shared-toast-${type}`} role="alert" aria-live="polite">
      <span className="shared-toast-icon" aria-hidden="true">
        {icons[type] || 'ℹ'}
      </span>
      <span className="shared-toast-message">{message}</span>
      {onClose && (
        <button
          type="button"
          className="shared-toast-close"
          onClick={onClose}
          aria-label="Dismiss message"
        >
          ×
        </button>
      )}
    </div>
  );
}
