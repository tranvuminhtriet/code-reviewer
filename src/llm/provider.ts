import type { LLMProvider } from "./types.js";
import { OpenAIProvider } from "./openai-provider.js";

export type LLMProviderType = "openai";

export interface ProviderConfig {
  apiKey: string;
  model?: string;
}

export function createLLMProvider(
  type: LLMProviderType,
  config: ProviderConfig,
): LLMProvider {
  switch (type) {
    case "openai":
      return new OpenAIProvider(config);
    default:
      throw new Error(`Unknown LLM provider: ${type}`);
  }
}
