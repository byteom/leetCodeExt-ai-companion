import { STORAGE_KEYS } from '../utils/constants';

export interface CacheEntry {
  content: string;
  expiresAt: number;
  updatedAt: number;
}

type CacheMap = Record<string, CacheEntry>;

let memoryCache: CacheMap | null = null;

const loadCacheMap = async (): Promise<CacheMap> => {
  if (memoryCache) {
    return memoryCache;
  }

  const stored = await browser.storage.local.get(STORAGE_KEYS.cache);
  memoryCache = (stored[STORAGE_KEYS.cache] as CacheMap | undefined) ?? {};
  return memoryCache;
};

const saveCacheMap = async (cache: CacheMap): Promise<void> => {
  memoryCache = cache;
  await browser.storage.local.set({ [STORAGE_KEYS.cache]: cache });
};

export const getCachedValue = async (key: string): Promise<string | null> => {
  const cache = await loadCacheMap();
  const entry = cache[key];
  if (!entry) {
    return null;
  }

  if (entry.expiresAt <= Date.now()) {
    delete cache[key];
    await saveCacheMap(cache);
    return null;
  }

  return entry.content;
};

export const setCachedValue = async (key: string, content: string, ttlMs: number): Promise<void> => {
  const cache = await loadCacheMap();
  cache[key] = {
    content,
    updatedAt: Date.now(),
    expiresAt: Date.now() + ttlMs,
  };

  const keys = Object.keys(cache);
  if (keys.length > 180) {
    const sorted = keys.sort((a, b) => cache[a].updatedAt - cache[b].updatedAt);
    const removeCount = keys.length - 180;
    for (let index = 0; index < removeCount; index += 1) {
      delete cache[sorted[index]];
    }
  }

  await saveCacheMap(cache);
};