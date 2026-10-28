"use client";

import { useMemo } from 'react';
import { motion } from 'motion/react';
import { useImageBasePath } from '../../context/ImageDataContext';
import { getRankingsUrl } from '../../config/dataSource';
import { useFetchJson } from '../../lib/useFetchJson';
import { readRankingDocument } from '../../lib/structuredResults';
import { SemanticOverview } from './SemanticOverview';
import styles from './semantics.module.css';

const slide = { enter: direction => ({ x: `${direction * 100}%` }), center: { x: 0 }, exit: direction => ({ x: `${-direction * 100}%` }) };

export default function SemanticsView({ transition, direction }) {
  const basePath = useImageBasePath();
  const result = useFetchJson(getRankingsUrl(basePath, 'per_item'));
  const parsed = useMemo(() => readRankingDocument(result.data), [result.data]);
  const document = parsed?.scope === 'per_item' ? parsed : null;
  return <motion.section className={styles.semantics} aria-label="Semantics" custom={direction} variants={slide}
    initial="enter" animate="center" exit="exit" transition={transition}>
    <header className={styles.heading}>
      <h2>Semantics</h2>
    </header>
    <div className={styles.content}>
      <SemanticOverview document={document} status={result} />
    </div>
  </motion.section>;
}
