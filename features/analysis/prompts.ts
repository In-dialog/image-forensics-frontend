import type { AnalysisPrompts, PromptProfile, PromptStage, RankingCriterion } from './types';

export const PROMPT_LIMITS = { criteria: 16, questions: 12, choices: 20, label: 120, instructions: 12000, question: 5000 };

export function newCriterion(criteria: RankingCriterion[]): RankingCriterion {
  let number = criteria.length + 1;
  while (criteria.some(item => item.label.toLowerCase() === `Criterion ${number}`.toLowerCase())) number++;
  return { label: `Criterion ${number}`, type: 'score', positive: '', negative: '', min: 0, max: 10,
    low_label: 'Not present', high_label: 'Strongly present' };
}

export function changeCriterionType(criterion: RankingCriterion, type: RankingCriterion['type']): RankingCriterion {
  if (criterion.type === type) return criterion;
  const base = { label: criterion.label, positive: criterion.positive, negative: criterion.negative };
  if (type === 'choice') return { ...base, type, choices: ['Present', 'Absent', 'Unclear'] };
  if (type === 'boolean') return { ...base, type };
  return { ...base, type, min: 0, max: 10, low_label: 'Not present', high_label: 'Strongly present' };
}

export function criterionSummary(criterion: RankingCriterion): string {
  if (criterion.type === 'score') return `${Number.isFinite(criterion.min) ? criterion.min : '?'} to ${Number.isFinite(criterion.max) ? criterion.max : '?'}`;
  if (criterion.type === 'boolean') return 'Yes / No';
  return `${criterion.choices.length} choices`;
}

export function moveItem<T>(items: T[], index: number, offset: -1 | 1): T[] {
  const target = index + offset;
  if (index < 0 || index >= items.length || target < 0 || target >= items.length) return items;
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export function profileErrors(profile: PromptProfile): string[] {
  const errors: string[] = [];
  const uniqueLabels = (items: { label: string }[], noun: string) => {
    const labels = new Set<string>();
    items.forEach((item, index) => {
      const label = item.label.trim().toLocaleLowerCase();
      if (!label || item.label.length > PROMPT_LIMITS.label) errors.push(`${noun} ${index + 1} needs a title of 1–120 characters.`);
      else if (labels.has(label)) errors.push(`${noun} titles must be unique: “${item.label}”.`);
      labels.add(label);
    });
  };
  const instructions = (value: { positive: string; negative: string }, limit: number, label: string) => {
    if (value.positive.length > limit || value.negative.length > limit) errors.push(`${label} instructions must be ${limit} characters or fewer.`);
  };
  instructions(profile, PROMPT_LIMITS.instructions, 'General');
  if (profile.kind === 'detection') {
    Object.entries(profile.groups).forEach(([name, group]) => instructions(group, PROMPT_LIMITS.instructions, name));
  } else if (profile.kind === 'description') {
    if (profile.questions.length < 1 || profile.questions.length > PROMPT_LIMITS.questions) errors.push('Use 1–12 description questions.');
    uniqueLabels(profile.questions, 'Question');
    profile.questions.forEach((question, index) => {
      if (!question.instruction.trim() || question.instruction.length > PROMPT_LIMITS.question) errors.push(`Question ${index + 1} needs instructions of 1–5000 characters.`);
    });
  } else {
    if (profile.criteria.length < 1 || profile.criteria.length > PROMPT_LIMITS.criteria) errors.push('Use 1–16 ranking criteria.');
    uniqueLabels(profile.criteria, 'Criterion');
    profile.criteria.forEach((criterion, index) => {
      const name = criterion.label.trim() || `Criterion ${index + 1}`;
      instructions(criterion, PROMPT_LIMITS.question, name);
      if (criterion.type === 'score') {
        if (![criterion.min, criterion.max].every(value => Number.isFinite(value) && Math.abs(value) <= 1e6) || criterion.min >= criterion.max) {
          errors.push(`${name}: the upper score must be greater than the lower score, between −1,000,000 and 1,000,000.`);
        }
        if (criterion.low_label.length > 200 || criterion.high_label.length > 200) errors.push(`${name}: scale descriptions must be 200 characters or fewer.`);
      } else if (criterion.type === 'choice') {
        const choices = criterion.choices.map(value => value.trim().toLocaleLowerCase());
        if (choices.length < 2 || choices.length > PROMPT_LIMITS.choices || choices.some(value => !value || value.length > 120) || new Set(choices).size !== choices.length) {
          errors.push(`${name}: provide 2–20 different, nonempty choices of up to 120 characters.`);
        }
      }
    });
  }
  return errors;
}

export function promptIssues(prompts: AnalysisPrompts): { stage: PromptStage; message: string }[] {
  return (Object.entries(prompts) as [PromptStage, PromptProfile][])
    .flatMap(([stage, profile]) => profileErrors(profile).map(message => ({ stage, message })));
}
