import type { LLMProvider } from "./types.js";
import { OpenAIProvider } from "./openai-provider.js";
import { GoogleGenAIProvider } from "./google-genai-provider.js";

export type LLMProviderType = "openai" | "google-genai";

export interface ProviderConfig {
  apiKey?: string;
  model?: string;
}

export function createLLMProvider(
  type: LLMProviderType,
  config: ProviderConfig,
): LLMProvider {
  switch (type) {
    case "openai":
      return new OpenAIProvider(config);
    case "google-genai":
      return new GoogleGenAIProvider(config);
    default:
      throw new Error(`Unknown LLM provider: ${type}`);
  }
}
