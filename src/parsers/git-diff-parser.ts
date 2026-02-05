import simpleGit, { SimpleGit, DiffResult } from "simple-git";
import { readFileSync } from "fs";
import type { ParsedDiff, FileDiff, Change } from "./types.js";

export class GitDiffParser {
  private git: SimpleGit;
  private supportedExtensions = [".ts", ".tsx", ".js", ".jsx"];

  constructor(repoPath: string = process.cwd()) {
    this.git = simpleGit(repoPath);
  }

  /**
   * Parse diff from a git commit
   */
  async parseDiff(commitHash: string = "HEAD"): Promise<ParsedDiff> {
    try {
      // Check if this is the first commit (no parent)
      const log = await this.git.log([commitHash]);
      const isFirstCommit =
        log.all.length === 1 && log.all[0].hash === log.latest?.hash;

      let diffSummary: DiffResult;
      let diff: string;

      if (isFirstCommit) {
        // For first commit, diff against empty tree
        diffSummary = await this.git.diffSummary([
          "4b825dc642cb6eb9a060e54bf8d69288fbee4904", // Git's empty tree SHA
          commitHash,
        ]);
        diff = await this.git.diff([
          "4b825dc642cb6eb9a060e54bf8d69288fbee4904",
          commitHash,
        ]);
      } else {
        // Normal case: diff against parent commit
        diffSummary = await this.git.diffSummary([
          `${commitHash}^`,
          commitHash,
        ]);
        diff = await this.git.diff([`${commitHash}^`, commitHash]);
      }

      return this.processDiff(diff, diffSummary);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to parse git diff: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Parse diff from a file
   */
  async parseDiffFile(filePath: string): Promise<ParsedDiff> {
    try {
      const diffContent = readFileSync(filePath, "utf-8");
      return this.processDiff(diffContent);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to read diff file: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Process raw diff content
   */
  private processDiff(diffContent: string, summary?: DiffResult): ParsedDiff {
    const files: FileDiff[] = [];
    let totalAdditions = 0;
    let totalDeletions = 0;

    // Split diff by file
    const fileDiffs = diffContent.split(/^diff --git /m).filter(Boolean);

    for (const fileDiff of fileDiffs) {
      const fileDiffData = this.parseFileDiff(fileDiff);

      if (!fileDiffData) continue;

      // Filter only TypeScript/JavaScript files
      if (!this.isSupportedFile(fileDiffData.path)) continue;

      files.push(fileDiffData);
      totalAdditions += fileDiffData.additions;
      totalDeletions += fileDiffData.deletions;
    }

    const summaryText = summary
      ? `${summary.changed} files changed, ${summary.insertions} insertions(+), ${summary.deletions} deletions(-)`
      : `${files.length} files changed, ${totalAdditions} insertions(+), ${totalDeletions} deletions(-)`;

    return {
      files,
      totalAdditions,
      totalDeletions,
      summary: summaryText,
    };
  }

  /**
   * Parse individual file diff
   */
  private parseFileDiff(diffContent: string): FileDiff | null {
    const lines = diffContent.split("\n");

    // Extract file paths
    const filePathMatch = lines[0]?.match(/^a\/(.+?) b\/(.+?)$/);
    if (!filePathMatch) return null;

    const oldPath = filePathMatch[1];
    const newPath = filePathMatch[2];

    // Determine status
    let status: FileDiff["status"] = "modified";
    if (diffContent.includes("new file mode")) {
      status = "added";
    } else if (diffContent.includes("deleted file mode")) {
      status = "deleted";
    } else if (oldPath !== newPath) {
      status = "renamed";
    }

    // Parse changes
    const changes: Change[] = [];
    let additions = 0;
    let deletions = 0;
    let currentLineNumber = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Track line numbers from hunk headers
      const hunkMatch = line.match(/^@@ -\d+,?\d* \+(\d+),?\d* @@/);
      if (hunkMatch) {
        currentLineNumber = parseInt(hunkMatch[1], 10);
        continue;
      }

      // Parse changes
      if (line.startsWith("+") && !line.startsWith("+++")) {
        changes.push({
          type: "add",
          lineNumber: currentLineNumber,
          content: line.substring(1),
        });
        additions++;
        currentLineNumber++;
      } else if (line.startsWith("-") && !line.startsWith("---")) {
        changes.push({
          type: "delete",
          lineNumber: currentLineNumber,
          content: line.substring(1),
        });
        deletions++;
      } else if (line.startsWith(" ")) {
        changes.push({
          type: "context",
          lineNumber: currentLineNumber,
          content: line.substring(1),
        });
        currentLineNumber++;
      }
    }

    return {
      path: newPath,
      oldPath: oldPath !== newPath ? oldPath : undefined,
      status,
      additions,
      deletions,
      changes,
    };
  }

  /**
   * Check if file is supported (TypeScript/JavaScript)
   */
  private isSupportedFile(filePath: string): boolean {
    return this.supportedExtensions.some((ext) => filePath.endsWith(ext));
  }
}
