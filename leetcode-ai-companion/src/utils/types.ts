export type HintLevel = 1 | 2 | 3;

export type LanguageOption = 'python' | 'javascript' | 'java' | 'cpp';

export type FeatureKey =
  | 'hints'
  | 'approach'
  | 'complexity'
  | 'pseudocode'
  | 'concepts'
  | 'codeReview'
  | 'reveal'
  | 'multiApproach'
  | 'pattern'
  | 'debug'
  | 'testCases'
  | 'dryRun'
  | 'chat'
  | 'interview';

export interface ExampleBlock {
  title: string;
  content: string;
}

export interface ProblemData {
  slug: string;
  title: string;
  description: string;
  constraints: string;
  examples: ExampleBlock[];
  editorCode: string;
  detectedLanguage: LanguageOption;
  url: string;
}

export interface AssistantSettings {
  openRouterApiKey: string;
  model: string;
  customModel: string;
  darkMode: boolean;
  defaultLanguage: LanguageOption;
  interviewModeByDefault: boolean;
  temperature: number;
}

export interface SimilarProblem {
  title: string;
  slug: string;
  reason: string;
}

export interface ComplexitySummary {
  optimalTime: string;
  optimalSpace: string;
  userTime: string;
  userSpace: string;
  explanation: string;
}

export interface MultiApproachSummary {
  bruteForce: string;
  better: string;
  optimal: string;
}

export interface OptimalSolutionPack {
  explanation: string;
  codeByLanguage: Record<LanguageOption, string>;
}

/* ─── Per-Feature AI Result Types ─── */

export interface HintsResult {
  level1: string;
  level2: string;
  level3: string;
}

export interface ApproachResult {
  beginner: string;
  advanced: string;
}

export interface PseudocodeResult {
  low: string;
  medium: string;
  high: string;
}

export interface ConceptsResult {
  concepts: string[];
  explanations: Record<string, string>;
}

export interface CodeReviewResult {
  correctness: string;
  performance: string;
  style: string;
  edgeCases: string;
  overall: string;
  score: number;
}

export interface PatternResult {
  problems: SimilarProblem[];
  patternName: string;
  patternDescription: string;
}

/* ─── Feature Cache Map ─── */
export interface FeatureCache {
  hints?: HintsResult;
  approach?: ApproachResult;
  complexity?: ComplexitySummary;
  pseudocode?: PseudocodeResult;
  concepts?: ConceptsResult;
  codeReview?: CodeReviewResult;
  reveal?: OptimalSolutionPack;
  multiApproach?: MultiApproachSummary;
  pattern?: PatternResult;
}

/* ─── Legacy CorePack (kept for migration) ─── */
export interface CorePack {
  hints: {
    level1: string;
    level2: string;
    level3: string;
  };
  approaches: {
    beginner: string;
    advanced: string;
  };
  complexity: ComplexitySummary;
  pseudocode: {
    low: string;
    medium: string;
    high: string;
  };
  concepts: string[];
  codeReview: string;
  multipleApproaches: MultiApproachSummary;
  optimalSolution: OptimalSolutionPack;
  similarProblems: SimilarProblem[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
}

export interface ProgressProblemEntry {
  slug: string;
  title: string;
  solvedAt: number;
  concepts: string[];
  hintsUsed: number;
  revealUsed: boolean;
}

export interface ProgressState {
  solved: Record<string, ProgressProblemEntry>;
  conceptAssistScore: Record<string, number>;
  featureUsageCount: Record<string, number>;
}

export interface WeakArea {
  concept: string;
  score: number;
}

export interface AiTaskInput {
  feature: FeatureKey;
  systemPrompt: string;
  userPrompt: string;
  model: string;
  temperature: number;
  cacheKey: string;
  ttlMs: number;
}

export interface AiTaskResult {
  ok: boolean;
  content?: string;
  error?: string;
  cached?: boolean;
}

export interface RuntimeRequestMap {
  AI_TASK: AiTaskInput;
  GET_SETTINGS: undefined;
  SAVE_SETTINGS: AssistantSettings;
  GET_PROGRESS: undefined;
  SAVE_PROGRESS: ProgressState;
  GET_NOTE: { slug: string };
  SAVE_NOTE: { slug: string; note: string };
}

export interface RuntimeResponseMap {
  AI_TASK: AiTaskResult;
  GET_SETTINGS: AssistantSettings;
  SAVE_SETTINGS: { ok: true };
  GET_PROGRESS: ProgressState;
  SAVE_PROGRESS: { ok: true };
  GET_NOTE: { note: string };
  SAVE_NOTE: { ok: true };
}