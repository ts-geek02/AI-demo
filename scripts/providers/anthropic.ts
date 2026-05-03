/**
 * Anthropic (Claude) provider adapter.
 *
 * Required env var: ANTHROPIC_API_KEY
 * Docs: https://docs.anthropic.com/en/api/messages
 */
import type { AIProvider, CompletionOptions } from './types.js';

const BASE_URL = 'https://api.anthropic.com/v1';
const ANTHROPIC_VERSION = '2023-06-01';

export class AnthropicProvider implements AIProvider {
  private readonly apiKey: string;

  constructor() {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set.');
    }
    this.apiKey = key;
  }

  async complete(prompt: string, options: CompletionOptions): Promise<string> {
    const response = await fetch(`${BASE_URL}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model: options.model,
        max_tokens: options.maxTokens,
        temperature: options.temperature,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Anthropic API error ${response.status}: ${body}`);
    }

    const data = (await response.json()) as {
      content: Array<{ type: string; text: string }>;
    };

    const textBlock = data.content?.find((b) => b.type === 'text');
    if (!textBlock?.text) {
      throw new Error('Anthropic API returned an empty response');
    }

    return textBlock.text;
  }
}
