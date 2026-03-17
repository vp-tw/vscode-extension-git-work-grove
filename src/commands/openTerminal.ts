import * as cp from "node:child_process";
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

function getExternalTerminalConfig(): string | undefined {
  const config = vscode.workspace.getConfiguration("terminal.external");
  switch (process.platform) {
    case "darwin":
      return config.get<string>("osxExec");
    case "linux":
      return config.get<string>("linuxExec");
    case "win32":
      return config.get<string>("windowsExec");
    default:
      return undefined;
  }
}

export function openInExternalTerminal(item: TerminalOpenableItem | undefined): void {
  if (!item) return;

  const resolved = resolve(item);
  if (!resolved) return;

  if (!fs.existsSync(resolved.cwd)) {
    void vscode.window.showErrorMessage(
      `Cannot open terminal: directory does not exist — ${resolved.cwd}`,
    );
    return;
  }

  const terminalApp = getExternalTerminalConfig();
  const env = { ...process.env };
  // Remove Electron/VS Code internals from the spawned process
  delete env.ELECTRON_RUN_AS_NODE;

  let child: cp.ChildProcess;
  if (process.platform === "darwin") {
    const app = terminalApp || "Terminal.app";
    child = cp.spawn("/usr/bin/open", ["-a", app, resolved.cwd], { env });
  } else if (process.platform === "win32") {
    const exec = terminalApp || "cmd.exe";
    child = cp.spawn(exec, [], { cwd: resolved.cwd, env, detached: true, stdio: "ignore" });
  } else {
    const exec = terminalApp || "xterm";
    child = cp.spawn(exec, [], { cwd: resolved.cwd, env, detached: true, stdio: "ignore" });
  }

  child.on("error", (error: NodeJS.ErrnoException) => {
    logError("Failed to open external terminal", error);
    if (error.code === "ENOENT") {
      void vscode.window.showErrorMessage(
        "Configured external terminal not found. Please check your \"terminal.external\" setting.",
      );
    } else {
      void vscode.window.showErrorMessage("Failed to open external terminal.");
    }
  });
}
