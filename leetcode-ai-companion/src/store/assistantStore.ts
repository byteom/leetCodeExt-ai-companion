import { DEFAULT_SETTINGS, EMPTY_PROGRESS } from '../utils/constants';
import type { AssistantSettings, ChatMessage, CorePack, FeatureCache, ProblemData, ProgressState } from '../utils/types';

export interface AssistantState {
  mounted: boolean;
  panelOpen: boolean;
  loading: Record<string, boolean>;
  featureErrors: Record<string, string>;
  error: string;
  problem: ProblemData | null;
  settings: AssistantSettings;
  corePack: CorePack | null;
  featureCache: FeatureCache;
  chat: ChatMessage[];
  revisionNote: string;
  progress: ProgressState;
  hintLevelShown: number;
  revealUsed: boolean;
  acceptedDetected: boolean;
}

const defaultState: AssistantState = {
  mounted: false,
  panelOpen: false,
  loading: {},
  featureErrors: {},
  error: '',
  problem: null,
  settings: DEFAULT_SETTINGS,
  corePack: null,
  featureCache: {},
  chat: [],
  revisionNote: '',
  progress: EMPTY_PROGRESS,
  hintLevelShown: 0,
  revealUsed: false,
  acceptedDetected: false,
};

type Listener = () => void;

class Store {
  private state: AssistantState = defaultState;

  private listeners = new Set<Listener>();

  public getState = (): AssistantState => this.state;

  public setState = (patch: Partial<AssistantState>): void => {
    this.state = { ...this.state, ...patch };
    for (const listener of this.listeners) {
      listener();
    }
  };

  public patchLoading = (key: string, value: boolean): void => {
    const loading = { ...this.state.loading, [key]: value };
    this.setState({ loading });
  };

  public patchFeatureCache = <K extends keyof FeatureCache>(key: K, value: FeatureCache[K]): void => {
    const featureCache = { ...this.state.featureCache, [key]: value };
    this.setState({ featureCache });
  };

  public patchFeatureError = (key: string, error: string): void => {
    const featureErrors = { ...this.state.featureErrors, [key]: error };
    this.setState({ featureErrors });
  };

  public clearFeatureCache = (): void => {
    this.setState({ featureCache: {}, featureErrors: {} });
  };

  public subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
}

export const assistantStore = new Store();