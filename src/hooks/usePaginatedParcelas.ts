import { useCallback, useEffect, useRef, useState } from 'react';
import { apiRequest, type PageResponse } from '../lib/api';
import type { Parcela } from '../types';

type LoadFilters = { reset?: boolean; status?: string; busca?: string; vencimentoDe?: string; vencimentoAte?: string };

export function usePaginatedParcelas(initialStatus = 'atrasada', autoLoad = true, basePath = '/parcelas/') {
  const [items, setItems] = useState<Parcela[]>([]); const [next, setNext] = useState<string | null>(null); const [loading, setLoading] = useState(false); const [error, setError] = useState(''); const loadingRef = useRef(false);
  const load = useCallback(async ({ reset = true, status = initialStatus, busca = '', vencimentoDe = '', vencimentoAte = '' }: LoadFilters = {}) => {
    if (loadingRef.current || (!reset && !next)) return; loadingRef.current = true; setLoading(true); setError('');
    try { const params = new URLSearchParams({ status, busca, page_size: '20' }); if (vencimentoDe) params.set('vencimento_de', vencimentoDe); if (vencimentoAte) params.set('vencimento_ate', vencimentoAte); const url = reset ? `${basePath}?${params}` : next!; const data = await apiRequest<PageResponse<Parcela>>(url); setItems(current => reset ? data.results : [...current, ...data.results]); setNext(data.next); }
    catch (e) { setError((e as Error).message); } finally { loadingRef.current = false; setLoading(false); }
  }, [basePath, initialStatus, next]);
  useEffect(() => { if (autoLoad) void load(); }, []);
  const remove = (id: number) => setItems(current => current.filter(item => item.id !== id));
  return { items, next, loading, error, setError, load, remove };
}
