import type { CustomCommandConfig } from "../types.js";

import * as vscode from "vscode";

import { CFG_CUSTOM_COMMANDS_DIRECTORY, CFG_CUSTOM_COMMANDS_WORKSPACE } from "../constants.js";
import { log } from "./outputChannel.js";

export function validateCustomCommand(entry: unknown): entry is CustomCommandConfig {
  if (typeof entry !== "object" || entry === null) return false;
  const obj = entry as Record<string, unknown>;

  if (typeof obj.label !== "string" || obj.label === "") return false;
  if (!Array.isArray(obj.command) || obj.command.length === 0) return false;
  if (!obj.command.every((c: unknown) => typeof c === "string")) return false;

  if (obj.env !== undefined) {
    if (typeof obj.env !== "object" || obj.env === null || Array.isArray(obj.env)) return false;
    if (!Object.values(obj.env).every((v: unknown) => typeof v === "string")) return false;
  }

  if (obj.mode !== undefined && obj.mode !== "spawn" && obj.mode !== "terminal") return false;

  return true;
}

export function getCustomCommands(type: "directory" | "workspace"): Array<CustomCommandConfig> {
  const key = type === "directory" ? CFG_CUSTOM_COMMANDS_DIRECTORY : CFG_CUSTOM_COMMANDS_WORKSPACE;
  const raw = vscode.workspace.getConfiguration().get<Array<unknown>>(key, []);
  const valid: Array<CustomCommandConfig> = [];

  for (const entry of raw) {
    if (validateCustomCommand(entry)) {
      valid.push({ ...entry, env: entry.env ?? {}, mode: entry.mode ?? "spawn" });
    } else {
      log(`Invalid custom command entry in ${key}: ${JSON.stringify(entry)}`);
    }
  }

  return valid;
}
