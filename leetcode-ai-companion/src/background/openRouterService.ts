import { OpenRouter } from '@openrouter/sdk';

interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenRouterRequestInput {
  apiKey: string;
  model: string;
  temperature: number;
  messages: OpenRouterMessage[];
}

const OPENROUTER_TIMEOUT_MS = 45_000;
const clientCache = new Map<string, OpenRouter>();

const getOpenRouterClient = (apiKey: string): OpenRouter => {
  const cached = clientCache.get(apiKey);
  if (cached) {
    return cached;
  }

  const client = new OpenRouter({
    apiKey,
    httpReferer: 'https://leetcode.com',
    appTitle: 'LeetCode AI Companion',
    timeoutMs: OPENROUTER_TIMEOUT_MS,
  });

  clientCache.set(apiKey, client);
  return client;
};

export const runOpenRouterCompletion = async (input: OpenRouterRequestInput): Promise<string> => {
  const client = getOpenRouterClient(input.apiKey);

  try {
    const stream = await client.chat.send(
      {
        chatGenerationParams: {
          model: input.model,
          temperature: input.temperature,
          messages: input.messages,
          stream: true,
        },
      },
      {
        timeoutMs: OPENROUTER_TIMEOUT_MS,
      },
    );

    let response = '';
    let streamError = '';

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        response += content;
      }

      if (chunk.error?.message) {
        streamError = chunk.error.message;
      }
    }

    const trimmed = response.trim();
    if (!trimmed) {
      throw new Error(streamError || 'OpenRouter returned an empty response.');
    }

    return trimmed;
  } catch (error) {
    const message = (error as Error).message || '';
    if ((error as Error).name === 'AbortError' || /timed?\s*out/i.test(message)) {
      throw new Error('OpenRouter request timed out. Try again or switch to a faster model.');
    }

    throw error;
  }
};
