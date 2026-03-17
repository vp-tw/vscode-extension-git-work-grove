export interface WorktreeInfo {
  name: string;
  path: string;
  head: string;
  branch: string | undefined;
  isDetached: boolean;
  isCurrent: boolean;
  isMain: boolean;
  isPrunable: boolean;
  configPath?: string;
}

export interface WorkspaceFileInfo {
  name: string;
  path: string;
}

export interface ResolvedFavorite {
  type: "repo" | "worktree" | "workspaceFile";
  path: string;
  displayName: string;
  isCurrent: boolean;
  worktreeInfo?: WorktreeInfo;
  parentWorktreeInfo?: WorktreeInfo;
}

export type OpenBehavior = "ask" | "currentWindow" | "newWindow" | "terminal";

export interface CustomCommandConfig {
  label: string;
  command: Array<string>;
  env?: Record<string, string>;
}
