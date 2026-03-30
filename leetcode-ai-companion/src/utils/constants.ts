import type { AssistantSettings, FeatureKey, LanguageOption, ProgressState } from './types';

export const LC_PROBLEM_MATCH = /^https:\/\/leetcode\.com\/problems\/[^/?#]+(?:\/|$)/i;

export const STORAGE_KEYS = {
  settings: 'lc_ai_settings_v1',
  progress: 'lc_ai_progress_v1',
  notes: 'lc_ai_notes_v1',
  cache: 'lc_ai_cache_v1',
} as const;

export const DEFAULT_MODEL_LIST = [
  'openai/gpt-4o-mini',
  'openai/gpt-4.1-mini',
  'anthropic/claude-3.7-sonnet',
  'google/gemini-2.5-pro',
  'meta-llama/llama-3.3-70b-instruct',
] as const;

export const DEFAULT_SETTINGS: AssistantSettings = {
  openRouterApiKey: '',
  model: DEFAULT_MODEL_LIST[0],
  customModel: '',
  darkMode: true,
  defaultLanguage: 'python',
  interviewModeByDefault: false,
  temperature: 0.2,
};

export const EMPTY_PROGRESS: ProgressState = {
  solved: {},
  conceptAssistScore: {},
  featureUsageCount: {},
};

export const LANGUAGE_LABELS: Record<LanguageOption, string> = {
  python: 'Python',
  javascript: 'JavaScript',
  java: 'Java',
  cpp: 'C++',
};

export const CACHE_DEFAULT_TTL_MS: Record<FeatureKey, number> = {
  hints: 1000 * 60 * 60 * 24,
  approach: 1000 * 60 * 60 * 24,
  complexity: 1000 * 60 * 60 * 24,
  pseudocode: 1000 * 60 * 60 * 24,
  concepts: 1000 * 60 * 60 * 24,
  codeReview: 1000 * 60 * 60 * 12,
  reveal: 1000 * 60 * 60 * 24,
  multiApproach: 1000 * 60 * 60 * 24,
  pattern: 1000 * 60 * 60 * 24,
  debug: 1000 * 60 * 20,
  testCases: 1000 * 60 * 20,
  dryRun: 1000 * 60 * 20,
  chat: 1000 * 60 * 5,
  interview: 1000 * 60 * 5,
};
