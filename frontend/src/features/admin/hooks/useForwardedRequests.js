import { useCallback, useEffect, useState } from 'react';
import { finalizeRequest, getForwardedRequests } from '../services/admin.service';

const getErrorMessage = (error) => error.response?.data?.message || error.message || 'Unable to load forwarded requests.';

export default function useForwardedRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getForwardedRequests();
      setRequests(data.requests || []);
      setError(null);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  const actOnRequest = useCallback(async (id, action, rejectionReason) => {
    try {
      const response = await finalizeRequest(id, action, rejectionReason);
      setRequests((current) => current.filter((request) => (request._id || request.id) !== id));
      refetch();
      return response;
    } catch (requestError) {
      setError(getErrorMessage(requestError));
      throw new Error(getErrorMessage(requestError), { cause: requestError });
    }
  }, [refetch]);

  const approveRequest = useCallback((id) => actOnRequest(id, 'approve'), [actOnRequest]);
  const rejectRequest = useCallback((id, rejectionReason) => actOnRequest(id, 'reject', rejectionReason), [actOnRequest]);

  useEffect(() => {
    const initialFetch = setTimeout(refetch, 0);
    return () => clearTimeout(initialFetch);
  }, [refetch]);

  return { requests, loading, error, refetch, approveRequest, rejectRequest };
}