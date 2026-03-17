import type { WorktreeInfo } from "../types.js";

import * as vscode from "vscode";

import { abbreviatePath } from "./fishPath.js";

interface TooltipOptions {
  isCurrent: boolean;
  type: string;
  path: string;
  worktreeInfo?: WorktreeInfo;
}

export function buildTooltip(options: TooltipOptions): vscode.MarkdownString {
  const lines: Array<string> = [];
  const isPrunable = options.worktreeInfo?.isPrunable ?? false;
  const configPath = options.worktreeInfo?.configPath;

  if (isPrunable) {
    lines.push("⚠ **Prunable Worktree**");
  } else {
    if (options.isCurrent) {
      lines.push("● Current");
    }
    lines.push(`**Type:** ${options.type}`);
  }

  const pathLabel = isPrunable ? "Expected path" : "Path";
  lines.push(`**${pathLabel}:** \`${options.path}\``);

  if (options.worktreeInfo) {
    const info = options.worktreeInfo;
    if (info.branch) {
      lines.push(`**Branch:** \`${info.branch}\``);
    } else if (info.isDetached) {
      lines.push("**HEAD:** detached");
    }
    lines.push(`**Commit:** \`${info.head.slice(0, 8)}\``);
  }

  if (isPrunable && configPath) {
    lines.push(`**Config:** \`${abbreviatePath(configPath)}\``);
  }

  if (isPrunable) {
    lines.push("⚠ Directory missing — run Prune to clean up");
  }

  const md = new vscode.MarkdownString(lines.join("\n\n"));
  md.isTrusted = false;
  return md;
}
