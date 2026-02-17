import type { WorkspaceFileInfo, WorktreeInfo } from "../types.js";

import * as vscode from "vscode";

import {
  getRepositoryWorkspaceDescription,
  getRepositoryWorkspaceLabel,
  getWorktreeWorkspaceDescription,
  getWorktreeWorkspaceLabel,
  renderTemplate,
  workspaceFileVars,
} from "../utils/template.js";
import { buildTooltip } from "../utils/tooltip.js";
import { buildResourceUri } from "./currentDecorationProvider.js";

export class WorkspaceFileItem extends vscode.TreeItem {
  readonly workspaceFileInfo: WorkspaceFileInfo;

  constructor(info: WorkspaceFileInfo, isCurrent: boolean, isFavorite: boolean, parent: WorktreeInfo) {
    const vars = workspaceFileVars(info.name, info.path, parent);
    const labelTemplate = parent.isMain ? getRepositoryWorkspaceLabel() : getWorktreeWorkspaceLabel();
    const descTemplate = parent.isMain ? getRepositoryWorkspaceDescription() : getWorktreeWorkspaceDescription();
    super(renderTemplate(labelTemplate, vars), vscode.TreeItemCollapsibleState.None);
    this.workspaceFileInfo = info;

    const parts = ["workspaceFile"];
    if (isCurrent) parts.push("current");
    if (isFavorite) parts.push("favorite");
    this.contextValue = parts.join(".");

    this.iconPath = isCurrent
      ? new vscode.ThemeIcon("window", new vscode.ThemeColor("terminal.ansiGreen"))
      : new vscode.ThemeIcon("window");
    this.tooltip = buildTooltip({
      isCurrent,
      type: parent.isMain ? "Repository Workspace" : "Worktree Workspace",
      path: info.path,
      worktreeInfo: parent,
    });
    this.resourceUri = buildResourceUri(info.path, isCurrent);
    this.description = renderTemplate(descTemplate, vars);
  }
}
