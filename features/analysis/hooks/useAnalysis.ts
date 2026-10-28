"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { analysisRequest, jsonBody } from "../api/client";
import { promptIssues } from "../prompts";
import { isActiveJob, isUnfinishedJob, withRequiredStages, type AnalysisConfig, type AnalysisJob, type AnalysisPrompts, type AnalysisSettings } from "../types";

const errorMessage = (error: unknown) => error instanceof Error ? error.message : "Something went wrong. Please try again.";
const updateJob = (jobs: AnalysisJob[], job: AnalysisJob) => [job, ...jobs.filter((item) => item.id !== job.id)]
  .sort((a, b) => b.created_at.localeCompare(a.created_at));

function rememberJob(id: string | null) {
  const url = new URL(window.location.href);
  if (id) url.searchParams.set("job", id);
  else url.searchParams.delete("job");
  window.history.replaceState(null, "", url);
}

export function useAnalysis() {
  const [mode, setMode] = useState<'setup' | 'run'>('setup');
  const [config, setConfig] = useState<AnalysisConfig | null>(null);
  const [settings, setSettings] = useState<AnalysisSettings | null>(null);
  const [prompts, setPrompts] = useState<AnalysisPrompts | null>(null);
  const [jobs, setJobs] = useState<AnalysisJob[]>([]);
  const [job, setJob] = useState<AnalysisJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"saving" | "starting" | "resuming" | "deleting" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pollError, setPollError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [imports, setImports] = useState<Record<string, { status: "downloading" | "saved" | "failed"; url?: string; error?: string }>>({});
  const [reloadKey, setReloadKey] = useState(0);
  const mounted = useRef(false);
  const requests = useRef(new Set<AbortController>());
  const importing = useRef(new Set<string>());
  const imported = useRef(new Set<string>());
  const autoImportAttempted = useRef(new Set<string>());
  const watched = useRef(new Set<string>());
  const mutationVersion = useRef(0);
  const activeJob = jobs.find(item => item.status === 'running') ?? jobs.find(isActiveJob) ?? (isActiveJob(job) ? job : null);
  const unfinishedJobs = jobs.filter(isUnfinishedJob).sort((a, b) => a.created_at.localeCompare(b.created_at));
  const queuedJobs = jobs.filter(item => item.status === 'queued' && item.queue_position);
  const validationIssues = prompts ? promptIssues(prompts) : [];
  const selectedJobId = job?.id;
  useEffect(() => { if (mode === 'run') rememberJob(selectedJobId ?? null); }, [selectedJobId, mode]);

  useEffect(() => {
    mounted.current = true;
    const currentRequests = requests.current;
    return () => {
      mounted.current = false;
      for (const request of currentRequests) request.abort();
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      const [configResult, jobsResult] = await Promise.allSettled([
        analysisRequest<AnalysisConfig>("/config", { signal: controller.signal }),
        analysisRequest<{ jobs: AnalysisJob[] }>("/jobs", { signal: controller.signal }),
      ]);
      if (controller.signal.aborted) return;
      if (configResult.status === "fulfilled" && Object.values(configResult.value.prompts).every(profile => profile && typeof profile === 'object' && 'kind' in profile)) {
        setConfig(configResult.value);
        setSettings(withRequiredStages(configResult.value.settings));
        setPrompts(configResult.value.prompts);
      } else {
        setError(configResult.status === 'fulfilled' ? 'Restart the analysis service to load the new prompt settings.' : errorMessage(configResult.reason));
      }
      if (jobsResult.status === "fulfilled") {
        for (const item of jobsResult.value.jobs) if (isActiveJob(item)) watched.current.add(item.id);
        setJobs(jobsResult.value.jobs);
        const requestedId = new URL(window.location.href).searchParams.get("job");
        const activeId = configResult.status === "fulfilled" ? configResult.value.active_job_id : null;
        const selected = jobsResult.value.jobs.find((item) => item.id === (requestedId || activeId))
          ?? jobsResult.value.jobs.find(isActiveJob)
          ?? jobsResult.value.jobs[0];
        if (selected) {
          setJob(selected);
          if (requestedId || isActiveJob(selected)) setMode('run');
        }
        if (requestedId && !jobsResult.value.jobs.some((item) => item.id === requestedId)) {
          try {
            const response = await analysisRequest<{ job: AnalysisJob }>(`/jobs/${encodeURIComponent(requestedId)}`, { signal: controller.signal });
            if (!controller.signal.aborted) {
              setJob(response.job);
              setMode('run');
              setJobs((previous) => updateJob(previous, response.job));
            }
          } catch (loadError) {
            if (!controller.signal.aborted) setPollError(errorMessage(loadError));
          }
        }
      } else if (configResult.status === "fulfilled") {
        setPollError(`Run history could not be loaded. ${errorMessage(jobsResult.reason)}`);
      }
      if (!controller.signal.aborted) setLoading(false);
    }
    void load();
    return () => controller.abort();
  }, [reloadKey]);

  const importResults = useCallback(async (completedJob: AnalysisJob) => {
    if (completedJob.status !== "succeeded" || importing.current.has(completedJob.id) || imported.current.has(completedJob.id)) return;
    importing.current.add(completedJob.id);
    const controller = new AbortController();
    requests.current.add(controller);
    setImports((previous) => ({ ...previous, [completedJob.id]: { status: "downloading" } }));
    try {
      const response = await analysisRequest<{ result_id: string; url: string }>(`/jobs/${encodeURIComponent(completedJob.id)}/import`, { method: "POST", signal: controller.signal });
      imported.current.add(completedJob.id);
      if (mounted.current) setImports((previous) => ({ ...previous, [completedJob.id]: { status: "saved", url: response.url } }));
    } catch (importError) {
      if (!controller.signal.aborted) setImports((previous) => ({ ...previous, [completedJob.id]: { status: "failed", error: errorMessage(importError) } }));
    } finally {
      importing.current.delete(completedJob.id);
      requests.current.delete(controller);
    }
  }, []);

  useEffect(() => {
    if (job?.status === "succeeded" && !autoImportAttempted.current.has(job.id)) {
      autoImportAttempted.current.add(job.id);
      void Promise.resolve().then(() => { if (mounted.current) return importResults(job); });
    }
  }, [job, importResults]);

  const connected = Boolean(config);
  useEffect(() => {
    if (!connected) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      let delay = 1500;
      const version = mutationVersion.current;
      try {
        const response = await analysisRequest<{ jobs: AnalysisJob[] }>("/jobs", { signal: controller.signal });
        if (controller.signal.aborted) return;
        if (version === mutationVersion.current) {
          setJobs(response.jobs);
          const nextActive = response.jobs.find(item => item.status === 'running') ?? response.jobs.find(isActiveJob);
          setJob(previous => {
            if (!previous) return previous;
            const updated = response.jobs.find(item => item.id === previous.id);
            return isActiveJob(previous) && updated && !isActiveJob(updated) && nextActive ? nextActive : updated ?? (previous.status === 'succeeded' ? previous : null);
          });
          for (const item of response.jobs) {
            if (isActiveJob(item)) watched.current.add(item.id);
            if (item.status === 'succeeded' && watched.current.has(item.id)) {
              watched.current.delete(item.id);
              if (!autoImportAttempted.current.has(item.id)) {
                autoImportAttempted.current.add(item.id);
                void importResults(item);
              }
            }
          }
          setPollError(null);
        }
      } catch (pollingError) {
        if (controller.signal.aborted) return;
        setPollError(`Progress updates are paused. ${errorMessage(pollingError)} Retrying automatically…`);
        delay = 4000;
      }
      if (!controller.signal.aborted) timer = setTimeout(poll, delay);
    }
    timer = setTimeout(poll, 500);
    return () => { controller.abort(); clearTimeout(timer); };
  }, [connected, importResults]);

  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    setPollError(null);
    setReloadKey((value) => value + 1);
  }, []);

  async function saveSettings() {
    if (!settings || !prompts || busy || validationIssues.length > 0) return;
    const controller = new AbortController();
    requests.current.add(controller);
    setBusy("saving"); setError(null); setNotice(null);
    try {
      const response = await analysisRequest<AnalysisConfig>("/config", { method: "PUT", ...jsonBody({ settings, prompts }), signal: controller.signal });
      if (!mounted.current) return;
      setConfig(response); setSettings(withRequiredStages(response.settings)); setPrompts(response.prompts);
      setNotice("Settings and prompts saved for future analyses.");
    } catch (saveError) {
      if (!controller.signal.aborted) setError(errorMessage(saveError));
    } finally {
      requests.current.delete(controller);
      if (mounted.current) setBusy(null);
    }
  }

  async function startAnalysis(file: File) {
    if (!settings || !prompts || busy || activeJob || validationIssues.length > 0) return;
    const controller = new AbortController();
    requests.current.add(controller);
    setBusy("starting"); setError(null); setNotice(null);
    mutationVersion.current++;
    try {
      const data = new FormData();
      data.set("image", file);
      const upload = await analysisRequest<{ upload_id: string; filename: string }>("/uploads", { method: "POST", body: data, signal: controller.signal });
      const response = await analysisRequest<{ job: AnalysisJob }>("/jobs", {
        method: "POST", ...jsonBody({ upload_id: upload.upload_id, stages: settings.selected_stages, settings, prompts }), signal: controller.signal,
      });
      if (!mounted.current) return;
      watched.current.add(response.job.id);
      setJob(response.job); setJobs((previous) => updateJob(previous, response.job));
      setMode('run');
      setPollError(null); rememberJob(response.job.id);
    } catch (startError) {
      if (!controller.signal.aborted) setError(errorMessage(startError));
    } finally {
      mutationVersion.current++;
      requests.current.delete(controller);
      if (mounted.current) setBusy(null);
    }
  }

  async function resumeJobs(ids: string[]) {
    if (busy || !ids.length) return false;
    const controller = new AbortController();
    requests.current.add(controller);
    mutationVersion.current++;
    setBusy('resuming'); setError(null);
    try {
      const response = await analysisRequest<{ jobs: AnalysisJob[] }>("/jobs/resume", {
        method: 'POST', ...jsonBody({job_ids: ids}), signal: controller.signal,
      });
      if (!mounted.current) return false;
      for (const id of ids) watched.current.add(id);
      setJobs(response.jobs);
      const selected = response.jobs.find(item => item.status === 'running')
        ?? response.jobs.filter(item => ids.includes(item.id)).sort((a, b) => (a.queue_position ?? 0) - (b.queue_position ?? 0))[0];
      if (selected) selectJob(selected);
      setNotice(null); setPollError(null);
      return true;
    } catch (resumeError) {
      if (!controller.signal.aborted) setError(errorMessage(resumeError));
      return false;
    } finally {
      mutationVersion.current++;
      requests.current.delete(controller);
      if (mounted.current) setBusy(null);
    }
  }

  async function deleteJob(id: string) {
    if (busy) return false;
    const controller = new AbortController();
    requests.current.add(controller);
    mutationVersion.current++;
    setBusy('deleting'); setError(null);
    try {
      await analysisRequest(`/jobs/${encodeURIComponent(id)}`, {method: 'DELETE', signal: controller.signal});
      if (!mounted.current) return false;
      setJobs(previous => previous.filter(item => item.id !== id));
      watched.current.delete(id);
      if (job?.id === id) { setJob(null); showExecutor(); }
      return true;
    } catch (deleteError) {
      if (!controller.signal.aborted) setError(errorMessage(deleteError));
      return false;
    } finally {
      mutationVersion.current++;
      requests.current.delete(controller);
      if (mounted.current) setBusy(null);
    }
  }

  function selectJob(selected: AnalysisJob) {
    setJob(selected);
    setMode('run');
    rememberJob(selected.id);
  }

  function showExecutor() { setMode('setup'); rememberJob(null); }

  return { config, settings, setSettings, prompts, setPrompts, jobs, job, activeJob, unfinishedJobs, queuedJobs, loading, busy, error, pollError, notice, imports, importResults, reload, saveSettings, startAnalysis, resumeJobs, deleteJob, selectJob, mode, showExecutor, validationIssues };
}
