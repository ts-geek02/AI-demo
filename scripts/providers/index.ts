/**
 * Provider registry — resolves the configured AI provider at runtime.
 * To add a new provider: implement AIProvider, drop the file here, add a case below.
 */
import type { AIProvider } from './types.js';

export async function createProvider(providerName: string): Promise<AIProvider> {
  switch (providerName.toLowerCase()) {
    case 'grok': {
      const { GrokProvider } = await import('./grok.js');
      return new GrokProvider();
    }
    case 'openai': {
      const { OpenAIProvider } = await import('./openai.js');
      return new OpenAIProvider();
    }
    case 'anthropic': {
      const { AnthropicProvider } = await import('./anthropic.js');
      return new AnthropicProvider();
    }
    default:
      throw new Error(
        `Unknown AI provider: "${providerName}". ` +
          'Supported values: grok, openai, anthropic. ' +
          'Update "provider" in ai.config.json.',
      );
  }
}

export type { AIProvider, CompletionOptions, AIConfig } from './types.js';
