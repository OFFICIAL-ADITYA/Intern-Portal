import { useState } from 'react';
import useCertificateRequests from '../hooks/useCertificateRequests';
import './RequestCertificateModal.css';

const TYPES = ['offer_letter', 'bonafide', 'ojt_certificate', 'experience_letter', 'completion_certificate', 'intern_of_month', 'league_winner', 'custom'];

export default function RequestCertificateModal({ onClose }) {
  const { submitRequest } = useCertificateRequests();
  const [certificateType, setCertificateType] = useState(TYPES[0]);
  const [reason, setReason] = useState('');
  const [metadata, setMetadata] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleMetaChange = (key, val) => {
    setMetadata((prev) => ({ ...prev, [key]: val }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await submitRequest({ certificateType, reason, metadata });
      onClose();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="request-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="request-modal" role="dialog" aria-modal="true" aria-labelledby="request-modal-title">
        <div className="request-modal-header"><div><p className="request-eyebrow">CERTIFICATE DESK</p><h2 id="request-modal-title">Request a certificate</h2></div><button type="button" className="request-close" onClick={onClose} aria-label="Close">×</button></div>
        <form onSubmit={submit}>
          <label className="request-field">Certificate type<select value={certificateType} onChange={(event) => { setCertificateType(event.target.value); setMetadata({}); }}>{TYPES.map((type) => <option key={type} value={type}>{type.replaceAll('_', ' ')}</option>)}</select></label>

          {certificateType === 'bonafide' && (
            <div className="request-metadata-section">
              <p className="request-metadata-title">Bonafide Details</p>
              <label className="request-field">College / Institution Name<input type="text" placeholder="e.g. Delhi Technological University" value={metadata.collegeName || ''} onChange={(e) => handleMetaChange('collegeName', e.target.value)} /></label>
              <label className="request-field">Purpose of Certificate<input type="text" placeholder="e.g. Academic Credit / College Submission" value={metadata.purpose || ''} onChange={(e) => handleMetaChange('purpose', e.target.value)} /></label>
            </div>
          )}

          {certificateType === 'offer_letter' && (
            <div className="request-metadata-section">
              <p className="request-metadata-title">Offer Letter Details</p>
              <div className="request-field-row">
                <label className="request-field">Internship Role<input type="text" placeholder="e.g. Full Stack Intern" value={metadata.internshipRole || ''} onChange={(e) => handleMetaChange('internshipRole', e.target.value)} /></label>
                <label className="request-field">Reporting Manager<input type="text" placeholder="e.g. Engineering Lead" value={metadata.reportingManager || ''} onChange={(e) => handleMetaChange('reportingManager', e.target.value)} /></label>
              </div>
              <label className="request-field">Stipend (optional)<input type="text" placeholder="e.g. ₹15,000 / month or Unpaid" value={metadata.stipend || ''} onChange={(e) => handleMetaChange('stipend', e.target.value)} /></label>
            </div>
          )}

          {certificateType === 'ojt_certificate' && (
            <div className="request-metadata-section">
              <p className="request-metadata-title">Training Program Details</p>
              <label className="request-field">Training Program Name<input type="text" placeholder="e.g. Practical Cloud & DevOps Apprenticeship" value={metadata.trainingProgram || ''} onChange={(e) => handleMetaChange('trainingProgram', e.target.value)} /></label>
              <label className="request-field">Technical Mentor<input type="text" placeholder="e.g. Lead Cloud Architect" value={metadata.mentorName || ''} onChange={(e) => handleMetaChange('mentorName', e.target.value)} /></label>
            </div>
          )}

          {certificateType === 'experience_letter' && (
            <div className="request-metadata-section">
              <p className="request-metadata-title">Experience Details</p>
              <div className="request-field-row">
                <label className="request-field">Designation / Role<input type="text" placeholder="e.g. Frontend Developer Intern" value={metadata.internshipRole || ''} onChange={(e) => handleMetaChange('internshipRole', e.target.value)} /></label>
                <label className="request-field">Reporting Manager<input type="text" placeholder="e.g. Project Manager" value={metadata.managerName || ''} onChange={(e) => handleMetaChange('managerName', e.target.value)} /></label>
              </div>
            </div>
          )}

          {certificateType === 'intern_of_month' && (
            <div className="request-metadata-section">
              <p className="request-metadata-title">Recognition Details</p>
              <label className="request-field">Award Month<input type="text" placeholder="e.g. August 2026" value={metadata.awardMonth || ''} onChange={(e) => handleMetaChange('awardMonth', e.target.value)} /></label>
              <label className="request-field">Key Contributions<input type="text" placeholder="e.g. Exceeded sprint milestones and mentored junior cohort" value={metadata.recognitionCriteria || ''} onChange={(e) => handleMetaChange('recognitionCriteria', e.target.value)} /></label>
            </div>
          )}

          {certificateType === 'league_winner' && (
            <div className="request-metadata-section">
              <p className="request-metadata-title">Championship Details</p>
              <div className="request-field-row">
                <label className="request-field">Event / League Name<input type="text" placeholder="e.g. National Coding Hackathon" value={metadata.eventName || ''} onChange={(e) => handleMetaChange('eventName', e.target.value)} /></label>
                <label className="request-field">Position / Rank<input type="text" placeholder="e.g. 1st Place Winner" value={metadata.position || ''} onChange={(e) => handleMetaChange('position', e.target.value)} /></label>
              </div>
              <div className="request-field-row">
                <label className="request-field">Event Date<input type="text" placeholder="e.g. September 10, 2026" value={metadata.eventDate || ''} onChange={(e) => handleMetaChange('eventDate', e.target.value)} /></label>
                <label className="request-field">Place / Venue<input type="text" placeholder="e.g. New Delhi Virtual Hub" value={metadata.place || ''} onChange={(e) => handleMetaChange('place', e.target.value)} /></label>
              </div>
            </div>
          )}

          <label className="request-field">Reason / Justification<textarea value={reason} onChange={(event) => setReason(event.target.value)} rows="3" required placeholder="Tell us why you need this certificate" /></label>
          {error && <p className="request-inline-error" role="alert">{error}</p>}
          <button className="request-submit" type="submit" disabled={submitting}>{submitting ? 'Submitting…' : 'Submit request'}</button>
        </form>
      </section>
    </div>
  );
}