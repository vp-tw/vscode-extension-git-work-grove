import type { CustomCommandConfig } from "../types.js";
import type { TreeActionableItem } from "../utils/resolveItemContext.js";

import { spawn } from "node:child_process";
import * as fs from "node:fs";
import process from "node:process";

import { quote } from "shell-quote";
import * as vscode from "vscode";

import { CMD_SHOW_OUTPUT } from "../constants.js";
import { getCustomCommands } from "../utils/customCommandConfig.js";
import { log, logError } from "../utils/outputChannel.js";
import { resolveItemContext } from "../utils/resolveItemContext.js";
import { renderTemplate } from "../utils/template.js";

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
      shell: process.platform === "win32",
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

function terminalCommand(label: string, bin: string, args: Array<string>, env: Record<string, string>, cwd: string): void {
  try {
    const terminal = vscode.window.createTerminal({ cwd, env, name: label });
    terminal.sendText(quote([bin, ...args]));
    terminal.show();
    log(`Custom command (terminal): ${quote([bin, ...args])}`);
  } catch (error) {
    logError(`Failed to run '${bin}' in terminal`, error);
    void vscode.window.showErrorMessage(`Failed to run '${bin}' in terminal.`);
  }
}

export async function runCustomCommand(
  item: TreeActionableItem | undefined,
  type: "directory" | "workspace",
): Promise<void> {
  if (!item) return;

  const resolved = resolveItemContext(item);
  if (!resolved) return;

  if (!fs.existsSync(resolved.cwd)) {
    void vscode.window.showErrorMessage(
      `Cannot run custom command: directory does not exist — ${resolved.cwd}`,
    );
    return;
  }

  const commands = getCustomCommands(type);
  if (commands.length === 0) return;

  const quickPickItems = commands.map((cmd) => {
    const rendered = renderCommand(cmd, resolved.vars);
    return {
      ...rendered,
      label: cmd.label,
      detail: `${rendered.bin} ${rendered.args.join(" ")}`,
      mode: cmd.mode,
    };
  });

  const selected = await vscode.window.showQuickPick(quickPickItems, {
    placeHolder: "Select a command to run",
  });

  if (!selected) return;

  if (selected.mode === "terminal") {
    terminalCommand(selected.label, selected.bin, selected.args, selected.env, resolved.cwd);
  } else {
    spawnCommand(selected.bin, selected.args, selected.env, resolved.cwd);
  }
}
