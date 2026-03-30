import type { RuntimeRequestMap, RuntimeResponseMap } from '../utils/types';

export const sendRuntimeMessage = async <K extends keyof RuntimeRequestMap>(
  type: K,
  payload: RuntimeRequestMap[K],
): Promise<RuntimeResponseMap[K]> => {
  return (await browser.runtime.sendMessage({ type, payload })) as RuntimeResponseMap[K];
};