import type { WorktreeInfo } from "../types.js";

import * as vscode from "vscode";

import {
  getWorktreeDescription,
  getWorktreeLabel,
  renderTemplate,
  worktreeVars,
} from "../utils/template.js";
import { buildTooltip } from "../utils/tooltip.js";
import { buildResourceUri } from "./currentDecorationProvider.js";

function buildContextValue(info: WorktreeInfo, isFavorite: boolean, displayCurrent: boolean): string {
  const parts = ["worktree"];
  if (info.isMain) parts.push("main");
  if (displayCurrent) parts.push("current");
  if (info.isPrunable) parts.push("prunable");
  if (isFavorite) parts.push("favorite");
  return parts.join(".");
}

function getIcon(info: WorktreeInfo, displayCurrent: boolean): vscode.ThemeIcon {
  if (info.isPrunable) {
    return new vscode.ThemeIcon("warning");
  }
  if (info.isMain) {
    if (displayCurrent) {
      return new vscode.ThemeIcon("repo", new vscode.ThemeColor("terminal.ansiGreen"));
    }
    return new vscode.ThemeIcon("repo");
  }
  if (displayCurrent) {
    return new vscode.ThemeIcon(
      "worktree",
      new vscode.ThemeColor("terminal.ansiGreen"),
    );
  }
  return new vscode.ThemeIcon("worktree");
}

function collapsibleState(info: WorktreeInfo, hasChildren: boolean): vscode.TreeItemCollapsibleState {
  if (!hasChildren) return vscode.TreeItemCollapsibleState.None;
  return info.isCurrent
    ? vscode.TreeItemCollapsibleState.Expanded
    : vscode.TreeItemCollapsibleState.Collapsed;
}

export class WorktreeItem extends vscode.TreeItem {
  readonly worktreeInfo: WorktreeInfo;

  constructor(info: WorktreeInfo, isFavorite: boolean, showCurrentIndicator?: boolean, hasChildren = true) {
    const displayCurrent = showCurrentIndicator ?? info.isCurrent;
    const vars = worktreeVars(info);
    super(renderTemplate(getWorktreeLabel(), vars), collapsibleState(info, hasChildren));
    this.worktreeInfo = info;
    this.contextValue = buildContextValue(info, isFavorite, displayCurrent);
    this.tooltip = buildTooltip({
      isCurrent: displayCurrent,
      type: info.isMain ? "Repository" : "Worktree",
      path: info.path,
      worktreeInfo: info,
      isPrunable: info.isPrunable,
    });
    this.iconPath = getIcon(info, displayCurrent);
    this.resourceUri = buildResourceUri(info.path, displayCurrent);
    this.description = renderTemplate(getWorktreeDescription(), vars);
  }
}
