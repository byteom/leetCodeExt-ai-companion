import React from 'react';
import ReactDOM from 'react-dom/client';
import { AssistantRoot } from '../components/AssistantRoot';
import assistantCss from '../styles/assistant.css?inline';

const hostId = 'lc-ai-companion-host';
const containerId = 'lc-ai-companion-container';
const styleId = 'lc-ai-companion-style';
const sheetMarker = 'lc-ai-companion-sheet';

let cachedStyleSheet: CSSStyleSheet | null = null;

const getConstructableSheet = () => {
  if (typeof CSSStyleSheet === 'undefined' || typeof CSSStyleSheet.prototype.replaceSync !== 'function') {
    return null;
  }

  if (!cachedStyleSheet) {
    cachedStyleSheet = new CSSStyleSheet();
    cachedStyleSheet.replaceSync(assistantCss);
  }

  return cachedStyleSheet;
};

const mount = () => {
  let host = document.getElementById(hostId);
  if (!host) {
    host = document.createElement('div');
    host.id = hostId;
    document.body.appendChild(host);
  }

  const shadow = host.shadowRoot ?? host.attachShadow({ mode: 'open' });

  let container = shadow.getElementById(containerId);
  if (!container) {
    container = document.createElement('div');
    container.id = containerId;
    shadow.appendChild(container);
  }

  let style = shadow.getElementById(styleId) as HTMLStyleElement | null;
  const constructableSheet = getConstructableSheet();

  if (constructableSheet) {
    const alreadyAdopted = shadow.adoptedStyleSheets.some((sheet) => (sheet as CSSStyleSheet & { __lcAiMarker?: string }).__lcAiMarker === sheetMarker);
    if (!alreadyAdopted) {
      (constructableSheet as CSSStyleSheet & { __lcAiMarker?: string }).__lcAiMarker = sheetMarker;
      shadow.adoptedStyleSheets = [...shadow.adoptedStyleSheets, constructableSheet];
    }
  } else if (!style) {
    style = document.createElement('style');
    style.id = styleId;
    style.textContent = assistantCss;
    shadow.appendChild(style);
  }

  ReactDOM.createRoot(container).render(
    <React.StrictMode>
      <AssistantRoot />
    </React.StrictMode>,
  );
};

export const bootstrapContentApp = () => {
  mount();
};
