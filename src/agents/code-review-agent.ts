import { BaseAgent } from "./base-agent.js";
import type { AgentContext, AgentResult } from "./types.js";

export class CodeReviewAgent extends BaseAgent {
  protected getAgentName(): string {
    return "Code Review";
  }

  async analyze(context: AgentContext): Promise<AgentResult> {
    const startTime = Date.now();

    try {
      const systemPrompt = this.getSystemPrompt();
      const userPrompt = this.buildUserPrompt(context);

      const response = await this.llm.chat(
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        {
          temperature: 0.3, // Lower temperature for more consistent analysis
          maxTokens: 4000,
        },
      );

      const findings = this.parseFindings(response.content);

      return {
        agentName: this.getAgentName(),
        findings,
        executionTime: Date.now() - startTime,
        tokenUsage: response.usage,
      };
    } catch (error) {
      console.error("Code Review Agent error:", error);
      return {
        agentName: this.getAgentName(),
        findings: [],
        executionTime: Date.now() - startTime,
      };
    }
  }

  protected getSystemPrompt(): string {
    return `You are an expert code reviewer specializing in TypeScript and JavaScript.

Your task is to analyze code changes and identify issues related to:
- **Code Quality**: Readability, maintainability, complexity
- **Best Practices**: Design patterns, SOLID principles, DRY
- **Potential Bugs**: Logic errors, edge cases, null/undefined handling
- **TypeScript**: Type safety, proper typing, type assertions
- **Modern JavaScript**: ES6+ features, async/await patterns
- **Testing**: Testability, missing test cases

For each issue found, provide:
1. **type**: "error" (must fix), "warning" (should fix), or "info" (nice to have)
2. **severity**: "critical", "high", "medium", or "low"
3. **category**: Brief category name (e.g., "Type Safety", "Error Handling")
4. **message**: Clear description of the issue
5. **file**: File path where the issue was found
6. **line**: Line number (if applicable)
7. **suggestion**: Specific recommendation to fix the issue

Output ONLY a valid JSON array of findings. Example:
[
  {
    "type": "warning",
    "severity": "medium",
    "category": "Error Handling",
    "message": "Missing try-catch block for async operation",
    "file": "src/api/user.ts",
    "line": 42,
    "suggestion": "Wrap the async call in try-catch to handle potential errors"
  }
]

If no issues are found, return an empty array: []`;
  }

  private buildUserPrompt(context: AgentContext): string {
    let prompt = this.formatDiffForPrompt(context);

    prompt += "\n\n---\n\n";
    prompt +=
      "Please analyze the above code changes and provide your findings as a JSON array.";

    return prompt;
  }
}
