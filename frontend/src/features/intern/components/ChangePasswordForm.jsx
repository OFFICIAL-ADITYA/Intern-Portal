import { useState } from 'react';
import { setPassword } from '../services/intern.service';
import Toast from '../../../shared/components/Toast';
import './ChangePasswordForm.css';

export default function ChangePasswordForm({ hasPassword = false, onPasswordUpdated }) {
  const [currentSecret, setCurrentSecret] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const validate = () => {
    const errs = {};
    if (!currentSecret.trim()) {
      errs.currentSecret = hasPassword
        ? 'Current password is required.'
        : 'Intern code or current secret is required.';
    }

    if (!newPassword) {
      errs.newPassword = 'New password is required.';
    } else if (newPassword.length < 8) {
      errs.newPassword = 'Password must be at least 8 characters long.';
    } else if (!/^(?=.*[A-Za-z])(?=.*\d)/.test(newPassword)) {
      errs.newPassword = 'Password must contain at least one letter and one number.';
    }

    if (!confirmPassword) {
      errs.confirmPassword = 'Confirm your new password.';
    } else if (confirmPassword !== newPassword) {
      errs.confirmPassword = 'Passwords do not match.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setToast(null);

    try {
      await setPassword({
        currentSecret: currentSecret.trim(),
        newPassword
      });

      setToast({
        type: 'success',
        message: 'Password set successfully! From now on, log in with your password.'
      });

      setCurrentSecret('');
      setNewPassword('');
      setConfirmPassword('');
      setErrors({});

      if (onPasswordUpdated) {
        onPasswordUpdated();
      }
    } catch (err) {
      let msg = err.response?.data?.message || err.message || 'Failed to update password.';
      if (err.response?.status === 429 || err.status === 429 || (typeof msg === 'string' && msg.includes('Too many'))) {
        const retryAfter = err.response?.data?.retryAfter;
        const minutes = retryAfter ? Math.ceil(retryAfter / 60) : 15;
        msg = `Too many attempts. Please wait ${minutes} minute${minutes === 1 ? '' : 's'} before trying again.`;
      }
      setToast({
        type: 'error',
        message: msg
      });
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrength = (pass) => {
    if (!pass) return null;
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;

    if (score <= 1) return { label: 'Weak', class: 'weak' };
    if (score === 2) return { label: 'Fair', class: 'fair' };
    if (score === 3) return { label: 'Good', class: 'good' };
    return { label: 'Strong', class: 'strong' };
  };

  const strength = getPasswordStrength(newPassword);

  return (
    <div className="change-password-card">
      {toast && (
        <div className="change-password-toast">
          <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />
        </div>
      )}

      <div className="cp-header">
        <h3>🔒 Security & Password</h3>
        <p className="cp-subtitle">
          {hasPassword
            ? 'Update your account login password below.'
            : 'You are currently using your Intern Code for login. Set a private password for future sign-ins.'}
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="cp-form">
        {/* Field 1: Current secret / Intern code */}
        <label className="cp-field">
          <span className="cp-label">
            {hasPassword ? 'Current Password' : 'Intern Code or Current Password'}
            <span className="cp-required">*</span>
          </span>
          <div className={`cp-input-wrap ${errors.currentSecret ? 'has-error' : ''}`}>
            <span className="cp-icon">🔑</span>
            <input
              type={showCurrent ? 'text' : 'password'}
              name="currentSecret"
              placeholder={hasPassword ? '••••••••' : 'e.g. UTS-2026-XXXXX'}
              value={currentSecret}
              onChange={(e) => {
                setCurrentSecret(e.target.value);
                if (errors.currentSecret) setErrors((prev) => ({ ...prev, currentSecret: null }));
              }}
              autoComplete="current-password"
            />
            <button
              type="button"
              className="cp-eye-btn"
              onClick={() => setShowCurrent(!showCurrent)}
              aria-label="Toggle password visibility"
            >
              {showCurrent ? '👁️' : '🙈'}
            </button>
          </div>
          {errors.currentSecret && <span className="cp-error">{errors.currentSecret}</span>}
          {!hasPassword && (
            <small className="cp-hint">
              First-time login secret is your unique Intern Code provided in your welcome email.
            </small>
          )}
        </label>

        {/* Field 2: New password */}
        <label className="cp-field">
          <span className="cp-label">
            New Password <span className="cp-required">*</span>
          </span>
          <div className={`cp-input-wrap ${errors.newPassword ? 'has-error' : ''}`}>
            <span className="cp-icon">🔒</span>
            <input
              type={showNew ? 'text' : 'password'}
              name="newPassword"
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                if (errors.newPassword) setErrors((prev) => ({ ...prev, newPassword: null }));
              }}
              autoComplete="new-password"
            />
            <button
              type="button"
              className="cp-eye-btn"
              onClick={() => setShowNew(!showNew)}
              aria-label="Toggle password visibility"
            >
              {showNew ? '👁️' : '🙈'}
            </button>
          </div>
          {errors.newPassword && <span className="cp-error">{errors.newPassword}</span>}

          {strength && (
            <div className="cp-strength-meter">
              <span className={`cp-strength-badge ${strength.class}`}>
                Strength: {strength.label}
              </span>
            </div>
          )}
          <small className="cp-hint">
            Must be at least 8 characters long and contain at least one letter and one number.
          </small>
        </label>

        {/* Field 3: Confirm new password */}
        <label className="cp-field">
          <span className="cp-label">
            Confirm New Password <span className="cp-required">*</span>
          </span>
          <div className={`cp-input-wrap ${errors.confirmPassword ? 'has-error' : ''}`}>
            <span className="cp-icon">✅</span>
            <input
              type={showConfirm ? 'text' : 'password'}
              name="confirmPassword"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: null }));
              }}
              autoComplete="new-password"
            />
            <button
              type="button"
              className="cp-eye-btn"
              onClick={() => setShowConfirm(!showConfirm)}
              aria-label="Toggle password visibility"
            >
              {showConfirm ? '👁️' : '🙈'}
            </button>
          </div>
          {errors.confirmPassword && <span className="cp-error">{errors.confirmPassword}</span>}
        </label>

        <div className="cp-actions">
          <button type="submit" className="cp-submit-btn" disabled={loading}>
            {loading ? <span className="spinner"></span> : hasPassword ? 'Update Password' : 'Set Password'}
          </button>
        </div>
      </form>
    </div>
  );
}
