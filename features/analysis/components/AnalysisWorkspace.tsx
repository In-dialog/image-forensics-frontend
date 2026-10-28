"use client";

import { useEffect, useRef, useState } from "react";
import { useAnalysis } from "../hooks/useAnalysis";
import { AnalysisTabs } from "./AnalysisTabs";
import { StageSettings } from "./StageSettings";
import { GlobalSettings } from "./GlobalSettings";
import { PROMPT_STAGE, PROMPT_STAGE_LABELS } from "../configuration";
import { ImageInput } from "./ImageInput";
import { JobHistory } from "./JobHistory";
import { JobProgress } from "./JobProgress";
import { UnfinishedRuns } from "./UnfinishedRuns";
import { RunOutput } from "./RunOutput";
import { StageSelector } from "./StageSelector";
import { BackendUnavailable } from '@/features/setup/components/BackendUnavailable';
import styles from "../analysis.module.css";

export function AnalysisWorkspace() {
  const analysis = useAnalysis();
  const [tab, setTab] = useState(() => typeof window !== 'undefined' && window.location.hash === '#settings' ? 'global-settings' : 'executor');
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const panel = useRef<HTMLDivElement>(null);
  const sidebar = useRef<HTMLElement>(null);
  const disabled = Boolean(analysis.busy || analysis.activeJob);
  const monitoring = analysis.mode === "run" && Boolean(analysis.job);
  const stage = analysis.config?.stages.find(item => item.key === tab);
  useEffect(() => { if (panel.current) panel.current.scrollTop = 0; }, [tab, monitoring]);
  useEffect(() => { if (sidebar.current) sidebar.current.scrollTop = 0; }, [monitoring]);
  return <div className={styles.analysisWorkspace} data-mode={monitoring ? 'run' : 'setup'}>
    <header className={styles.pageHeading}>
      <h1>{monitoring ? "Analysis run" : "New analysis"}</h1>
      <div className={styles.topActions}>
        {monitoring ? <>
          <button type="button" className={styles.secondaryButton} onClick={() => { analysis.showExecutor(); setTab("executor"); }}>
            {analysis.activeJob ? "View setup" : "Back to executor"}
          </button>
          {analysis.activeJob && <span className={styles.hint}>Analysis running</span>}
          {analysis.queuedJobs.length > 0 && <span className={styles.hint}>{analysis.queuedJobs.length} queued</span>}
        </> : <>
          {analysis.activeJob ? <button type="button" className={styles.primaryButton} onClick={() => analysis.selectJob(analysis.activeJob!)}>View running analysis</button> : <>
            <button type="button" className={styles.secondaryButton} disabled={disabled || !analysis.config || analysis.validationIssues.length > 0} onClick={() => void analysis.saveSettings()}>
              {analysis.busy === "saving" ? "Saving…" : "Save settings"}
            </button>
            <button type="button" className={styles.primaryButton} disabled={!file || disabled || !analysis.config || analysis.validationIssues.length > 0} onClick={() => { if (file) void analysis.startAnalysis(file); }}>
              {analysis.busy === "starting" ? "Starting…" : "Start analysis"}<span aria-hidden="true">→</span>
            </button>
          </>}
        </>}
        {analysis.config && <UnfinishedRuns jobs={analysis.unfinishedJobs} queued={analysis.queuedJobs} busy={Boolean(analysis.busy)}
          hasActiveJob={Boolean(analysis.activeJob)} error={analysis.error} onResume={analysis.resumeJobs} onDelete={analysis.deleteJob} onSelect={analysis.selectJob} />}
      </div>
    </header>
    {analysis.loading && <p role="status" className={styles.hint}>Connecting to the analysis service…</p>}
    {!analysis.loading && !analysis.config && <BackendUnavailable />}
    {analysis.error && <div role="alert" className={styles.message}>
      <p>{analysis.error}</p>
      {!analysis.config && <button type="button" className={styles.secondaryButton} disabled={analysis.loading} onClick={analysis.reload}>Try again</button>}
    </div>}
    {!monitoring && analysis.notice && <p role="status" className={styles.notice}>{analysis.notice}</p>}
    {!monitoring && analysis.validationIssues.length > 0 && <p className={styles.errorText} role="status">
      Check {PROMPT_STAGE_LABELS[analysis.validationIssues[0].stage]}: {analysis.validationIssues[0].message}{' '}
      <button type="button" className={styles.textButton} onClick={() => {
        const key = Object.entries(PROMPT_STAGE).find(([, value]) => value === analysis.validationIssues[0].stage)?.[0];
        if (key) setTab(key);
      }}>Open settings</button>
    </p>}
    {analysis.config && analysis.settings && analysis.prompts && <div className={styles.layout} data-mode={monitoring ? 'run' : 'setup'}>
      <div ref={panel} className={monitoring ? styles.outputPanel : styles.controls}
        {...(!monitoring ? {role: "tabpanel", id: "analysis-panel", "aria-labelledby": "analysis-tab-" + tab, tabIndex: 0} : {})}>
        {monitoring && analysis.job ? <RunOutput key={analysis.job.id} job={analysis.job} />
          : tab === "executor" ? <>
            <ImageInput file={file} disabled={disabled} error={fileError} onChange={(next, error) => { setFile(next); setFileError(error); }} />
            <StageSelector stages={analysis.config.stages} selected={analysis.settings.selected_stages} disabled={disabled}
              onChange={selected => analysis.setSettings({...analysis.settings!, selected_stages: selected})} />
          </> : tab === "history" ? <>
            {analysis.jobs.length ? <JobHistory jobs={analysis.jobs} selectedId={analysis.job?.id} onSelect={analysis.selectJob} />
              : <p className={styles.hint}>No analyses yet.</p>}
          </> : tab === "global-settings" ? <GlobalSettings settings={analysis.settings} onSettings={analysis.setSettings} disabled={disabled} />
          : stage ? <StageSettings key={stage.key} stage={stage} config={analysis.config} settings={analysis.settings} prompts={analysis.prompts}
            onSettings={analysis.setSettings} onPrompts={analysis.setPrompts} disabled={disabled} /> : null}
      </div>
      <aside ref={sidebar} className={styles.aside}>
        {analysis.pollError && <p role="status" className={styles.errorText}>{analysis.pollError}</p>}
        {monitoring ? <JobProgress job={analysis.job} importState={analysis.job ? analysis.imports[analysis.job.id] : undefined}
          onRetryImport={() => { if (analysis.job) void analysis.importResults(analysis.job); }} />
          : <AnalysisTabs stages={analysis.config.stages} selected={tab} onSelect={setTab} />}
      </aside>
    </div>}
  </div>;
}
