import type { CustomCommandConfig } from "../types.js";

import { spawn } from "node:child_process";
import * as path from "node:path";
import process from "node:process";

import * as vscode from "vscode";

import { CMD_SHOW_OUTPUT } from "../constants.js";
import { getCustomCommands } from "../utils/customCommandConfig.js";
import { log, logError } from "../utils/outputChannel.js";
import { renderTemplate, workspaceFileVars, worktreeVars } from "../utils/template.js";

// Duck-typed item type matching openTerminal.ts pattern
type CustomCommandItem =
  | { favoritePath: string; favoriteType: "repo" | "worktree" | "workspaceFile"; parentWorktreeInfo?: { branch: string | undefined; head: string; isCurrent: boolean; isDetached: boolean; isMain: boolean; isPrunable: boolean; name: string; path: string }; worktreeInfo?: { branch: string | undefined; head: string; isCurrent: boolean; isDetached: boolean; isMain: boolean; isPrunable: boolean; name: string; path: string } }
  | { parentWorktreeInfo: { branch: string | undefined; head: string; isCurrent: boolean; isDetached: boolean; isMain: boolean; isPrunable: boolean; name: string; path: string }; workspaceFileInfo: { name: string; path: string } }
  | { worktreeInfo: { branch: string | undefined; head: string; isCurrent: boolean; isDetached: boolean; isMain: boolean; isPrunable: boolean; name: string; path: string } };

function resolveVars(item: CustomCommandItem): { cwd: string; vars: Record<string, string> } | undefined {
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
        return { cwd: path.dirname(item.favoritePath), vars };
      }
    }
  }

  // WorkspaceFileItem
  if ("workspaceFileInfo" in item) {
    const vars = workspaceFileVars(item.workspaceFileInfo.name, item.workspaceFileInfo.path, item.parentWorktreeInfo);
    return { cwd: path.dirname(item.workspaceFileInfo.path), vars };
  }

  // WorktreeItem / GroupHeaderItem (repository)
  if ("worktreeInfo" in item && item.worktreeInfo) {
    return { cwd: item.worktreeInfo.path, vars: worktreeVars(item.worktreeInfo) };
  }

  return undefined;
}

function renderCommand(config: CustomCommandConfig, vars: Record<string, string>): { args: Array<string>; bin: string; env: Record<string, string> } {
  const rendered = config.command.map(part => renderTemplate(part, vars));
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(config.env ?? {})) {
    env[key] = renderTemplate(value, vars);
  }
  return { args: rendered.slice(1), bin: rendered[0], env };
}

function spawnCommand(bin: string, args: Array<string>, env: Record<string, string>, cwd: string): void {
  try {
    const child = spawn(bin, args, {
      cwd,
      detached: true,
      env: { ...process.env, ...env },
      shell: true,
      stdio: "ignore",
    });
    child.unref();
    child.on("error", (err) => {
      logError(`Failed to run '${bin}'`, err);
      void vscode.window.showErrorMessage(
        `Failed to run '${bin}': ${err.message}`,
        "Show Logs",
      ).then((action) => {
        if (action === "Show Logs") {
          void vscode.commands.executeCommand(CMD_SHOW_OUTPUT);
        }
      });
    });
    log(`Custom command: ${bin} ${args.join(" ")}`);
  } catch (error) {
    logError(`Failed to spawn '${bin}'`, error);
    void vscode.window.showErrorMessage(`Failed to run '${bin}'.`);
  }
}

export async function runCustomCommand(
  item: CustomCommandItem | undefined,
  type: "directory" | "workspace",
): Promise<void> {
  if (!item) return;

  const resolved = resolveVars(item);
  if (!resolved) return;

  const commands = getCustomCommands(type);
  if (commands.length === 0) return;

  const quickPickItems = commands.map((cmd) => {
    const rendered = renderCommand(cmd, resolved.vars);
    return {
      command: cmd,
      detail: `${rendered.bin} ${rendered.args.join(" ")}`,
      label: cmd.label,
    };
  });

  const selected = await vscode.window.showQuickPick(quickPickItems, {
    placeHolder: "Select a command to run",
  });

  if (!selected) return;

  const { args, bin, env } = renderCommand(selected.command, resolved.vars);
  spawnCommand(bin, args, env, resolved.cwd);
}
