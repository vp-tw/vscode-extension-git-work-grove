import type { ItemContext, TreeActionableItem } from "../utils/resolveItemContext.js";

import * as fs from "node:fs";

import * as vscode from "vscode";

import { logError } from "../utils/outputChannel.js";
import { resolveItemContext } from "../utils/resolveItemContext.js";
import {
  getRepositoryTerminalName,
  getRepositoryWorkspaceTerminalName,
  getWorktreeTerminalName,
  getWorktreeWorkspaceTerminalName,
  renderTemplate,
} from "../utils/template.js";

function resolveTerminalName(item: TreeActionableItem, ctx: ItemContext): string {
  // FavoriteItem
  if ("favoritePath" in item) {
    switch (item.favoriteType) {
      case "repo":
        return renderTemplate(getRepositoryTerminalName(), ctx.vars);
      case "worktree":
        return renderTemplate(getWorktreeTerminalName(), ctx.vars);
      case "workspaceFile": {
        const template = ctx.parentWorktreeInfo?.isMain
          ? getRepositoryWorkspaceTerminalName()
          : getWorktreeWorkspaceTerminalName();
        return renderTemplate(template, ctx.vars);
      }
    }
  }

  // WorkspaceFileItem
  if ("workspaceFileInfo" in item) {
    const parent = item.parentWorktreeInfo;
    const template = parent.isMain
      ? getRepositoryWorkspaceTerminalName()
      : getWorktreeWorkspaceTerminalName();
    return renderTemplate(template, ctx.vars);
  }

  // WorktreeItem / GroupHeaderItem (repository)
  if ("worktreeInfo" in item && item.worktreeInfo) {
    const template = item.worktreeInfo.isMain ? getRepositoryTerminalName() : getWorktreeTerminalName();
    return renderTemplate(template, ctx.vars);
  }

  return "";
}

export function openInTerminal(item: TreeActionableItem | undefined): void {
  if (!item) return;

  const ctx = resolveItemContext(item);
  if (!ctx) return;

  if (!fs.existsSync(ctx.cwd)) {
    void vscode.window.showErrorMessage(
      `Cannot open terminal: directory does not exist — ${ctx.cwd}`,
    );
    return;
  }

  const name = resolveTerminalName(item, ctx);

  try {
    const terminal = vscode.window.createTerminal({
      name,
      cwd: ctx.cwd,
    });
    terminal.show();
  } catch (error) {
    logError("Failed to create terminal", error);
    void vscode.window.showErrorMessage("Failed to create terminal.");
  }
}
