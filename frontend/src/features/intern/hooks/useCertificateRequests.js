import { useCallback, useEffect, useState } from 'react';
import { getMyRequests, submitCertificateRequest } from '../services/intern.api';

const getErrorMessage = (error) => error.response?.data?.message || error.message || 'Unable to load certificate requests.';

export default function useCertificateRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getMyRequests();
      setRequests(data.requests || []);
      setError(null);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  const submitRequest = useCallback(async (data) => {
    try {
      const response = await submitCertificateRequest(data);
      await refetch();
      window.dispatchEvent(new Event('certificate-request-changed'));
      return response;
    } catch (requestError) {
      throw new Error(getErrorMessage(requestError), { cause: requestError });
    }
  }, [refetch]);

  useEffect(() => {
    const initialFetch = setTimeout(refetch, 0);
    const refresh = () => refetch();
    window.addEventListener('certificate-request-changed', refresh);
    return () => { clearTimeout(initialFetch); window.removeEventListener('certificate-request-changed', refresh); };
  }, [refetch]);

  return { requests, loading, error, refetch, submitRequest };
}