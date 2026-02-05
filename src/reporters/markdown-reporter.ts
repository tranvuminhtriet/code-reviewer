import { BaseReporter } from "./base-reporter.js";
import type { Report, AgentFinding } from "../reporters/types.js";

export class MarkdownReporter extends BaseReporter {
  getFormat(): "markdown" | "html" {
    return "markdown";
  }

  async generate(report: Report): Promise<string> {
    let md = "";

    // Header
    md += "# Code Review Report\n\n";
    md += `Generated: ${report.generatedAt.toLocaleString()}\n\n`;
    md += `Execution Time: ${(report.executionTime / 1000).toFixed(2)}s\n\n`;

    // Summary
    md += "## 📊 Summary\n\n";
    md += this.generateSummaryTable(report);
    md += "\n\n";

    // Token usage
    if (report.tokenUsage) {
      md += "### Token Usage\n\n";
      md += `- **Total**: ${report.tokenUsage.total.toLocaleString()} tokens\n`;
      if (report.tokenUsage.byAgent.codeReview) {
        md += `- Code Review: ${report.tokenUsage.byAgent.codeReview.toLocaleString()}\n`;
      }
      if (report.tokenUsage.byAgent.security) {
        md += `- Security: ${report.tokenUsage.byAgent.security.toLocaleString()}\n`;
      }
      if (report.tokenUsage.byAgent.performance) {
        md += `- Performance: ${report.tokenUsage.byAgent.performance.toLocaleString()}\n`;
      }
      md += "\n\n";
    }

    // Findings by agent
    md += "---\n\n";
    md += this.generateAgentSection("Code Review", report.codeReview);
    md += this.generateAgentSection("Security", report.security);
    md += this.generateAgentSection("Performance", report.performance);

    return md;
  }

  private generateSummaryTable(report: Report): string {
    const { summary } = report;

    let table = "| Metric | Count |\n";
    table += "|--------|-------|\n";
    table += `| **Total Findings** | ${summary.totalFindings} |\n`;
    table += `| 🔴 Critical | ${summary.critical} |\n`;
    table += `| 🟠 High | ${summary.high} |\n`;
    table += `| 🟡 Medium | ${summary.medium} |\n`;
    table += `| 🟢 Low | ${summary.low} |\n`;
    table += "\n";
    table += "| Agent | Findings |\n";
    table += "|-------|----------|\n";
    table += `| Code Review | ${summary.byAgent.codeReview} |\n`;
    table += `| Security | ${summary.byAgent.security} |\n`;
    table += `| Performance | ${summary.byAgent.performance} |\n`;

    return table;
  }

  private generateAgentSection(
    agentName: string,
    findings: AgentFinding[],
  ): string {
    let section = `## ${agentName} Agent\n\n`;

    if (findings.length === 0) {
      section += `✅ No issues found by ${agentName} agent.\n\n`;
      return section;
    }

    section += `Found ${findings.length} issue(s):\n\n`;

    // Group by severity
    const bySeverity = this.groupBySeverity(findings);

    for (const severity of ["critical", "high", "medium", "low"]) {
      const items = bySeverity[severity] || [];
      if (items.length === 0) continue;

      section += `### ${this.getSeverityBadge(severity)}\n\n`;

      for (const finding of items) {
        section += this.formatFinding(finding);
      }
    }

    return section;
  }

  private formatFinding(finding: AgentFinding): string {
    let md = `#### ${this.getTypeBadge(finding.type)} ${finding.category}\n\n`;
    md += `**File**: \`${finding.file}\`${finding.line ? `:${finding.line}` : ""}\n\n`;
    md += `**Issue**: ${finding.message}\n\n`;

    if (finding.suggestion) {
      md += `**Suggestion**: ${finding.suggestion}\n\n`;
    }

    if (finding.code) {
      md += "**Code**:\n```typescript\n";
      md += finding.code;
      md += "\n```\n\n";
    }

    md += "---\n\n";

    return md;
  }

  private groupBySeverity(
    findings: AgentFinding[],
  ): Record<string, AgentFinding[]> {
    const grouped: Record<string, AgentFinding[]> = {
      critical: [],
      high: [],
      medium: [],
      low: [],
    };

    for (const finding of findings) {
      if (grouped[finding.severity]) {
        grouped[finding.severity].push(finding);
      }
    }

    return grouped;
  }
}
