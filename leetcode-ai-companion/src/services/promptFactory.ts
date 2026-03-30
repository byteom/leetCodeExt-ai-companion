import { CACHE_DEFAULT_TTL_MS } from '../utils/constants';
import { stableHash } from '../utils/hash';
import { cleanCodeFence, safeJsonParse } from '../utils/json';
import type {
  AiTaskInput,
  ApproachResult,
  CodeReviewResult,
  ComplexitySummary,
  ConceptsResult,
  FeatureKey,
  HintsResult,
  LanguageOption,
  MultiApproachSummary,
  OptimalSolutionPack,
  PatternResult,
  ProblemData,
  PseudocodeResult,
} from '../utils/types';

/* ─── Shared Context ─── */

export interface PromptContext {
  problem: ProblemData;
  language: LanguageOption;
  model: string;
  temperature: number;
  interviewMode: boolean;
}

const formatProblemContext = (problem: ProblemData): string => {
  const examples = problem.examples
    .map((example) => `${example.title}:\n${example.content}`)
    .join('\n\n');

  return [
    `Title: ${problem.title}`,
    `Slug: ${problem.slug}`,
    'Problem Description:',
    problem.description || '(Not found)',
    '',
    'Constraints:',
    problem.constraints || '(Not found)',
    '',
    'Examples:',
    examples || '(Not found)',
    '',
    'User Code:',
    problem.editorCode || '(No code in editor)',
  ].join('\n');
};

const makeCacheKey = (feature: string, ctx: PromptContext, extras: Record<string, unknown> = {}): string =>
  stableHash(
    JSON.stringify({
      feature,
      model: ctx.model,
      language: ctx.language,
      slug: ctx.problem.slug,
      code: ctx.problem.editorCode,
      description: ctx.problem.description,
      ...extras,
    }),
  );

const buildTask = (
  feature: FeatureKey,
  ctx: PromptContext,
  systemPrompt: string,
  userPrompt: string,
  extras: Record<string, unknown> = {},
): AiTaskInput => ({
  feature,
  systemPrompt,
  userPrompt,
  model: ctx.model,
  temperature: Math.min(ctx.temperature, 0.3),
  cacheKey: makeCacheKey(feature, ctx, extras),
  ttlMs: CACHE_DEFAULT_TTL_MS[feature],
});

/* ══════════════════════════════════════════
   PER-FEATURE PROMPT BUILDERS
   ══════════════════════════════════════════ */

/* ─── Hints ─── */
export const buildHintsTask = (ctx: PromptContext): AiTaskInput =>
  buildTask(
    'hints',
    ctx,
    'You are a senior algorithms coach. Return strict JSON only. No markdown wrappers.',
    `Analyze this LeetCode problem and generate 3 progressive hints.

Return JSON: {"level1": string, "level2": string, "level3": string}

Rules:
- Level 1: High-level direction only. What type of problem is this? What data structure category?
- Level 2: More specific. Name the exact algorithm/pattern. Give a key observation about the problem.
- Level 3: Step-by-step approach without giving full code. Include specific variable/state suggestions.
${ctx.interviewMode ? '- Interview Mode: Be more cryptic in hints. Guide thinking, don\'t give answers.' : ''}

Problem context:
${formatProblemContext(ctx.problem)}`,
  );

/* ─── Approach Explainer ─── */
export const buildApproachTask = (ctx: PromptContext): AiTaskInput =>
  buildTask(
    'approach',
    ctx,
    'You are an expert coding interview coach. Return strict JSON only.',
    `Explain the approach to solve this problem at two levels.

Return JSON: {"beginner": string, "advanced": string}

Rules:
- beginner: Explain like teaching a student. Use simple language, analogies, step-by-step logic. Cover WHY this approach works.
- advanced: Concise, assumes DSA knowledge. Focus on optimizations, edge cases, alternative approaches, and trade-offs.
- Both should reference the specific problem, not be generic.
- Include time/space complexity reasoning in each.

Problem context:
${formatProblemContext(ctx.problem)}`,
  );

/* ─── Complexity Analyzer ─── */
export const buildComplexityTask = (ctx: PromptContext): AiTaskInput =>
  buildTask(
    'complexity',
    ctx,
    'You are a complexity analysis expert. Return strict JSON only.',
    `Analyze the time and space complexity of this problem and the user's code.

Return JSON:
{
  "optimalTime": string,
  "optimalSpace": string,
  "userTime": string,
  "userSpace": string,
  "explanation": string
}

Rules:
- optimalTime/Space: The best known complexity for this problem.
- userTime/Space: Analyze the user's actual code. If no code, say "No code provided".
- explanation: Detailed breakdown. Walk through loops, recursion, data structures used. Explain WHY each complexity is what it is.
- Compare user's complexity vs optimal. Suggest how to improve if suboptimal.

Problem context:
${formatProblemContext(ctx.problem)}`,
  );

/* ─── Pseudocode Generator ─── */
export const buildPseudocodeTask = (ctx: PromptContext): AiTaskInput =>
  buildTask(
    'pseudocode',
    ctx,
    'You are a pseudocode generation expert. Return strict JSON only.',
    `Generate pseudocode at 3 verbosity levels for the optimal solution.

Return JSON: {"low": string, "medium": string, "high": string}

Rules:
- low: 3-5 lines max. Only the core logic flow. Like a recipe title.
- medium: 8-15 lines. Include edge case handling, loop structures, key variable names. Like a recipe with ingredients.
- high: 20-30 lines. Almost line-by-line. Include comments, variable initialization, return values. Like a detailed cooking guide.
- Use language-agnostic pseudocode but lean toward ${ctx.language} conventions.
- Each level should be self-contained and readable independently.

Problem context:
${formatProblemContext(ctx.problem)}`,
  );

/* ─── Concept Linker ─── */
export const buildConceptsTask = (ctx: PromptContext): AiTaskInput =>
  buildTask(
    'concepts',
    ctx,
    'You are a DSA pattern recognition expert. Return strict JSON only.',
    `Identify the core DSA concepts, patterns, and techniques used in this problem.

Return JSON:
{
  "concepts": ["concept1", "concept2", ...],
  "explanations": {"concept1": "why it's relevant", "concept2": "why it's relevant", ...}
}

Rules:
- List 3-6 core concepts (e.g., "Sliding Window", "Hash Map", "Two Pointers", "Dynamic Programming").
- Each explanation should be 1-2 sentences explaining why THIS problem uses that concept.
- Be specific to the problem, not generic definitions.
- Order from most important to least.

Problem context:
${formatProblemContext(ctx.problem)}`,
  );

/* ─── Code Review Engine ─── */
export const buildCodeReviewTask = (ctx: PromptContext): AiTaskInput =>
  buildTask(
    'codeReview',
    ctx,
    'You are a senior code reviewer specializing in competitive programming. Return strict JSON only.',
    `Perform a comprehensive code review of the user's solution.

Return JSON:
{
  "correctness": string,
  "performance": string,
  "style": string,
  "edgeCases": string,
  "overall": string,
  "score": number
}

Rules:
- correctness: Does the code solve the problem correctly? Identify any logic bugs.
- performance: Is it optimal? What are the bottlenecks? How to improve?
- style: Code quality, readability, naming conventions, idiomatic ${ctx.language} patterns.
- edgeCases: List specific edge cases and whether the code handles them (empty input, single element, max constraints, negative numbers, etc).
- overall: 2-3 sentence summary with actionable improvement suggestions.
- score: 1-10 quality score (10 = perfect, production-ready solution).
- If no user code is present, provide general guidance for this problem type.

Problem context:
${formatProblemContext(ctx.problem)}`,
  );

/* ─── Reveal Optimal Solution ─── */
export const buildRevealTask = (ctx: PromptContext): AiTaskInput =>
  buildTask(
    'reveal',
    ctx,
    'You are a coding interview preparation expert. Return strict JSON only.',
    `Provide the optimal solution with detailed explanation and code in multiple languages.

Return JSON:
{
  "explanation": string,
  "codeByLanguage": {
    "python": string,
    "javascript": string,
    "java": string,
    "cpp": string
  }
}

Rules:
- explanation: Start with the key insight. Then explain the algorithm step by step. Include why this is optimal.
- Code must be clean, well-commented, production-quality.
- Code must handle all edge cases.
- Each language implementation should be idiomatic (pythonic Python, modern JS, etc).
- Include complexity analysis at the end of explanation.

Problem context:
${formatProblemContext(ctx.problem)}`,
  );

/* ─── Multiple Approaches ─── */
export const buildMultiApproachTask = (ctx: PromptContext): AiTaskInput =>
  buildTask(
    'multiApproach',
    ctx,
    'You are an algorithms expert who teaches problem-solving progressively. Return strict JSON only.',
    `Generate 3 different approaches to solve this problem, from brute force to optimal.

Return JSON:
{
  "bruteForce": string,
  "better": string,
  "optimal": string
}

Rules:
- bruteForce: The simplest, most intuitive approach. Include pseudocode, time/space complexity, and why it's suboptimal.
- better: An improved approach. Explain what optimization technique is applied and why it helps.
- optimal: The best known approach. Full explanation with complexity proof.
- Each approach should include: (1) Idea in 1 sentence, (2) Algorithm steps, (3) Time/Space complexity, (4) ${ctx.language} code snippet.
- Show the progression of thinking from brute force to optimal.

Problem context:
${formatProblemContext(ctx.problem)}`,
  );

/* ─── Pattern Recognition ─── */
export const buildPatternTask = (ctx: PromptContext): AiTaskInput =>
  buildTask(
    'pattern',
    ctx,
    'You are a LeetCode pattern matching expert. Return strict JSON only.',
    `Identify the algorithmic pattern and find 5 similar LeetCode problems.

Return JSON:
{
  "patternName": string,
  "patternDescription": string,
  "problems": [
    {"title": string, "slug": string, "reason": string}
  ]
}

Rules:
- patternName: The main algorithmic pattern (e.g., "Sliding Window", "BFS/DFS", "Binary Search on Answer").
- patternDescription: 2-3 sentences about how this pattern works and when to use it.
- problems: Exactly 5 similar LeetCode problems. Must be real LeetCode problems with correct slugs.
- reason: Brief explanation of similarity (shared technique, similar structure, etc).
- Order by similarity (most similar first).

Problem context:
${formatProblemContext(ctx.problem)}`,
  );

/* ─── Debug Helper ─── */
export const buildDebugTask = (ctx: PromptContext, code: string): AiTaskInput =>
  buildTask(
    'debug',
    ctx,
    [
      'You are a world-class debugging assistant for competitive programming.',
      'Provide precise, actionable bug fixes.',
      ctx.interviewMode ? 'In interview mode, give hints about the bug before the fix.' : '',
    ].filter(Boolean).join(' '),
    `Debug this code thoroughly.

Provide your analysis in this structured format:
1. **Bug Summary**: One-line description of what's wrong
2. **Root Cause**: Detailed explanation of WHY the bug exists
3. **Bug Location**: Exact line(s) with the issue
4. **Fix**: Corrected code with explanation
5. **Edge Cases**: List cases that would trigger this bug
6. **Prevention Tips**: How to avoid this class of bugs in the future

Code to debug:
\`\`\`
${code}
\`\`\`

Problem context:
${formatProblemContext(ctx.problem)}

Metadata: ${JSON.stringify({ language: ctx.language })}`,
    { targetCode: code },
  );

/* ─── Test Case Generator ─── */
export const buildTestCaseTask = (ctx: PromptContext, customInput: string): AiTaskInput =>
  buildTask(
    'testCases',
    ctx,
    'You are a QA engineer specializing in algorithm testing. Provide comprehensive test cases.',
    `Generate thorough test cases for this problem.

Provide in this format:
1. **Basic Cases** (2-3): Simple cases to verify basic logic
2. **Edge Cases** (3-4): Empty input, single element, minimum/maximum constraints
3. **Boundary Cases** (2-3): Values at constraint boundaries
4. **Adversarial Cases** (2-3): Inputs designed to break common implementations
5. **Performance Cases** (1-2): Large inputs near max constraints

For each test case provide:
- Input
- Expected Output
- Why this case matters (what it tests)

${customInput ? `User's custom scenario to include: ${customInput}` : ''}

Problem context:
${formatProblemContext(ctx.problem)}

Metadata: ${JSON.stringify({ language: ctx.language, customInput })}`,
    { customInput },
  );

/* ─── Dry Run Visualizer ─── */
export const buildDryRunTask = (ctx: PromptContext, code: string, runInput: string): AiTaskInput =>
  buildTask(
    'dryRun',
    ctx,
    'You are an algorithm visualization expert. Create precise, educational step-by-step traces.',
    `Create a detailed dry-run trace for this code with the given input.

Format as a step-by-step execution trace:
1. **Initial State**: All variables and their starting values
2. **Step-by-Step**: For each iteration/recursive call, show:
   - Current line being executed
   - All variable states (use a compact table format)
   - Key decisions (if/else branch taken, loop condition)
   - Data structure state (array contents, map entries, stack/queue)
3. **Final State**: Return value and explanation

Use this format for each step:
Step N: [line description]
  ├─ variables: {var1: val1, var2: val2}
  ├─ action: [what happened]
  └─ state: [current data structure state]

Code:
\`\`\`
${code}
\`\`\`

Input: ${runInput || '(Use the first example from the problem)'}

Problem context:
${formatProblemContext(ctx.problem)}

Metadata: ${JSON.stringify({ language: ctx.language, code, runInput })}`,
    { code, runInput },
  );

/* ─── AI Chat ─── */
export const buildChatTask = (ctx: PromptContext, history: string, message: string): AiTaskInput => {
  const feature: FeatureKey = ctx.interviewMode ? 'interview' : 'chat';

  return buildTask(
    feature,
    ctx,
    [
      'You are an expert DSA tutor and coding interview coach.',
      'You have full context of the problem the user is working on.',
      'Be concise, accurate, and directly helpful.',
      'Use code examples in ' + ctx.language + ' when relevant.',
      ctx.interviewMode ? 'INTERVIEW MODE: Guide the user through Socratic questioning. Never give direct solutions. Ask leading questions instead.' : '',
    ].filter(Boolean).join(' '),
    `Conversation history:\n${history}\n\nUser message: ${message}\n\nRespond contextually. If the user asks about approach, compare with optimal. If about bugs, analyze their code. If about concepts, explain with examples.\n\nProblem context:\n${formatProblemContext(ctx.problem)}`,
    { message, historyLength: history.length },
  );
};

/* ─── JSON Parsers ─── */

export const parseJsonResponse = <T>(raw: string, fallback: T): T => {
  const cleaned = cleanCodeFence(raw);
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return safeJsonParse<T>(cleaned.slice(firstBrace, lastBrace + 1), fallback);
  }
  // Try array
  const firstBracket = cleaned.indexOf('[');
  const lastBracket = cleaned.lastIndexOf(']');
  if (firstBracket >= 0 && lastBracket > firstBracket) {
    return safeJsonParse<T>(cleaned.slice(firstBracket, lastBracket + 1), fallback);
  }
  return fallback;
};

export const parseHints = (raw: string): HintsResult | null => parseJsonResponse<HintsResult | null>(raw, null);
export const parseApproach = (raw: string): ApproachResult | null => parseJsonResponse<ApproachResult | null>(raw, null);
export const parseComplexity = (raw: string): ComplexitySummary | null => parseJsonResponse<ComplexitySummary | null>(raw, null);
export const parsePseudocode = (raw: string): PseudocodeResult | null => parseJsonResponse<PseudocodeResult | null>(raw, null);
export const parseConcepts = (raw: string): ConceptsResult | null => parseJsonResponse<ConceptsResult | null>(raw, null);
export const parseCodeReview = (raw: string): CodeReviewResult | null => parseJsonResponse<CodeReviewResult | null>(raw, null);
export const parseReveal = (raw: string): OptimalSolutionPack | null => parseJsonResponse<OptimalSolutionPack | null>(raw, null);
export const parseMultiApproach = (raw: string): MultiApproachSummary | null => parseJsonResponse<MultiApproachSummary | null>(raw, null);
export const parsePattern = (raw: string): PatternResult | null => parseJsonResponse<PatternResult | null>(raw, null);

/* ─── Legacy CorePack (kept for backward compat) ─── */
export const parseCorePack = (raw: string): import('../utils/types').CorePack | null => {
  const cleaned = cleanCodeFence(raw);
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  const candidate =
    firstBrace >= 0 && lastBrace > firstBrace
      ? cleaned.slice(firstBrace, lastBrace + 1)
      : cleaned;
  return safeJsonParse<import('../utils/types').CorePack | null>(candidate, null);
};
