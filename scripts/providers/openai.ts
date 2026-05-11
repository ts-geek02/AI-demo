/**
 * OpenAI provider adapter.
 *
 * Required env var: OPENAI_API_KEY
 * Docs: https://platform.openai.com/docs/api-reference/chat
 */
import type { AIProvider, CompletionOptions } from './types.js';

const BASE_URL = 'https://api.openai.com/v1';

export class OpenAIProvider implements AIProvider {
  private readonly apiKey: string;

  public constructor() {
    const key = process.env['OPENAI_API_KEY'];
    if (!key) {
      throw new Error('OPENAI_API_KEY environment variable is not set.');
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
      throw new Error(`OpenAI API error ${response.status}: ${body}`);
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
      throw new Error('OpenAI API returned an empty response');
    }

    return content;
  }
}
