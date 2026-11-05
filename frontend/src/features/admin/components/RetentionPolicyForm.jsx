import { useCallback, useEffect, useState } from 'react';
import Toast from '../../../shared/components/Toast';
import { getRetentionPolicy, updateRetentionPolicy } from '../services/admin.service';
import './RetentionManagement.css';

export default function RetentionPolicyForm() {
  const [policy, setPolicy] = useState({ graceDays: 30, purgeDays: 90 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getRetentionPolicy();
      setPolicy({ graceDays: result.policy?.graceDays ?? 30, purgeDays: result.policy?.purgeDays ?? 90 });
    } catch (requestError) {
      setError(requestError.message || 'Unable to load retention policy.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(refresh, 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  const save = async (event) => {
    event.preventDefault();
    const graceDays = Number(policy.graceDays);
    const purgeDays = Number(policy.purgeDays);
    if (!Number.isInteger(graceDays) || graceDays < 1 || !Number.isInteger(purgeDays) || purgeDays <= graceDays) {
      setToast({ type: 'error', message: 'Use at least 1 grace day and set purge days higher than grace days.' });
      return;
    }
    setSaving(true);
    try {
      const result = await updateRetentionPolicy({ graceDays, purgeDays });
      setPolicy({ graceDays: result.policy.graceDays, purgeDays: result.policy.purgeDays });
      setToast({ type: 'success', message: 'Retention policy saved.' });
    } catch (requestError) {
      setToast({ type: 'error', message: requestError.message || 'Unable to save retention policy.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="retention-policy-card" onSubmit={save}>
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
      <div>
        <p className="admin-eyebrow">ACCOUNT LIFECYCLE</p>
        <h2>Retention policy</h2>
        <p>Interns can sign in during the grace period. Archived accounts are anonymized after the purge period; certificate records remain available.</p>
      </div>
      {error ? (
        <div className="retention-state retention-error" role="alert">
          <span>{error}</span><button type="button" onClick={refresh}>Retry</button>
        </div>
      ) : (
        <div className="retention-policy-fields">
          <label>Grace period (days)
            <input type="number" min="1" step="1" required value={policy.graceDays} onChange={(event) => setPolicy((current) => ({ ...current, graceDays: event.target.value }))} />
          </label>
          <label>Purge after archival (days)
            <input type="number" min={Number(policy.graceDays) + 1} step="1" required value={policy.purgeDays} onChange={(event) => setPolicy((current) => ({ ...current, purgeDays: event.target.value }))} />
          </label>
          <button type="submit" disabled={saving || loading}>{loading ? 'Loading…' : saving ? 'Saving…' : 'Save policy'}</button>
        </div>
      )}
    </form>
  );
}
