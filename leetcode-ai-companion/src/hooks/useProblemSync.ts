import { useEffect } from 'react';
import { sendRuntimeMessage } from '../services/runtime';
import {
  extractProblemData,
  initEditorBridge,
  isLeetCodeProblemPage,
  subscribeEditorSnapshots,
} from '../services/leetcodeScraper';
import { assistantStore } from '../store/assistantStore';
import { STORAGE_KEYS } from '../utils/constants';
import { normalizeLanguage } from '../utils/language';
import type { AssistantSettings } from '../utils/types';

const detectAccepted = (): boolean => {
  const explicitResult = document.querySelector('[data-e2e-locator="submission-result"]') as HTMLElement | null;
  if (explicitResult?.innerText?.toLowerCase().includes('accepted')) {
    return true;
  }

  const successBanner = document.querySelector('[class*="text-green"]') as HTMLElement | null;
  if (successBanner?.innerText?.toLowerCase().includes('accepted')) {
    return true;
  }

  const panelText = document.querySelector('[data-e2e-locator="console-result"]')?.textContent ?? '';
  return panelText.toLowerCase().includes('all test cases passed');
};

export const useProblemSync = (): void => {
  useEffect(() => {
    let active = true;
    let previousSlug = '';
    let syncTimer: number | null = null;
    let syncing = false;
    let resyncRequested = false;
    let noteRequestId = 0;

    const applySettings = (settings: AssistantSettings): void => {
      assistantStore.setState({ settings });
      scheduleSnapshotSync();
    };

    const boot = async (): Promise<void> => {
      try {
        const [settings, progress] = await Promise.all([
          sendRuntimeMessage('GET_SETTINGS', undefined),
          sendRuntimeMessage('GET_PROGRESS', undefined),
        ]);

        if (!active) {
          return;
        }

        assistantStore.setState({ progress, mounted: true, panelOpen: false, error: '' });
        applySettings(settings);
      } catch (error) {
        assistantStore.setState({ error: (error as Error).message || 'Failed to load extension settings.' });
      }
    };

    const syncSnapshot = async (): Promise<void> => {
      if (!active) {
        return;
      }

      if (syncing) {
        resyncRequested = true;
        return;
      }

      syncing = true;

      try {
        if (!isLeetCodeProblemPage(location.href)) {
          previousSlug = '';
          assistantStore.setState({
            problem: null,
            corePack: null,
            acceptedDetected: false,
            panelOpen: false,
            error: 'Open a LeetCode problem page to use the assistant.',
          });
          return;
        }

        const current = assistantStore.getState();
        const problem = extractProblemData(current.settings.defaultLanguage);
        if (!problem.slug) {
          assistantStore.setState({
            problem: null,
            corePack: null,
            acceptedDetected: false,
            panelOpen: false,
            error: 'Unable to detect the current LeetCode problem yet.',
          });
          return;
        }

        const acceptedDetected = detectAccepted();
        const slugChanged = problem.slug !== previousSlug;

        assistantStore.setState({
          problem,
          acceptedDetected,
          error: '',
        });

        if (!slugChanged) {
          return;
        }

        previousSlug = problem.slug;
        assistantStore.setState({
          corePack: null,
          hintLevelShown: 0,
          revealUsed: false,
          chat: [],
          revisionNote: '',
        });

        const requestId = ++noteRequestId;
        const noteResponse = await sendRuntimeMessage('GET_NOTE', { slug: problem.slug });

        if (!active || requestId !== noteRequestId || assistantStore.getState().problem?.slug !== problem.slug) {
          return;
        }

        assistantStore.setState({ revisionNote: noteResponse.note });
      } catch (error) {
        if (active) {
          assistantStore.setState({ error: (error as Error).message || 'Failed to sync the current problem.' });
        }
      } finally {
        syncing = false;
        if (resyncRequested) {
          resyncRequested = false;
          void syncSnapshot();
        }
      }
    };

    const scheduleSnapshotSync = (): void => {
      if (!active || syncTimer !== null) {
        return;
      }

      syncTimer = window.setTimeout(() => {
        syncTimer = null;
        void syncSnapshot();
      }, 150);
    };

    initEditorBridge();

    const handleStorageChange = (
      changes: Record<string, { newValue?: unknown }>,
      areaName: string,
    ): void => {
      if (!active || areaName !== 'sync') {
        return;
      }

      const nextSettings = changes[STORAGE_KEYS.settings]?.newValue as AssistantSettings | undefined;
      if (!nextSettings) {
        return;
      }

      applySettings(nextSettings);
    };

    const unsubscribe = subscribeEditorSnapshots(({ code, language }) => {
      const state = assistantStore.getState();
      if (!state.problem) {
        return;
      }

      assistantStore.setState({
        problem: {
          ...state.problem,
          editorCode: code || state.problem.editorCode,
          detectedLanguage: normalizeLanguage(language, state.problem.detectedLanguage),
        },
      });
    });

    browser.storage.onChanged.addListener(handleStorageChange);

    void boot().then(() => syncSnapshot());

    const interval = window.setInterval(() => {
      scheduleSnapshotSync();
    }, 1800);

    const observer = new MutationObserver(() => {
      scheduleSnapshotSync();
    });

    observer.observe(document.body, { subtree: true, childList: true });

    return () => {
      active = false;
      if (syncTimer !== null) {
        window.clearTimeout(syncTimer);
      }
      unsubscribe();
      window.clearInterval(interval);
      observer.disconnect();
      browser.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);
};
