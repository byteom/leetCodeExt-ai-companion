import type { LanguageOption } from './types';

const map: Array<{ pattern: RegExp; language: LanguageOption }> = [
  { pattern: /python|py/i, language: 'python' },
  { pattern: /javascript|typescript|js/i, language: 'javascript' },
  { pattern: /java/i, language: 'java' },
  { pattern: /c\+\+|cpp|clang/i, language: 'cpp' },
];

export const normalizeLanguage = (input: string | undefined, fallback: LanguageOption): LanguageOption => {
  if (!input) {
    return fallback;
  }

  const hit = map.find((entry) => entry.pattern.test(input));
  return hit?.language ?? fallback;
};