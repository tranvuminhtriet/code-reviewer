import { BaseAgent } from "./base-agent.js";
import type { AgentContext, AgentResult } from "./types.js";
import { ESLint } from "eslint";

export class SecurityAgent extends BaseAgent {
  private eslint: ESLint;

  constructor(llm: any, config: Record<string, any> = {}) {
    super(llm, config);

    // Initialize ESLint with security plugin
    this.eslint = new ESLint({
      useEslintrc: false,
      overrideConfig: {
        parser: "@typescript-eslint/parser",
        parserOptions: {
          ecmaVersion: 2022,
          sourceType: "module",
        },
        plugins: ["security"],
        rules: {
          "security/detect-object-injection": "warn",
          "security/detect-non-literal-regexp": "warn",
          "security/detect-unsafe-regex": "error",
          "security/detect-buffer-noassert": "error",
          "security/detect-child-process": "warn",
          "security/detect-disable-mustache-escape": "error",
          "security/detect-eval-with-expression": "error",
          "security/detect-no-csrf-before-method-override": "error",
          "security/detect-non-literal-fs-filename": "warn",
          "security/detect-non-literal-require": "warn",
          "security/detect-possible-timing-attacks": "warn",
          "security/detect-pseudoRandomBytes": "error",
        },
      },
    });
  }

  protected getAgentName(): string {
    return "Security";
  }

  async analyze(context: AgentContext): Promise<AgentResult> {
    const startTime = Date.now();

    try {
      // Run static analysis first
      const staticFindings = await this.runStaticAnalysis(context);

      // Then run LLM analysis with context
      const systemPrompt = this.getSystemPrompt();
      const userPrompt = this.buildUserPrompt(context, staticFindings);

      const response = await this.llm.chat(
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        {
          temperature: 0.2, // Very low temperature for security analysis
          maxTokens: 4000,
        },
      );

      const llmFindings = this.parseFindings(response.content);

      // Merge static and LLM findings
      const allFindings = [...staticFindings, ...llmFindings];

      return {
        agentName: this.getAgentName(),
        findings: allFindings,
        executionTime: Date.now() - startTime,
        tokenUsage: response.usage,
      };
    } catch (error) {
      console.error("Security Agent error:", error);
      return {
        agentName: this.getAgentName(),
        findings: [],
        executionTime: Date.now() - startTime,
      };
    }
  }

  protected getSystemPrompt(): string {
    return `You are a security expert specializing in web application security and the OWASP Top 10.

Your task is to analyze code changes for security vulnerabilities:
- **Injection Attacks**: SQL injection, XSS, command injection
- **Authentication & Authorization**: Weak auth, broken access control
- **Sensitive Data Exposure**: Hardcoded secrets, logging sensitive data
- **Security Misconfiguration**: Default configs, unnecessary features
- **Vulnerable Dependencies**: Known CVEs in packages
- **Cryptography**: Weak algorithms, improper key management
- **Input Validation**: Missing validation, sanitization
- **API Security**: Rate limiting, authentication, data exposure

You will receive:
1. The code changes to analyze
2. Findings from the Code Review agent (for context)
3. Static analysis results from ESLint security plugin

Focus on security issues that the static analysis might have missed or need deeper analysis.

For each security issue found, provide:
1. **type**: "error" (critical security issue), "warning" (potential issue), or "info" (security improvement)
2. **severity**: "critical", "high", "medium", or "low"
3. **category**: Security category (e.g., "XSS", "SQL Injection", "Auth")
4. **message**: Clear description of the vulnerability
5. **file**: File path where the issue was found
6. **line**: Line number (if applicable)
7. **suggestion**: Specific recommendation to fix the vulnerability

Output ONLY a valid JSON array of findings. If no additional issues are found beyond static analysis, return an empty array: []`;
  }

  private async runStaticAnalysis(context: AgentContext): Promise<any[]> {
    const findings: any[] = [];

    for (const file of context.diff.files) {
      // Skip deleted files
      if (file.status === "deleted") continue;

      try {
        // Reconstruct file content from changes
        const content = this.reconstructFileContent(file);

        // Run ESLint
        const results = await this.eslint.lintText(content, {
          filePath: file.path,
        });

        // Convert ESLint results to findings
        for (const result of results) {
          for (const message of result.messages) {
            findings.push({
              type: message.severity === 2 ? "error" : "warning",
              severity: message.severity === 2 ? "high" : "medium",
              category: "Static Analysis",
              message: `${message.ruleId}: ${message.message}`,
              file: file.path,
              line: message.line,
              suggestion: "Review ESLint security rule documentation",
            });
          }
        }
      } catch (error) {
        // Skip files that can't be linted
        console.warn(`Failed to lint ${file.path}:`, error);
      }
    }

    return findings;
  }

  private reconstructFileContent(file: any): string {
    // Simple reconstruction from changes (for linting purposes)
    const lines: string[] = [];

    for (const change of file.changes) {
      if (change.type !== "delete") {
        lines.push(change.content);
      }
    }

    return lines.join("\n");
  }

  private buildUserPrompt(
    context: AgentContext,
    staticFindings: any[],
  ): string {
    let prompt = this.formatDiffForPrompt(context);

    prompt += "\n\n---\n\n";

    // Include previous findings from code review
    if (context.previousFindings && context.previousFindings.length > 0) {
      prompt += "# Context from Code Review Agent\n\n";
      prompt += this.formatPreviousFindings(context.previousFindings);
      prompt += "\n\n---\n\n";
    }

    // Include static analysis results
    if (staticFindings.length > 0) {
      prompt += "# Static Analysis Results (ESLint Security)\n\n";
      for (const finding of staticFindings) {
        prompt += `- ${finding.message} (${finding.file}:${finding.line})\n`;
      }
      prompt += "\n\n---\n\n";
    }

    prompt +=
      "Please analyze the code changes for security vulnerabilities and provide your findings as a JSON array.";
    prompt +=
      " Focus on issues not covered by static analysis or that need deeper security review.";

    return prompt;
  }
}
