import type { ResolvedFavorite } from "../types.js";

import * as vscode from "vscode";

import {
  getFavoriteRepositoryDescription,
  getFavoriteRepositoryLabel,
  getFavoriteRepositoryWorkspaceDescription,
  getFavoriteRepositoryWorkspaceLabel,
  getFavoriteWorktreeDescription,
  getFavoriteWorktreeLabel,
  getFavoriteWorktreeWorkspaceDescription,
  getFavoriteWorktreeWorkspaceLabel,
  renderTemplate,
  workspaceFileVars,
  worktreeVars,
} from "../utils/template.js";
import { buildTooltip } from "../utils/tooltip.js";
import { buildResourceUri } from "./currentDecorationProvider.js";

function getIcon(resolved: ResolvedFavorite): vscode.ThemeIcon {
  const color = resolved.isCurrent
    ? new vscode.ThemeColor("terminal.ansiGreen")
    : undefined;

  switch (resolved.type) {
    case "repo":
      return new vscode.ThemeIcon("repo", color);
    case "worktree":
      return new vscode.ThemeIcon("worktree", color);
    case "workspaceFile":
      return new vscode.ThemeIcon("window", color);
  }
}

function buildContextValue(resolved: ResolvedFavorite): string {
  const parts = ["favorite", resolved.type];
  if (resolved.isCurrent) parts.push("current");
  return parts.join(".");
}

function buildLabel(resolved: ResolvedFavorite): string {
  switch (resolved.type) {
    case "repo":
      return renderTemplate(getFavoriteRepositoryLabel(), worktreeVars(resolved.worktreeInfo!));
    case "worktree":
      return renderTemplate(getFavoriteWorktreeLabel(), worktreeVars(resolved.worktreeInfo!));
    case "workspaceFile": {
      const vars = workspaceFileVars(resolved.displayName, resolved.path, resolved.parentWorktreeInfo);
      const template = resolved.parentWorktreeInfo?.isMain
        ? getFavoriteRepositoryWorkspaceLabel()
        : getFavoriteWorktreeWorkspaceLabel();
      return renderTemplate(template, vars);
    }
  }
}

function buildDescription(resolved: ResolvedFavorite): string {
  switch (resolved.type) {
    case "repo":
      return renderTemplate(getFavoriteRepositoryDescription(), worktreeVars(resolved.worktreeInfo!));
    case "worktree":
      return renderTemplate(getFavoriteWorktreeDescription(), worktreeVars(resolved.worktreeInfo!));
    case "workspaceFile": {
      const vars = workspaceFileVars(resolved.displayName, resolved.path, resolved.parentWorktreeInfo);
      const template = resolved.parentWorktreeInfo?.isMain
        ? getFavoriteRepositoryWorkspaceDescription()
        : getFavoriteWorktreeWorkspaceDescription();
      return renderTemplate(template, vars);
    }
  }
}

function buildFavoriteTooltip(resolved: ResolvedFavorite): vscode.MarkdownString {
  switch (resolved.type) {
    case "repo":
      return buildTooltip({
        isCurrent: resolved.isCurrent,
        type: "Repository",
        path: resolved.path,
        worktreeInfo: resolved.worktreeInfo,
      });
    case "worktree":
      return buildTooltip({
        isCurrent: resolved.isCurrent,
        type: "Worktree",
        path: resolved.path,
        worktreeInfo: resolved.worktreeInfo,
      });
    case "workspaceFile":
      return buildTooltip({
        isCurrent: resolved.isCurrent,
        type: resolved.parentWorktreeInfo?.isMain ? "Repository Workspace" : "Worktree Workspace",
        path: resolved.path,
        worktreeInfo: resolved.parentWorktreeInfo,
      });
  }
}

export class FavoriteItem extends vscode.TreeItem {
  readonly favoritePath: string;
  readonly favoriteIndex: number;

  constructor(resolved: ResolvedFavorite, index: number) {
    super(buildLabel(resolved), vscode.TreeItemCollapsibleState.None);
    this.favoritePath = resolved.path;
    this.favoriteIndex = index;
    this.iconPath = getIcon(resolved);
    this.contextValue = buildContextValue(resolved);
    this.tooltip = buildFavoriteTooltip(resolved);
    this.resourceUri = buildResourceUri(resolved.path, resolved.isCurrent);
    this.description = buildDescription(resolved);
  }
}
