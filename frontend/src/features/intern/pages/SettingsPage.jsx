import { useState } from 'react';
import ChangePasswordForm from '../components/ChangePasswordForm';
import { updateProfile } from '../services/intern.service';
import Toast from '../../../shared/components/Toast';
import './SettingsPage.css';

export default function SettingsPage({ profile, onProfileUpdated }) {
  const [isEditingMobile, setIsEditingMobile] = useState(false);
  const [mobileInput, setMobileInput] = useState(profile?.mobileNo || '');
  const [mobileError, setMobileError] = useState(null);
  const [savingMobile, setSavingMobile] = useState(false);
  const [toast, setToast] = useState(null);

  const handleStartEditMobile = () => {
    setMobileInput(profile?.mobileNo || '');
    setMobileError(null);
    setIsEditingMobile(true);
  };

  const handleCancelEditMobile = () => {
    setMobileInput(profile?.mobileNo || '');
    setMobileError(null);
    setIsEditingMobile(false);
  };

  const handleSaveMobile = async () => {
    const trimmed = mobileInput.trim();
    if (!trimmed) {
      setMobileError('Mobile number cannot be empty.');
      return;
    }

    if (!/^\+?[0-9]{10,15}$/.test(trimmed)) {
      setMobileError('Please enter a valid 10-15 digit phone number.');
      return;
    }

    setSavingMobile(true);
    setMobileError(null);

    try {
      await updateProfile({ mobileNo: trimmed });
      setToast({
        type: 'success',
        message: 'Mobile number updated successfully!'
      });
      setIsEditingMobile(false);
      if (onProfileUpdated) {
        onProfileUpdated();
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to update mobile number.';
      setMobileError(msg);
      setToast({
        type: 'error',
        message: msg
      });
    } finally {
      setSavingMobile(false);
    }
  };

  return (
    <div className="intern-settings-page">
      {toast && (
        <div className="settings-toast-container">
          <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />
        </div>
      )}

      <div className="settings-header">
        <h2>Account Settings</h2>
        <p className="settings-subtitle">Manage your personal profile details and security credentials.</p>
      </div>

      <div className="settings-grid">
        {/* Profile Card */}
        <div className="settings-card profile-details-card">
          <div className="sc-header">
            <h3>👤 Profile Information</h3>
            <p className="sc-subtitle">Your registered internship identity</p>
          </div>

          <div className="profile-info-list">
            <div className="info-item">
              <span className="info-label">Full Name</span>
              <strong className="info-value">{profile?.fullName || '—'}</strong>
            </div>

            <div className="info-item">
              <span className="info-label">Email Address</span>
              <strong className="info-value">{profile?.email || '—'}</strong>
            </div>

            <div className="info-item">
              <span className="info-label">Intern Code</span>
              <strong className="info-value code-pill">{profile?.internCode || '—'}</strong>
            </div>

            <div className="info-item">
              <span className="info-label">Domain</span>
              <strong className="info-value">{profile?.domain || '—'}</strong>
            </div>

            <div className="info-item mobile-item">
              <span className="info-label">Mobile Number</span>
              {isEditingMobile ? (
                <div className="mobile-edit-form">
                  <input
                    type="tel"
                    value={mobileInput}
                    onChange={(e) => {
                      setMobileInput(e.target.value);
                      if (mobileError) setMobileError(null);
                    }}
                    placeholder="e.g. 9876543210"
                    className={`mobile-input ${mobileError ? 'has-error' : ''}`}
                    autoFocus
                  />
                  {mobileError && <span className="mobile-error-text">{mobileError}</span>}
                  <div className="mobile-edit-actions">
                    <button
                      type="button"
                      className="btn-save-mobile"
                      onClick={handleSaveMobile}
                      disabled={savingMobile}
                    >
                      {savingMobile ? 'Saving…' : 'Save'}
                    </button>
                    <button
                      type="button"
                      className="btn-cancel-mobile"
                      onClick={handleCancelEditMobile}
                      disabled={savingMobile}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mobile-display-wrap">
                  <strong className="info-value">{profile?.mobileNo || 'Not provided'}</strong>
                  <button
                    type="button"
                    className="btn-edit-mobile"
                    onClick={handleStartEditMobile}
                    title="Update your mobile phone number"
                  >
                    ✏️ Edit
                  </button>
                </div>
              )}
            </div>

            <div className="info-item">
              <span className="info-label">Internship Status</span>
              <span className={`status-badge-inline ${profile?.internshipDetails?.status || 'ongoing'}`}>
                {(profile?.internshipDetails?.status || 'ongoing').toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {/* Password Security Form */}
        <ChangePasswordForm
          hasPassword={!!profile?.passwordSetAt}
          onPasswordUpdated={onProfileUpdated}
        />
      </div>
    </div>
  );
}
