import type { WorkspaceFileInfo, WorktreeInfo } from "../types.js";

import * as path from "node:path";

import { workspaceFileVars, worktreeVars } from "./template.js";

/**
 * Duck-typed tree item that can be resolved to a CWD and template variables.
 * Covers WorktreeItem, WorkspaceFileItem, GroupHeaderItem (repository), and FavoriteItem.
 */
export type TreeActionableItem =
  | { favoritePath: string; favoriteType: "repo" | "worktree" | "workspaceFile"; parentWorktreeInfo?: WorktreeInfo; worktreeInfo?: WorktreeInfo }
  | { parentWorktreeInfo: WorktreeInfo; workspaceFileInfo: WorkspaceFileInfo }
  | { worktreeInfo: WorktreeInfo };

export interface ItemContext {
  cwd: string;
  vars: Record<string, string>;
  parentWorktreeInfo?: WorktreeInfo;
}

export function resolveItemContext(item: TreeActionableItem): ItemContext | undefined {
  // FavoriteItem
  if ("favoritePath" in item) {
    switch (item.favoriteType) {
      case "repo":
      case "worktree": {
        const info = item.worktreeInfo!;
        return { cwd: item.favoritePath, vars: worktreeVars(info) };
      }
      case "workspaceFile": {
        const wsName = path.basename(item.favoritePath, ".code-workspace");
        const vars = workspaceFileVars(wsName, item.favoritePath, item.parentWorktreeInfo);
        return { cwd: path.dirname(item.favoritePath), parentWorktreeInfo: item.parentWorktreeInfo, vars };
      }
    }
  }

  // WorkspaceFileItem
  if ("workspaceFileInfo" in item) {
    const vars = workspaceFileVars(item.workspaceFileInfo.name, item.workspaceFileInfo.path, item.parentWorktreeInfo);
    return { cwd: path.dirname(item.workspaceFileInfo.path), parentWorktreeInfo: item.parentWorktreeInfo, vars };
  }

  // WorktreeItem / GroupHeaderItem (repository)
  if ("worktreeInfo" in item && item.worktreeInfo) {
    return { cwd: item.worktreeInfo.path, vars: worktreeVars(item.worktreeInfo) };
  }

  return undefined;
}
