export type StageGroup = "global" | "per_item" | "ranking";
export type Device = "auto" | "cpu" | "cuda";
export type PromptStage = "object_detect" | "analyze_segments" | "image_description" | "full_image_rankings" | "per_item_rankings";
export type SettingValue = string | number | boolean | null;
export type StageOptions = Record<string, SettingValue>;

export interface AnalysisStage {
  key: string;
  label: string;
  group: StageGroup;
}

export interface AnalysisSettings {
  device: Device;
  min_item_size_px: number;
  selected_stages: string[];
  stage_options: Record<PromptStage, StageOptions>;
  synthetic_api: { url: string; auto_start: boolean; start_timeout_seconds: number };
}

export interface PromptInstructions { positive: string; negative: string }
export interface DetectionProfile extends PromptInstructions {
  kind: 'detection';
  groups: Record<'people' | 'objects' | 'texts', PromptInstructions>;
}
export interface DescriptionQuestion { label: string; instruction: string }
export interface DescriptionProfile extends PromptInstructions {
  kind: 'description';
  style: 'concise' | 'detailed' | 'bullets';
  questions: DescriptionQuestion[];
}
interface CriterionBase extends PromptInstructions { label: string }
export interface ScoreCriterion extends CriterionBase {
  type: 'score'; min: number; max: number; low_label: string; high_label: string;
}
export interface ChoiceCriterion extends CriterionBase { type: 'choice'; choices: string[] }
export interface BooleanCriterion extends CriterionBase { type: 'boolean' }
export type RankingCriterion = ScoreCriterion | ChoiceCriterion | BooleanCriterion;
export interface RankingProfile extends PromptInstructions { kind: 'ranking'; criteria: RankingCriterion[] }
export type PromptProfile = DetectionProfile | DescriptionProfile | RankingProfile;
export interface AnalysisPrompts {
  object_detect: DetectionProfile;
  analyze_segments: DetectionProfile;
  image_description: DescriptionProfile;
  full_image_rankings: RankingProfile;
  per_item_rankings: RankingProfile;
}
export interface PromptPreset { name: string; profile: PromptProfile }

export interface AnalysisConfig {
  stages: AnalysisStage[];
  settings: AnalysisSettings;
  prompts: AnalysisPrompts;
  prompt_presets?: Partial<Record<PromptStage, PromptPreset[]>>;
  models: string[];
  ollama_available: boolean;
  active_job_id: string | null;
}

export type JobStatus = "queued" | "running" | "succeeded" | "failed" | "interrupted";

export interface StageSubstep {
  label: string;
  status: "pending" | "running" | "succeeded" | "failed" | "interrupted" | "skipped";
  completed: number;
  total: number | null;
  unit: string;
  current: string | null;
  activity: string | null;
  skipped: number;
  failed: number;
}

export interface AnalysisStage {
  key: string;
  label: string;
  status: "pending" | "running" | "succeeded" | "failed" | "skipped";
  substeps?: StageSubstep[];
  current_substep?: number | null;
}

export interface AnalysisJob {
  id: string;
  status: JobStatus;
  original_filename?: string;
  stage_key: string | null;
  completed_stages: number;
  total_stages: number;
  stages: AnalysisStage[];
  created_at: string;
  updated_at: string;
  error: string | null;
  result_id: string | null;
  logs: string[];
  queue_position?: number | null;
  resume_attempts?: number;
}

export const isActiveJob = (job: AnalysisJob | null | undefined) => job?.status === "queued" || job?.status === "running";
export const isUnfinishedJob = (job: AnalysisJob) => job.status === "failed" || job.status === "interrupted";
export const REQUIRED_STAGES = ["extract_objects", "original_export"];

export function withRequiredStages(settings: AnalysisSettings): AnalysisSettings {
  return { ...settings, selected_stages: Array.from(new Set([...settings.selected_stages, ...REQUIRED_STAGES])) };
}
