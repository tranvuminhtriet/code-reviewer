import type { ParsedDiff } from "../parsers/types.js";
import type { LLMProviderType } from "../llm/provider.js";

/**
 * Pipeline Configuration
 */

export interface PipelineConfig {
  llm: {
    provider: LLMProviderType;
    apiKey: string;
    model?: string;
  };
  agents: {
    codeReview: { enabled: boolean };
    security: { enabled: boolean };
    performance: { enabled: boolean };
  };
  output: {
    formats: ("markdown" | "html")[];
    directory: string;
  };
}

export interface PipelineResult {
  report: any; // Report type from reporters
  outputs: { format: string; path: string }[];
  success: boolean;
  error?: string;
}
