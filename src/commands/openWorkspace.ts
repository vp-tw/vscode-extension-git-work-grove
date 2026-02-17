import type { OpenBehavior } from "../types.js";
import type { FavoriteItem } from "../views/favoriteItem.js";
import type { WorkspaceFileItem } from "../views/workspaceFileItem.js";
import type { WorktreeItem } from "../views/worktreeItem.js";

import * as vscode from "vscode";

import { getOpenBehavior, updateOpenBehavior } from "../utils/config.js";

type OpenableItem = FavoriteItem | WorkspaceFileItem | WorktreeItem;

function openFolder(uri: vscode.Uri, forceNewWindow: boolean): Thenable<unknown> {
  return vscode.commands.executeCommand("vscode.openFolder", uri, {
    forceNewWindow,
  });
}

async function askAndOpen(uri: vscode.Uri): Promise<void> {
  const pick = await vscode.window.showQuickPick(
    [
      { label: "Open in New Window", behavior: "newWindow" as const, persist: false },
      { label: "Open in Current Window", behavior: "currentWindow" as const, persist: false },
      { label: "Always Open in New Window", behavior: "newWindow" as const, persist: true },
      { label: "Always Open in Current Window", behavior: "currentWindow" as const, persist: true },
    ],
    { placeHolder: "How would you like to open this workspace?" },
  );

  if (!pick) return;

  if (pick.persist) {
    await updateOpenBehavior(pick.behavior);
  }

  await openFolder(uri, pick.behavior === "newWindow");
}

async function openWithBehavior(uri: vscode.Uri, behavior: OpenBehavior): Promise<void> {
  if (behavior === "ask") {
    await askAndOpen(uri);
  } else {
    await openFolder(uri, behavior === "newWindow");
  }
}

function resolveUri(item: OpenableItem | undefined): vscode.Uri | undefined {
  if (!item) return undefined;

  if ("favoritePath" in item) {
    return vscode.Uri.file(item.favoritePath);
  }

  if ("workspaceFileInfo" in item) {
    return vscode.Uri.file(item.workspaceFileInfo.path);
  }

  if ("worktreeInfo" in item) {
    return vscode.Uri.file(item.worktreeInfo.path);
  }

  return undefined;
}

export async function openInNewWindow(item: OpenableItem | undefined): Promise<void> {
  const uri = resolveUri(item);
  if (!uri) return;
  await openFolder(uri, true);
}

export async function openInCurrentWindow(item: OpenableItem | undefined): Promise<void> {
  const uri = resolveUri(item);
  if (!uri) return;
  await openFolder(uri, false);
}

export async function openDefault(item: OpenableItem | undefined): Promise<void> {
  const uri = resolveUri(item);
  if (!uri) return;
  await openWithBehavior(uri, getOpenBehavior());
}
