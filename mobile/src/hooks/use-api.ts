import { useCallback, useEffect, useRef, useState } from 'react';

interface UseApiOptions {
  immediate?: boolean; // lancer au mount (défaut: true)
}

interface UseApiReturn<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook générique pour appeler une fonction async retournant des données.
 *
 * Usage :
 *   const { data, loading, error, refetch } = useApi(
 *     () => groupsApi.list(),
 *     { immediate: true }
 *   );
 */
export function useApi<T>(
  fetcher: () => Promise<T>,
  options: UseApiOptions = {}
): UseApiReturn<T> {
  const { immediate = true } = options;

  const [data, setData]       = useState<T | null>(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError]     = useState<string | null>(null);

  // Ref to avoid setting state after unmount
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const execute = useCallback(async () => {
    if (!mounted.current) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      if (mounted.current) setData(result);
    } catch (err) {
      if (mounted.current) {
        setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      }
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [fetcher]);

  useEffect(() => {
    if (immediate) execute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { data, loading, error, refetch: execute };
}
