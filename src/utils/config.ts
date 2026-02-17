import type { OpenBehavior } from "../types.js";

import * as vscode from "vscode";

function get<T>(key: string, defaultValue: T): T {
  return vscode.workspace.getConfiguration().get<T>(key, defaultValue);
}

export function getOpenBehavior(): OpenBehavior {
  return get<OpenBehavior>("git-work-grove.openBehavior", "ask");
}

export function getWorkspaceFileInclude(): Array<string> {
  return get<Array<string>>("git-work-grove.workspaceFile.include", [
    "*.code-workspace",
  ]);
}

export function getWorkspaceFileExclude(): Array<string> {
  return get<Array<string>>("git-work-grove.workspaceFile.exclude", []);
}

export async function updateOpenBehavior(value: OpenBehavior): Promise<void> {
  await vscode.workspace
    .getConfiguration()
    .update(
      "git-work-grove.openBehavior",
      value,
      vscode.ConfigurationTarget.Global,
    );
}
