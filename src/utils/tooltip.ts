import type { WorktreeInfo } from "../types.js";

import * as vscode from "vscode";

interface TooltipOptions {
  isCurrent: boolean;
  type: string;
  path: string;
  worktreeInfo?: WorktreeInfo;
  isPrunable?: boolean;
}

export function buildTooltip(options: TooltipOptions): vscode.MarkdownString {
  const lines: Array<string> = [];

  if (options.isCurrent) {
    lines.push("● Current");
  }

  lines.push(`**Type:** ${options.type}`);
  lines.push(`**Path:** \`${options.path}\``);

  if (options.worktreeInfo) {
    const info = options.worktreeInfo;
    if (info.branch) {
      lines.push(`**Branch:** \`${info.branch}\``);
    } else if (info.isDetached) {
      lines.push("**HEAD:** detached");
    }
    lines.push(`**Commit:** \`${info.head.slice(0, 8)}\``);
  }

  if (options.isPrunable) {
    lines.push("⚠ Directory missing — run Prune to clean up");
  }

  const md = new vscode.MarkdownString(lines.join("\n\n"));
  md.isTrusted = false;
  return md;
}
