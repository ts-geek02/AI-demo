/**
 * Common interface that every AI provider adapter must implement.
 * Swap providers by changing `provider` in ai.config.json — no other code changes needed.
 */
export interface AIProvider {
  /**
   * Send a prompt to the AI and return the generated text.
   */
  complete(prompt: string, options: CompletionOptions): Promise<string>;
}

export interface CompletionOptions {
  model: string;
  maxTokens: number;
  temperature: number;
}

export interface AIConfig {
  provider: string;
  model: string;
  testDir: string;
  sourceDir: string;
  sourceExtensions: string[];
  excludePatterns: string[];
  maxTokens: number;
  temperature: number;
}
