import { useSyncExternalStore } from 'react';
import { assistantStore, type AssistantState } from '../store/assistantStore';

export const useAssistantStore = <T>(selector: (state: AssistantState) => T): T => {
  return useSyncExternalStore(
    assistantStore.subscribe,
    () => selector(assistantStore.getState()),
    () => selector(assistantStore.getState()),
  );
};