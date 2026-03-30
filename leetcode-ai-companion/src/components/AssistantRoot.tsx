import { useEffect, useState } from 'react';
import { useProblemSync } from '../hooks/useProblemSync';
import { useAssistantStore } from '../hooks/useAssistantStore';
import { assistantStore } from '../store/assistantStore';
import { AssistantPanel } from './AssistantPanel';
import { FloatingWidget } from './FloatingWidget';

export const AssistantRoot = () => {
  useProblemSync();
  const [mounted, setMounted] = useState(false);
  const panelOpen = useAssistantStore((state) => state.panelOpen);
  const problem = useAssistantStore((state) => state.problem);
  const settings = useAssistantStore((state) => state.settings);
  const darkMode = settings?.darkMode ?? true;

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) {
      return;
    }

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        assistantStore.setState({ panelOpen: false });
      }
    };

    document.addEventListener('keydown', onEscape);
    return () => document.removeEventListener('keydown', onEscape);
  }, [mounted]);

  const closePanel = () => {
    assistantStore.setState({ panelOpen: false });
  };

  if (!mounted || !problem) {
    return null;
  }

  return (
    <div className={`lcai-root ${darkMode ? 'dark' : 'light'}`}>
      <FloatingWidget open={panelOpen} onToggle={() => assistantStore.setState({ panelOpen: !panelOpen })} />
      {panelOpen ? (
        <aside className="lcai-panel" role="complementary" aria-label="LeetCode AI Assistant">
          <button type="button" className="lcai-panel-close" onClick={closePanel} title="Close panel" aria-label="Close panel">
            ×
          </button>
          <AssistantPanel />
        </aside>
      ) : null}
    </div>
  );
};
