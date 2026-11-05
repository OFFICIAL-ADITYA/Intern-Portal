import { useCallback, useEffect, useState } from 'react';
import { getRequestsForReview, reviewRequest } from '../services/tl.service';

const getErrorMessage = (error) => error.response?.data?.message || error.message || 'Unable to load review requests.';

export default function useReviewRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const refetch = useCallback(async () => {
    setLoading(true);
    try { const data = await getRequestsForReview(); setRequests(data.requests || []); setError(null); } catch (requestError) { setError(getErrorMessage(requestError)); } finally { setLoading(false); }
  }, []);
  const actOnRequest = useCallback(async (id, action, rejectionReason) => {
    try {
      await reviewRequest(id, action, rejectionReason);
      setRequests((current) => current.filter((request) => (request._id || request.id) !== id));
      refetch();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
      throw new Error(getErrorMessage(requestError), { cause: requestError });
    }
  }, [refetch]);
  const forwardRequest = useCallback((id) => actOnRequest(id, 'forward'), [actOnRequest]);
  const rejectRequest = useCallback((id, rejectionReason) => actOnRequest(id, 'reject', rejectionReason), [actOnRequest]);
  useEffect(() => { const initialFetch = setTimeout(refetch, 0); return () => clearTimeout(initialFetch); }, [refetch]);
  return { requests, loading, error, refetch, forwardRequest, rejectRequest };
}