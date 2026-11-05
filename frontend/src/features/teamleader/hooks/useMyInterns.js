import { useCallback, useEffect, useState } from 'react';
import { getMyInterns } from '../services/tl.service';

const getErrorMessage = (error) => error.response?.data?.message || error.message || 'Unable to load your interns.';

export default function useMyInterns(params = {}) {
  const [interns, setInterns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const paramsKey = JSON.stringify(params);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getMyInterns(params);
      setInterns(data.interns || []);
      setError(null);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey]);

  useEffect(() => {
    const initialFetch = setTimeout(refetch, 0);
    return () => clearTimeout(initialFetch);
  }, [refetch]);

  return { interns, loading, error, refetch };
}
