import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Unhandled React Error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-primary, #0f172a)',
          color: 'var(--text-primary, #f8fafc)',
          padding: '24px',
          fontFamily: 'Inter, system-ui, sans-serif'
        }}>
          <div style={{
            maxWidth: '480px',
            width: '100%',
            background: 'var(--bg-secondary, #1e293b)',
            border: '1px solid var(--border-color, #334155)',
            borderRadius: '16px',
            padding: '36px',
            textAlign: 'center',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.4)'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 12px 0' }}>
              Something went wrong
            </h1>
            <p style={{
              fontSize: '0.925rem',
              color: 'var(--text-secondary, #94a3b8)',
              lineHeight: 1.5,
              margin: '0 0 24px 0'
            }}>
              An unexpected application error occurred. We've captured the diagnostics and are working to resolve it.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={this.handleReload}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  background: 'var(--accent, #6366f1)',
                  color: '#fff',
                  border: 'none',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  transition: 'opacity 0.2s'
                }}
              >
                ↻ Reload Page
              </button>
              <button
                type="button"
                onClick={this.handleHome}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  background: 'transparent',
                  color: 'var(--text-primary, #f8fafc)',
                  border: '1px solid var(--border-color, #334155)',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  cursor: 'pointer'
                }}
              >
                Go to Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
