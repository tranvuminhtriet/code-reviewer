import type { ParsedDiff } from "../parsers/types.js";

/**
 * Agent Finding Types
 */

export type FindingSeverity = "critical" | "high" | "medium" | "low";
export type FindingType = "error" | "warning" | "info";

export interface AgentFinding {
  type: FindingType;
  severity: FindingSeverity;
  category: string;
  message: string;
  file: string;
  line?: number;
  suggestion?: string;
  code?: string; // Code snippet
}

export interface AgentContext {
  diff: ParsedDiff;
  previousFindings?: AgentFinding[];
}

export interface AgentResult {
  agentName: string;
  findings: AgentFinding[];
  executionTime: number;
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}
