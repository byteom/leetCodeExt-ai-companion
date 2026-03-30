import type { ProgressState, WeakArea } from '../utils/types';

export const recordFeatureUsage = (
  state: ProgressState,
  feature: string,
  concepts: string[] = [],
  weight = 1,
): ProgressState => {
  const next: ProgressState = {
    ...state,
    solved: { ...state.solved },
    conceptAssistScore: { ...state.conceptAssistScore },
    featureUsageCount: { ...state.featureUsageCount },
  };

  next.featureUsageCount[feature] = (next.featureUsageCount[feature] ?? 0) + 1;
  for (const concept of concepts) {
    next.conceptAssistScore[concept] = (next.conceptAssistScore[concept] ?? 0) + weight;
  }

  return next;
};

export const markProblemSolved = (
  state: ProgressState,
  input: {
    slug: string;
    title: string;
    concepts: string[];
    hintsUsed: number;
    revealUsed: boolean;
  },
): ProgressState => {
  const next: ProgressState = {
    ...state,
    solved: { ...state.solved },
    conceptAssistScore: { ...state.conceptAssistScore },
    featureUsageCount: { ...state.featureUsageCount },
  };

  next.solved[input.slug] = {
    slug: input.slug,
    title: input.title,
    solvedAt: Date.now(),
    concepts: input.concepts,
    hintsUsed: input.hintsUsed,
    revealUsed: input.revealUsed,
  };

  for (const concept of input.concepts) {
    const hintPenalty = input.hintsUsed * 0.6;
    const revealPenalty = input.revealUsed ? 2.5 : 0;
    next.conceptAssistScore[concept] = (next.conceptAssistScore[concept] ?? 0) + hintPenalty + revealPenalty;
  }

  return next;
};

export const computeWeakAreas = (state: ProgressState): WeakArea[] => {
  const solvedCountByConcept: Record<string, number> = {};
  for (const entry of Object.values(state.solved)) {
    for (const concept of entry.concepts) {
      solvedCountByConcept[concept] = (solvedCountByConcept[concept] ?? 0) + 1;
    }
  }

  const scores = Object.entries(state.conceptAssistScore).map(([concept, assist]) => {
    const solvedCount = solvedCountByConcept[concept] ?? 0;
    const score = assist / Math.max(1, solvedCount);
    return { concept, score: Number(score.toFixed(2)) };
  });

  return scores.sort((a, b) => b.score - a.score).slice(0, 8);
};