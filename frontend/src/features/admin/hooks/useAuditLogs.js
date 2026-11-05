import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getAuditLogs, exportAuditLogs } from '../services/admin.service';

export function useAuditLogs() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [logs, setLogs] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);

  // Extract query filters from URL
  const filters = useMemo(() => {
    return {
      actor: searchParams.get('actor') || '',
      action: searchParams.get('action') || '',
      targetType: searchParams.get('targetType') || '',
      from: searchParams.get('from') || '',
      to: searchParams.get('to') || '',
      page: parseInt(searchParams.get('page') || '1', 10),
      limit: parseInt(searchParams.get('limit') || '20', 10),
      sort: searchParams.get('sort') || '-createdAt',
    };
  }, [searchParams]);

  // Fetch logs
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);

    const params = {};
    if (filters.actor) params.actor = filters.actor;
    if (filters.action) params.action = filters.action;
    if (filters.targetType) params.targetType = filters.targetType;
    if (filters.from) params.from = filters.from;
    if (filters.to) params.to = filters.to;
    params.page = filters.page;
    params.limit = filters.limit;
    params.sort = filters.sort;

    try {
      const data = await getAuditLogs(params);
      setLogs(data.logs || []);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
      setError(err.message || 'Failed to load audit logs.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Update filters and reset page to 1
  const updateFilters = useCallback(
    (newFilters) => {
      setSearchParams((prev) => {
        const updated = new URLSearchParams(prev);
        Object.entries(newFilters).forEach(([key, val]) => {
          if (val !== undefined && val !== null && val !== '') {
            updated.set(key, String(val));
          } else {
            updated.delete(key);
          }
        });
        updated.set('page', '1');
        return updated;
      });
    },
    [setSearchParams]
  );

  // Change page
  const setPage = useCallback(
    (newPage) => {
      setSearchParams((prev) => {
        const updated = new URLSearchParams(prev);
        updated.set('page', String(newPage));
        return updated;
      });
    },
    [setSearchParams]
  );

  // Clear all filters
  const clearFilters = useCallback(() => {
    setSearchParams(new URLSearchParams());
  }, [setSearchParams]);

  // Export CSV
  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const params = {};
      if (filters.actor) params.actor = filters.actor;
      if (filters.action) params.action = filters.action;
      if (filters.targetType) params.targetType = filters.targetType;
      if (filters.from) params.from = filters.from;
      if (filters.to) params.to = filters.to;
      if (filters.sort) params.sort = filters.sort;

      const blob = await exportAuditLogs(params);
      const url = window.URL.createObjectURL(new Blob([blob], { type: 'text/csv;charset=utf-8;' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `audit_logs_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
      alert('Failed to export audit logs. ' + (err.message || ''));
    } finally {
      setExporting(false);
    }
  }, [filters]);

  return {
    logs,
    totalPages,
    total,
    loading,
    error,
    exporting,
    filters,
    updateFilters,
    setPage,
    clearFilters,
    handleExport,
    retry: fetchLogs,
  };
}

export default useAuditLogs;
