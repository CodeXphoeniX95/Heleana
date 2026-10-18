import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Comme useApi mais avec cache : garde les données précédentes
 * pendant le rechargement → pas de spinner à chaque navigation.
 */
export function useCache<T>(
  fetcher: () => Promise<T>,
  key: string
): {
  data: T | null;
  loading: boolean;   // true seulement au premier chargement
  refreshing: boolean; // true pendant les rechargements suivants
  error: string | null;
  refetch: () => Promise<void>;
} {
  const cache = useRef<Record<string, T>>({});
  const [data, setData]           = useState<T | null>(cache.current[key] ?? null);
  const [loading, setLoading]     = useState(!cache.current[key]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const execute = useCallback(async (isRefresh = false) => {
    if (!mounted.current) return;
    if (isRefresh) setRefreshing(true);
    else if (!cache.current[key]) setLoading(true);
    setError(null);

    try {
      const result = await fetcher();
      cache.current[key] = result;
      if (mounted.current) setData(result);
    } catch (err) {
      if (mounted.current) setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      if (mounted.current) { setLoading(false); setRefreshing(false); }
    }
  }, [fetcher, key]);

  useEffect(() => { execute(false); }, []);

  return {
    data,
    loading,
    refreshing,
    error,
    refetch: () => execute(true),
  };
}
