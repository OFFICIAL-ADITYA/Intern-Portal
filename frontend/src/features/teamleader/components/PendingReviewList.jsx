import { useState } from 'react';
import useReviewRequests from '../hooks/useReviewRequests';
import './PendingReviewList.css';

const formatDate = (date) => date ? new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

export default function PendingReviewList() {
  const { requests, loading, error, forwardRequest, rejectRequest } = useReviewRequests();
  const [rejectingId, setRejectingId] = useState(null);
  const [reason, setReason] = useState('');
  const [actionError, setActionError] = useState(null);
  const forward = async (id) => { setActionError(null); try { await forwardRequest(id); } catch (requestError) { setActionError(requestError.message); } };
  const reject = async (id) => { if (!reason.trim()) return; setActionError(null); try { await rejectRequest(id, reason.trim()); setRejectingId(null); setReason(''); } catch (requestError) { setActionError(requestError.message); } };
  return <section className="review-panel" aria-labelledby="review-title"><div className="review-heading"><div><p className="request-eyebrow">INBOX</p><h2 id="review-title">Pending certificate reviews</h2></div><span className="review-count">{requests.length} pending</span></div>
    {loading && <p className="requests-state">Loading requests…</p>}{!loading && (error || actionError) && <p className="requests-state requests-error" role="alert">{error || actionError}</p>}{!loading && !error && !requests.length && <p className="requests-state">No requests pending review</p>}
    {!loading && requests.length > 0 && <div className="review-list">{requests.map((request) => { const id = request._id || request.id; const intern = request.userId || {}; return <article className="review-row" key={id}><div className="review-details"><h3>{intern.fullName || 'Unknown intern'}</h3><p className="review-meta">{intern.internCode || '—'} · {intern.domain || '—'} · {formatDate(request.requestedAt || request.createdAt)}</p><p><strong>{request.certificateType?.replaceAll('_', ' ') || '—'}</strong></p><p className="review-reason">{request.reason || 'No reason provided'}</p></div><div className="review-actions">{rejectingId === id ? <div className="reject-form"><input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Rejection reason" aria-label="Rejection reason" autoFocus /><button type="button" onClick={() => reject(id)} disabled={!reason.trim()}>Confirm</button><button type="button" onClick={() => { setRejectingId(null); setReason(''); }}>Cancel</button></div> : <><button type="button" className="forward-button" onClick={() => forward(id)}>Forward to Admin</button><button type="button" className="reject-button" onClick={() => setRejectingId(id)}>Reject</button></>}</div></article>; })}</div>}
  </section>;
}