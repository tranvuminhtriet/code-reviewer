import type { LLMProvider } from "../llm/types.js";
import type { AgentContext, AgentFinding, AgentResult } from "./types.js";

export abstract class BaseAgent {
  constructor(
    protected llm: LLMProvider,
    protected config: Record<string, any> = {},
  ) {}

  /**
   * Main analysis method - must be implemented by subclasses
   */
  abstract analyze(context: AgentContext): Promise<AgentResult>;

  /**
   * Get system prompt - must be implemented by subclasses
   */
  protected abstract getSystemPrompt(): string;

  /**
   * Get agent name - must be implemented by subclasses
   */
  protected abstract getAgentName(): string;

  /**
   * Parse LLM response to structured findings
   */
  protected parseFindings(response: string): AgentFinding[] {
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        console.warn("No JSON array found in LLM response");
        return [];
      }

      const findings = JSON.parse(jsonMatch[0]);

      // Validate findings structure
      if (!Array.isArray(findings)) {
        console.warn("LLM response is not an array");
        return [];
      }

      return findings.filter(this.isValidFinding);
    } catch (error) {
      console.error("Failed to parse LLM response:", error);
      return [];
    }
  }

  /**
   * Validate finding structure
   */
  private isValidFinding(finding: any): finding is AgentFinding {
    return (
      finding &&
      typeof finding === "object" &&
      typeof finding.type === "string" &&
      typeof finding.severity === "string" &&
      typeof finding.category === "string" &&
      typeof finding.message === "string" &&
      typeof finding.file === "string"
    );
  }

  /**
   * Format diff for LLM prompt
   */
  protected formatDiffForPrompt(context: AgentContext): string {
    const { diff } = context;
    let prompt = `# Code Changes Summary\n\n${diff.summary}\n\n`;

    for (const file of diff.files) {
      prompt += `## File: ${file.path}\n`;
      prompt += `Status: ${file.status}\n`;
      prompt += `Changes: +${file.additions} -${file.deletions}\n\n`;

      // Include actual changes
      prompt += "```diff\n";
      for (const change of file.changes) {
        const prefix =
          change.type === "add" ? "+" : change.type === "delete" ? "-" : " ";
        prompt += `${prefix}${change.content}\n`;
      }
      prompt += "```\n\n";
    }

    return prompt;
  }

  /**
   * Format previous findings for context
   */
  protected formatPreviousFindings(findings: AgentFinding[]): string {
    if (!findings || findings.length === 0) {
      return "No previous findings.";
    }

    let formatted = "# Previous Agent Findings\n\n";

    for (const finding of findings) {
      formatted += `- **[${finding.severity.toUpperCase()}]** ${finding.category}: ${finding.message}\n`;
      formatted += `  File: ${finding.file}${finding.line ? `:${finding.line}` : ""}\n`;
      if (finding.suggestion) {
        formatted += `  Suggestion: ${finding.suggestion}\n`;
      }
      formatted += "\n";
    }

    return formatted;
  }
}
