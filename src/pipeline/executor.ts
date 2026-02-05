import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { createLLMProvider } from "../llm/provider.js";
import { CodeReviewAgent } from "../agents/code-review-agent.js";
import { SecurityAgent } from "../agents/security-agent.js";
import { PerformanceAgent } from "../agents/performance-agent.js";
import { MarkdownReporter } from "../reporters/markdown-reporter.js";
import { HTMLReporter } from "../reporters/html-reporter.js";
import type { ParsedDiff } from "../parsers/types.js";
import type {
  AgentContext,
  AgentFinding,
  AgentResult,
} from "../agents/types.js";
import type { Report, ReportSummary } from "../reporters/types.js";
import type { PipelineConfig, PipelineResult } from "./types.js";

export class PipelineExecutor {
  async execute(
    diff: ParsedDiff,
    config: PipelineConfig,
  ): Promise<PipelineResult> {
    const startTime = Date.now();

    try {
      // Initialize LLM provider
      const llm = createLLMProvider(config.llm.provider, {
        apiKey: config.llm.apiKey,
        model: config.llm.model,
      });

      // Initialize agents
      const codeReviewAgent = new CodeReviewAgent(llm);
      const securityAgent = new SecurityAgent(llm);
      const performanceAgent = new PerformanceAgent(llm);

      // Execute pipeline
      const context: AgentContext = { diff };
      const results: Record<string, AgentResult> = {};

      // Step 1: Code Review
      if (config.agents.codeReview.enabled) {
        console.log("Running Code Review Agent...");
        results.codeReview = await codeReviewAgent.analyze(context);
        context.previousFindings = results.codeReview.findings;
        console.log(
          `✓ Code Review: ${results.codeReview.findings.length} findings`,
        );
      }

      // Step 2: Security (depends on code review)
      if (config.agents.security.enabled) {
        console.log("Running Security Agent...");
        results.security = await securityAgent.analyze(context);
        context.previousFindings = [
          ...(context.previousFindings || []),
          ...results.security.findings,
        ];
        console.log(`✓ Security: ${results.security.findings.length} findings`);
      }

      // Step 3: Performance (depends on code review)
      if (config.agents.performance.enabled) {
        console.log("Running Performance Agent...");
        results.performance = await performanceAgent.analyze(context);
        console.log(
          `✓ Performance: ${results.performance.findings.length} findings`,
        );
      }

      // Aggregate report
      const report = this.aggregateReport(results, Date.now() - startTime);

      // Generate outputs
      const outputs = await this.generateOutputs(report, config.output);

      return {
        report,
        outputs,
        success: true,
      };
    } catch (error) {
      console.error("Pipeline execution failed:", error);
      return {
        report: null,
        outputs: [],
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  private aggregateReport(
    results: Record<string, AgentResult>,
    executionTime: number,
  ): Report {
    const codeReview = results.codeReview?.findings || [];
    const security = results.security?.findings || [];
    const performance = results.performance?.findings || [];

    const allFindings = [...codeReview, ...security, ...performance];

    // Calculate summary
    const summary: ReportSummary = {
      totalFindings: allFindings.length,
      critical: allFindings.filter((f) => f.severity === "critical").length,
      high: allFindings.filter((f) => f.severity === "high").length,
      medium: allFindings.filter((f) => f.severity === "medium").length,
      low: allFindings.filter((f) => f.severity === "low").length,
      byAgent: {
        codeReview: codeReview.length,
        security: security.length,
        performance: performance.length,
      },
    };

    // Calculate token usage
    const tokenUsage = {
      total:
        (results.codeReview?.tokenUsage?.totalTokens || 0) +
        (results.security?.tokenUsage?.totalTokens || 0) +
        (results.performance?.tokenUsage?.totalTokens || 0),
      byAgent: {
        codeReview: results.codeReview?.tokenUsage?.totalTokens,
        security: results.security?.tokenUsage?.totalTokens,
        performance: results.performance?.tokenUsage?.totalTokens,
      },
    };

    return {
      summary,
      codeReview,
      security,
      performance,
      generatedAt: new Date(),
      executionTime,
      tokenUsage: tokenUsage.total > 0 ? tokenUsage : undefined,
    };
  }

  private async generateOutputs(
    report: Report,
    outputConfig: PipelineConfig["output"],
  ): Promise<{ format: string; path: string }[]> {
    const outputs: { format: string; path: string }[] = [];

    // Ensure output directory exists
    mkdirSync(outputConfig.directory, { recursive: true });

    // Generate timestamp for unique filenames
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

    for (const format of outputConfig.formats) {
      try {
        let content: string;
        let filename: string;

        if (format === "markdown") {
          const reporter = new MarkdownReporter();
          content = await reporter.generate(report);
          filename = `code-review-${timestamp}.md`;
        } else if (format === "html") {
          const reporter = new HTMLReporter();
          content = await reporter.generate(report);
          filename = `code-review-${timestamp}.html`;
        } else {
          console.warn(`Unknown format: ${format}`);
          continue;
        }

        const filepath = join(outputConfig.directory, filename);
        writeFileSync(filepath, content, "utf-8");

        outputs.push({ format, path: filepath });
        console.log(`✓ Generated ${format.toUpperCase()} report: ${filepath}`);
      } catch (error) {
        console.error(`Failed to generate ${format} report:`, error);
      }
    }

    return outputs;
  }
}
