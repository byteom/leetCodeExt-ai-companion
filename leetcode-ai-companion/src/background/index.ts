import { getCachedValue, setCachedValue } from './cacheStore';
import { runOpenRouterCompletion } from './openRouterService';
import { DEFAULT_SETTINGS, EMPTY_PROGRESS } from '../utils/constants';
import { loadNotes, loadProgress, loadSettings, saveNotes, saveProgress, saveSettings } from '../services/storage';
import type { RuntimeRequestMap, RuntimeResponseMap } from '../utils/types';

const inFlight = new Map<string, Promise<string>>();

const runAiTask = async (payload: RuntimeRequestMap['AI_TASK']): Promise<RuntimeResponseMap['AI_TASK']> => {
  try {
    const settings = await loadSettings();
    const apiKey = settings.openRouterApiKey.trim();

    if (!apiKey) {
      return {
        ok: false,
        error: 'Missing OpenRouter API key. Configure it in extension settings.',
      };
    }

    const cached = await getCachedValue(payload.cacheKey);
    if (cached) {
      return {
        ok: true,
        content: cached,
        cached: true,
      };
    }

    const existing = inFlight.get(payload.cacheKey);
    if (existing) {
      const content = await existing;
      return {
        ok: true,
        content,
        cached: true,
      };
    }

    const requestPromise = runOpenRouterCompletion({
      apiKey,
      model: payload.model,
      temperature: payload.temperature,
      messages: [
        { role: 'system', content: payload.systemPrompt },
        { role: 'user', content: payload.userPrompt },
      ],
    });

    inFlight.set(payload.cacheKey, requestPromise);

    const content = await requestPromise;
    await setCachedValue(payload.cacheKey, content, payload.ttlMs);

    return {
      ok: true,
      content,
      cached: false,
    };
  } catch (error) {
    return {
      ok: false,
      error: (error as Error).message || 'Unknown AI request error',
    };
  } finally {
    inFlight.delete(payload.cacheKey);
  }
};

export const initBackgroundHandlers = (): void => {
  browser.runtime.onMessage.addListener((
    message: { type: keyof RuntimeRequestMap; payload: unknown },
    _sender,
    sendResponse,
  ) => {
    const { type, payload } = message;

    const handleMessage = async () => {
      switch (type) {
        case 'AI_TASK':
          return runAiTask(payload as RuntimeRequestMap['AI_TASK']);
        case 'GET_SETTINGS':
          return loadSettings().then((settings) => ({ ...DEFAULT_SETTINGS, ...settings }));
        case 'SAVE_SETTINGS':
          return saveSettings(payload as RuntimeRequestMap['SAVE_SETTINGS']).then(() => ({ ok: true as const }));
        case 'GET_PROGRESS':
          return loadProgress().then((progress) => ({ ...EMPTY_PROGRESS, ...progress }));
        case 'SAVE_PROGRESS':
          return saveProgress(payload as RuntimeRequestMap['SAVE_PROGRESS']).then(() => ({ ok: true as const }));
        case 'GET_NOTE':
          return loadNotes().then((notes) => ({ note: notes[(payload as RuntimeRequestMap['GET_NOTE']).slug] ?? '' }));
        case 'SAVE_NOTE':
          return loadNotes().then(async (notes) => {
            const input = payload as RuntimeRequestMap['SAVE_NOTE'];
            notes[input.slug] = input.note;
            await saveNotes(notes);
            return { ok: true as const };
          });
        default:
          return { ok: false, error: 'Unknown message type' };
      }
    };

    void handleMessage()
      .then((response) => sendResponse(response))
      .catch((error: Error) => sendResponse({ ok: false, error: error.message || 'Unknown background error' }));

    return true;
  });
};
