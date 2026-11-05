import { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../services/auth.service';
import '../../../app/App.css';

const genericError = 'Something went wrong, please try again';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    try {
      const data = await forgotPassword(email.trim().toLowerCase());
      setMessage(data.message);
    } catch (err) {
      if (err?.message?.includes('Too many') || err?.retryAfter || err?.status === 429) {
        setError(err.message || 'Too many password reset requests. Please wait before trying again.');
      } else {
        setError(err?.message || genericError);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="brand-panel">
        <div className="brand">
          <span className="brand-icon">🚀</span>
          <strong>uptoskills</strong>
        </div>
        <div className="brand-content">
          <h1>Keep your <em>progress moving</em></h1>
          <p>Get back into your secure internship workspace.</p>
        </div>
        <small>Copyright © 2026 UptoSkills</small>
      </div>

      <div className="form-side">
        <div className="auth-card">
          <h2>Forgot Password?</h2>
          <p className="sub">Enter your registered account email and we will send a reset link.</p>

          {message ? (
            <div className="auth-status success" role="status">{message}</div>
          ) : (
            <form onSubmit={submit} noValidate>
              <label className="field">
                <b>Email Address</b>
                <div className="input-wrap">
                  <span className="input-icon">✉️</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="e.g. admin@uptoskills.com"
                    required
                  />
                </div>
              </label>

              {error && <div className="auth-status error" role="alert">{error}</div>}

              <button type="submit" className="primary" disabled={loading || !email.trim()}>
                {loading ? <span className="spinner"></span> : 'Send Reset Link'}
              </button>
            </form>
          )}

          <Link className="auth-link" to="/login">Back to Login</Link>
        </div>
      </div>
    </div>
  );
}