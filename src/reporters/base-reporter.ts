import type { Report, ReportOutput } from "./types.js";

export abstract class BaseReporter {
  abstract generate(report: Report): Promise<string>;
  abstract getFormat(): "markdown" | "html";

  async createOutput(
    report: Report,
    outputPath: string,
  ): Promise<ReportOutput> {
    const content = await this.generate(report);

    return {
      format: this.getFormat(),
      path: outputPath,
      content,
    };
  }

  protected getSeverityBadge(severity: string): string {
    const badges: Record<string, string> = {
      critical: "🔴 CRITICAL",
      high: "🟠 HIGH",
      medium: "🟡 MEDIUM",
      low: "🟢 LOW",
    };
    return badges[severity] || severity.toUpperCase();
  }

  protected getTypeBadge(type: string): string {
    const badges: Record<string, string> = {
      error: "❌ Error",
      warning: "⚠️  Warning",
      info: "ℹ️  Info",
    };
    return badges[type] || type;
  }
}
