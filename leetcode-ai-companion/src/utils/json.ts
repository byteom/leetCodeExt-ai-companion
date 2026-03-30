export const safeJsonParse = <T>(value: string, fallback: T): T => {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

export const cleanCodeFence = (value: string): string =>
  value.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();