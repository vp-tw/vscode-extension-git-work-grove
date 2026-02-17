import * as vscode from "vscode";

export const SCHEME = "gitworkgrove";

export function buildResourceUri(fsPath: string, isCurrent: boolean): vscode.Uri {
  return vscode.Uri.from({
    scheme: SCHEME,
    path: fsPath,
    query: isCurrent ? "current" : "",
  });
}

export class CurrentDecorationProvider implements vscode.FileDecorationProvider {
  provideFileDecoration(uri: vscode.Uri): vscode.FileDecoration | undefined {
    if (uri.scheme !== SCHEME) return undefined;
    if (uri.query === "current") {
      return {
        badge: "●",
        color: new vscode.ThemeColor("terminal.ansiGreen"),
      };
    }
    return undefined;
  }
}
