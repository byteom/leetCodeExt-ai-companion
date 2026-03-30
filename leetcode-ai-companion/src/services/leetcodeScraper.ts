import { LC_PROBLEM_MATCH } from '../utils/constants';
import { normalizeLanguage } from '../utils/language';
import type { ExampleBlock, LanguageOption, ProblemData } from '../utils/types';

const DESCRIPTION_SELECTOR = [
  '[data-track-load="description_content"]',
  '[data-cy="question-content"]',
  '[class*="question-content"]',
  'article',
].join(',');

const TITLE_SELECTOR = [
  '[data-cy="question-title"]',
  'div[class*="text-title-large"]',
  'h1',
].join(',');

const CODE_SOURCE = 'LC_AI_COMPANION_PAGE_BRIDGE';

type EditorListener = (payload: { code: string; language: string }) => void;

let bridgeInitialized = false;
let latestEditorCode = '';
let latestEditorLanguage = '';
let bridgePollId: number | null = null;
const listeners = new Set<EditorListener>();

const normalizeExtractedText = (value: string): string =>
  value
    .replace(/\u00a0/g, ' ')
    .replace(/\r/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const readNodeText = (node: Element | null): string => normalizeExtractedText(node?.textContent ?? '');

const findSectionHeading = (root: Element, pattern: RegExp): HTMLElement | null => {
  const nodes = Array.from(root.querySelectorAll('h1, h2, h3, h4, strong, b, p'));
  return (nodes.find((node) => pattern.test(readNodeText(node))) as HTMLElement | undefined) ?? null;
};

const collectSectionFromHeading = (heading: HTMLElement): string => {
  const chunks: string[] = [];
  let current = heading.nextElementSibling;

  while (current) {
    const text = readNodeText(current);
    if (/^(Example\s+\d+|Constraints|Follow[- ]?up|Hint|Related Topics)\s*:?\s*$/i.test(text)) {
      break;
    }

    if (text) {
      chunks.push(text);
    }

    current = current.nextElementSibling;
  }

  return normalizeExtractedText(chunks.join('\n\n'));
};

const parseExamples = (descriptionText: string): ExampleBlock[] => {
  const examples: ExampleBlock[] = [];
  const regex = /(Example\s+\d+\s*:\s*[\s\S]*?)(?=\n\s*Example\s+\d+\s*:|\n\s*Constraints\s*:|$)/gi;

  for (const match of descriptionText.matchAll(regex)) {
    const content = match[1]?.trim();
    if (!content) {
      continue;
    }

    const titleMatch = content.match(/^Example\s+\d+/i);
    examples.push({
      title: titleMatch?.[0] ?? 'Example',
      content,
    });
  }

  return examples;
};

const parseExamplesFromDom = (descriptionNode: Element | null): ExampleBlock[] => {
  if (!descriptionNode) {
    return [];
  }

  const examples: ExampleBlock[] = [];
  const headings = Array.from(descriptionNode.querySelectorAll('h1, h2, h3, h4, strong, b, p'));

  for (const heading of headings) {
    const title = readNodeText(heading);
    if (!/^Example\s+\d+\s*:?\s*$/i.test(title)) {
      continue;
    }

    const content = collectSectionFromHeading(heading as HTMLElement);
    examples.push({
      title: title.replace(/:\s*$/, ''),
      content: normalizeExtractedText([title.replace(/:\s*$/, ':'), content].filter(Boolean).join('\n')),
    });
  }

  return examples;
};

const extractConstraints = (descriptionText: string): string => {
  const regex = /Constraints\s*:\s*([\s\S]*?)(?=\n\s*(Follow[- ]?up|Hint|Related Topics|$))/i;
  const match = descriptionText.match(regex);
  return match?.[1]?.trim() ?? '';
};

const extractConstraintsFromDom = (descriptionNode: Element | null): string => {
  if (!descriptionNode) {
    return '';
  }

  const heading = findSectionHeading(descriptionNode, /^Constraints\s*:?\s*$/i);
  return heading ? collectSectionFromHeading(heading) : '';
};

const detectLanguageFromDom = (): string => {
  const languageButton = document.querySelector('[id*="headlessui-listbox-button"] span') as HTMLElement | null;
  const inlineLanguage = document.querySelector('[data-key="lang-select"]') as HTMLElement | null;

  return languageButton?.innerText?.trim() ?? inlineLanguage?.innerText?.trim() ?? latestEditorLanguage;
};

const collectCodeFromDom = (): string => {
  const textarea = document.querySelector('textarea[data-mode-id], textarea[class*="inputarea"]') as HTMLTextAreaElement | null;
  if (textarea?.value?.trim()) {
    return textarea.value;
  }

  const monacoLines = Array.from(document.querySelectorAll('.monaco-editor .view-lines .view-line'))
    .map((line) => (line as HTMLElement).innerText)
    .filter(Boolean);

  if (monacoLines.length > 0) {
    return monacoLines.join('\n');
  }

  const codemirror = document.querySelector('.cm-content') as HTMLElement | null;
  if (codemirror?.innerText?.trim()) {
    return codemirror.innerText;
  }

  return latestEditorCode;
};

const emitEditorSnapshot = (code: string, language: string): void => {
  latestEditorCode = code;
  latestEditorLanguage = language;

  for (const listener of listeners) {
    listener({ code, language });
  }
};

const pollEditorSnapshot = (): void => {
  const nextCode = collectCodeFromDom();
  const nextLanguage = detectLanguageFromDom();

  if (nextCode === latestEditorCode && nextLanguage === latestEditorLanguage) {
    return;
  }

  emitEditorSnapshot(nextCode, nextLanguage);
};

export const isLeetCodeProblemPage = (url: string = location.href): boolean => LC_PROBLEM_MATCH.test(url);

export const getProblemSlug = (url: string = location.href): string => {
  const match = url.match(/leetcode\.com\/problems\/([^/?#]+)/i);
  return match?.[1] ?? '';
};

export const initEditorBridge = (): void => {
  if (bridgeInitialized) {
    return;
  }

  bridgeInitialized = true;
  pollEditorSnapshot();
  bridgePollId = window.setInterval(() => {
    pollEditorSnapshot();
  }, 900);
};

export const subscribeEditorSnapshots = (listener: EditorListener): (() => void) => {
  listeners.add(listener);
  if (latestEditorCode) {
    listener({ code: latestEditorCode, language: latestEditorLanguage });
  }

  return () => {
    listeners.delete(listener);
  };
};

export const extractProblemData = (fallbackLanguage: LanguageOption = 'python'): ProblemData => {
  const slug = getProblemSlug(location.href);
  const titleNode = document.querySelector(TITLE_SELECTOR) as HTMLElement | null;
  const descriptionNode = document.querySelector(DESCRIPTION_SELECTOR) as HTMLElement | null;

  const title = titleNode?.innerText?.trim() || slug.replace(/-/g, ' ');
  const descriptionText = normalizeExtractedText(descriptionNode?.innerText ?? '');
  const constraints = extractConstraintsFromDom(descriptionNode) || extractConstraints(descriptionText);
  const examples = parseExamplesFromDom(descriptionNode);
  const fallbackExamples = examples.length > 0 ? examples : parseExamples(descriptionText);

  const rawLanguage = detectLanguageFromDom();
  const detectedLanguage = normalizeLanguage(rawLanguage, fallbackLanguage);

  const editorCode = collectCodeFromDom();

  return {
    slug,
    title,
    description: descriptionText,
    constraints,
    examples: fallbackExamples,
    editorCode,
    detectedLanguage,
    url: location.href,
  };
};
