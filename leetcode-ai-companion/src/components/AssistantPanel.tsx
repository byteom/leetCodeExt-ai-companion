import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  buildHintsTask, buildApproachTask, buildComplexityTask, buildPseudocodeTask,
  buildConceptsTask, buildCodeReviewTask, buildRevealTask, buildMultiApproachTask,
  buildPatternTask, buildDebugTask, buildTestCaseTask, buildDryRunTask, buildChatTask,
  parseHints, parseApproach, parseComplexity, parsePseudocode,
  parseConcepts, parseCodeReview, parseReveal, parseMultiApproach, parsePattern,
  type PromptContext,
} from '../services/promptFactory';
import { computeWeakAreas, markProblemSolved, recordFeatureUsage } from '../services/progressService';
import { runAiTask } from '../services/aiClient';
import { sendRuntimeMessage } from '../services/runtime';
import { assistantStore } from '../store/assistantStore';
import { LANGUAGE_LABELS } from '../utils/constants';
import type { ChatMessage, FeatureCache, LanguageOption } from '../utils/types';

/* ─── Feature Definitions ─── */
interface FeatureItem {
  id: string;
  icon: string;
  label: string;
  desc: string;
  color: string;
}

const FEATURES: FeatureItem[] = [
  { id: 'snapshot', icon: '📸', label: 'Problem Snapshot', desc: 'Description & constraints', color: '#3ba2ff' },
  { id: 'hints', icon: '💡', label: 'Hint System', desc: 'AI-powered progressive hints', color: '#4ade80' },
  { id: 'approach', icon: '🧭', label: 'Approach Explainer', desc: 'Beginner + Advanced AI analysis', color: '#2dd4bf' },
  { id: 'complexity', icon: '⏱️', label: 'Complexity', desc: 'AI Time & Space analysis', color: '#818cf8' },
  { id: 'pseudocode', icon: '📝', label: 'Pseudocode', desc: 'AI adjustable verbosity', color: '#22d3ee' },
  { id: 'debug', icon: '🐛', label: 'Debug Helper', desc: 'AI bug detection & fixes', color: '#fb923c' },
  { id: 'concepts', icon: '🔗', label: 'Concept Linker', desc: 'AI pattern recognition', color: '#a78bfa' },
  { id: 'review', icon: '📋', label: 'Code Review', desc: 'AI quality & edge-case analysis', color: '#38bdf8' },
  { id: 'reveal', icon: '🔓', label: 'Reveal Solution', desc: 'Optimal code in 4 languages', color: '#f472b6' },
  { id: 'multiApproach', icon: '📊', label: 'Multi Approaches', desc: 'Brute → Better → Optimal', color: '#c084fc' },
  { id: 'testcase', icon: '🧪', label: 'Test Cases', desc: 'AI edge case generator', color: '#34d399' },
  { id: 'dryrun', icon: '▶️', label: 'Dry Run', desc: 'AI step-by-step trace', color: '#fbbf24' },
  { id: 'pattern', icon: '🔍', label: 'Patterns', desc: 'AI similar problem finder', color: '#60a5fa' },
  { id: 'revision', icon: '📓', label: 'Revision Notes', desc: 'Per-problem notes', color: '#fb7185' },
  { id: 'progress', icon: '📈', label: 'Progress', desc: 'Stats & weak areas', color: '#a3e635' },
  { id: 'chat', icon: '💬', label: 'AI Chat', desc: 'Context-aware Q&A tutor', color: '#e879f9' },
];

/* ─── Helpers ─── */
const formatChatHistory = (messages: ChatMessage[]): string =>
  messages
    .slice(-8)
    .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
    .join('\n');

const mergeProgress = async (next: ReturnType<typeof assistantStore.getState>['progress']) => {
  assistantStore.setState({ progress: next });
  await sendRuntimeMessage('SAVE_PROGRESS', next);
};

/* ─── Component ─── */
export const AssistantPanel = () => {
  const state = assistantStore.getState();
  const [refreshToken, setRefreshToken] = useState(0);
  const [debugCode, setDebugCode] = useState(state.problem?.editorCode ?? '');
  const [debugOutput, setDebugOutput] = useState('');
  const [testCaseInput, setTestCaseInput] = useState('');
  const [testCaseOutput, setTestCaseOutput] = useState('');
  const [dryRunCode, setDryRunCode] = useState(state.problem?.editorCode ?? '');
  const [dryRunInput, setDryRunInput] = useState('');
  const [dryRunOutput, setDryRunOutput] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [approachMode, setApproachMode] = useState<'beginner' | 'advanced'>('beginner');
  const [pseudoLevel, setPseudoLevel] = useState<'low' | 'medium' | 'high'>('medium');
  const [debugDirty, setDebugDirty] = useState(false);
  const [dryRunDirty, setDryRunDirty] = useState(false);
  const [activeView, setActiveView] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageOption>(
    state.problem?.detectedLanguage ?? state.settings.defaultLanguage,
  );

  useEffect(() => {
    const unsubscribe = assistantStore.subscribe(() => setRefreshToken((value) => value + 1));
    return unsubscribe;
  }, []);

  const snapshot = useMemo(() => assistantStore.getState(), [refreshToken]);

  useEffect(() => {
    const nextCode = snapshot.problem?.editorCode ?? '';
    if (!debugDirty) setDebugCode(nextCode);
    if (!dryRunDirty) setDryRunCode(nextCode);
  }, [snapshot.problem?.editorCode, debugDirty, dryRunDirty]);

  useEffect(() => {
    const nextCode = snapshot.problem?.editorCode ?? '';
    setDebugCode(nextCode);
    setDebugOutput('');
    setTestCaseInput('');
    setTestCaseOutput('');
    setDryRunCode(nextCode);
    setDryRunInput('');
    setDryRunOutput('');
    setChatInput('');
    setDebugDirty(false);
    setDryRunDirty(false);
    assistantStore.clearFeatureCache();
  }, [snapshot.problem?.slug]);

  useEffect(() => {
    if (!snapshot.problem) return;
    setSelectedLanguage(snapshot.problem.detectedLanguage || snapshot.settings.defaultLanguage);
  }, [snapshot.problem?.slug]);

  /* ─── Auto-detect solved ─── */
  useEffect(() => {
    if (!snapshot.acceptedDetected || !snapshot.problem) return;
    if (snapshot.progress.solved[snapshot.problem.slug]) return;

    const concepts = snapshot.featureCache.concepts?.concepts ?? [];
    const next = markProblemSolved(snapshot.progress, {
      slug: snapshot.problem.slug,
      title: snapshot.problem.title,
      concepts,
      hintsUsed: snapshot.hintLevelShown,
      revealUsed: snapshot.revealUsed,
    });

    void mergeProgress(next);
  }, [snapshot.acceptedDetected, snapshot.problem?.slug, snapshot.featureCache.concepts, snapshot.hintLevelShown, snapshot.revealUsed]);

  /* ─── Prompt Context Helper ─── */
  const getPromptCtx = useCallback((): PromptContext | null => {
    if (!snapshot.problem) return null;
    return {
      problem: snapshot.problem,
      language: selectedLanguage,
      model: snapshot.settings.customModel.trim() || snapshot.settings.model,
      temperature: snapshot.settings.temperature,
      interviewMode: snapshot.settings.interviewModeByDefault,
    };
  }, [snapshot.problem, selectedLanguage, snapshot.settings]);

  /* ─── Lazy Feature Loader ─── */
  const loadFeature = useCallback(async <K extends keyof FeatureCache>(
    featureKey: K,
    buildFn: (ctx: PromptContext) => import('../utils/types').AiTaskInput,
    parseFn: (raw: string) => FeatureCache[K] | null,
  ): Promise<void> => {
    if (snapshot.featureCache[featureKey]) return;
    if (snapshot.loading[featureKey]) return;

    const ctx = getPromptCtx();
    if (!ctx || !snapshot.settings.openRouterApiKey.trim()) return;

    try {
      assistantStore.patchLoading(featureKey, true);
      assistantStore.patchFeatureError(featureKey, '');

      const task = buildFn(ctx);
      const response = await runAiTask(task);
      const parsed = parseFn(response);

      if (!parsed) {
        throw new Error('AI returned an invalid response. Try again.');
      }

      assistantStore.patchFeatureCache(featureKey, parsed);
    } catch (error) {
      assistantStore.patchFeatureError(featureKey, (error as Error).message);
    } finally {
      assistantStore.patchLoading(featureKey, false);
    }
  }, [snapshot.featureCache, snapshot.loading, snapshot.settings.openRouterApiKey, getPromptCtx]);

  /* ─── Auto-load feature on view ─── */
  useEffect(() => {
    if (!activeView || !snapshot.problem || !snapshot.settings.openRouterApiKey.trim()) return;

    const autoLoadMap: Record<string, () => Promise<void>> = {
      hints: () => loadFeature('hints', buildHintsTask, parseHints),
      approach: () => loadFeature('approach', buildApproachTask, parseApproach),
      complexity: () => loadFeature('complexity', buildComplexityTask, parseComplexity),
      pseudocode: () => loadFeature('pseudocode', buildPseudocodeTask, parsePseudocode),
      concepts: () => loadFeature('concepts', buildConceptsTask, parseConcepts),
      review: () => loadFeature('codeReview', buildCodeReviewTask, parseCodeReview),
      reveal: async () => { /* Don't auto-load reveal — user must click */ },
      multiApproach: () => loadFeature('multiApproach', buildMultiApproachTask, parseMultiApproach),
      pattern: () => loadFeature('pattern', buildPatternTask, parsePattern),
    } as Record<string, () => Promise<void>>;

    const loader = autoLoadMap[activeView];
    if (loader) void loader();
  }, [activeView, snapshot.problem?.slug, snapshot.settings.openRouterApiKey]);

  /* ─── Progress tracking ─── */
  const withProgressTracking = async (feature: string, weight = 1): Promise<void> => {
    const concepts = snapshot.featureCache.concepts?.concepts ?? [];
    const next = recordFeatureUsage(snapshot.progress, feature, concepts, weight);
    await mergeProgress(next);
  };

  const persistSettings = async (patch: Partial<typeof snapshot.settings>): Promise<void> => {
    const nextSettings = { ...snapshot.settings, ...patch };
    assistantStore.setState({ settings: nextSettings });
    await sendRuntimeMessage('SAVE_SETTINGS', nextSettings);
  };

  /* ─── Action Handlers ─── */
  const runDebug = async () => {
    const ctx = getPromptCtx();
    if (!ctx) return;

    try {
      assistantStore.patchLoading('debug', true);
      const task = buildDebugTask({ ...ctx, problem: { ...ctx.problem, editorCode: debugCode } }, debugCode);
      const result = await runAiTask(task);
      setDebugOutput(result);
      await withProgressTracking('debug', 1.2);
    } catch (error) {
      setDebugOutput((error as Error).message);
    } finally {
      assistantStore.patchLoading('debug', false);
    }
  };

  const runTestCases = async () => {
    const ctx = getPromptCtx();
    if (!ctx) return;

    try {
      assistantStore.patchLoading('testCases', true);
      const task = buildTestCaseTask(ctx, testCaseInput);
      const result = await runAiTask(task);
      setTestCaseOutput(result);
      await withProgressTracking('testCases', 0.7);
    } catch (error) {
      setTestCaseOutput((error as Error).message);
    } finally {
      assistantStore.patchLoading('testCases', false);
    }
  };

  const runDryRun = async () => {
    const ctx = getPromptCtx();
    if (!ctx) return;

    try {
      assistantStore.patchLoading('dryRun', true);
      const task = buildDryRunTask(
        { ...ctx, problem: { ...ctx.problem, editorCode: dryRunCode } },
        dryRunCode,
        dryRunInput,
      );
      const result = await runAiTask(task);
      setDryRunOutput(result);
      await withProgressTracking('dryRun', 0.8);
    } catch (error) {
      setDryRunOutput((error as Error).message);
    } finally {
      assistantStore.patchLoading('dryRun', false);
    }
  };

  const sendChat = async () => {
    const ctx = getPromptCtx();
    if (!ctx || !chatInput.trim()) return;

    const userMessage: ChatMessage = {
      id: `u_${Date.now()}`,
      role: 'user',
      content: chatInput.trim(),
      createdAt: Date.now(),
    };

    const nextChat = [...snapshot.chat, userMessage];
    assistantStore.setState({ chat: nextChat });
    setChatInput('');

    try {
      assistantStore.patchLoading('chat', true);
      const task = buildChatTask(ctx, formatChatHistory(nextChat), userMessage.content);
      const result = await runAiTask(task);
      const assistantMessage: ChatMessage = {
        id: `a_${Date.now()}`,
        role: 'assistant',
        content: result,
        createdAt: Date.now(),
      };
      assistantStore.setState({ chat: [...assistantStore.getState().chat, assistantMessage] });
      await withProgressTracking('chat', 0.4);
    } catch (error) {
      assistantStore.setState({
        chat: [
          ...assistantStore.getState().chat,
          { id: `err_${Date.now()}`, role: 'assistant', content: `Error: ${(error as Error).message}`, createdAt: Date.now() },
        ],
      });
    } finally {
      assistantStore.patchLoading('chat', false);
    }
  };

  const saveNote = async (note: string) => {
    if (!snapshot.problem) return;
    assistantStore.setState({ revisionNote: note });
    await sendRuntimeMessage('SAVE_NOTE', { slug: snapshot.problem.slug, note });
  };

  const revealSolution = async () => {
    if (snapshot.settings.interviewModeByDefault && !window.confirm('In Interview Mode, revealing the solution is discouraged. Continue anyway?')) {
      return;
    }
    assistantStore.setState({ revealUsed: true });
    // Trigger loading the reveal
    await loadFeature('reveal', buildRevealTask, parseReveal);
    await withProgressTracking('reveal', 2.2);
  };

  const showHint = async (level: 1 | 2 | 3) => {
    // Ensure hints are loaded
    if (!snapshot.featureCache.hints) {
      await loadFeature('hints', buildHintsTask, parseHints);
    }
    assistantStore.setState({ hintLevelShown: Math.max(snapshot.hintLevelShown, level) });
    await withProgressTracking(`hint_level_${level}`, level * 0.8);
  };

  const retryFeature = (featureKey: string) => {
    // Clear cached data and error to force a reload
    const fc = { ...snapshot.featureCache };
    delete fc[featureKey as keyof FeatureCache];
    assistantStore.setState({ featureCache: fc });
    assistantStore.patchFeatureError(featureKey, '');
  };

  const isInterviewMode = snapshot.settings.interviewModeByDefault;

  if (!snapshot.problem) {
    return <div className="lcai-panel-empty">LeetCode problem context not found yet.</div>;
  }

  const weakAreas = computeWeakAreas(snapshot.progress);
  const currentFeature = FEATURES.find((f) => f.id === activeView);
  const fc = snapshot.featureCache;

  /* ─── Error Banner for a feature ─── */
  const FeatureError = ({ featureKey }: { featureKey: string }) => {
    const error = snapshot.featureErrors[featureKey];
    if (!error) return null;
    return (
      <div className="lcai-feature-error">
        <span>❌ {error}</span>
        <button type="button" onClick={() => retryFeature(featureKey)}>Retry</button>
      </div>
    );
  };

  /* ─── Loading Indicator ─── */
  const FeatureLoading = ({ featureKey, text }: { featureKey: string; text: string }) => {
    if (!snapshot.loading[featureKey]) return null;
    return <div className="lcai-loading">{text}</div>;
  };

  /* ─── Feature Content Renderer ─── */
  const renderFeatureContent = () => {
    switch (activeView) {
      case 'snapshot':
        return (
          <>
            <div className="lcai-feature-info-banner">
              <span>📸</span> Parsed directly from the LeetCode page — no AI call needed.
            </div>
            <div className="lcai-snapshot-grid">
              <div>
                <h4>Description</h4>
                <pre>{snapshot.problem?.description || 'Problem description not parsed yet.'}</pre>
              </div>
              <div>
                <h4>Constraints</h4>
                <pre>{snapshot.problem?.constraints || 'No explicit constraints parsed.'}</pre>
              </div>
              <div>
                <h4>Examples</h4>
                <pre>
                  {snapshot.problem?.examples.length
                    ? snapshot.problem.examples.map((example) => example.content).join('\n\n')
                    : 'No examples parsed.'}
                </pre>
              </div>
              <div>
                <h4>Editor Code ({LANGUAGE_LABELS[selectedLanguage]})</h4>
                <pre>{snapshot.problem?.editorCode || 'No code detected from the editor yet.'}</pre>
              </div>
            </div>
          </>
        );

      case 'hints':
        return (
          <>
            <FeatureError featureKey="hints" />
            <FeatureLoading featureKey="hints" text="🤖 Generating progressive hints..." />
            {isInterviewMode ? (
              <div className="lcai-hint-interview-note">
                <small>💡 Interview Mode: Hints guide you through the problem step-by-step</small>
              </div>
            ) : null}
            <div className="lcai-row-wrap">
              <button type="button" onClick={() => void showHint(1)} disabled={Boolean(snapshot.loading.hints)}>
                {snapshot.loading.hints ? 'Loading...' : 'Level 1 — Direction'}
              </button>
              <button type="button" onClick={() => void showHint(2)} disabled={Boolean(snapshot.loading.hints) || snapshot.hintLevelShown < 1}>
                Level 2 — Pattern
              </button>
              <button type="button" onClick={() => void showHint(3)} disabled={Boolean(snapshot.loading.hints) || snapshot.hintLevelShown < 2}>
                Level 3 — Approach
              </button>
            </div>
            <div className="lcai-stack-output">
              {snapshot.hintLevelShown >= 1 && fc.hints ? (
                <div className="lcai-hint-card">
                  <span className="lcai-hint-badge">Level 1</span>
                  <pre>{fc.hints.level1}</pre>
                </div>
              ) : null}
              {snapshot.hintLevelShown >= 2 && fc.hints ? (
                <div className="lcai-hint-card">
                  <span className="lcai-hint-badge lcai-hint-badge-2">Level 2</span>
                  <pre>{fc.hints.level2}</pre>
                </div>
              ) : null}
              {snapshot.hintLevelShown >= 3 && fc.hints ? (
                <div className="lcai-hint-card">
                  <span className="lcai-hint-badge lcai-hint-badge-3">Level 3</span>
                  <pre>{fc.hints.level3}</pre>
                </div>
              ) : null}
            </div>
          </>
        );

      case 'approach':
        return (
          <>
            <FeatureError featureKey="approach" />
            <FeatureLoading featureKey="approach" text="🤖 Analyzing approach strategies..." />
            <div className="lcai-row-wrap">
              <button type="button" onClick={() => setApproachMode('beginner')} className={approachMode === 'beginner' ? 'active' : ''}>
                🎯 Beginner
              </button>
              <button type="button" onClick={() => setApproachMode('advanced')} className={approachMode === 'advanced' ? 'active' : ''}>
                🚀 Advanced
              </button>
            </div>
            {fc.approach ? (
              <pre>{approachMode === 'beginner' ? fc.approach.beginner : fc.approach.advanced}</pre>
            ) : !snapshot.loading.approach ? (
              <p className="lcai-muted-text">Click a mode to load AI analysis...</p>
            ) : null}
          </>
        );

      case 'complexity':
        return (
          <>
            <FeatureError featureKey="complexity" />
            <FeatureLoading featureKey="complexity" text="🤖 Analyzing time & space complexity..." />
            {fc.complexity ? (
              <div className="lcai-complexity-grid">
                <div className="lcai-complexity-card lcai-complexity-optimal">
                  <h4>🏆 Optimal Complexity</h4>
                  <div className="lcai-complexity-values">
                    <span><strong>Time:</strong> {fc.complexity.optimalTime}</span>
                    <span><strong>Space:</strong> {fc.complexity.optimalSpace}</span>
                  </div>
                </div>
                <div className="lcai-complexity-card lcai-complexity-user">
                  <h4>📝 Your Code</h4>
                  <div className="lcai-complexity-values">
                    <span><strong>Time:</strong> {fc.complexity.userTime}</span>
                    <span><strong>Space:</strong> {fc.complexity.userSpace}</span>
                  </div>
                </div>
                <div className="lcai-complexity-explanation">
                  <h4>📖 Explanation</h4>
                  <pre>{fc.complexity.explanation}</pre>
                </div>
              </div>
            ) : null}
          </>
        );

      case 'pseudocode':
        return (
          <>
            <FeatureError featureKey="pseudocode" />
            <FeatureLoading featureKey="pseudocode" text="🤖 Generating pseudocode..." />
            <div className="lcai-row-wrap">
              <button type="button" onClick={() => setPseudoLevel('low')} className={pseudoLevel === 'low' ? 'active' : ''}>
                📌 Low (Concise)
              </button>
              <button type="button" onClick={() => setPseudoLevel('medium')} className={pseudoLevel === 'medium' ? 'active' : ''}>
                📋 Medium
              </button>
              <button type="button" onClick={() => setPseudoLevel('high')} className={pseudoLevel === 'high' ? 'active' : ''}>
                📄 High (Detailed)
              </button>
            </div>
            {fc.pseudocode ? (
              <pre>{fc.pseudocode[pseudoLevel]}</pre>
            ) : !snapshot.loading.pseudocode ? (
              <p className="lcai-muted-text">Select verbosity to load AI pseudocode...</p>
            ) : null}
          </>
        );

      case 'debug':
        return (
          <>
            <FeatureError featureKey="debug" />
            <textarea
              value={debugCode}
              onChange={(event) => { setDebugDirty(true); setDebugCode(event.target.value); }}
              rows={8}
              placeholder="Your code will appear here automatically, or paste your code..."
            />
            <div className="lcai-row-wrap">
              <button type="button" onClick={() => { setDebugDirty(false); setDebugCode(snapshot.problem?.editorCode ?? ''); }}>
                ↻ Use Editor Code
              </button>
              <button type="button" onClick={() => void runDebug()} disabled={Boolean(snapshot.loading.debug)}>
                {snapshot.loading.debug ? '🔍 Analyzing...' : '🐛 Run AI Debug Analysis'}
              </button>
            </div>
            <FeatureLoading featureKey="debug" text="🤖 Analyzing your code for bugs..." />
            {debugOutput ? <pre>{debugOutput}</pre> : (
              <p className="lcai-muted-text">Paste your code above and click "Run AI Debug Analysis" for detailed bug detection and fixes.</p>
            )}
          </>
        );

      case 'concepts':
        return (
          <>
            <FeatureError featureKey="concepts" />
            <FeatureLoading featureKey="concepts" text="🤖 Identifying DSA patterns..." />
            {fc.concepts ? (
              <>
                <div className="lcai-tags">
                  {fc.concepts.concepts.map((concept) => (
                    <span key={concept} className="lcai-concept-tag">{concept}</span>
                  ))}
                </div>
                {fc.concepts.explanations ? (
                  <div className="lcai-concept-explanations">
                    {Object.entries(fc.concepts.explanations).map(([concept, explanation]) => (
                      <div key={concept} className="lcai-concept-item">
                        <strong>{concept}</strong>
                        <p>{explanation}</p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </>
            ) : null}
          </>
        );

      case 'review':
        return (
          <>
            <FeatureError featureKey="codeReview" />
            <FeatureLoading featureKey="codeReview" text="🤖 Performing code review..." />
            {fc.codeReview ? (
              <div className="lcai-review-grid">
                <div className="lcai-review-score">
                  <span className="lcai-score-number">{fc.codeReview.score}</span>
                  <span className="lcai-score-label">/10</span>
                </div>
                <div className="lcai-review-section">
                  <h4>✅ Correctness</h4>
                  <pre>{fc.codeReview.correctness}</pre>
                </div>
                <div className="lcai-review-section">
                  <h4>⚡ Performance</h4>
                  <pre>{fc.codeReview.performance}</pre>
                </div>
                <div className="lcai-review-section">
                  <h4>✨ Style</h4>
                  <pre>{fc.codeReview.style}</pre>
                </div>
                <div className="lcai-review-section">
                  <h4>🔲 Edge Cases</h4>
                  <pre>{fc.codeReview.edgeCases}</pre>
                </div>
                <div className="lcai-review-section">
                  <h4>📝 Overall</h4>
                  <pre>{fc.codeReview.overall}</pre>
                </div>
              </div>
            ) : null}
          </>
        );

      case 'reveal':
        return (
          <>
            <FeatureError featureKey="reveal" />
            {isInterviewMode && !snapshot.revealUsed ? (
              <div className="lcai-alert lcai-alert-interview">
                <strong>🎯 Interview Mode Active</strong>
                <p>Solutions are hidden to simulate a real interview. Try solving first, then reveal to compare.</p>
              </div>
            ) : null}
            <div className="lcai-view-actions">
              <button type="button" onClick={() => void revealSolution()} disabled={Boolean(snapshot.loading.reveal) || snapshot.revealUsed}>
                {snapshot.loading.reveal ? '🔍 Loading...' : snapshot.revealUsed ? '✅ Solution Revealed' : '🔓 Reveal Optimal Solution'}
              </button>
            </div>
            <FeatureLoading featureKey="reveal" text="🤖 Generating optimal solution in 4 languages..." />
            {fc.reveal && snapshot.revealUsed ? (
              <>
                <pre>{fc.reveal.explanation}</pre>
                <h4>Code ({LANGUAGE_LABELS[selectedLanguage]})</h4>
                <pre>{fc.reveal.codeByLanguage[selectedLanguage]}</pre>
              </>
            ) : !snapshot.revealUsed ? (
              <p className="lcai-muted-text">Click "Reveal" to see the optimal solution with full explanation and code.</p>
            ) : null}
          </>
        );

      case 'multiApproach':
        return (
          <>
            <FeatureError featureKey="multiApproach" />
            <FeatureLoading featureKey="multiApproach" text="🤖 Generating 3 approaches..." />
            {fc.multiApproach ? (
              <div className="lcai-approaches-stack">
                <div className="lcai-approach-card">
                  <h4>🐌 Brute Force</h4>
                  <pre>{fc.multiApproach.bruteForce}</pre>
                </div>
                <div className="lcai-approach-card">
                  <h4>⚡ Better</h4>
                  <pre>{fc.multiApproach.better}</pre>
                </div>
                <div className="lcai-approach-card">
                  <h4>🏆 Optimal</h4>
                  <pre>{fc.multiApproach.optimal}</pre>
                </div>
              </div>
            ) : null}
          </>
        );

      case 'testcase':
        return (
          <>
            <textarea
              value={testCaseInput}
              onChange={(event) => setTestCaseInput(event.target.value)}
              placeholder="Optional: Describe a custom scenario you want test cases for..."
              rows={3}
            />
            <button type="button" onClick={() => void runTestCases()} disabled={Boolean(snapshot.loading.testCases)}>
              {snapshot.loading.testCases ? '🔍 Generating...' : '🧪 Generate AI Test Cases'}
            </button>
            <FeatureLoading featureKey="testCases" text="🤖 Creating comprehensive test cases..." />
            {testCaseOutput ? <pre>{testCaseOutput}</pre> : (
              <p className="lcai-muted-text">Generates edge cases, boundary cases, adversarial inputs, and performance tests using AI.</p>
            )}
          </>
        );

      case 'dryrun':
        return (
          <>
            <textarea
              value={dryRunCode}
              onChange={(event) => { setDryRunDirty(true); setDryRunCode(event.target.value); }}
              rows={6}
              placeholder="Your code..."
            />
            <textarea
              value={dryRunInput}
              onChange={(event) => setDryRunInput(event.target.value)}
              placeholder="Input to trace (leave empty to use first example)"
              rows={2}
            />
            <div className="lcai-row-wrap">
              <button type="button" onClick={() => { setDryRunDirty(false); setDryRunCode(snapshot.problem?.editorCode ?? ''); }}>
                ↻ Use Editor Code
              </button>
              <button type="button" onClick={() => void runDryRun()} disabled={Boolean(snapshot.loading.dryRun)}>
                {snapshot.loading.dryRun ? '🔍 Running...' : '▶️ AI Dry Run Trace'}
              </button>
            </div>
            <FeatureLoading featureKey="dryRun" text="🤖 Tracing execution step by step..." />
            {dryRunOutput ? <pre>{dryRunOutput}</pre> : (
              <p className="lcai-muted-text">Shows variable states, data structure changes, and decision points at every step.</p>
            )}
          </>
        );

      case 'pattern':
        return (
          <>
            <FeatureError featureKey="pattern" />
            <FeatureLoading featureKey="pattern" text="🤖 Finding similar problems..." />
            {fc.pattern ? (
              <>
                <div className="lcai-pattern-banner">
                  <h4>🎯 Pattern: {fc.pattern.patternName}</h4>
                  <p>{fc.pattern.patternDescription}</p>
                </div>
                <h4>Similar Problems</h4>
                <ul className="lcai-links-list">
                  {fc.pattern.problems.map((problem) => (
                    <li key={problem.slug}>
                      <a href={`https://leetcode.com/problems/${problem.slug}/`} target="_blank" rel="noreferrer">
                        {problem.title}
                      </a>
                      <span>{problem.reason}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </>
        );

      case 'revision':
        return (
          <>
            <div className="lcai-feature-info-banner">
              <span>📓</span> Your personal notes for this problem. Saved locally.
            </div>
            <textarea
              value={snapshot.revisionNote}
              onChange={(event) => assistantStore.setState({ revisionNote: event.target.value })}
              rows={8}
              placeholder="Write your key takeaways, tricky parts, patterns learned..."
            />
            <button type="button" onClick={() => void saveNote(snapshot.revisionNote)}>
              💾 Save Revision Note
            </button>
          </>
        );

      case 'progress':
        return (
          <>
            <div className="lcai-progress-grid">
              <div className="lcai-stat-card">
                <span className="lcai-stat-number">{Object.keys(snapshot.progress.solved).length}</span>
                <span className="lcai-stat-label">Problems Solved</span>
              </div>
              <div className="lcai-stat-card">
                <span className="lcai-stat-number">
                  {Object.values(snapshot.progress.featureUsageCount).reduce((a, b) => a + b, 0)}
                </span>
                <span className="lcai-stat-label">AI Features Used</span>
              </div>
            </div>
            <h4>Most Used Features</h4>
            <pre>
              {Object.entries(snapshot.progress.featureUsageCount)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([feature, count]) => `${feature}: ${count}`)
                .join('\n') || 'No usage data yet.'}
            </pre>
            <h4>Weak Areas</h4>
            <div className="lcai-tags">
              {weakAreas.length
                ? weakAreas.map((item) => <span key={item.concept}>{item.concept} ({item.score})</span>)
                : <span>No weak areas identified yet. Solve more problems!</span>}
            </div>
          </>
        );

      case 'chat':
        return (
          <>
            <div className="lcai-chat-box">
              {snapshot.chat.length === 0 ? (
                <div className="lcai-chat-empty">
                  <span>💬</span>
                  <p>Ask anything about this problem! I have full context of the problem, constraints, and your code.</p>
                  <div className="lcai-chat-suggestions">
                    <button type="button" onClick={() => { setChatInput('What is the optimal approach for this problem?'); }}>Optimal approach?</button>
                    <button type="button" onClick={() => { setChatInput('What edge cases should I consider?'); }}>Edge cases?</button>
                    <button type="button" onClick={() => { setChatInput('Can you explain the time complexity?'); }}>Time complexity?</button>
                  </div>
                </div>
              ) : null}
              {snapshot.chat.map((message) => (
                <div key={message.id} className={`lcai-chat-message ${message.role}`}>
                  <strong>{message.role === 'user' ? 'You' : 'AI'}:</strong>
                  <p>{message.content}</p>
                </div>
              ))}
            </div>
            <div className="lcai-chat-controls">
              <input
                value={chatInput}
                onChange={(event) => setChatInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    void sendChat();
                  }
                }}
                placeholder="Ask about approach, optimization, or alternatives..."
              />
              <button type="button" onClick={() => void sendChat()} disabled={Boolean(snapshot.loading.chat)}>
                {snapshot.loading.chat ? '...' : '→'}
              </button>
            </div>
          </>
        );

      default:
        return <p>Select a feature from the menu.</p>;
    }
  };

  /* ─── Render ─── */
  return (
    <div className="lcai-panel-shell">
      {/* ── Top Bar ── */}
      <div className="lcai-topbar">
        <div className="lcai-topbar-info">
          <h2>{snapshot.problem.title}</h2>
          <p>{snapshot.problem.slug}</p>
        </div>
        <div className="lcai-topbar-controls">
          <select
            value={selectedLanguage}
            onChange={(event) => {
              const language = event.target.value as LanguageOption;
              setSelectedLanguage(language);
              void persistSettings({ defaultLanguage: language });
            }}
          >
            {Object.entries(LANGUAGE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <label className="lcai-inline-toggle">
            <input
              type="checkbox"
              checked={snapshot.settings.interviewModeByDefault}
              onChange={(event) => void persistSettings({ interviewModeByDefault: event.target.checked })}
            />
            Interview Mode
          </label>
        </div>
      </div>

      {/* ── Alerts ── */}
      {!snapshot.settings.openRouterApiKey.trim() ? (
        <div className="lcai-alert">
          ⚠️ Add your OpenRouter API key in the popup settings to use AI features.
        </div>
      ) : null}

      {snapshot.error ? (
        <div className="lcai-alert lcai-alert-error">
          <div className="lcai-error-content">
            <span>{snapshot.error}</span>
            <button type="button" onClick={() => assistantStore.setState({ error: '' })}>
              Dismiss
            </button>
          </div>
        </div>
      ) : null}

      {/* ── Main Content ── */}
      {activeView === null ? (
        /* ─── HOME: Feature Grid ─── */
        <div className="lcai-home">
          <p className="lcai-home-subtitle">⚡ Select a tool — AI loads only when you need it</p>
          <div className="lcai-feature-grid">
            {FEATURES.map((feature) => (
              <button
                key={feature.id}
                className="lcai-feature-tile"
                onClick={() => setActiveView(feature.id)}
                style={{ '--tile-accent': feature.color } as React.CSSProperties}
              >
                <span className="lcai-tile-icon">{feature.icon}</span>
                <span className="lcai-tile-label">{feature.label}</span>
                <span className="lcai-tile-desc">{feature.desc}</span>
                {snapshot.featureCache[feature.id as keyof FeatureCache] ? (
                  <span className="lcai-tile-cached">✓</span>
                ) : null}
              </button>
            ))}
          </div>
        </div>
      ) : (
        /* ─── FEATURE VIEW ─── */
        <div className="lcai-view">
          <div className="lcai-view-nav">
            <button className="lcai-back-btn" type="button" onClick={() => setActiveView(null)}>
              ←
            </button>
            <span className="lcai-view-icon" style={{ '--tile-accent': currentFeature?.color } as React.CSSProperties}>
              {currentFeature?.icon}
            </span>
            <div className="lcai-view-title">
              <h3>{currentFeature?.label}</h3>
              <p>{currentFeature?.desc}</p>
            </div>
          </div>
          <div className="lcai-view-body">
            {renderFeatureContent()}
          </div>
        </div>
      )}
    </div>
  );
};
