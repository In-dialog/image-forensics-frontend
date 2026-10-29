'use client';

import { useEffect, useState } from 'react';
import { loadDatasets } from './loadDatasets.mjs';

export function usePublishedDatasets() {
  const [state, setState] = useState({ datasets: [], loading: true, error: false });
  useEffect(() => {
    let controller;
    const refresh = async () => {
      controller?.abort();
      const current = new AbortController();
      controller = current;
      setState({ datasets: [], loading: true, error: false });
      try {
        const datasets = await loadDatasets({ signal: current.signal });
        if (!current.signal.aborted) setState({ datasets, loading: false, error: false });
      } catch {
        if (!current.signal.aborted) setState({ datasets: [], loading: false, error: true });
      }
    };
    const onVisible = () => { if (document.visibilityState === 'visible') void refresh(); };
    const onPageShow = event => { if (event.persisted) void refresh(); };
    void refresh();
    window.addEventListener('focus', refresh);
    window.addEventListener('pageshow', onPageShow);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      controller?.abort();
      window.removeEventListener('focus', refresh);
      window.removeEventListener('pageshow', onPageShow);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);
  return state;
}
