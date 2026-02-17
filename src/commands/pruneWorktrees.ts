import type { GitWorktreeService } from "../services/gitWorktreeService.js";
import type { WorktreeTreeProvider } from "../views/worktreeTreeProvider.js";

import * as vscode from "vscode";

import { logError } from "../utils/outputChannel.js";

export async function pruneWorktrees(
  gitService: GitWorktreeService,
  treeProvider: WorktreeTreeProvider,
): Promise<void> {
  try {
    await gitService.pruneWorktrees();
    treeProvider.refresh();
    vscode.window.showInformationMessage("Worktrees pruned successfully.");
  } catch (error) {
    logError("Failed to prune worktrees", error);
    const action = await vscode.window.showErrorMessage(
      "Failed to prune worktrees.",
      "Show Logs",
    );
    if (action === "Show Logs") {
      vscode.commands.executeCommand("gitWorkGrove.showOutput");
    }
  }
}
