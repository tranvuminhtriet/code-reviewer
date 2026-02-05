import type { AgentFinding } from "../agents/types.js";

/**
 * Report Types
 */

export interface ReportSummary {
  totalFindings: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  byAgent: {
    codeReview: number;
    security: number;
    performance: number;
  };
}

export interface Report {
  summary: ReportSummary;
  codeReview: AgentFinding[];
  security: AgentFinding[];
  performance: AgentFinding[];
  generatedAt: Date;
  executionTime: number;
  tokenUsage?: {
    total: number;
    byAgent: {
      codeReview?: number;
      security?: number;
      performance?: number;
    };
  };
}

export interface ReportOutput {
  format: "markdown" | "html";
  path: string;
  content: string;
}
