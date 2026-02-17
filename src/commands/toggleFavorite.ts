import type { FavoritesService } from "../services/favoritesService.js";
import type { FavoriteItem } from "../views/favoriteItem.js";
import type { WorkspaceFileItem } from "../views/workspaceFileItem.js";
import type { WorktreeItem } from "../views/worktreeItem.js";
import type { WorktreeTreeProvider } from "../views/worktreeTreeProvider.js";

function resolvePath(item: FavoriteItem | WorkspaceFileItem | WorktreeItem): string | undefined {
  if ("favoritePath" in item) return item.favoritePath;
  if ("workspaceFileInfo" in item) return item.workspaceFileInfo.path;
  if ("worktreeInfo" in item) return item.worktreeInfo.path;
  return undefined;
}

export async function toggleFavorite(
  item: FavoriteItem | WorkspaceFileItem | WorktreeItem | undefined,
  favorites: FavoritesService,
  treeProvider: WorktreeTreeProvider,
): Promise<void> {
  if (!item) return;

  const path = resolvePath(item);
  if (!path) return;

  // FavoriteItem — always remove; others — toggle
  if ("favoritePath" in item || favorites.isFavorite(path)) {
    await favorites.remove(path);
  } else {
    await favorites.add(path);
  }

  treeProvider.refresh();
}
