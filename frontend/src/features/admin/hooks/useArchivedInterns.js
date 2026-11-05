import { useCallback, useEffect, useState } from 'react';
import { getArchivedInterns, restoreIntern } from '../services/admin.service';

export default function useArchivedInterns() {
  const [interns, setInterns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getArchivedInterns();
      setInterns(result.interns || []);
    } catch (requestError) {
      setError(requestError.message || 'Unable to load archived interns.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(refresh, 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  const restore = async (intern) => {
    await restoreIntern(intern._id);
    setInterns((current) => current.filter((item) => item._id !== intern._id));
    return `${intern.fullName} has been restored.`;
  };

  return { interns, loading, error, refresh, restore };
}
