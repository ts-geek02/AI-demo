/**
 * Grok (xAI) provider adapter.
 *
 * Required env var: XAI_API_KEY
 * Docs: https://docs.x.ai/api
 *
 * Grok's API is OpenAI-compatible, so we use the same chat completions endpoint
 * with a different base URL — no extra SDK needed.
 */
import type { AIProvider, CompletionOptions } from './types.js';

const BASE_URL = 'https://api.x.ai/v1';

export class GrokProvider implements AIProvider {
  private readonly apiKey: string;

  public constructor() {
    const key = process.env['XAI_API_KEY'];
    if (!key) {
      throw new Error(
        'XAI_API_KEY environment variable is not set. Get a free key at https://console.x.ai/',
      );
    }
    this.apiKey = key;
  }

  public async complete(prompt: string, options: CompletionOptions): Promise<string> {
    const response = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: options.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: options.maxTokens,
        temperature: options.temperature,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Grok API error ${response.status}: ${body}`);
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
    };

    // data.choices is typed as a non-nullable array — no optional chain needed.
    // The first element may be absent if the API returns an empty array, so
    // we keep [0]? but the subsequent .message.content access is always safe
    // once choices[0] exists.
    const firstChoice = data.choices[0];
    const content = firstChoice?.message.content;
    if (!content) {
      throw new Error('Grok API returned an empty response');
    }

    return content;
  }
}
