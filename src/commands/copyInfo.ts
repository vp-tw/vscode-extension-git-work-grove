import type { ActionableItem } from "../utils/resolveItemPath.js";

import * as vscode from "vscode";

import { resolveItemPath } from "../utils/resolveItemPath.js";

function resolveName(item: ActionableItem): string | undefined {
  if ("favoritePath" in item) return typeof item.label === "string" ? item.label : undefined;
  if ("workspaceFileInfo" in item) return item.workspaceFileInfo.name;
  if ("worktreeInfo" in item) return item.worktreeInfo.name;
  return undefined;
}

export async function copyName(item: ActionableItem | undefined): Promise<void> {
  if (!item) return;
  const name = resolveName(item);
  if (name) {
    await vscode.env.clipboard.writeText(name);
  }
}

export async function copyPath(item: ActionableItem | undefined): Promise<void> {
  if (!item) return;
  const path = resolveItemPath(item);
  if (path) {
    await vscode.env.clipboard.writeText(path);
  }
}
