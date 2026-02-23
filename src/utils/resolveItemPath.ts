import type { FavoriteItem } from "../views/favoriteItem.js";
import type { WorkspaceFileItem } from "../views/workspaceFileItem.js";
import type { WorktreeItem } from "../views/worktreeItem.js";

export type ActionableItem = FavoriteItem | WorkspaceFileItem | WorktreeItem;

export function resolveItemPath(item: ActionableItem): string | undefined {
  if ("favoritePath" in item) return item.favoritePath;
  if ("workspaceFileInfo" in item) return item.workspaceFileInfo.path;
  if ("worktreeInfo" in item) return item.worktreeInfo.path;
  return undefined;
}
