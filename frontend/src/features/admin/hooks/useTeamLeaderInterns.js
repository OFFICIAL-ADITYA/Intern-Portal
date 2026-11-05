import { useCallback, useEffect, useState } from 'react';
import { getInternsByTeamLeader } from '../services/admin.service';

const getErrorMessage = (error) => error.message || 'Unable to load interns for this team leader.';

export default function useTeamLeaderInterns(teamLeaderId) {
  const [teamLeader, setTeamLeader] = useState(null);
  const [interns, setInterns] = useState([]);
  const [loading, setLoading] = useState(Boolean(teamLeaderId));
  const [error, setError] = useState(null);

  const refetch = useCallback(async () => {
    if (!teamLeaderId) return;

    setLoading(true);
    try {
      const data = await getInternsByTeamLeader(teamLeaderId);
      setTeamLeader(data.teamLeader || null);
      setInterns(data.interns || []);
      setError(null);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
      setTeamLeader(null);
      setInterns([]);
    } finally {
      setLoading(false);
    }
  }, [teamLeaderId]);

  useEffect(() => {
    if (!teamLeaderId) return undefined;

    const initialFetch = setTimeout(refetch, 0);
    return () => clearTimeout(initialFetch);
  }, [teamLeaderId, refetch]);

  return { teamLeader, interns, loading, error, refetch };
}
