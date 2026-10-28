"use client";

import { useState, useEffect } from "react";
import { useAssetAvailability } from '../context/ImageDataContext';

/**
 * Fetches a JSON resource with automatic cancellation on URL change or unmount.
 * @param {string|null} url - URL to fetch, or null/undefined to skip
 * @returns {{ data: any, error: boolean, loading: boolean, missing: boolean }}
 */
export function useFetchJson(url) {
  const [resource, setResource] = useState(null);
  const hasAsset = useAssetAvailability();
  const missing = Boolean(url && !hasAsset(url));
  const requestUrl = missing ? null : url;
  const data = resource && resource.url === requestUrl ? resource.data : null;
  const error = resource && resource.url === requestUrl ? resource.error : false;

  useEffect(() => {
    if (!requestUrl) return;
    const controller = new AbortController();
    fetch(requestUrl, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json) => { if (!controller.signal.aborted) setResource({ url: requestUrl, data: json, error: false }); })
      .catch(() => { if (!controller.signal.aborted) setResource({ url: requestUrl, data: null, error: true }); });
    return () => controller.abort();
  }, [requestUrl]);

  return { data: missing ? null : data, error: missing || error, loading: !missing && !data && !error && !!requestUrl, missing };
}
