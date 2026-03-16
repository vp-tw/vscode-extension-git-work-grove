import * as fs from "node:fs";
import * as path from "node:path";

import * as vscode from "vscode";

import { logError } from "../utils/outputChannel.js";
import {
  getRepositoryTerminalName,
  getRepositoryWorkspaceTerminalName,
  getWorktreeTerminalName,
  getWorktreeWorkspaceTerminalName,
  renderTemplate,
  workspaceFileVars,
  worktreeVars,
} from "../utils/template.js";

type TerminalOpenableItem =
  | { favoritePath: string; favoriteType: "repo" | "worktree" | "workspaceFile"; worktreeInfo?: { isMain: boolean; name: string; path: string; head: string; branch: string | undefined; isDetached: boolean; isCurrent: boolean; isPrunable: boolean }; parentWorktreeInfo?: { isMain: boolean; name: string; path: string; head: string; branch: string | undefined; isDetached: boolean; isCurrent: boolean; isPrunable: boolean } }
  | { workspaceFileInfo: { name: string; path: string }; parentWorktreeInfo: { isMain: boolean; name: string; path: string; head: string; branch: string | undefined; isDetached: boolean; isCurrent: boolean; isPrunable: boolean } }
  | { worktreeInfo: { isMain: boolean; name: string; path: string; head: string; branch: string | undefined; isDetached: boolean; isCurrent: boolean; isPrunable: boolean } };

function resolve(item: TerminalOpenableItem): { cwd: string; name: string } | undefined {
  // FavoriteItem
  if ("favoritePath" in item) {
    switch (item.favoriteType) {
      case "repo": {
        const info = item.worktreeInfo!;
        const name = renderTemplate(getRepositoryTerminalName(), worktreeVars(info));
        return { cwd: item.favoritePath, name };
      }
      case "worktree": {
        const info = item.worktreeInfo!;
        const name = renderTemplate(getWorktreeTerminalName(), worktreeVars(info));
        return { cwd: item.favoritePath, name };
      }
      case "workspaceFile": {
        const wsName = path.basename(item.favoritePath, ".code-workspace");
        const parent = item.parentWorktreeInfo;
        const template = parent?.isMain
          ? getRepositoryWorkspaceTerminalName()
          : getWorktreeWorkspaceTerminalName();
        const vars = workspaceFileVars(wsName, item.favoritePath, parent);
        const name = renderTemplate(template, vars);
        return { cwd: path.dirname(item.favoritePath), name };
      }
    }
  }

  // WorkspaceFileItem
  if ("workspaceFileInfo" in item) {
    const parent = item.parentWorktreeInfo;
    const template = parent.isMain
      ? getRepositoryWorkspaceTerminalName()
      : getWorktreeWorkspaceTerminalName();
    const vars = workspaceFileVars(item.workspaceFileInfo.name, item.workspaceFileInfo.path, parent);
    const name = renderTemplate(template, vars);
    return { cwd: path.dirname(item.workspaceFileInfo.path), name };
  }

  // WorktreeItem / GroupHeaderItem (repository)
  if ("worktreeInfo" in item && item.worktreeInfo) {
    const info = item.worktreeInfo;
    const template = info.isMain ? getRepositoryTerminalName() : getWorktreeTerminalName();
    const name = renderTemplate(template, worktreeVars(info));
    return { cwd: info.path, name };
  }

  return undefined;
}

export function openInTerminal(item: TerminalOpenableItem | undefined): void {
  if (!item) return;

  const resolved = resolve(item);
  if (!resolved) return;

  if (!fs.existsSync(resolved.cwd)) {
    void vscode.window.showErrorMessage(
      `Cannot open terminal: directory does not exist — ${resolved.cwd}`,
    );
    return;
  }

  try {
    const terminal = vscode.window.createTerminal({
      name: resolved.name,
      cwd: resolved.cwd,
    });
    terminal.show();
  } catch (error) {
    logError("Failed to create terminal", error);
    void vscode.window.showErrorMessage("Failed to create terminal.");
  }
}
