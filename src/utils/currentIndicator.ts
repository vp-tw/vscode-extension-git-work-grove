/**
 * Centralized current-indicator logic.
 *
 * See docs/spec/current-indicator.md for the full specification.
 *
 * Rule: only ONE item shows the current indicator at any time.
 * When a workspace file is open, the workspace file is current — not the
 * parent worktree / repository.
 */

/**
 * Whether a worktree (linked or main/repository) should display the current
 * indicator (green icon + badge).
 *
 * Returns `true` only when the worktree is the active working directory AND
 * no `.code-workspace` file is open (otherwise the workspace file takes
 * priority).
 */
export function isWorktreeDisplayCurrent(
  isCurrent: boolean,
  workspaceFilePath: string | undefined,
): boolean {
  return isCurrent && workspaceFilePath === undefined;
}

/**
 * Whether a workspace file should display the current indicator.
 *
 * Returns `true` when the file is the exact `.code-workspace` VS Code has
 * open.
 */
export function isWorkspaceFileDisplayCurrent(
  filePath: string,
  workspaceFilePath: string | undefined,
): boolean {
  return workspaceFilePath === filePath;
}
