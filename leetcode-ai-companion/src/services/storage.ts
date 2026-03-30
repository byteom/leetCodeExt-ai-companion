import { DEFAULT_SETTINGS, EMPTY_PROGRESS, STORAGE_KEYS } from '../utils/constants';
import type { AssistantSettings, ProgressState } from '../utils/types';

export const loadSettings = async (): Promise<AssistantSettings> => {
  const saved = await browser.storage.sync.get(STORAGE_KEYS.settings);
  return {
    ...DEFAULT_SETTINGS,
    ...(saved[STORAGE_KEYS.settings] as Partial<AssistantSettings> | undefined),
  };
};

export const saveSettings = async (settings: AssistantSettings): Promise<void> => {
  await browser.storage.sync.set({
    [STORAGE_KEYS.settings]: settings,
  });
};

export const loadProgress = async (): Promise<ProgressState> => {
  const saved = await browser.storage.local.get(STORAGE_KEYS.progress);
  return {
    ...EMPTY_PROGRESS,
    ...(saved[STORAGE_KEYS.progress] as Partial<ProgressState> | undefined),
  };
};

export const saveProgress = async (state: ProgressState): Promise<void> => {
  await browser.storage.local.set({ [STORAGE_KEYS.progress]: state });
};

export const loadNotes = async (): Promise<Record<string, string>> => {
  const saved = await browser.storage.local.get(STORAGE_KEYS.notes);
  return (saved[STORAGE_KEYS.notes] as Record<string, string> | undefined) ?? {};
};

export const saveNotes = async (notes: Record<string, string>): Promise<void> => {
  await browser.storage.local.set({ [STORAGE_KEYS.notes]: notes });
};