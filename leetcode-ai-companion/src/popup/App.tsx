import { useEffect, useMemo, useState } from 'react';
import { DEFAULT_MODEL_LIST, LANGUAGE_LABELS } from '../utils/constants';
import type { AssistantSettings, LanguageOption } from '../utils/types';
import { sendRuntimeMessage } from '../services/runtime';
import '../styles/popup.css';

const clampTemperature = (value: number): number => Math.max(0, Math.min(1, value));

const SettingsApp = () => {
  const [settings, setSettings] = useState<AssistantSettings | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    void sendRuntimeMessage('GET_SETTINGS', undefined)
      .then((data) => {
        if (active) {
          setSettings(data);
        }
      })
      .catch((err: Error) => {
        if (active) {
          setError(err.message);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const effectiveModel = useMemo(() => {
    if (!settings) {
      return '';
    }

    return settings.customModel.trim() || settings.model;
  }, [settings]);

  const save = async () => {
    if (!settings) {
      return;
    }

    try {
      setSaved(false);
      setError('');
      await sendRuntimeMessage('SAVE_SETTINGS', settings);
      setSaved(true);
      window.setTimeout(() => {
        setSaved(false);
        window.close();
      }, 350);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  if (!settings && error) {
    return (
      <main className="popup-shell">
        <header>
          <h1>LeetCode AI Companion</h1>
          <p>Popup failed to load settings</p>
        </header>

        <p className="popup-error">{error}</p>
        <button type="button" onClick={() => window.location.reload()}>
          Retry
        </button>
      </main>
    );
  }

  if (!settings) {
    return <main className="popup-shell">Loading settings...</main>;
  }

  return (
    <main className="popup-shell">
      <header>
        <h1>LeetCode AI Companion</h1>
        <p>OpenRouter configuration and defaults</p>
      </header>

      <label>
        OpenRouter API Key
        <input
          type="password"
          value={settings.openRouterApiKey}
          onChange={(event) => setSettings({ ...settings, openRouterApiKey: event.target.value })}
          placeholder="sk-or-v1-..."
        />
      </label>

      <label>
        Model
        <select value={settings.model} onChange={(event) => setSettings({ ...settings, model: event.target.value })}>
          {DEFAULT_MODEL_LIST.map((model) => (
            <option key={model} value={model}>
              {model}
            </option>
          ))}
        </select>
      </label>

      <label>
        Custom Model (optional override)
        <input
          type="text"
          value={settings.customModel}
          onChange={(event) => setSettings({ ...settings, customModel: event.target.value })}
          placeholder="provider/model"
        />
      </label>

      <label>
        Temperature ({settings.temperature.toFixed(2)})
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={settings.temperature}
          onChange={(event) =>
            setSettings({
              ...settings,
              temperature: clampTemperature(Number(event.target.value)),
            })
          }
        />
      </label>

      <label>
        Default Language
        <select
          value={settings.defaultLanguage}
          onChange={(event) =>
            setSettings({
              ...settings,
              defaultLanguage: event.target.value as LanguageOption,
            })
          }
        >
          {Object.entries(LANGUAGE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <label className="popup-toggle">
        <input
          type="checkbox"
          checked={settings.darkMode}
          onChange={(event) => setSettings({ ...settings, darkMode: event.target.checked })}
        />
        Dark Mode
      </label>

      <label className="popup-toggle">
        <input
          type="checkbox"
          checked={settings.interviewModeByDefault}
          onChange={(event) => setSettings({ ...settings, interviewModeByDefault: event.target.checked })}
        />
        Interview Mode by Default
      </label>

      <button type="button" onClick={() => void save()}>
        Save Settings
      </button>

      {saved ? <p className="popup-success">Saved.</p> : null}
      {error ? <p className="popup-error">{error}</p> : null}

      <footer>
        <small>Effective model: {effectiveModel || 'n/a'}</small>
      </footer>
    </main>
  );
};

export default SettingsApp;
