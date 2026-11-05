import { useCallback, useEffect, useState } from 'react';
import { getAllTeamLeaders } from '../services/admin.service';

const getErrorMessage = (error) => error.message || 'Unable to load team leaders.';

export default function useTeamLeaders() {
  const [teamLeaders, setTeamLeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAllTeamLeaders();
      setTeamLeaders(data.teamLeaders || []);
      setError(null);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialFetch = setTimeout(refetch, 0);
    return () => clearTimeout(initialFetch);
  }, [refetch]);

  return { teamLeaders, loading, error, refetch };
}
