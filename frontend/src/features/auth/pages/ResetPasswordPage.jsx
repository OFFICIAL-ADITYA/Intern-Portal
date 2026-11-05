import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { resetPassword as resetPasswordRequest } from '../services/auth.service';
import '../../../app/App.css';

export default function ResetPasswordPage() {
  const { token } = useParams();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError('');

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const data = await resetPasswordRequest(token, newPassword);
      setSuccess(data.message);
    } catch (requestError) {
      setError(requestError.message || 'Something went wrong, please try again');
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
          <h1>A fresh start for your <em>secure account</em></h1>
          <p>Choose a new password to continue managing your internship journey.</p>
        </div>
        <small>Copyright © 2026 UptoSkills</small>
      </div>

      <div className="form-side">
        <div className="auth-card">
          <h2>Reset Password</h2>
          <p className="sub">Create a new password for your staff account.</p>

          {success ? (
            <>
              <div className="auth-status success" role="status">{success}</div>
              <Link className="primary auth-button-link" to="/login">Go to Login</Link>
            </>
          ) : (
            <form onSubmit={submit} noValidate>
              <label className="field">
                <b>New Password</b>
                <div className="input-wrap">
                  <span className="input-icon">🔒</span>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    placeholder="At least 8 characters"
                    required
                  />
                </div>
              </label>

              <label className="field">
                <b>Confirm Password</b>
                <div className="input-wrap">
                  <span className="input-icon">🔒</span>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Enter your password again"
                    required
                  />
                </div>
              </label>

              {error && <div className="auth-status error" role="alert">{error}</div>}

              <button type="submit" className="primary" disabled={loading}>
                {loading ? <span className="spinner"></span> : 'Reset Password'}
              </button>
            </form>
          )}

          {!success && (
            <Link className="auth-link" to="/forgot-password">Request a new reset link</Link>
          )}
        </div>
      </div>
    </div>
  );
}