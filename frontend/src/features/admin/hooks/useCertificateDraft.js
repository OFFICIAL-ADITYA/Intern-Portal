import { useCallback, useEffect, useState, useRef } from 'react';
import { getCertificateDraft, updateCertificateDraft, finalizeCertificate } from '../services/admin.service';

const getErrorMessage = (error, fallback) =>
  error.response?.data?.message || error.message || fallback;

/**
 * Custom hook for managing Certificate Draft review and finalization lifecycle.
 *
 * @param {string} certificateId
 */
export default function useCertificateDraft(certificateId) {
  const [draft, setDraft] = useState(null);
  const [htmlContent, setHtmlContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [error, setError] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [finalizeError, setFinalizeError] = useState(null);
  const [finalizeSuccess, setFinalizeSuccess] = useState(null);

  // Prevent race conditions and duplicate submissions
  const isSavingRef = useRef(false);
  const isFinalizingRef = useRef(false);

  const fetchDraft = useCallback(async (idToFetch) => {
    const targetId = idToFetch || certificateId;
    if (!targetId) {
      setLoading(false);
      setError('Invalid certificate ID provided');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await getCertificateDraft(targetId);
      const certificate = data.certificate || data;
      setDraft(certificate);
      setHtmlContent(certificate.htmlContent || '');
      setError(null);
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to load certificate draft.'));
    } finally {
      setLoading(false);
    }
  }, [certificateId]);

  const saveDraft = useCallback(async () => {
    if (!certificateId || isSavingRef.current) return;

    isSavingRef.current = true;
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const data = await updateCertificateDraft(certificateId, htmlContent);
      const updatedCert = data.certificate || data;
      setDraft(updatedCert);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      return true;
    } catch (err) {
      setSaveError(getErrorMessage(err, 'Unable to save draft. Please try again.'));
      return false;
    } finally {
      setSaving(false);
      isSavingRef.current = false;
    }
  }, [certificateId, htmlContent]);

  const finalizeDraft = useCallback(async () => {
    if (!certificateId || isFinalizingRef.current || draft?.status === 'finalized') return;

    isFinalizingRef.current = true;
    setFinalizing(true);
    setFinalizeError(null);
    setFinalizeSuccess(null);

    try {
      // 1. If user modified the HTML, ensure it is persisted first
      if (htmlContent && htmlContent !== draft?.htmlContent) {
        await updateCertificateDraft(certificateId, htmlContent);
      }

      // 2. Trigger finalization endpoint
      const result = await finalizeCertificate(certificateId);
      const finalizedCert = result.certificate || result;
      setDraft(finalizedCert);
      setFinalizeSuccess({
        message: result.message || 'Certificate finalized successfully.',
        emailSent: result.emailSent,
        emailError: result.emailError
      });
      return result;
    } catch (err) {
      const msg = getErrorMessage(err, 'Unable to finalize certificate. Please try again.');
      setFinalizeError(msg);
      throw new Error(msg, { cause: err });
    } finally {
      setFinalizing(false);
      isFinalizingRef.current = false;
    }
  }, [certificateId, draft, htmlContent]);

  const resetContent = useCallback(() => {
    if (draft?.htmlContent) {
      setHtmlContent(draft.htmlContent);
    }
  }, [draft]);

  useEffect(() => {
    if (!certificateId) return;
    const timer = setTimeout(() => {
      fetchDraft(certificateId);
    }, 0);
    return () => clearTimeout(timer);
  }, [certificateId, fetchDraft]);

  return {
    draft,
    htmlContent,
    setHtmlContent,
    loading,
    saving,
    finalizing,
    error,
    saveError,
    saveSuccess,
    finalizeError,
    finalizeSuccess,
    fetchDraft,
    saveDraft,
    finalizeDraft,
    resetContent
  };
}
