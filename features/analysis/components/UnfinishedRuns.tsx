"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { AnalysisJob } from "../types";
import styles from "./unfinishedRuns.module.css";

function RunIcon({ action }: { action: 'resume' | 'delete' | 'unfinished' }) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {action === 'resume' ? <><path d="M4 10a8 8 0 1 1 1 7M4 4v6h6" /><path d="m11 8 5 4-5 4z" /></>
      : action === 'delete' ? <><path d="M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7" /></>
      : <><circle cx="12" cy="12" r="9" strokeDasharray="3 3" /><path d="M12 6v6l4 2" /></>}
  </svg>;
}

export function UnfinishedRuns({ jobs, queued, busy, hasActiveJob, error, onResume, onDelete, onSelect }: {
  jobs: AnalysisJob[];
  queued: AnalysisJob[];
  busy: boolean;
  hasActiveJob: boolean;
  error: string | null;
  onResume: (ids: string[]) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  onSelect: (job: AnalysisJob) => void;
}) {
  const [open, setOpen] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const confirmation = useRef<HTMLButtonElement>(null);
  const id = useId();
  const count = jobs.length + queued.length;
  const rows = [...queued].sort((a, b) => (a.queue_position ?? 0) - (b.queue_position ?? 0)).concat(jobs);

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    const fit = () => {
      if (!panel.current) return;
      const available = window.matchMedia('(max-width: 620px)').matches
        ? window.innerHeight - 32 : window.innerHeight - panel.current.getBoundingClientRect().top - 16;
      panel.current.style.maxHeight = `${Math.max(1, Math.min(680, available))}px`;
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (confirmId) setConfirmId(null);
      else { setOpen(false); toggle.current?.focus(); }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    window.addEventListener('resize', fit);
    window.addEventListener('scroll', fit, true);
    fit();
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); window.removeEventListener('resize', fit); window.removeEventListener('scroll', fit, true); };
  }, [open, confirmId]);
  useEffect(() => { if (confirmId) confirmation.current?.focus(); }, [confirmId]);

  async function resume(ids: string[]) {
    if (await onResume(ids)) { setOpen(false); setConfirmId(null); }
  }

  return <div ref={root} className={styles.root}>
    <button ref={toggle} type="button" className={styles.toggle} disabled={!count && !open} aria-expanded={open} aria-controls={id}
      onClick={() => { setOpen(!open); setConfirmId(null); }}>
      <RunIcon action="unfinished" />Unfinished <span className={styles.badge}>{count}</span>
    </button>
    {open && <section ref={panel} id={id} role="dialog" aria-labelledby={`${id}-title`} className={styles.panel}>
      <header><h2 id={`${id}-title`}>Unfinished analyses</h2>
        <button type="button" className={styles.close} aria-label="Close unfinished analyses" onClick={() => { setOpen(false); toggle.current?.focus(); }}>×</button>
      </header>
      {jobs.length > 0 && <button type="button" className={styles.resumeAll} disabled={busy} onClick={() => void resume(jobs.map(job => job.id))}>
        <RunIcon action="resume" />Resume in order <span>{jobs.length}</span>
      </button>}
      {error && <p role="alert" className={styles.error}>{error}</p>}
      {!count && <p className={styles.empty}>No unfinished analyses.</p>}
      <ol className={styles.list}>{rows.map((job, index) => <li key={job.id}>
        <span className={styles.order}>{String(index + 1).padStart(2, '0')}</span>
        <div className={styles.identity}>
          <button type="button" onClick={() => { onSelect(job); setOpen(false); }}>{job.original_filename || job.id}</button>
          <span>{job.status === 'queued' ? `Queued · ${job.queue_position}` : job.status === 'interrupted' ? 'Interrupted' : 'Failed'} · {job.completed_stages} / {job.total_stages} stages</span>
          {job.stage_key && <small>{job.stages.find(stage => stage.key === job.stage_key)?.label}</small>}
        </div>
        <div className={styles.actions}>
          {confirmId === job.id ? <>
            <span className={styles.confirmLabel}>Delete this run and its files?</span>
            <button ref={confirmation} type="button" disabled={busy} onClick={async () => {
              if (await onDelete(job.id)) { setConfirmId(null); toggle.current?.focus(); }
            }}>Delete permanently</button>
            <button type="button" disabled={busy} onClick={() => setConfirmId(null)}>Cancel</button>
          </> : <>
            {job.status !== 'queued' && <button type="button" disabled={busy} onClick={() => void resume([job.id])} aria-label={`${hasActiveJob ? 'Queue' : 'Resume'} ${job.original_filename || job.id}`}>
              <RunIcon action="resume" />{hasActiveJob ? 'Queue' : 'Resume'}
            </button>}
            <button type="button" disabled={busy} aria-label={`Delete ${job.original_filename || job.id}`} onClick={() => setConfirmId(job.id)}><RunIcon action="delete" />Delete</button>
          </>}
        </div>
      </li>)}</ol>
    </section>}
  </div>;
}
