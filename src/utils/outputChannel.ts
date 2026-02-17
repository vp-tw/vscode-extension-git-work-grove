import * as vscode from "vscode";

import { OUTPUT_CHANNEL_NAME } from "../constants.js";

let channel: vscode.OutputChannel | undefined;

export function getOutputChannel(): vscode.OutputChannel {
  if (!channel) {
    channel = vscode.window.createOutputChannel(OUTPUT_CHANNEL_NAME);
  }
  return channel;
}

export function log(message: string): void {
  getOutputChannel().appendLine(`[${new Date().toISOString()}] ${message}`);
}

export function logError(message: string, error: unknown): void {
  const errorMessage =
    error instanceof Error ? error.stack ?? error.message : String(error);
  log(`ERROR: ${message}\n${errorMessage}`);
}
