/* eslint-disable @next/next/no-img-element -- Local dataset assets have arbitrary dimensions. */
import { useState } from 'react';
import { useAssetAvailability } from '../../context/ImageDataContext';
import styles from './semantics.module.css';

export function ResultImage({ src, alt, className = '' }) {
  const hasAsset = useAssetAvailability();
  const [failed, setFailed] = useState(null);
  if (!src || !hasAsset(src) || failed === src) return <span className={`${styles.missingImage} ${className}`} role="img" aria-label={alt ? `${alt}: image unavailable` : 'Image unavailable'}>◇</span>;
  return <img src={src} alt={alt} className={className} loading="lazy" onError={() => setFailed(src)} />;
}
