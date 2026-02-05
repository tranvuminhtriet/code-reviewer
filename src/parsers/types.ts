/**
 * Git Diff Parser Types
 */

export interface Change {
  type: "add" | "delete" | "context";
  lineNumber: number;
  content: string;
}

export interface FileDiff {
  path: string;
  oldPath?: string;
  status: "added" | "modified" | "deleted" | "renamed";
  additions: number;
  deletions: number;
  changes: Change[];
  fullContent?: string; // Full new content for added/modified files
}

export interface ParsedDiff {
  files: FileDiff[];
  totalAdditions: number;
  totalDeletions: number;
  summary: string;
}
