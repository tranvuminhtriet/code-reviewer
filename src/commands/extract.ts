import * as fs from "fs/promises";
import * as path from "path";

export interface ExtractedFinding {
  severity: string;
  category: string;
  file: string;
  line?: number;
  issue: string;
  suggestion?: string;
  code?: string;
}

export async function extractCheckedFindings(
  reportPath: string,
): Promise<ExtractedFinding[]> {
  // Read markdown file
  const content = await fs.readFile(reportPath, "utf-8");

  // Find all checked items with their content
  const findings: ExtractedFinding[] = [];

  // Regex to match checked items: - [x] **[SEVERITY]** Category
  const lines = content.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Check if this is a checked finding
    if (line.match(/^- \[x\] \*\*\[(.+?)\]\*\* (.+)$/)) {
      const match = line.match(/^- \[x\] \*\*\[(.+?)\]\*\* (.+)$/);
      if (!match) {
        i++;
        continue;
      }

      const severity = match[1].toLowerCase();
      const category = match[2];

      // Extract details from following lines
      const finding: ExtractedFinding = {
        severity,
        category,
        file: "",
        issue: "",
      };

      // Parse following lines until we hit another checkbox or empty line
      i++;
      while (i < lines.length) {
        const detailLine = lines[i];

        // Stop if we hit another checkbox or section
        if (
          detailLine.match(/^- \[/) ||
          detailLine.match(/^##/) ||
          (detailLine.trim() === "" && lines[i + 1]?.match(/^- \[/))
        ) {
          break;
        }

        // Extract file
        const fileMatch = detailLine.match(/- \*\*File\*\*: `(.+?)`(:(\d+))?/);
        if (fileMatch) {
          finding.file = fileMatch[1];
          if (fileMatch[3]) {
            finding.line = parseInt(fileMatch[3]);
          }
        }

        // Extract issue
        const issueMatch = detailLine.match(/- \*\*Issue\*\*: (.+)/);
        if (issueMatch) {
          finding.issue = issueMatch[1];
        }

        // Extract suggestion
        const suggestionMatch = detailLine.match(/- \*\*Suggestion\*\*: (.+)/);
        if (suggestionMatch) {
          finding.suggestion = suggestionMatch[1];
        }

        // Extract code block
        if (detailLine.includes("- **Code**:")) {
          i++;
          // Skip opening ```
          if (lines[i]?.trim().startsWith("```")) {
            i++;
            const codeLines: string[] = [];
            while (i < lines.length && !lines[i].trim().endsWith("```")) {
              // Remove indentation
              codeLines.push(lines[i].replace(/^\s{4}/, ""));
              i++;
            }
            finding.code = codeLines.join("\n");
          }
        }

        i++;
      }

      // Only add if we have required fields
      if (finding.file && finding.issue) {
        findings.push(finding);
      }

      continue;
    }

    i++;
  }

  return findings;
}

export function formatFindingsAsMarkdown(findings: ExtractedFinding[]): string {
  if (findings.length === 0) {
    return "# No findings selected\n\nPlease check boxes in the report to select findings to fix.\n";
  }

  let md = "# Selected Findings to Fix\n\n";
  md += `Total: ${findings.length} issue(s)\n\n`;
  md += "---\n\n";

  findings.forEach((finding, index) => {
    md += `## ${index + 1}. [${finding.severity.toUpperCase()}] ${finding.category}\n\n`;
    md += `**File**: \`${finding.file}\`${finding.line ? `:${finding.line}` : ""}\n\n`;
    md += `**Issue**: ${finding.issue}\n\n`;

    if (finding.suggestion) {
      md += `**Suggested Fix**: ${finding.suggestion}\n\n`;
    }

    if (finding.code) {
      md += "**Current Code**:\n```typescript\n";
      md += finding.code;
      md += "\n```\n\n";
    }

    md += "---\n\n";
  });

  return md;
}

export function formatFindingsAsJSON(findings: ExtractedFinding[]): string {
  return JSON.stringify(
    {
      total: findings.length,
      findings: findings.map((f, index) => ({
        id: index + 1,
        severity: f.severity,
        category: f.category,
        file: f.file,
        line: f.line,
        issue: f.issue,
        suggestion: f.suggestion,
        code: f.code,
      })),
    },
    null,
    2,
  );
}
