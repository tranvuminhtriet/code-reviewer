import { BaseAgent } from "./base-agent.js";
import type { AgentContext, AgentResult } from "./types.js";
import { parse } from "@typescript-eslint/typescript-estree";

export class PerformanceAgent extends BaseAgent {
  protected getAgentName(): string {
    return "Performance";
  }

  async analyze(context: AgentContext): Promise<AgentResult> {
    const startTime = Date.now();

    try {
      // Run AST analysis for performance patterns
      const astFindings = await this.runASTAnalysis(context);

      // Then run LLM analysis
      const systemPrompt = this.getSystemPrompt();
      const userPrompt = this.buildUserPrompt(context, astFindings);

      const response = await this.llm.chat(
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        {
          temperature: 0.3,
          maxTokens: 4000,
        },
      );

      const llmFindings = this.parseFindings(response.content);

      // Merge AST and LLM findings
      const allFindings = [...astFindings, ...llmFindings];

      return {
        agentName: this.getAgentName(),
        findings: allFindings,
        executionTime: Date.now() - startTime,
        tokenUsage: response.usage,
      };
    } catch (error) {
      console.error("Performance Agent error:", error);
      return {
        agentName: this.getAgentName(),
        findings: [],
        executionTime: Date.now() - startTime,
      };
    }
  }

  protected getSystemPrompt(): string {
    return `You are a performance optimization expert specializing in JavaScript and TypeScript applications.

Your task is to analyze code changes for performance issues:
- **Algorithm Efficiency**: O(n²) loops, inefficient data structures
- **Memory Leaks**: Event listeners, closures, circular references
- **React Performance**: Unnecessary re-renders, missing memoization, large component trees
- **Async Patterns**: Promise chains, parallel vs sequential, race conditions
- **Bundle Size**: Large imports, tree-shaking issues, dynamic imports
- **DOM Operations**: Excessive DOM manipulation, layout thrashing
- **Network**: Missing caching, redundant requests, large payloads
- **Computation**: Heavy calculations in render, blocking operations

You will receive:
1. The code changes to analyze
2. Findings from the Code Review agent (for context)
3. AST analysis results for common performance anti-patterns

Focus on performance issues that need deeper analysis or architectural considerations.

For each performance issue found, provide:
1. **type**: "error" (critical perf issue), "warning" (noticeable impact), or "info" (optimization opportunity)
2. **severity**: "critical", "high", "medium", or "low"
3. **category**: Performance category (e.g., "Memory Leak", "Re-render", "Algorithm")
4. **message**: Clear description of the performance issue
5. **file**: File path where the issue was found
6. **line**: Line number (if applicable)
7. **suggestion**: Specific recommendation to improve performance

Output ONLY a valid JSON array of findings. If no additional issues are found, return an empty array: []`;
  }

  private async runASTAnalysis(context: AgentContext): Promise<any[]> {
    const findings: any[] = [];

    // Suppress TypeScript version warning from @typescript-eslint/typescript-estree
    // This warning appears when using TypeScript 5.6+ with older parser versions
    // The parser still works correctly, so we can safely suppress the warning
    const originalEnv = process.env.TSESTREE_SINGLE_RUN;
    process.env.TSESTREE_SINGLE_RUN = "true";

    try {
      for (const file of context.diff.files) {
        // Skip deleted files
        if (file.status === "deleted") continue;

        try {
          // Reconstruct file content
          const content = this.reconstructFileContent(file);

          // Parse to AST
          const ast = parse(content, {
            jsx: true,
            loc: true,
            range: true,
          });

          // Analyze AST for performance patterns
          this.analyzeAST(ast, file.path, findings);
        } catch (error) {
          // Skip files that can't be parsed
          console.warn(`Failed to parse ${file.path}:`, error);
        }
      }
    } finally {
      // Restore original environment variable
      if (originalEnv === undefined) {
        delete process.env.TSESTREE_SINGLE_RUN;
      } else {
        process.env.TSESTREE_SINGLE_RUN = originalEnv;
      }
    }

    return findings;
  }

  private analyzeAST(ast: any, filePath: string, findings: any[]): void {
    // Simple AST traversal to detect common performance issues
    // This is a basic implementation - can be extended with more patterns

    const traverse = (node: any) => {
      if (!node || typeof node !== "object") return;

      // Detect nested loops (potential O(n²))
      if (node.type === "ForStatement" || node.type === "WhileStatement") {
        const hasNestedLoop = this.hasNestedLoop(node);
        if (hasNestedLoop) {
          findings.push({
            type: "warning",
            severity: "medium",
            category: "Algorithm Complexity",
            message: "Nested loop detected - potential O(n²) complexity",
            file: filePath,
            line: node.loc?.start.line,
            suggestion:
              "Consider using a more efficient algorithm or data structure (e.g., Map, Set)",
          });
        }
      }

      // Detect array methods in loops
      if (
        (node.type === "ForStatement" || node.type === "WhileStatement") &&
        this.hasArrayMethodInLoop(node)
      ) {
        findings.push({
          type: "warning",
          severity: "low",
          category: "Loop Optimization",
          message: "Array method called inside loop - consider optimization",
          file: filePath,
          line: node.loc?.start.line,
          suggestion:
            "Move array operations outside the loop or use more efficient alternatives",
        });
      }

      // Recursively traverse child nodes
      for (const key in node) {
        if (key !== "loc" && key !== "range" && key !== "parent") {
          const child = node[key];
          if (Array.isArray(child)) {
            child.forEach(traverse);
          } else {
            traverse(child);
          }
        }
      }
    };

    traverse(ast);
  }

  private hasNestedLoop(node: any): boolean {
    // Simple check for nested loops
    const checkNode = (n: any): boolean => {
      if (!n || typeof n !== "object") return false;

      if (
        n.type === "ForStatement" ||
        n.type === "WhileStatement" ||
        n.type === "ForInStatement" ||
        n.type === "ForOfStatement"
      ) {
        return true;
      }

      for (const key in n) {
        if (key !== "loc" && key !== "range" && key !== "parent") {
          const child = n[key];
          if (Array.isArray(child)) {
            if (child.some(checkNode)) return true;
          } else if (checkNode(child)) {
            return true;
          }
        }
      }

      return false;
    };

    return checkNode(node.body);
  }

  private hasArrayMethodInLoop(node: any): boolean {
    // Check if array methods like map, filter, etc. are called in loop
    const arrayMethods = [
      "map",
      "filter",
      "reduce",
      "forEach",
      "find",
      "some",
      "every",
    ];

    const checkNode = (n: any): boolean => {
      if (!n || typeof n !== "object") return false;

      if (
        n.type === "CallExpression" &&
        n.callee?.type === "MemberExpression" &&
        n.callee?.property?.type === "Identifier" &&
        arrayMethods.includes(n.callee.property.name)
      ) {
        return true;
      }

      for (const key in n) {
        if (key !== "loc" && key !== "range" && key !== "parent") {
          const child = n[key];
          if (Array.isArray(child)) {
            if (child.some(checkNode)) return true;
          } else if (checkNode(child)) {
            return true;
          }
        }
      }

      return false;
    };

    return checkNode(node.body);
  }

  private reconstructFileContent(file: any): string {
    const lines: string[] = [];

    for (const change of file.changes) {
      if (change.type !== "delete") {
        lines.push(change.content);
      }
    }

    return lines.join("\n");
  }

  private buildUserPrompt(context: AgentContext, astFindings: any[]): string {
    let prompt = this.formatDiffForPrompt(context);

    prompt += "\n\n---\n\n";

    // Include previous findings from code review
    if (context.previousFindings && context.previousFindings.length > 0) {
      prompt += "# Context from Previous Agents\n\n";
      prompt += this.formatPreviousFindings(context.previousFindings);
      prompt += "\n\n---\n\n";
    }

    // Include AST analysis results
    if (astFindings.length > 0) {
      prompt += "# AST Analysis Results\n\n";
      for (const finding of astFindings) {
        prompt += `- ${finding.message} (${finding.file}:${finding.line})\n`;
      }
      prompt += "\n\n---\n\n";
    }

    prompt +=
      "Please analyze the code changes for performance issues and provide your findings as a JSON array.";
    prompt +=
      " Focus on issues not covered by AST analysis or that need deeper performance review.";

    return prompt;
  }
}
