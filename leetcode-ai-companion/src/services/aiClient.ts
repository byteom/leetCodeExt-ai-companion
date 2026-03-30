import { sendRuntimeMessage } from './runtime';
import type { AiTaskInput } from '../utils/types';

export const runAiTask = async (task: AiTaskInput): Promise<string> => {
  const response = await sendRuntimeMessage('AI_TASK', task);
  if (!response.ok || !response.content) {
    throw new Error(response.error ?? 'AI request failed');
  }
  return response.content;
};